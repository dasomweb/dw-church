import { createHash } from 'node:crypto';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';

// 번역 · 성경 본문(개역개정/ESV) · 악보 가사 스캔 — 모두 Google Gemini 사용.
// (대표님 지시: 번역은 반드시 Gemini. Anthropic 크레딧 이슈로 나머지도 같이 Gemini로 통일.)
// 이미지 생성/텍스트 생성에서 이미 쓰는 GEMINI_API_KEY 재사용(새 키 불필요).
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-2.5-flash'; // 텍스트 + 비전(악보 OCR) 동일 모델
const MAX_BATCH = 60; // 한 번에 번역할 문구 수 상한

function hashOf(text: string, lang: string): string {
  return createHash('sha256').update(`${lang} ${text}`).digest('hex');
}

const LANG_NAME: Record<string, string> = { en: 'English' };

// Gemini generateContent 응답에서 텍스트를 뽑아 합친다(파트가 여러 개일 수 있음).
function geminiText(data: unknown): string {
  const parts = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((p) => p?.text ?? '').join('').trim();
}

/**
 * 문구 배열을 targetLang 으로 번역. 캐시 우선(테넌트 translations 테이블),
 * 미스만 Gemini 로 한 번에 번역해 upsert. is_override=true 행은 자동번역이
 * 덮어쓰지 않는다. 어떤 이유로든 실패하면 해당 문구는 원문(한국어)을 그대로
 * 반환 → 프론트가 절대 깨지지 않음(라이브 무손상).
 * 반환: { [원문]: 번역문 }.
 */
