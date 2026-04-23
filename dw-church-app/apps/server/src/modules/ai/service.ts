import { env } from '../../config/env.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Tone guide shared across all AI text generation for church websites.
 * Applied to every generateText() call — prompt authors don't need to
 * restate it. Keep updates here rather than sprinkling tone hints across
 * individual prompts.
 */
export const CHURCH_TONE_GUIDE = `
You write Korean content for a present-day church website.

Tone:
- 따뜻하고 부드러우면서도 단정하고 예의 있는 문체
- 현 시대 독자에게 자연스럽게 읽히는 구어에 가까운 한국어
- 기독교 신앙의 정서와 언어는 살리되, 옛스럽거나 지나치게 전통적/권위적인
  표현("지체", "성도 여러분께 고하노니", "말씀하시나이다" 같은 경직된 투)은
  피한다
- 과장, 감상적 수식, 종교 용어 남발 금지. 간결하고 진심이 전해지는 문장을
  우선
- 경어체(-습니다/입니다) 기본. 명령형/훈계조 지양, 청자와 함께 걷는 톤
- 공감 가는 일상 언어로 풀어쓰되, 신앙적 깊이가 얕아지지 않게

Structure:
- 한 문단은 2~4문장. 문장 사이 호흡이 자연스럽게
- 모호한 수식어보다 구체적인 장면/감각 묘사가 있으면 좋다
- 구약/신약 인용이 필요할 때는 자연스러운 맥락에서 짧게. 본문 전체가
  성경 인용으로 도배되는 것은 피한다

Avoid:
- 과도한 이모지 / 느낌표 연발
- "~해보시길 바랍니다" 같은 판에 박힌 맺음을 반복
- 영어 단어를 불필요하게 섞는 것
- "사랑 가득한 마음으로 당신을 환영합니다" 식 지나치게 감상적인 클리셰
`.trim();

/**
 * Image-prompt guide (for future image generation endpoints).
 * 한국 기독교 이미지 선호: 자연(풍경/꽃/공원/하늘/빛) 중심, 성경 이미지는
 * 모던한 스타일. 스테인드글라스/교부 성화 같은 옛스러운 룩은 피한다.
 */
export const CHURCH_IMAGE_GUIDE = `
Korean church website imagery:
- Prefer nature: serene landscapes, wildflowers, parks, warm sunlight,
  soft skies, gentle water.
- When biblical imagery is needed, keep it modern and photographic —
  not stained-glass, not classical oil-painting, not stock-religious
  clip art. Think minimal editorial photography.
- Mood: calm, hopeful, approachable. Neutral-to-warm color palette.
- Avoid: heavy religious symbology, crosses pushed to the foreground,
  old manuscripts, dramatic cinematic lighting.
`.trim();

// ─── Text Generation (Gemini 2.5 Flash) ──────────────────

export async function generateText(prompt: string, context?: string): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const contextSuffix = context ? `\n\nContext: ${context}` : '';
  const systemPrompt = `${CHURCH_TONE_GUIDE}${contextSuffix}`;

  const res = await fetch(
    `${GEMINI_BASE}/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          // Korean text uses ~1.5 tokens/char. The editor asks for 3 variants
          // at ~300 chars each (pastor greeting, intro, etc.), so budget
          // generously to avoid mid-sentence truncation.
          maxOutputTokens: 4096,
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini text API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text generated');
  return text;
}
