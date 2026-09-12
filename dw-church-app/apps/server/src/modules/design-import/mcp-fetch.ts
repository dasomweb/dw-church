/**
 * Fetch a Claude Design canvas via the design MCP, using the operator's OAuth
 * token. Tool NAMES are documented (list_files / get_file); the exact argument
 * schemas are read LIVE from tools/list and filled by matching property names —
 * we never hardcode unverified arg keys (see mcp-client.ts header).
 */
import { DesignMcpClient, contentToText, type McpTool } from '../design-oauth/mcp-client.js';

export interface FetchedCanvas {
  html: string;
  /** Raw file listing (whatever list_files returned) — shown in the preview. */
  files: unknown;
  /** Which tools/args were used — surfaced so a first-connect mismatch is visible. */
  toolNote: string;
}

/** Pick args for a tool by matching its inputSchema property names to our values. */
function argsFor(tool: McpTool | undefined, values: { projectId?: string; file?: string }): Record<string, unknown> {
  const props = ((tool?.inputSchema as { properties?: Record<string, unknown> })?.properties) ?? {};
  const keys = Object.keys(props);
  const args: Record<string, unknown> = {};
  for (const k of keys) {
    if (/proj/i.test(k) && values.projectId) args[k] = values.projectId;
    else if (/(path|file|name)/i.test(k) && values.file) args[k] = values.file;
  }
  // Fallbacks when the tool advertises no schema.
  if (keys.length === 0) {
    if (values.file) args.path = values.file;
    if (values.projectId) args.project_id = values.projectId;
  }
  return args;
}

/** Decode a get_file payload — plain text, or JSON `{ content }` (maybe base64). */
function decodeFile(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return text;
  try {
    const j = JSON.parse(trimmed) as { content?: string; text?: string; data?: string };
    const inner = j.content ?? j.text ?? j.data;
    if (typeof inner !== 'string') return text;
    // Heuristic base64 decode (Claude Design may base64 large files).
    if (/^[A-Za-z0-9+/=\r\n]+$/.test(inner) && inner.length % 4 === 0 && !/<|\s{2,}/.test(inner.slice(0, 40))) {
      try { return Buffer.from(inner, 'base64').toString('utf-8'); } catch { return inner; }
    }
    return inner;
  } catch {
    return text;
  }
}

export async function fetchCanvas(
  accessToken: string,
  target: { projectId: string; file: string },
): Promise<FetchedCanvas> {
  const client = new DesignMcpClient(accessToken);
  await client.connect();
  const tools = await client.listTools();
  if (tools.length === 0) throw new Error('design MCP 에 도구가 없습니다(tools/list 비어있음) — 연결/스코프 확인.');

  const listTool = tools.find((t) => /list/i.test(t.name) && /file/i.test(t.name)) ?? tools.find((t) => /list/i.test(t.name));
  const getTool = tools.find((t) => /(get|read)/i.test(t.name) && /file/i.test(t.name)) ?? tools.find((t) => /(get|read)/i.test(t.name));
  if (!getTool) {
    throw new Error(`design MCP 에서 파일 읽기 도구를 못 찾음. 사용 가능한 도구: ${tools.map((t) => t.name).join(', ')}`);
  }

  let files: unknown = null;
  if (listTool) {
    try {
      files = await client.callTool(listTool.name, argsFor(listTool, { projectId: target.projectId }));
    } catch {
      files = null; // listing is a nicety; the file read is what matters.
    }
  }

  const content = await client.callTool(getTool.name, argsFor(getTool, target));
  const html = decodeFile(contentToText(content));
  if (!html || html.length < 40) {
    throw new Error(`get_file(${getTool.name}) 결과가 비어있음 — 파일 경로("${target.file}") 또는 인자 스키마를 확인하세요.`);
  }
  return {
    html,
    files,
    toolNote: `list=${listTool?.name ?? '(none)'} get=${getTool.name}`,
  };
}
