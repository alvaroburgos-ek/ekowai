// Load .env.local before any other imports execute. Side effect: populates
// process.env for tests that hit the live DB.
import { config } from 'dotenv';
config({ path: '.env.local' });
