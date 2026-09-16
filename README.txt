EHOOD V20

Owner:
threatenn@outlook.com

OWNER / VERIFIED
- Only the owner email is marked Owner.
- The blue verified check is owner-only.
- New accounts cannot give themselves Owner or Verified.
- Owner controls no longer include a Verify button for other users.

SHARED CHAT
This version includes /api/chat backed by the Neon/Postgres database connected to the Vercel project.
The chat polls every 2 seconds so people on different phones/devices can see each other's messages.
It stores sender username/avatar with each message so chat users can see each other even when profiles are local.

VERCEL
Make sure the Neon integration is connected to the ehood-v15 project and exposes one of these environment variables:
POSTGRES_URL, DATABASE_URL, or NEON_DATABASE_URL.
No Supabase connection is required for the shared chat API.

IMPORTANT
Do not upload this ZIP as a single file into GitHub. Replace the project source files with the extracted contents, or deploy the folder directly through the appropriate Vercel workflow.


CHAT FIX
1. In Supabase SQL Editor, run the entire supabase.sql file.
2. Put your real Supabase URL and anon/publishable key in config.js (replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY).
3. Redeploy to Vercel. The chat now writes/reads from Supabase and uses Realtime; users in the same channel see each other.
