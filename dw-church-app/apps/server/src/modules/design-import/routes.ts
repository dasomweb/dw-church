/**
 * Claude Design import routes (super-admin). STAGE: dry-run preview.
 *
 *   POST /design/import/preview  → fetch the canvas via MCP + parse its structure
 *                                  (page→block table, dynamic lists, warnings).
 *                                  NO writes — this is the "실속" the operator
 *                                  reviews before any apply, and the first live
 *                                  MCP round-trip that confirms the fetch args.
 *
 * Apply (theme + pages) is wired after the preview is confirmed against a real
 * canvas — we do not write guessed structure into a tenant.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { getAccessToken } from '../design-oauth/service.js';
import { fetchCanvas } from './mcp-fetch.js';
import { parseCanvas } from './canvas-parse.js';

async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  const isSuperByRole = request.user?.role === 'super_admin';
  const isSuperByEnv = !!request.user?.email && env.SUPER_ADMIN_EMAILS.includes(request.user.email);
  if (!isSuperByRole && !isSuperByEnv) throw new AppError('FORBIDDEN', 403, 'Super admin access required');
}

const userIdOf = (request: FastifyRequest): string => request.user?.id ?? request.user?.email ?? '';

export async function designImportRoutes(app: FastifyInstance): Promise<void> {
  app.post('/design/import/preview', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const body = (request.body ?? {}) as { projectId?: string; file?: string };
    if (!body.projectId || !body.file) throw new AppError('BAD_REQUEST', 400, 'projectId/file 필수');

    const token = await getAccessToken(userIdOf(request));
    const fetched = await fetchCanvas(token, { projectId: body.projectId, file: body.file });
    const parsed = parseCanvas(fetched.html);

    // First-connect confirmation: log the LIVE tool schemas + canvas shape so the
    // fetch args + real .dc.html format are verified against reality (not guessed)
    // before apply is wired. Never logs token values.
    request.log.info(
      {
        designImportPreview: true,
        tools: fetched.tools.map((t) => ({ name: t.name, inputSchema: t.inputSchema })),
        toolNote: fetched.toolNote,
        htmlLength: fetched.html.length,
        canvasHead: fetched.html.slice(0, 1200),
        pages: parsed.pages.map((p) => ({ slug: p.slug, sections: p.sections.map((s) => s.blockType), dynamicLists: p.dynamicLists })),
        warnings: parsed.warnings,
      },
      'design-import preview (live MCP)',
    );

    return reply.send({
      data: {
        toolNote: fetched.toolNote,
        htmlLength: fetched.html.length,
        pages: parsed.pages,
        imports: parsed.imports,
        warnings: parsed.warnings,
      },
    });
  });
}
