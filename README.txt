EHOOD V18 — SAVED ACCOUNTS / REAL LOGIN

This version is prepared for persistent Ehood accounts using Supabase Auth + the Supabase profiles database.

WHAT IT DOES
- Sign up with email + password.
- Sign in with the same email + password later.
- Supabase Auth keeps a secure browser session, so users can close the site and come back without creating another account.
- Logout clears the active session.
- Each profile stores its account creation date in profiles.created_at.
- Member Since reads that saved account creation date.
- Profile data is stored in the database instead of only in one browser.

IMPORTANT — ONE-TIME SUPABASE SETUP
1. Create a Supabase project.
2. Open SQL Editor.
3. Run the entire supabase.sql file from this ZIP.
4. Open Project Settings → API.
5. Copy the Project URL and the publishable/anon key into config.js:
   SUPABASE_URL: "YOUR PROJECT URL"
   SUPABASE_ANON_KEY: "YOUR PUBLISHABLE/ANON KEY"
6. In Supabase Authentication settings, configure your site's URL/redirect URL to your Ehood Vercel URL.
7. Upload the ZIP contents to the SAME GitHub repository and let Vercel redeploy.

EMAIL VERIFICATION
Supabase may require email confirmation depending on your Auth settings. If confirmation is enabled, a new user must confirm their email before a session is created.

SECURITY
- Do NOT put a Supabase service-role/secret key in config.js or frontend code.
- Only use the public publishable/anon key in config.js.
- The SQL file enables Row Level Security for profiles.
- Passwords are handled by Supabase Auth and are not stored by the Ehood frontend when Supabase mode is active.

LOCAL FALLBACK
If config.js still contains placeholders, the site falls back to a local demo mode. That mode only persists accounts on the same browser/device and is NOT the real multi-device account system.
