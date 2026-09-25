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

const handler = createMcpHandler((server) => {
  registerProjectTools(server);
  registerWorksheetTools(server);
  registerFieldTools(server);
  registerResultTools(server);
});

const authenticated = withMcpAuth(handler, verifyMcpToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export { authenticated as GET, authenticated as POST, authenticated as DELETE };
