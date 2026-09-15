EHOOD V10 — SAME-PROJECT DEPLOYMENT

Upload the files in this ZIP to the SAME Vercel project. This ZIP has the site files at the top level so you do not need to create a new project/site.

NEW IN V8
- Ehood Owner panel available only to the owner account.
- Owner can give/remove verification checkmarks.
- Owner can mute/unmute users.
- Owner can ban/unban users.
- Banned users cannot sign in in local mode.
- Muted users cannot send messages in local mode.
- First account created in a fresh local browser becomes the Ehood Owner and receives the verification checkmark. Existing local accounts are upgraded so the first existing account becomes owner if no owner exists.
- Ehood Nitro is shown at $2.99/month with a premium-perks screen.
- Existing logo, PFP/profile, mobile chat bar, login/logout, username lock, friends/DM UI remain.

IMPORTANT
This no-service mode stores accounts and moderation data in that browser's localStorage. It is good for a demo on one device, but bans/checkmarks/usernames are NOT global across different devices.

For real public use where every user shares the same accounts, username lock, moderation, and Nitro purchase status, Ehood needs a server/database and a real payment provider behind the same Ehood website.

NITRO
The $2.99/month Nitro screen is included, but it does not charge money yet. Payment processing must be connected to a payment provider before accepting real purchases.
