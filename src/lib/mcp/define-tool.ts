import type { AuthInfo, McpServer } from '@modelcontextprotocol/server';
import type { z } from 'zod';
import { runWithMcpAuth } from './auth-context';
import { authContextFrom } from './verify-token';

/** What a tool handler gets: its validated args plus the calling user's id. */
export type ToolHandler<Args> = (
  args: Args,
  user: { id: string; email?: string },
) => Promise<unknown>;

type ToolConfig = {
  title: string;
  description: string;
  /** Marks a tool that only reads — surfaced to the client as a hint. */
  readOnly?: boolean;
};

/**
 * Registers one MCP tool, wiring three things every tool needs:
 *
 *  1. The AsyncLocalStorage scope, so the app's server actions resolve the
 *     calling user (see auth-context.ts). Without this, every action the tool
 *     calls would report "Not authenticated".
 *  2. A JSON result envelope — handlers return plain data, not MCP content
 *     blocks.
 *  3. Error containment: a thrown error becomes an `isError` tool result, so
 *     one broken tool reports a usable message instead of killing the request.
 */
export function defineTool<Schema extends z.ZodType>(
  server: McpServer,
  name: string,
  config: ToolConfig & { inputSchema: Schema },
  handler: ToolHandler<z.infer<Schema>>,
): void {
  server.registerTool(
    name,
    {
      title: config.title,
      description: config.description,
      inputSchema: config.inputSchema,
      annotations: config.readOnly ? { readOnlyHint: true } : undefined,
    },
    // The callback's args type is tied to the schema generic, which this
    // wrapper deliberately erases; the runtime shape is what `inputSchema`
    // validated, so the handler's own generic keeps call sites honest.
    (async (args: z.infer<Schema>, ctx: { http?: { authInfo?: AuthInfo } }) => {
      const auth = authContextFrom(ctx?.http?.authInfo);
      try {
        const result = await runWithMcpAuth(
          { user: auth.user, accessToken: auth.accessToken },
          () => handler(args, { id: auth.user.id, email: auth.user.email }),
        );
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Fehler in ${name}: ${message}` }],
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  );
}

/**
 * Normalizes the `{ ok: false, error }` shape the app's server actions return.
 *
 * The actions report failures as values rather than exceptions, which is right
 * for form submissions but invisible to a model — it would read `ok: false` as
 * a successful call. Turning it into a throw lets `defineTool` mark the tool
 * result as an error, which the model does act on.
 */
export function unwrap<T extends { ok: boolean }>(
  result: T,
): Extract<T, { ok: true }> {
  if (!result.ok) {
    const error = (result as { error?: string }).error ?? 'Unbekannter Fehler';
    throw new Error(error);
  }
  return result as Extract<T, { ok: true }>;
}
