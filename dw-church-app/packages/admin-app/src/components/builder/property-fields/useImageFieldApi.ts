import { useDWChurchClient } from '@dw-church/api-client';
type ImageKind = 'background' | 'content';
import { useMemo } from 'react';

/**
 * Wires the ImageField component to the existing tenant API client +
 * planner-proxy so the operator's upload / AI-generate buttons resolve
 * to real endpoints without each call site re-implementing the auth +
 * URL plumbing.
 *
 *   upload(file)     → POST /api/v1/files/upload  (multipart)
 *                      Routes through the api-client which already
 *                      attaches the session JWT + X-Tenant-Slug header.
 *
 *   generate(prompt, opts)
 *                    → POST /api/v1/ai/builder/image/generate (proxy)
 *                      Tenant-admin scoped (NOT super_admin) — same
 *                      route the per-section AI image button uses.
 *                      Server falls through to agents and returns
 *                      { url, mime, info } once R2 upload completes.
 *
 * Returns null when the api client isn't ready (e.g. mounted before
 * the auth provider hydrates) so callers can render a disabled
 * placeholder rather than crashing.
 */
export function useImageFieldApi(): {
  upload: ((file: File, opts?: { kind?: ImageKind }) => Promise<string>) | undefined;
  generate:
    | ((
        prompt: string,
        opts: { variant: 'hero' | 'section' | 'square'; referenceUrls?: string[]; mode?: 'space' | 'product' },
      ) => Promise<string>)
    | undefined;
  /**
   * One-click "AI auto" — server reads the section + page + business
   * context and the matching reference photos, composes the prompt
   * itself, and returns a generated image URL. No operator prompt
   * input required.
   *
   * `itemIndex` targets the image inside a list block's item array
   * (features_grid item 2's imageUrl, team_members item 3's photoUrl,
   * etc.). Omit for section-level images (hero backgroundImageUrl,
   * text_image imageUrl).
   */
  autoGenerate:
    | ((args: { pageId: string; sectionId: string; itemIndex?: number }) => Promise<string>)
    | undefined;

  /**
   * One-click "AI 자동 매칭" — server scans the tenant's media library,
   * lets the LLM rank candidates against the section context (page
   * title + section block_type + operator copy + matching tags), and
   * returns the chosen image. Recycles existing assets — no new image
   * is generated. Resolves to { url, reason } so the caller can surface
   * the LLM's rationale in a toast.
   */
  autoMatch:
    | ((args: { pageId: string; sectionId: string; itemIndex?: number }) => Promise<{ url: string; mediaId: string; reason: string }>)
    | undefined;
} {
  const client = useDWChurchClient();

  return useMemo(() => {
    if (!client) return { upload: undefined, generate: undefined, autoGenerate: undefined, autoMatch: undefined };
    // The client exposes a fetchAdapter for raw URL composition (same
    // pattern planner-api.ts uses to bypass the camelize/snake middleware
    // on JSON-passthrough endpoints).
    const fa = (client as unknown as {
      fetchAdapter?: { baseUrl: string; headers: Record<string, string> };
    }).fetchAdapter;

    // Client-side resize is applied inside `client.uploadFile` based
    // on the kind hint — 'background' (2048px) for hero / banner /
    // full-bleed slots, 'content' (1280px, default) for everything
    // else. No double-resize: callers pass the kind once and the
    // upload pipeline handles it.
    const upload = async (
      file: File,
      _opts: { kind?: ImageKind } = {},
    ): Promise<string> => {
      const result = await client.uploadFile(file); // dw-church uploadFile has no kind option
      if (!result?.url) throw new Error('Upload response has no URL');
      return result.url;
    };

    const generate = async (
      prompt: string,
      opts: {
        variant: 'hero' | 'section' | 'square';
        referenceUrls?: string[];
        // 'space' (venue / architecture preserved) or 'product'
        // (commercial scene with the product preserved) — drives the
        // policy-prefix branch in agents image_service. Optional, no
        // policy applied when omitted.
        mode?: 'space' | 'product';
      },
    ): Promise<string> => {
      if (!fa) throw new Error('API client is not ready');
      // Forward headers as-is INCLUDING X-Tenant-Slug. The builder
      // route's proxy requires request.tenant to scope the R2 upload
      // path + register the image in the right tenant's files table.
      //
      // For super_admin operators acting on a non-home tenant via
      // /super-admin/t/<slug>, X-Tenant-Slug is the ONLY signal of
      // target tenant (the JWT carries the operator's home, not the
      // target). Auth middleware was updated in parallel to honor
      // header tenant when role=super_admin instead of nullifying
      // on mismatch.
      //
      // Tenant-admin role is still protected against header injection
      // by the auth middleware's defensive nullify-on-mismatch branch
      // (server/src/middleware/auth.ts line 50).
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...fa.headers,
      };
      const res = await fetch(`${fa.baseUrl}/api/v1/ai/builder/image/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          variant: opts.variant,
          referenceUrls: opts.referenceUrls ?? [],
          ...(opts.mode ? { mode: opts.mode } : {}),
        }),
      });
      const text = await res.text();
      let json: { url?: string; error?: { message?: string }; detail?: string } = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        // not JSON — fall through to status check below
      }
      if (!res.ok || !json.url) {
        const message = json.error?.message ?? json.detail ?? `HTTP ${res.status}`;
        throw new Error(message);
      }
      return json.url;
    };

    const autoGenerate = async (args: {
      pageId: string;
      sectionId: string;
      itemIndex?: number;
    }): Promise<string> => {
      if (!fa) throw new Error('API client is not ready');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...fa.headers,
      };
      const body: Record<string, unknown> = {
        pageId: args.pageId,
        sectionId: args.sectionId,
      };
      if (typeof args.itemIndex === 'number') body.itemIndex = args.itemIndex;
      const res = await fetch(`${fa.baseUrl}/api/v1/ai/builder/section-image/auto-generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json: { url?: string; error?: { message?: string }; detail?: string } = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        // not JSON
      }
      if (!res.ok || !json.url) {
        const message = json.error?.message ?? json.detail ?? `HTTP ${res.status}`;
        throw new Error(message);
      }
      return json.url;
    };

    const autoMatch = async (args: {
      pageId: string;
      sectionId: string;
      itemIndex?: number;
    }): Promise<{ url: string; mediaId: string; reason: string }> => {
      if (!fa) throw new Error('API client is not ready');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...fa.headers,
      };
      const body: Record<string, unknown> = {
        pageId: args.pageId,
        sectionId: args.sectionId,
      };
      if (typeof args.itemIndex === 'number') body.itemIndex = args.itemIndex;
      const res = await fetch(`${fa.baseUrl}/api/v1/ai/builder/section-image/auto-match`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json: { url?: string; mediaId?: string; reason?: string; error?: { message?: string }; detail?: string } = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        // not JSON
      }
      if (!res.ok || !json.url || !json.mediaId) {
        const message = json.error?.message ?? json.detail ?? `HTTP ${res.status}`;
        throw new Error(message);
      }
      return { url: json.url, mediaId: json.mediaId, reason: json.reason ?? '' };
    };

    return { upload, generate, autoGenerate, autoMatch };
  }, [client]);
}
