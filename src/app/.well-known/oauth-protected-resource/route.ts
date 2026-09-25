import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from 'mcp-handler';
import { env } from '@/env';

/**
 * RFC 9728 Protected Resource Metadata.
 *
 * This is how the Claude app finds out who issues tokens for the MCP endpoint:
 * it gets a 401 from /api/mcp pointing here, reads this document, and follows
 * it to the Supabase project's OAuth 2.1 server — which advertises its own
 * endpoints and supports dynamic client registration, so the connector
 * registers itself with no manual setup on the engineer's side.
 */
// The issuer is the GoTrue mount point, NOT the bare project URL: Supabase
// serves the discovery document at `<project>/auth/v1/.well-known/
// oauth-authorization-server` and reports `issuer: <project>/auth/v1`.
// Naming the bare URL here sends the client to a 404 and the connector never
// finds the authorization server. Verified against the live project.
const handler = protectedResourceHandler({
  authServerUrls: [`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`],
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
