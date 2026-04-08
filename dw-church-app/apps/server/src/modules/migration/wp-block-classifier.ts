/**
 * AI-powered block classifier for WP migration.
 * Uses Gemini to determine which existing blocks each WP page/post should map to.
 * No hardcoded strings — AI handles all classification.
 */
import { env } from '../../config/env.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface BlockSuggestion {
  blockType: string;
  props: Record<string, unknown>;
}

export interface ClassifiedPage {
  slug: string;
  title: string;
  contentType: 'static' | 'dynamic';
  suggestedBlocks: BlockSuggestion[];
}

/**
 * Use AI to classify WP pages into our block system.
 */
export async function classifyWPPages(
  pages: { slug: string; title: string; content: string; images: string[] }[],
): Promise<ClassifiedPage[]> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    // No AI — return pages with generic text_only blocks
    return pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      contentType: 'static' as const,
      suggestedBlocks: [
        { blockType: 'hero_banner', props: { title: p.title } },
        { blockType: 'text_only', props: { title: p.title } },
      ],
    }));
  }

  const results: ClassifiedPage[] = [];
  for (let i = 0; i < pages.length; i += 5) {
    const batch = pages.slice(i, i + 5);
    try {
      const classified = await classifyBatchWithAI(batch, apiKey);
      results.push(...classified);
    } catch {
      results.push(...batch.map((p) => ({
        slug: p.slug,
        title: p.title,
        contentType: 'static' as const,
        suggestedBlocks: [
          { blockType: 'hero_banner', props: { title: p.title } },
          { blockType: 'text_only', props: { title: p.title } },
        ],
      })));
    }
  }

  return results;
}

async function classifyBatchWithAI(
  pages: { slug: string; title: string; content: string; images: string[] }[],
  apiKey: string,
): Promise<ClassifiedPage[]> {
  const pageDescriptions = pages.map((p, i) => {
    const textContent = p.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
    return `[${i}] slug="${p.slug}" title="${p.title}" images=${p.images.length}\ncontent: ${textContent}`;
  }).join('\n\n');

  const prompt = `You are analyzing WordPress church website pages to map them into a block-based CMS.

Available block types:
- hero_banner: Hero banner (top of every page)
- pastor_message: Pastor greeting (photo + message)
- church_intro: Church introduction
- mission_vision: Vision/mission statement
- text_image: Text with image (general content)
- text_only: Text only
- worship_times: Worship schedule table
- location_map: Map/directions
- contact_info: Contact information
- staff_grid: Staff/clergy directory (dynamic)
- history_timeline: Church history timeline
- recent_sermons: Sermon list (dynamic)
- recent_bulletins: Bulletin list (dynamic)
- recent_columns: Pastoral column list (dynamic)
- album_gallery: Photo gallery (dynamic)
- event_grid: Events list (dynamic)
- newcomer_info: Newcomer welcome
- image_gallery: Image gallery
- board: Bulletin board (dynamic)
- video: Video embed
- quote_block: Quote/scripture

For each page, determine:
1. contentType: "static" or "dynamic"
2. blocks: ordered list of blocks to compose the page. First block should always be hero_banner.

Respond ONLY with a JSON array:
[{"index":0,"contentType":"static","blocks":[{"blockType":"hero_banner","props":{"title":"..."}},{"blockType":"text_image","props":{"title":"..."}}]}]

Pages:
${pageDescriptions}`;

  const res = await fetch(
    `${GEMINI_BASE}/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON in AI response');

  const parsed = JSON.parse(jsonMatch[0]) as { index: number; contentType: string; blocks: BlockSuggestion[] }[];

  return parsed.map((item) => {
    const page = pages[item.index];
    return {
      slug: page?.slug || '',
      title: page?.title || '',
      contentType: (item.contentType === 'dynamic' ? 'dynamic' : 'static') as 'static' | 'dynamic',
      suggestedBlocks: item.blocks || [],
    };
  });
}
