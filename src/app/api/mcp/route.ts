import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { verifyMcpToken } from '@/lib/mcp/verify-token';
import { registerProjectTools } from '@/lib/mcp/tools/projects';
import { registerWorksheetTools } from '@/lib/mcp/tools/worksheets';
import { registerFieldTools } from '@/lib/mcp/tools/fields';
import { registerResultTools } from '@/lib/mcp/tools/results';

/**
 * The MCP endpoint. An engineer adds this URL as a connector in the Claude app;
 * Supabase Auth acts as the OAuth 2.1 authorization server, so the caller signs
 * in with their normal EKOWAI account and every tool runs as that person — the
 * same access rules as in the browser, via resolveProjectAccess.
 *
 * Node runtime, not edge: the tools reach the database through postgres.js and
 * the auth scope uses AsyncLocalStorage.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = createMcpHandler(
  (server) => {
    registerProjectTools(server);
    registerWorksheetTools(server);
    registerFieldTools(server);
    registerResultTools(server);
  },
  {
    // Refuse `subscriptions/listen` instead of opening a notification stream.
    // A 2026-protocol client (the Claude connector) opens one after every
    // initialize; the SDK keeps it open until the client hangs up, which on a
    // Vercel function means the 300 s timeout — observed every ~4 min, around
    // the clock, from 2026-10-14 to 2026-10-17 (method confirmed in the log on
    // 2026-10-17). This server never pushes notifications, so the client loses
    // nothing; the SDK answers the request at once with a JSON-RPC error.
    maxSubscriptions: 0,
    // One compact line per JSON-RPC message, so the Vercel request log shows
    // WHICH method a hung or slow call was. Incident 2026-10-14: POST /api/mcp
    // calls ran into the 300 s function timeout every few minutes and the log
    // could not say what they were. Parameters are deliberately not logged —
    // they carry project data.
    onEvent: (event) => {
      if (event.type === 'REQUEST_RECEIVED') {
        console.log(JSON.stringify({ mcp: 'received', method: event.method }));
      } else if (event.type === 'REQUEST_COMPLETED') {
        console.log(
          JSON.stringify({
            mcp: 'completed',
            method: event.method,
            durationMs: event.duration,
            status: event.status,
          }),
        );
      } else if (event.type === 'ERROR') {
        const message = event.error instanceof Error ? event.error.message : String(event.error);
        console.error(JSON.stringify({ mcp: 'error', message }));
      }
    },
  },
);

const authenticated = withMcpAuth(handler, verifyMcpToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export { authenticated as GET, authenticated as POST, authenticated as DELETE };
