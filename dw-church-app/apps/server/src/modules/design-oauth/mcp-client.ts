/**
 * Minimal Claude Design MCP client (Streamable HTTP transport).
 *
 * The design MCP lives at https://api.anthropic.com/v1/design/mcp and speaks
 * MCP over Streamable HTTP (JSON-RPC 2.0; responses may be application/json OR
 * text/event-stream). We authenticate with the operator's OAuth access token
 * (see service.ts getAccessToken). Documented tools (docs/CLAUDE-DESIGN-WORKFLOW.md):
 *   • list_files → enumerate a project's files
 *   • get_file   → read one file (large .dc.html may paginate via offset/length)
 *
 * ⚠ The exact tools/call argument schemas are confirmed against the live server
 * via probeTools() on first connect — we do NOT hardcode unverified arg names.
 * callTool() passes arguments straight through so the caller supplies whatever the
 * probed inputSchema requires.
 */
import { DESIGN_MCP_URL } from './service.js';

const PROTOCOL_VERSION = '2025-06-18';

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id?: number | string;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/** One tool_result content item (MCP content block). */
export interface McpContent {
  type: string;
  text?: string;
  [k: string]: unknown;
}

/**
 * Parse a Streamable-HTTP response body — plain JSON or SSE `data:` frames.
 * `contentType`/`raw` are passed in (already read) so this is a pure, testable fn.
 */
export function parseRpcFrames(contentType: string, raw: string, id: number): JsonRpcResponse {
  if (contentType.includes('application/json')) {
    const j = JSON.parse(raw) as JsonRpcResponse | JsonRpcResponse[];
    if (Array.isArray(j)) return j.find((m) => m.id === id) ?? j[0]!;
    return j;
  }
  // SSE: collect `data:` payloads, return the frame matching our request id.
  const frames: JsonRpcResponse[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const m = /^data:\s?(.*)$/.exec(line);
    if (!m || !m[1]) continue;
    try { frames.push(JSON.parse(m[1]) as JsonRpcResponse); } catch { /* keep-alive/comment */ }
  }
  return frames.find((f) => f.id === id) ?? frames[frames.length - 1] ?? { jsonrpc: '2.0' };
}

async function parseRpcBody(res: Response, id: number): Promise<JsonRpcResponse> {
  return parseRpcFrames(res.headers.get('content-type') || '', await res.text(), id);
}

export class DesignMcpClient {
  private sessionId: string | null = null;
  private nextId = 1;
  constructor(private readonly accessToken: string) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': PROTOCOL_VERSION,
    };
    if (this.sessionId) h['Mcp-Session-Id'] = this.sessionId;
    return h;
  }

  private async rpc<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.nextId++;
    const res = await fetch(DESIGN_MCP_URL, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    });
    const sid = res.headers.get('mcp-session-id');
    if (sid) this.sessionId = sid;
    if (!res.ok && res.status !== 200) {
      const body = (await res.text()).slice(0, 300);
      throw new Error(`MCP ${method} 실패: HTTP ${res.status} ${body}`);
    }
    const parsed = await parseRpcBody(res, id);
    if (parsed.error) throw new Error(`MCP ${method} 오류: ${parsed.error.message}`);
    return parsed.result as T;
  }

  private async notify(method: string, params: Record<string, unknown> = {}): Promise<void> {
    await fetch(DESIGN_MCP_URL, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ jsonrpc: '2.0', method, params }),
    });
  }

  /** MCP handshake — initialize + initialized notification. */
  async connect(): Promise<{ serverInfo?: Record<string, unknown> }> {
    const result = await this.rpc<{ serverInfo?: Record<string, unknown> }>('initialize', {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'truelight-console', version: '1.0.0' },
    });
    await this.notify('notifications/initialized');
    return result ?? {};
  }

  async listTools(): Promise<McpTool[]> {
    const r = await this.rpc<{ tools?: McpTool[] }>('tools/list', {});
    return r?.tools ?? [];
  }

  /** Generic tool call — arguments pass straight through (see file header). */
  async callTool(name: string, args: Record<string, unknown> = {}): Promise<McpContent[]> {
    const r = await this.rpc<{ content?: McpContent[] }>('tools/call', { name, arguments: args });
    return r?.content ?? [];
  }
}

/** Flatten a tool_result's content items to a single text string. */
export function contentToText(content: McpContent[]): string {
  return content.map((c) => (typeof c.text === 'string' ? c.text : '')).join('');
}

/**
 * Diagnostic — connect with the user's token and return the live tools/list
 * (names + inputSchemas). Used by the console's "MCP 점검" so the fetch args are
 * finalized against reality on first connect, never guessed.
 */
export async function probeTools(accessToken: string): Promise<McpTool[]> {
  const client = new DesignMcpClient(accessToken);
  await client.connect();
  return client.listTools();
}
