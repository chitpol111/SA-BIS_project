# SA-BIS_project

## Manpower management app

## Supabase and Vercel

The API stores application state in Supabase and uploaded files in a private
Supabase Storage bucket. Before deploying:

1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. In Supabase Project Settings → API, copy the Project URL and `service_role`
   key. Keep the service-role key private.
3. Copy `.env.example` to `.env.local` and fill in those values plus a random
   `JWT_SECRET` of at least 32 characters. The local `.env.local` is ignored by
   Git.
4. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `JWT_SECRET` to the
   Vercel project's Environment Variables for every deployment environment.
   Use a random JWT secret of at least 32 characters. Keep the service-role key
   and JWT secret server-side; never use `VITE_` names. Existing login tokens
   must be reissued after deployment.
5. Deploy the repository with the project root as the Vercel Root Directory.
   `vercel.json` builds the Vite client and routes `/api/*` to the Express
   serverless function.
6. After running the SQL, transfer accounts from `server/data/users.json` with
   `npm run migrate-users --prefix server`. This script uses `.env.local` and
   does not print account records.
7. Create or update accounts with
   `npm run add-user --prefix server -- <email> <password> "<name>" <director|staff> [memberId]`.

The first API request seeds versioned JSONB rows in Supabase with the
repository's demo users, teas, members, jobs, leaves, calendar data, and chat
state. Writes to separate collections can proceed independently; concurrent
writes to the same collection are guarded against overwriting and return HTTP
409 if the client needs to retry.
Uploaded files are private and served through one-hour signed URLs. Vercel's
request payload limit means uploaded file payloads must remain within 4 MB;
multiple work-update files share that limit.

### Run and test locally

Use Node.js 20.19 or newer. The server's development command loads the
repository-root `.env.local` when present, so both development servers can
start before configuration is complete. The API requires valid `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, and `JWT_SECRET` values; without them, API requests
will fail. After setting those values and running the schema and account
migration:

1. Run `npm run dev` from the repository root.
2. Open `http://localhost:5173` and sign in with a migrated account. The API
   health check is `http://localhost:3001/api/health`; it should return
   `{"ok":true}`.
3. Create a calendar event or todo in the UI, refresh the page, and verify it
   is still present. In Supabase Table Editor, `public.app_state` should
   contain updated rows such as `customEvents` or `todos`.
4. Upload a small image or PDF. It should open from a signed URL and an object
   should appear in the private `uploads` bucket.
5. Run `npm run build` to check the production client build.

If health returns HTTP 503, check the three environment variable names and
values, confirm the SQL ran successfully, and check the server terminal for a
Supabase connection error. Never paste the service-role key or JWT secret into
chat or commit `.env.local`.
