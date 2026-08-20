# HOOD CABALS whitelist

A dark, cyberpunk whitelist application with a small Express API. Every submission is recorded as a row in a Google Sheet (shareable, exportable, viewable by multiple people), with an optional best-effort email notification on top.

## Setup

1. Install Node.js 18 or newer.
2. From this folder, run `npm install`.
3. Do the "Google Sheets setup" below and copy the deployed web app URL and your chosen secret into `.env` as `SHEETS_WEBHOOK_URL` and `SHEETS_SECRET`.
4. (Optional) Set `EMAIL_TO`, `EMAIL_USER`, and `EMAIL_PASSWORD` in `.env` for an email ping on each submission. Use an SMTP app password or transactional email credentials; never commit `.env`.
5. Update `CONFIG.pinnedPostUrl` in `app.js` with the real pinned X post URL.
6. Run `npm start` and open `http://localhost:3000`.

The API accepts only the application fields needed: X username, X post link, wallet address, and adds the submission timestamp on the server. Requests are limited to five per IP per 15 minutes. The frontend never contains any credentials. The Google Sheet write is required for a submission to succeed; email is best-effort and won't fail the request if it errors.

## Google Sheets setup

This gives you a shared, exportable record of every submission for free, with no database to host.

1. Create a new Google Sheet (sheets.new). This will hold your applications.
2. In the Sheet, go to **Extensions → Apps Script**. Delete the default code and paste in the contents of [google-apps-script.js](google-apps-script.js) from this repo.
3. In the pasted script, replace `SHARED_SECRET` with a long random string (this stops randoms from posting fake rows to your sheet if they guess the URL). Keep this value — you'll put it in `.env` as `SHEETS_SECRET`.
4. Click **Deploy → New deployment**. Choose type **Web app**. Set "Execute as" to yourself, and "Who has access" to **Anyone**. Deploy, authorize the script when prompted, and copy the resulting web app URL.
5. Put that URL in `.env` as `SHEETS_WEBHOOK_URL`.
6. Share the Sheet itself (the actual spreadsheet, not the script) with whoever needs to view or export records — **File → Share**. They can filter/sort live, or export via **File → Download → CSV/Excel/PDF** any time, no manual compiling needed.

If you ever change the Apps Script code, you must **Deploy → Manage deployments → Edit → New version** for the change to take effect — saving the script alone doesn't update the live web app.

## Deploying to Vercel

Vercel doesn't run a persistent server, so production traffic is served by [api/applications.js](api/applications.js) — a serverless version of the same endpoint in `server.js` (same validation, same Sheet write, same best-effort email). `server.js` itself is only used for local development via `npm start`; it isn't used in production on Vercel.

1. Install the CLI: `npm install -g vercel` (or skip installing and just run `npx vercel` each time below).
2. From this project's folder, run `vercel login` and complete the login flow it opens in your browser.
3. Run `vercel`. It will ask a series of questions:
   - "Set up and deploy?" → **Y**
   - "Which scope?" → pick your account
   - "Link to existing project?" → **N**
   - "What's your project's name?" → accept the default or name it e.g. `hood-cabals-whitelist`
   - "In which directory is your code located?" → accept the default (`./`)
   - It should auto-detect no framework ("Other") and no build command — accept the defaults it suggests.
   This creates a **preview** deployment and prints a URL — the form won't work yet because environment variables aren't set.
4. Add the environment variables (same names/values as your local `.env`), either via CLI or dashboard:
   - CLI: run each of these from the project folder, pasting the matching value from your `.env` when prompted, and choosing **Production** (and Preview/Development too, if you want those environments to work as well):
     ```
     vercel env add SHEETS_WEBHOOK_URL
     vercel env add SHEETS_SECRET
     vercel env add EMAIL_TO
     vercel env add EMAIL_USER
     vercel env add EMAIL_PASSWORD
     vercel env add SMTP_HOST
     vercel env add SMTP_PORT
     vercel env add SMTP_SECURE
     ```
   - Or via dashboard: **vercel.com → your project → Settings → Environment Variables**, add each key/value there instead.
5. Deploy to production: `vercel --prod`. It prints your live URL (`https://your-project-name.vercel.app`).
6. Open that URL and submit a real test application to confirm it lands in your Google Sheet.

Every subsequent `vercel --prod` redeploys with your latest local changes. If you later connect this project's GitHub repo in the Vercel dashboard instead, it'll auto-deploy on every push and you can skip running `vercel --prod` manually.
