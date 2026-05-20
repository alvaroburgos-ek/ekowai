// Load .env.local before any other imports execute. This module has the
// side effect of populating process.env for tests that hit the live DB.
import { config } from 'dotenv';
config({ path: '.env.local' });
