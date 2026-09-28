# Full Setup Guide — Ethan Cohen Photography

This guide deploys your custom Yeshiva League photography platform at `ethancohenphotography.com`.

## What this project does

- Public portfolio for baseball, basketball, and hockey
- Event galleries and game scores
- Player/team tag search (public galleries only)
- Private proofing links with favorite selections
- Hidden admin path at `/login` → `/admin`; the normal navigation has no upload/admin links
- Backblaze B2 object storage for photos
- Supabase PostgreSQL database for galleries, scores, photo records, tags, and favorites
- Vercel hosting for the site

## Security rules — read first

- Never post, email, or send anyone your B2 Application Key, Supabase service-role key, Vercel token, or admin password.
- Do not use your username (`eco20fo`) as the admin password. Use a unique 16+ character passphrase.
- The app accepts JPG, PNG, and WEBP only. Do not put camera RAW files on a public portfolio.
- The upload flow sends images directly from the browser to B2; files do not pass through Vercel.

---

# Part 1 — Make accounts

You need free accounts at:

1. [GitHub](https://github.com) — stores the project source
2. [Vercel](https://vercel.com) — hosts the site
3. [Supabase](https://supabase.com) — database
4. [Backblaze](https://www.backblaze.com/b2/cloud-storage.html) — photo storage

Use an email address you will keep access to. Enable 2-factor authentication when offered.

---

# Part 2 — Create the Supabase database

1. Sign in to Supabase and select **New project**.
2. Organization: select your personal organization.
3. Name: `ethan-cohen-photo`.
4. Set a strong database password and save it in a password manager.
5. Select a region near you (US East is sensible for New York).
6. Click **Create new project** and wait until it finishes.
7. In the left menu, open **SQL Editor** → **New query**.
8. Open `supabase/schema.sql` from this download. Copy all contents into the Supabase editor.
9. Click **Run**. It should say Success.
10. Go to **Project Settings** → **API**. Keep this tab open later; you need:
   - Project URL
   - `anon` public key
   - `service_role` secret key — treat this as private.

This project uses server-side database access. Do not turn on public access policies for these tables; the service-role key stays only in Vercel environment variables.

---

# Part 3 — Create Backblaze B2 storage

1. Sign in to Backblaze.
2. Open **B2 Cloud Storage**.
3. Click **Create a Bucket**.
4. Bucket name: `ethan-cohen-photos` (bucket names must be globally unique; if taken, use `ethan-cohen-photos-2026`).
5. Select **Public** for now. This is needed by this starter package to display public gallery images. Do not upload private/sensitive images to public proofing galleries until you upgrade to signed image delivery.
6. Create the bucket.
7. Open **App Keys** → **Add a New Application Key**.
8. Name: `ethan-site-uploader`.
9. Access: **Read and Write**.
10. Restrict it to your new bucket.
11. Create the key and copy both values immediately:
    - `keyID`
    - `applicationKey`

Backblaze shows the application key only once. Store it in a password manager. Never add it to GitHub.

12. Open the bucket settings and find its friendly/public URL. For B2 S3-compatible uploads, use this endpoint in Vercel:
   `https://s3.us-west-004.backblazeb2.com`

Set `B2_PUBLIC_BASE_URL` to the public URL shown by your B2 bucket. It may resemble `https://f004.backblazeb2.com/file/YOUR_BUCKET_NAME`.

---

# Part 4 — Put the code on GitHub

1. Create a new empty GitHub repository named `ethan-cohen-photography`.
2. Do **not** check “Add a README” because this package has one.
3. Download and unzip `ethan-cohen-yl-sports.zip`.
4. In the GitHub repository page, choose **Add file** → **Upload files**.
5. Drag every file/folder *inside* the unzipped project folder into GitHub. Upload `app`, `components`, `lib`, `supabase`, and the root files such as `package.json`.
6. Do NOT upload `.env.example` with real values. The example itself is safe.
7. Click **Commit changes**.

---

# Part 5 — Make password secrets

You need two values, made locally and kept private.

## Admin password hash

Open [bcrypt-generator.com](https://bcrypt-generator.com/) or run a local bcrypt generator. Enter a **new, unique 16+ character admin password**. Generate a bcrypt hash with 10–12 rounds. Copy the output beginning with `$2...`.

This hash—not your actual password—goes in Vercel as `ADMIN_PASSWORD_HASH`.

## Authentication secret

Generate a long random string with a password manager (at least 32 characters). This goes in Vercel as `AUTH_SECRET`.

---

# Part 6 — Deploy on Vercel

1. Sign in to Vercel using GitHub.
2. Click **Add New** → **Project**.
3. Import `ethan-cohen-photography`.
4. Framework should automatically say **Next.js**. Keep default build settings.
5. Before clicking Deploy, expand **Environment Variables**.
6. Add these exact names and values for **Production**, **Preview**, and **Development**:

| Variable | Value source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role secret key |
| `ADMIN_PASSWORD_HASH` | Your bcrypt hash, not actual password |
| `AUTH_SECRET` | Your 32+ random secret |
| `B2_KEY_ID` | Backblaze app key `keyID` |
| `B2_APPLICATION_KEY` | Backblaze app key `applicationKey` |
| `B2_BUCKET` | Your exact B2 bucket name |
| `B2_ENDPOINT` | `https://s3.us-west-004.backblazeb2.com` |
| `B2_PUBLIC_BASE_URL` | Your B2 bucket public base URL, no ending slash |

7. Click **Deploy**.
8. When done, open the Vercel URL. You should see your Yeshiva League homepage.

---

# Part 7 — Connect your Spaceship domain

You own `ethancohenphotography.com` at Spaceship.

1. In Vercel, open your project → **Settings** → **Domains**.
2. Add `ethancohenphotography.com`.
3. Also add `www.ethancohenphotography.com`.
4. Vercel will display one or more DNS records. Keep that tab open.
5. Sign in to Spaceship → **Domain List** → `ethancohenphotography.com` → **DNS**.
6. Delete only conflicting old A/CNAME records for `@` and `www`; do not delete email records if you later use email.
7. Add exactly the records Vercel shows. Typically:
   - A record: Host `@`, Value `76.76.21.21`
   - CNAME: Host `www`, Value `cname.vercel-dns.com`
   Use the Vercel-provided records if they differ.
8. Return to Vercel and click **Refresh** / wait for verification.
9. In Vercel Domains, make `ethancohenphotography.com` the primary domain and redirect `www` to it.

DNS may take a few minutes and occasionally up to 24 hours.

---

# Part 8 — First admin login and gallery

1. Visit `https://ethancohenphotography.com/login`.
2. Enter the original password you used to create the bcrypt hash.
3. You will go to `/admin`. This link is intentionally absent from the public menu.
4. Click **New Gallery**.
5. Enter an event name such as `Yeshiva League vs. MTA — Basketball`.
6. Add teams, date, score, sport, and select Public or Private.
7. Select JPEG, PNG, or WEBP images and click Save Gallery.
8. Public galleries appear on your homepage and Scores page.
9. Private galleries generate a `proof_token` in Supabase. Copy it from the gallery row in Supabase and share it as:
   `https://ethancohenphotography.com/proof/PASTE-TOKEN-HERE`

## Important starter limitation

This starter creates private gallery records, favorites, secure admin login, and direct B2 uploads. For a true private proofing gallery where image URLs cannot be opened by anyone, the B2 bucket must be private and images need short-lived signed read URLs. That is the next hardening step; do not use the starter public B2 bucket for sensitive client proofing content.

---

# Common problems

- **Vercel build error**: make sure every project file was uploaded at repository root, not inside a second nested folder.
- **Images upload but do not display**: check `B2_PUBLIC_BASE_URL` exactly matches the public bucket URL, with no ending slash.
- **Admin says incorrect password**: regenerate bcrypt hash for the password you are typing, update `ADMIN_PASSWORD_HASH` in Vercel, then redeploy.
- **Domain not verified**: use Vercel’s exact DNS entries; remove conflicting records at Spaceship and wait for DNS propagation.
- **Do not share secrets**: Vercel variables, B2 keys, Supabase service key, and admin credentials should never be pasted into messages or GitHub.
