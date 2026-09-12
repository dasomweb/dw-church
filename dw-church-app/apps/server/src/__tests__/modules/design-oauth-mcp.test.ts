/**
 * Claude Design MCP client — Streamable-HTTP body parsing (JSON + SSE) and
 * content flattening. Pure logic, no network.
 */
import { describe, it, expect } from 'vitest';
import { parseRpcFrames, contentToText } from '../../modules/design-oauth/mcp-client.js';

describe('parseRpcFrames', () => {
  it('parses a plain application/json response', () => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 3, result: { tools: [{ name: 'list_files' }] } });
    const r = parseRpcFrames('application/json', body, 3);
    expect((r.result as { tools: { name: string }[] }).tools[0]!.name).toBe('list_files');
  });

  it('picks the frame matching the request id from an SSE stream', () => {
    const sse =
      ': keep-alive\n\n' +
      'event: message\n' +
      `data: ${JSON.stringify({ jsonrpc: '2.0', id: 1, result: { ok: 'first' } })}\n\n` +
      `data: ${JSON.stringify({ jsonrpc: '2.0', id: 2, result: { ok: 'second' } })}\n\n`;
    const r = parseRpcFrames('text/event-stream', sse, 2);
    expect((r.result as { ok: string }).ok).toBe('second');
  });

  it('tolerates malformed data lines and falls back to the last frame', () => {
    const sse = 'data: not-json\n\n' + `data: ${JSON.stringify({ jsonrpc: '2.0', id: 9, result: { v: 1 } })}\n\n`;
    const r = parseRpcFrames('text/event-stream', sse, 999);
    expect((r.result as { v: number }).v).toBe(1);
  });

  it('surfaces a JSON-RPC error frame', () => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 5, error: { code: -32601, message: 'no such tool' } });
    const r = parseRpcFrames('application/json', body, 5);
    expect(r.error?.message).toBe('no such tool');
  });
});

describe('contentToText', () => {
  it('joins text content blocks and ignores non-text', () => {
    const txt = contentToText([
      { type: 'text', text: '<html>' },
      { type: 'image', data: 'xxx' },
      { type: 'text', text: '</html>' },
    ]);
    expect(txt).toBe('<html></html>');
  });
});