export async function translateTexts(
  schema: string,
  texts: string[],
  lang: string,
): Promise<{ translations: Record<string, string>; failed: string[]; reason?: TranslateFailReason }> {
  const out: Record<string, string> = {};
  // 번역에 실패해 원문을 그대로 돌려준 항목. 페이지 렌더링은 원문 폴백이 맞지만,
  // 관리자 자동번역 같은 호출부는 "실패"를 알아야 한글을 영어 칸에 쓰지 않는다.
  const failed: string[] = [];
  let failReason: TranslateFailReason | undefined;
  // 공백/중복 제거 + 상한.
  const uniq = Array.from(new Set(texts.map((t) => (t ?? '').trim()).filter(Boolean)));
  if (uniq.length === 0 || lang === 'ko' || !LANG_NAME[lang]) {
    for (const t of uniq) out[t] = t;
    return { translations: out, failed };
  }

  const hashes = uniq.map((t) => hashOf(t, lang));
  // 1) 캐시 조회 — 번호 파라미터 IN 절(드라이버 배열 바인딩 이슈 회피).
  let cached: { source: string; text: string }[] = [];
  try {
    const placeholders = hashes.map((_, i) => `$${i + 2}`).join(', ');
    cached = await prisma.$queryRawUnsafe<{ source: string; text: string }[]>(
      `SELECT source, text FROM "${schema}".translations
       WHERE lang = $1 AND source_hash IN (${placeholders})`,
      lang, ...hashes,
    );
  } catch { cached = []; }
  const have = new Set<string>();
  for (const row of cached) { out[row.source] = row.text; have.add(row.source); }

  const misses = uniq.filter((t) => !have.has(t));
  if (misses.length === 0) return { translations: out, failed };

  // 2) 미스만 Gemini 배치 번역(상한 단위로).
  for (let i = 0; i < misses.length; i += MAX_BATCH) {
    const batch = misses.slice(i, i + MAX_BATCH);
    let translated: string[] | null = null;
    try {
      const r = await callGeminiTranslate(batch, lang);
      translated = r.texts;
      if (!translated && r.reason) failReason = r.reason;
    } catch {
      translated = null;
      failReason = failReason ?? 'error';
    }
    for (let k = 0; k < batch.length; k++) {
      const src = batch[k]!;
      const tr = translated?.[k];
      if (tr && tr.trim()) {
        out[src] = tr;
        // upsert (관리자 보정본은 보존).
        try {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "${schema}".translations (source_hash, lang, source, text, is_override, updated_at)
             VALUES ($1, $2, $3, $4, false, NOW())
             ON CONFLICT (source_hash, lang) DO UPDATE
               SET text = EXCLUDED.text, source = EXCLUDED.source, updated_at = NOW()
               WHERE "${schema}".translations.is_override = false`,
            hashOf(src, lang), lang, src, tr,
          );
        } catch { /* cache write best-effort */ }
      } else {
        out[src] = src; // 실패 → 원문 유지(렌더링 폴백)
        failed.push(src);
      }
    }
  }
  return { translations: out, failed, reason: failed.length ? failReason : undefined };
}

/** 번역 실패 사유 — 호출부가 사용자에게 "왜" 안 됐는지 알릴 수 있게 구분한다. */
export type TranslateFailReason = 'no_key' | 'quota' | 'truncated' | 'error';

async function callGeminiTranslate(
  texts: string[],
  lang: string,
): Promise<{ texts: string[] | null; reason?: TranslateFailReason }> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return { texts: null, reason: 'no_key' };
  const target = LANG_NAME[lang] ?? lang;
  const system = `You are a professional translator for a Korean-American immigrant church website. `
    + `Translate each Korean string in the JSON array to natural, warm ${target} suitable for a church audience. `
    + `Keep proper nouns, Scripture references, times, and numbers intact. Do NOT translate strings already in ${target}. `
    + `Preserve any Markdown formatting (headings #, bullets -, **bold**, > quotes, line breaks) exactly. `
    + `Return ONLY a JSON array of the translated strings in the SAME order and length — no prose, no keys, no code fences.`;
  try {
    const res = await fetch(`${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: JSON.stringify(texts) }] }],
        generationConfig: {
          temperature: 0.3,
          // gemini-2.5-flash 의 thinking 토큰은 maxOutputTokens 예산을 **같이** 쓴다.
          // 긴 설교노트(5천자+)에서 thinking 이 6.5k 토큰을 먹어 출력이 잘리고
          // (finishReason=MAX_TOKENS) JSON 파싱이 실패 → 원문 그대로 반환되던 버그.
          // 번역은 추론이 필요 없으므로 thinking 을 끄고 예산을 넉넉히 준다.
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 32768,
          responseMimeType: 'application/json',
        },
      }),
    });
    if (!res.ok) {
      // 429 / RESOURCE_EXHAUSTED = 할당량·예산 소진. 사용자에게 그대로 알려야 한다.
      const body = await res.text().catch(() => '');
      const quota = res.status === 429 || /RESOURCE_EXHAUSTED|quota|billing/i.test(body);
      return { texts: null, reason: quota ? 'quota' : 'error' };
    }
    const data = await res.json();
    const finish = data?.candidates?.[0]?.finishReason;
    const raw = geminiText(data);
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
      const arr = JSON.parse(json);
      if (Array.isArray(arr) && arr.length === texts.length) return { texts: arr.map((x) => String(x ?? '')) };
    } catch {
      const m = json.match(/\[[\s\S]*\]/);
      if (m) {
        try { const arr = JSON.parse(m[0]); if (Array.isArray(arr) && arr.length === texts.length) return { texts: arr.map((x) => String(x ?? '')) }; } catch { /* fall through */ }
      }
    }
    // 출력 상한에 걸려 잘린 경우 — 길이를 줄이거나 예산을 늘려야 한다.
    return { texts: null, reason: finish === 'MAX_TOKENS' ? 'truncated' : 'error' };
  } catch {
    return { texts: null, reason: 'error' };
  }
}

/**
 * 성경 본문 가져오기 — 한국어 개역개정 + 영어 ESV. 온라인 주보 관리 입력 보조용.
 * 장절(reference)만 주면 두 버전 본문 + 영어 장절 표기를 돌려준다(Gemini).
 * LLM 재현이므로 100% 정확하지 않을 수 있음 → 게시 전 운영자 확인 전제(호출부 안내).
 * 실패(키 없음/오류)하면 빈 문자열 반환 → UI 무손상.
 */
export async function fetchScripture(reference: string): Promise<{ ko: string; en: string; referenceEn: string }> {
  const ref = (reference ?? '').trim();
  const empty = { ko: '', en: '', referenceEn: '' };
  if (!ref || !env.GEMINI_API_KEY) return empty;
  const system =
    'You are a Bible reference assistant for a Korean-American church bulletin. '
    + 'Given a Scripture reference (Korean book names are common, e.g. "누가복음 1:46-55"), '
    + 'return the passage text in TWO versions: '
    + '"ko" = 개역개정 (Korean Revised Version / 개역개정판), and "en" = ESV (English Standard Version). '
    + 'Also return "referenceEn" = the reference in standard English abbreviation style (e.g. "Luke 1:46-55"). '
    + 'Prefix each verse with its verse number inline (e.g. "46 내 영혼이..."). '
    + 'Reproduce each named version as accurately as possible; do not paraphrase or mix versions. '
    + 'Return ONLY compact JSON: {"ko":"...","en":"...","referenceEn":"..."} — no prose, no code fences.';
  try {
    const res = await fetch(`${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: ref }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096, responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) return empty;
    const data = await res.json();
    const raw = geminiText(data);
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const m = json.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : json) as Record<string, unknown>;
    return {
      ko: String(parsed.ko ?? ''),
      en: String(parsed.en ?? ''),
      referenceEn: String(parsed.referenceEn ?? ''),
    };
  } catch {
    return empty;
  }
}

/**
 * 찬양 악보 이미지에서 가사(lyrics)만 추출 — Gemini 비전 OCR. 온라인 주보 관리에서
 * 악보 업로드 후 "가사 스캔" 버튼용. R2 공개 URL 을 서버에서 내려받아 base64 로 전달.
 * 실패 시 빈 문자열(호출부는 기존 가사 유지). 게시 전 운영자 확인 전제.
 */
export async function scanHymnLyrics(imageUrls: string[]): Promise<string> {
  const urls = (imageUrls ?? []).map((u) => (u ?? '').trim()).filter(Boolean).slice(0, 6);
  if (urls.length === 0 || !env.GEMINI_API_KEY) return '';

  // R2 공개 URL → base64 (Gemini REST inlineData 는 URL 이 아니라 바이트를 받음).
  const parts: Array<Record<string, unknown>> = [];
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const mime = r.headers.get('content-type') || 'image/jpeg';
      if (!mime.startsWith('image/')) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      parts.push({ inlineData: { mimeType: mime, data: buf.toString('base64') } });
    } catch { /* skip this image */ }
  }
  if (parts.length === 0) return '';
  parts.push({ text: '이 악보들의 가사만 추출해줘.' });

  const system =
    'You extract the LYRICS (가사) from Korean church hymn / worship sheet-music images. '
    + 'Read only the sung words, in natural reading order across all sheets. '
    + 'Output plain text: one lyric line per line, a blank line between verses/stanzas. '
    + 'If verses are numbered (1절, 2절, Verse 1…), keep that label on its own line. '
    + 'Do NOT include musical notation, chord symbols, measure numbers, tempo marks, '
    + 'copyright/CCLI lines, or any commentary. Return ONLY the lyrics text — no preface.';
  try {
    const res = await fetch(`${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ parts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return geminiText(data);
  } catch {
    return '';
  }
}

// ─── Admin 보정 ──────────────────────────────────────────────
export async function listTranslations(schema: string, lang: string) {
  return prisma.$queryRawUnsafe<{ source: string; text: string; is_override: boolean; updated_at: Date }[]>(
    `SELECT source, text, is_override, updated_at FROM "${schema}".translations
     WHERE lang = $1 ORDER BY is_override DESC, updated_at DESC LIMIT 500`,
    lang,
  );
}

export async function setOverride(schema: string, source: string, lang: string, text: string) {
  const src = source.trim();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "${schema}".translations (source_hash, lang, source, text, is_override, updated_at)
     VALUES ($1, $2, $3, $4, true, NOW())
     ON CONFLICT (source_hash, lang) DO UPDATE
       SET text = EXCLUDED.text, is_override = true, updated_at = NOW()`,
    hashOf(src, lang), lang, src, text,
  );
}

export async function deleteTranslation(schema: string, source: string, lang: string) {
  await prisma.$executeRawUnsafe(
    `DELETE FROM "${schema}".translations WHERE source_hash = $1 AND lang = $2`,
    hashOf(source.trim(), lang), lang,
  );
}
