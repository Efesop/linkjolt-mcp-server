#!/usr/bin/env node
/**
 * @linkjolt/mcp-server: a stdio relay to LinkJolt's hosted MCP server.
 *
 * Since 0.3.0 this package defines no tools of its own. It reads JSON-RPC
 * messages from stdin, one per line, posts each to the hosted endpoint
 * (https://www.linkjolt.io/api/mcp) with your API key, and writes the answer to
 * stdout. Every tool, prompt and instruction is therefore the hosted server's,
 * and the package can never fall behind it again (0.2.x carried its own copy
 * of 18 tools and none of the setup ones).
 *
 * Most clients do not need it: claude.ai, Claude Desktop, Claude Code,
 * ChatGPT, Cursor, VS Code and Windsurf all connect to the hosted endpoint
 * directly and sign in through the browser. Use it for a client that can only
 * run a local command.
 *
 * Setup:
 *   1. Create an API key at https://www.linkjolt.io/merchant/api-keys
 *   2. Add to your client's config:
 *      {
 *        "mcpServers": {
 *          "linkjolt": {
 *            "command": "npx",
 *            "args": ["-y", "@linkjolt/mcp-server"],
 *            "env": { "LINKJOLT_API_KEY": "lj_pk_your_key" }
 *          }
 *        }
 *      }
 *
 * LINKJOLT_MCP_URL points the relay at another deployment (tests, local dev).
 * Logs go to stderr: stdout carries JSON-RPC only.
 */

import { createInterface } from 'node:readline';

const VERSION = '0.3.1';
const DEFAULT_ENDPOINT = 'https://www.linkjolt.io/api/mcp';
const API_KEYS_URL = 'https://www.linkjolt.io/merchant/api-keys';

const endpoint = (process.env.LINKJOLT_MCP_URL || DEFAULT_ENDPOINT).trim();
const apiKey = (process.env.LINKJOLT_API_KEY || '').trim();

/** The revision the server agreed in initialize, sent on later requests (Streamable HTTP). */
let protocolVersion: string | null = null;

type JsonRpcId = string | number | null;

function write(message: unknown): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function rpcError(id: JsonRpcId, code: number, message: string): Record<string, unknown> {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

/** A tool call that cannot go through is answered as a tool error, so the model reads why. */
function toolError(id: JsonRpcId, text: string): Record<string, unknown> {
  return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }], isError: true } };
}

function messageId(message: unknown): JsonRpcId | undefined {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return undefined;
  const id = (message as { id?: unknown }).id;
  return typeof id === 'string' || typeof id === 'number' || id === null ? id : undefined;
}

function messageMethod(message: unknown): string | null {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return null;
  const method = (message as { method?: unknown }).method;
  return typeof method === 'string' ? method : null;
}

/** The JSON body of a Streamable HTTP answer, plain JSON or one SSE event. */
function parseBody(text: string, contentType: string | null): unknown {
  if (contentType && contentType.includes('text/event-stream')) {
    const data = text
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('');
    return data ? JSON.parse(data) : null;
  }
  return text ? JSON.parse(text) : null;
}

async function relay(line: string): Promise<void> {
  let message: unknown;
  try {
    message = JSON.parse(line);
  } catch {
    write(rpcError(null, -32700, 'Parse error: each line must be one JSON-RPC message'));
    return;
  }
  const id = messageId(message);
  const method = messageMethod(message);
  const isNotification = id === undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'User-Agent': `linkjolt-mcp-relay/${VERSION}`,
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (protocolVersion) headers['MCP-Protocol-Version'] = protocolVersion;

  let response: Response;
  try {
    response = await fetch(endpoint, { method: 'POST', headers, body: line });
  } catch (error) {
    if (isNotification) return;
    const why = `Could not reach LinkJolt at ${endpoint}: ${error instanceof Error ? error.message : 'network error'}.`;
    write(method === 'tools/call' ? toolError(id, why) : rpcError(id, -32603, why));
    return;
  }

  // A notification is acknowledged with 202 and no body.
  if (isNotification) return;

  const text = await response.text();
  let body: unknown;
  try {
    body = parseBody(text, response.headers.get('content-type'));
  } catch {
    body = null;
  }

  if (response.status === 401) {
    const why = apiKey
      ? `LinkJolt rejected the API key in LINKJOLT_API_KEY. Check it at ${API_KEYS_URL} (it may be revoked, or belong to a plan without API access).`
      : `This needs a LinkJolt account: set LINKJOLT_API_KEY to an API key from ${API_KEYS_URL}, or connect to ${DEFAULT_ENDPOINT} directly and sign in through the browser.`;
    write(method === 'tools/call' ? toolError(id, why) : rpcError(id, -32001, why));
    return;
  }

  if (body && typeof body === 'object' && !Array.isArray(body) && (body as { jsonrpc?: unknown }).jsonrpc === '2.0') {
    if (method === 'initialize') {
      const agreed = (body as { result?: { protocolVersion?: unknown } }).result?.protocolVersion;
      if (typeof agreed === 'string') protocolVersion = agreed;
    }
    write(body);
    return;
  }

  write(rpcError(id, -32603, `LinkJolt answered HTTP ${response.status} without a JSON-RPC message.`));
}

function main(): void {
  if (!apiKey) {
    process.stderr.write(
      `[linkjolt-mcp] LINKJOLT_API_KEY is not set: only the planning tools that need no account will work. Create a key at ${API_KEYS_URL}.\n`
    );
  }
  const pending = new Set<Promise<void>>();
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  input.on('line', (line) => {
    if (!line.trim()) return;
    const job = relay(line).catch((error) => {
      process.stderr.write(`[linkjolt-mcp] relay failed: ${error instanceof Error ? error.message : String(error)}\n`);
    });
    pending.add(job);
    void job.finally(() => pending.delete(job));
  });
  input.on('close', () => {
    void Promise.all(pending).then(() => process.exit(0));
  });
}

main();
