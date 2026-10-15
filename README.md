# Before11

Before11 is a personal school planner for one person and two computers: the home machine and the school Chromebook. Courses, homework, and exams are typed in by hand, and study time is dragged onto a calendar.

The app is the unfinished list plus the day, 3-day, week, and month calendars. The Chromebook test below has not been marked passed. `#probe` is still the Supabase probe.

## Run locally

```
npm install
npm run dev
```

Open [http://127.0.0.1:5199/before11/](http://127.0.0.1:5199/before11/). The probe stays at [http://127.0.0.1:5199/before11/#probe](http://127.0.0.1:5199/before11/#probe).

## Supabase dashboard checklist

1. At [supabase.com](https://supabase.com), sign in with the GitHub account. New project: name `before11`, Free plan, the region closest to home. Let it generate the database password and keep that password in a password manager, never in the repo. The app never uses it.
2. Copy two values into `src/config/supabase-config.ts`:
   - `SUPABASE_URL`: the Project URL, `https://<project-ref>.supabase.co` (the project's **Connect** button, or Project Settings → Data API).
   - `SUPABASE_ANON_KEY`: Project Settings → API Keys → the `anon` `public` key (on the "Legacy API Keys" tab if there are two tabs). If the dashboard shows only a Publishable key (`sb_publishable_…`), paste that instead. Never the `service_role` key or a `sb_secret_…` key.
3. Authentication → Sign In / Providers → Email: enabled (the default). No other provider.
4. Authentication → Users → Add user → Create new user: the one email and password, with **Auto Confirm User** checked. Copy that user's UID.
5. Only after that user exists: Authentication → Sign In / Providers → turn **off** "Allow new users to sign up". Save.
6. Authentication → URL Configuration: Site URL `https://purple-spider513.github.io/Before11/`. Redirect URLs: add `http://127.0.0.1:5199/before11/` and `https://purple-spider513.github.io/Before11/`.
7. SQL Editor → New query → paste `supabase/schema.sql` → Run. It reports success with no rows. The file already contains the owner uid.
8. Database → Publications → `supabase_realtime`: the five tables are listed.

`supabase/schema.sql` contains the owner uid. That id is not a secret.

Free Supabase projects pause after about a week with no activity. If the probe suddenly can't reach the server after a break, open the project in the dashboard and click Restore. Stay on Supabase.

GitHub Pages: `.github/workflows/deploy.yml` deploys `main` of `purple-spider513/Before11` with GitHub Actions. The probe URL is `https://purple-spider513.github.io/Before11/#probe`. The app is the same URL with an empty hash.

## Transport

Home Wi-Fi: sign-in, an acknowledged write, and Realtime passed. The school Chromebook probe has not been run. The probe uses Supabase Realtime. If the channel does not reach `SUBSCRIBED` within 10 seconds, or reports `CHANNEL_ERROR`, `TIMED_OUT`, or `CLOSED`, it refetches every 10 seconds until Realtime connects. The app uses the same fallback. The probe's `Transport` and `Realtime log` lines show which happened.

## Chromebook test

Michael runs this. The agent does not check these boxes. Home Wi-Fi does not count for the school steps. Pages URL: `https://purple-spider513.github.io/Before11/#probe`.

- [ ] On the school Chromebook, on **school Wi-Fi** (home Wi-Fi does not count), open the Pages URL `#probe`. The page loads from GitHub Pages.
- [ ] Sign in. It shows `Auth: signed in as <email>`.
- [ ] Write a line. It shows `Last write: acknowledged`.
- [ ] On the home computer, open `#probe`, signed in. The same line appears.
- [ ] Change the line at home. The Chromebook's `Live value` changes without a refresh: within about 5 seconds with `source: realtime` if `Transport: realtime`, or within about 10 seconds with `source: server` if `Transport: polling every 10s (…)`. Either one passes. Write down the `Transport` line and the `Realtime log` lines.
- [ ] On the Chromebook, turn the Wi-Fi off. `navigator.onLine: false`. Click "Read cache". `Live value` still shows the last text with `source: cache`.
- [ ] Close the tab. Next school day, on school Wi-Fi, open the URL again. The last text shows at once with `source: cache`, there is no sign-in form (still signed in), and a new write shows `acknowledged`. That proves the token refresh at `https://<project-ref>.supabase.co/auth/v1/token` works on school Wi-Fi.

Transport used on school Wi-Fi: (not filled in; `realtime` or `polling every 10s`)

Do not press Refresh while the Wi-Fi is off. There is no service worker, so Chrome shows its own offline page instead of the site. "Read cache" re-runs the same cache read the page does on load.

## Decisions made during build

- Vite production `base` is `/Before11/`, matching the GitHub repository name. `npm run dev` stays at `/before11/`.
- `src/config/supabase-config.ts` holds the project URL and the publishable key (the public anon role). If either is emptied, the probe shows `Auth: failed: config-missing` and no Supabase request is made.
- `OWNER_EMAIL` is empty. When it is set, the probe email field and the app sign-in email field start with that address.
- `#probe` is the probe. Any other hash, including empty, is the app.
- The signed-in user is a field on the zustand store so the list and calendar can render from it on the first frame.
- An estimate that is not a multiple of 5 is rounded to the nearest 5, then clamped to 5–1440. An empty estimate is stored as null.
- In the course field, an exact case-insensitive match is the highlighted row. Otherwise the Create row is highlighted when the typed name is non-empty.
- Done dates in block tooltips use `Mon D`, and add the year when it is not the current year.
- Scrollbar color `#3A3A44` and the `+N` pill `rgba(0,0,0,0.35)` are `--scrollbar` and `--pill` in `tokens.css`. Components only use variables.
- `supabase/schema.sql` commits the owner uid. The live database was already applied; this file was not run again.
- After a successful outbox send, the head is dropped only when it is still the same operation. A newer coalesced write started during the request stays queued.
- The edit form replaces the row. Escape, a click outside, or a second click on that row closes it without saving. Clicking the form's own padding does not close it.
- Placing a 60-minute session from an armed click snaps to 5 minutes and may end after midnight. A list drag onto a column clamps the start to 0–1380.
- Remote rows are applied from `src/store/remote.ts` so the store and the undo stack do not import each other.
- Sign-in shows `Checking…` on the same frame. The Sign in button stays enabled.
- The probe starts signed in on frame 0 when `b11.auth` in `localStorage` holds a user.
- Realtime channel names carry a counter. `supabase.channel(name)` returns the existing channel of that name until its async removal finishes, and React StrictMode subscribes twice in dev.
- The Vite scaffold's oxlint package and `@types/node` are not installed. They are outside the allowed dependency list.
