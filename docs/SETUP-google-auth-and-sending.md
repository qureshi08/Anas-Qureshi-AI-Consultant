# Setup: Google sign-in + cold email sending

Everything needed to take the admin from deployed to actually sending. Do it in order,
each part depends on the one before.

Project-specific values used below:
- Supabase project ref: `hidqqawjhxafcavrjopg`
- Live site: `https://anas-qureshi-ai-consultant.vercel.app`

---

## Part 1 — Google Cloud: get a Client ID and Secret

This one set of credentials covers both jobs: signing in to the admin, and (optionally)
connecting Gmail inboxes for sending.

1. Go to <https://console.cloud.google.com>
2. Top-left project dropdown → **New Project** → name it `Anas AI Consultant` → **Create**.
   Wait for it to finish, then make sure it is the selected project in that dropdown.
3. Left menu → **APIs & Services** → **OAuth consent screen**
   (in the newer UI this is **Google Auth Platform**).
   - User type: **External** → **Create**
   - App name: `Anas Qureshi AI Consultant`
   - User support email: your Gmail
   - Developer contact email: your Gmail
   - **Save and Continue** through Scopes and Test Users. Nothing needs adding.
4. Left menu → **Credentials** (newer UI: **Clients**)
   → **+ Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Website`
   - Under **Authorised redirect URIs** → **+ Add URI**, and add BOTH of these exactly:

     ```
     https://hidqqawjhxafcavrjopg.supabase.co/auth/v1/callback
     https://anas-qureshi-ai-consultant.vercel.app/api/outbound/google/callback
     ```

     The first is for signing in to the admin. The second is for connecting Gmail
     inboxes to send from. Trailing slashes and typos will break it silently.
   - **Create**
5. A dialog shows **Client ID** and **Client Secret**. Copy both somewhere safe now.
   The Client ID ends in `.apps.googleusercontent.com`. The secret starts with `GOCSPX-`.

If you already created the client and closed the dialog: **Credentials** → click the client
name under "OAuth 2.0 Client IDs" → the Client ID is on that page, and you can reset the
secret there if you lost it.

### Publishing status
While the app is in **Testing**, only accounts listed as test users can sign in, and
sessions expire after 7 days. Either add your Gmail under **Audience → Test users**, or
hit **Publish app**. For a single-user admin, adding yourself as a test user is fine, but
publishing avoids the weekly re-login.

---

## Part 2 — Supabase: enable Google sign-in

1. <https://supabase.com/dashboard/project/hidqqawjhxafcavrjopg/auth/providers>
2. Find **Google** → toggle **Enable Sign in with Google** on
3. **Client IDs**: paste the Client ID from Part 1 (this is the field that was empty)
4. **Client Secret (for OAuth)**: paste the secret
5. **Save**
6. Now go to **Authentication → URL Configuration**
   (<https://supabase.com/dashboard/project/hidqqawjhxafcavrjopg/auth/url-configuration>)
   - **Site URL**: `https://anas-qureshi-ai-consultant.vercel.app`
   - **Redirect URLs** → add:
     ```
     https://anas-qureshi-ai-consultant.vercel.app/auth/callback
     ```
   - **Save**

---

## Part 3 — Vercel: environment variables

<https://vercel.com> → your project → **Settings** → **Environment Variables**.
Add both, leave all three environments ticked:

| Key | Value |
|---|---|
| `ADMIN_EMAILS` | `muhammadanasq@gmail.com` |
| `CRON_SECRET` | any long random string |
| `GOOGLE_CLIENT_ID` | the Client ID from Part 1 |
| `GOOGLE_CLIENT_SECRET` | the secret from Part 1 |

`ADMIN_EMAILS` is the only thing stopping a stranger's Google account from reaching the
admin and its connected inboxes. Comma-separate to add more people later.

`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are what make **Connect Gmail** a one-click
button. Set them once here and you never paste a credential into the app again, no matter
how many inboxes you connect.

Then **Deployments** → newest → **⋯** → **Redeploy**. Environment variables only apply to
new builds, so this step is not optional.

---

## Part 4 — Connect your sending inboxes

Because Part 3 set the credentials as env vars, this is now pure clicking. Nothing to paste.

1. Admin → **Cold email** → **Inboxes**
2. **Connect Gmail →**
3. Google asks which account. Pick it, approve, you land back on Inboxes with it connected.
4. **Test connection** → expect "Connected as you@gmail.com"
5. Set its **daily limit** (start at **20**, raise it once the account is warm)

**To add a second, third, tenth inbox: click Connect Gmail again and pick a different
account.** The account picker appears every time, so you are never stuck reconnecting the
same mailbox. Five inboxes at 20/day = 100 emails a day, and sends rotate to whichever
inbox has sent least so far today.

If you'd rather not use OAuth for a given account, the "Or add an app password" form still
works, but those inboxes can send and cannot be read, so reply sync skips them.

---

## Part 5 — First test run

Use your own email addresses as the leads. Never test on real prospects.

1. **Campaigns** → create one (name, goal, platform)
2. **Compose** → pick that campaign → fill in P / W / O / C → get the score to **5+/7** → **Save to campaign**
3. **Leads** → add 1-2 leads using addresses you control
4. **Validator** → check them. Expect **Unverified**, not Safe. That is the honest ceiling,
   see the note below.
5. **Send queue** → pick the campaign → gap **15 seconds** → **Start sending**
   - Keep the tab open. Closing it stops the run.
6. Check the mail arrived, reply to yourself from that address
7. **Sync replies** → the lead should flip to `replied`

---

## Two things that behave differently from the old local app

**Sending needs the tab open.** Vercel cannot hold a long-running process, so the browser
paces the loop and each request sends exactly one email. Follow-ups still run unattended
via the daily cron at 09:00, or immediately via **Process follow-ups**.

**Validation cannot confirm a mailbox exists.** The old Express version opened a socket to
the recipient's mail server on port 25; serverless hosts block that. What runs now is
syntax, disposable-domain, role-address and a real DNS MX lookup, which catches typos and
dead domains. It reports **Unverified** rather than Safe because it genuinely does not know.
True mailbox verification needs a paid API such as ZeroBounce.

---

## If something breaks

| Symptom | Cause |
|---|---|
| "Not on the allowlist" after signing in | `ADMIN_EMAILS` does not match your Google address, or you did not redeploy |
| `redirect_uri_mismatch` from Google | The URI in Part 1 step 4 does not match exactly |
| "At least one Client ID is required" | Client ID field empty in Supabase (Part 2 step 3) |
| Test connection fails on app password | 2-Step Verification is off, or the password has spaces in it |
| Follow-ups never send | `CRON_SECRET` missing, or no redeploy after adding it |
| Send button greyed out | No leads pass the safety filter, or no email written in Compose |
| "Connect Gmail" replaced by a red note | `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` missing in Vercel, or no redeploy after adding them |
| Connect Gmail keeps re-linking the same account | You are only signed into one Google account in that browser. Sign into the others, or use an incognito window per account |
| Every inbox stops working after a week | The Google app is still in **Testing**. Publish it (Part 1, Publishing status) |
