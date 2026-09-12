# SmartBiz — User & Testing Guide

SmartBiz is an AI-powered platform for discovering and promoting local small businesses in Rwanda. Visitors search and browse businesses, customers leave reviews, business owners list their businesses and buy advertising plans that boost their ranking, and a super admin oversees everything.

The project has two parts, run separately:

| Folder | What it is | Runs on |
|---|---|---|
| `api/` | Express + PostgreSQL REST API | http://localhost:5002 |
| `client/` | React (Vite + Tailwind) web app | http://localhost:5173 |

---

## 1. Getting it running

**Terminal 1 — API** (from `api/`):

```bash
npm install
cp .env.example .env    # then edit it — see note below
npm run db:migrate      # creates tables
npm run db:seed         # 12 categories, 90 businesses, superadmin, seed owner
npm run db:seed:owners  # 20 extra business-owner accounts (random Rwandan names)
npm run dev:api
```

> `npm run db:seed` first asks **"Truncate tables? (yes/No)"** — answer `yes` to wipe all data tables (users, businesses, reviews, subscriptions…) and reseed from scratch; anything else seeds on top of the existing data. Non-interactive runs (piped stdin, CI) skip the prompt and never truncate. `npm run db:truncate` wipes the data tables on its own.

> ⚠️ **Important:** in `api/.env`, set `PORT=5002` (the `.env.example` says 5000, but the client proxies API calls to 5002 — with the wrong port every page shows "Couldn't load…" errors). Also set `DATABASE_URL` to your Postgres database and `SMARTBIZ_GEMINI_API_KEY` if you want real AI recommendations (the app still works without it — see §6).

**Terminal 2 — Client** (from `client/`):

```bash
npm install
npm run dev             # open http://localhost:5173
```

---

## 2. Test accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| **Super admin** | `admin@smartbiz.rw` | `Admin@SmartBiz1` | Only exists via seed — cannot be created from the Register page |
| **Business owner (populated)** | `seed.owner@smartbiz.rw` | `SeedPass123!` | Owns all 90 seeded businesses — best for seeing a full dashboard |
| **Business owners ×20** | Random per seed run, e.g. `aline.uwase@smartbiz.rw` | `OwnerPass123!` | Names are random Rwandan names; the seeder **prints every generated email** when it finishes (owners linked to businesses are marked). Only **5 random ones** are linked to businesses — an empty "My Businesses" list for the others is **expected, not a bug** |
| **Customer** | — | — | None is seeded; create one on `/register` (choose "Customer") |

Login redirects by role: super admin → `/superadmin`, everyone else → `/dashboard`. Sessions are stored in the browser (localStorage), so a refresh keeps you logged in; clearing site data logs you out.

---

## 3. The three roles at a glance

- **Visitor (not logged in):** can browse and search businesses, use AI recommendations, and view business details — but cannot leave reviews (the review form is hidden).
- **Customer** (`user`): everything a visitor can do, plus leave **one review per business** (1–5 stars + comment). Their dashboard is just a "You're logged in as a customer" card with a Browse button. They cannot subscribe to plans.
- **Business owner** (`business_owner`): full dashboard to **add / edit / delete businesses** and to **subscribe businesses to paid plans**.
- **Super admin:** a dedicated `/superadmin` area managing all businesses, all users, and subscription analytics.

---

## 4. How the core product works: plans & ranking

Business owners pay (simulated) monthly plans that boost visibility everywhere:

| Plan | Price | Effect |
|---|---|---|
| **Basic** | 5,000 RWF/mo | Ranked above all free listings |
| **Standard** | 15,000 RWF/mo | Above Basic; gets a **"SPONSORED"** badge |
| **Premium** | 30,000 RWF/mo | Top placement everywhere, featured on the home page, **green highlighted card** + badge |

Ranking order everywhere: **Premium → Standard → Basic → free**, then verified status, then star rating. Plans last **30 days**; an expired plan silently ranks as free again (badges disappear — worth knowing on an old test database).

**Payment is simulated** — the Subscribe page says so on-screen. Confirming activates the plan instantly; there is no card form.

---

## 5. Screen-by-screen tour

### Home (`/`)
- **Hero search** — typing shows live suggestions (after a short pause); clicking one jumps straight to that business.
- **AI Recommendations card** — type a need in plain language (e.g. *"healthy lunch near Remera"*) and hit **Recommend**. You get up to 5 clickable business suggestions, each with a one-line reason.
- **Browse by Category** — tiles with live listing counts.
- **Featured Businesses** — a diverse strip: the top-rated business from each category, **plus** every business with an active paid plan added alongside them with a "Sponsored" badge (sponsors join the list, they don't replace it).

### Businesses (`/businesses`)
- Live search (no button needed), category dropdown, and city filter — all reflected in the URL, so links are shareable. 12 results per page.
- **Two display modes:** with no filters, results are **grouped by category** (the category with the strongest paid subscriber leads the page). Once you search or pick a category, it switches to a flat grid. This is intentional.
- Cards show a "SPONSORED" pill for paid plans and a **green ring for Premium**.

### Business detail (`/businesses/:id`)
Photo, verified check, rating, description, tap-to-call phone, email, and website links. **Reviews:** logged-in users get a 5-star picker + comment form (both required). A second review of the same business is rejected with *"You already reviewed this business."*

### Register (`/register`) & Login (`/login`)
Registration asks for name, email, password (min 6 chars) and — most importantly — an **Account Type**: *Customer* or *Business Owner*. That choice determines everything you can do afterwards. No email verification; you're logged in immediately.

### Top bar (logged in)
Once logged in, the Home / Businesses / Pricing menu disappears (it's for the landing pages only) and the top bar shows just a **round profile button with your initials**. Clicking it opens a card with your name, email, role badge, a **Dashboard** link for the roles that have one (Super Admin → `/superadmin`, Business Owner → `/dashboard`; customers see no dashboard link), and a **Logout** button.

### Dashboard (`/dashboard`) — owners
- A **left sidebar** lists each of your businesses with its current plan chip (Free / Basic / Standard / Premium) and an aggregated **Subscriptions** panel: active plans, monthly spend and all-time spend in RWF, plus a "Manage subscriptions" shortcut.
- A **Profile views** card shows a line chart of daily views of your business profiles over the last 30 days, with an all-time total. Views by the general public are counted when someone opens a business detail page; your own visits to your businesses (and admin visits) are not counted. Each business row also shows its view count.
- **+ Add Business** opens an inline form (Name, Description, Category, City are required; City pre-fills "Kigali").
- **My Businesses** lists your businesses with edit (pencil) and delete (trash) buttons.
- ⚠️ **Delete has no confirmation dialog** — one click removes the business (a soft delete: it disappears from all listings).

### Pricing (`/pricing`)
The three plan cards. "Choose plan" behaviour depends on who you are:
- Owner → goes to `/subscribe` with the plan pre-selected.
- Customer → silently bounced to `/dashboard` (no message — known quirk).
- Logged out → sent to login, and after logging in you land on `/dashboard`, **not** back on the plan — go back to Pricing yourself.

### Subscribe (`/subscribe`)
Three steps: **pick a business** (or register one right in the form), **pick a plan**, **confirm**. Success shows a green banner, and your **Active subscriptions** list below. Customers see a "Business owners only" dead end here.

### Super Admin (`/superadmin`)
A left icon rail (expands on hover) with three sections:
- **Businesses** — searchable, paginated table of all ~90+ businesses (10/page) with add/edit/delete. The Verified column is a green/grey dot — **read-only in the UI** (changeable only in the DB). Delete has no confirm here either.
- **Users** — every account with role badges (purple = admin, green = owner, grey = customer). **Click any row** for a modal showing that user's businesses, plans and ratings.
- **Subscriptions** — KPI tiles (active subs, monthly & all-time revenue), two **hover-interactive donut charts** by plan, a breakdown table, and the 10 most recent subscriptions. Empty until at least one business subscribes — so test subscribing first.

The super admin reaches `/superadmin` via the **Dashboard link in the profile menu** (top-right initials button), which always points back to the admin area.

---

## 6. The AI part

Home-page recommendations use **Google Gemini** (key: `SMARTBIZ_GEMINI_API_KEY` in `api/.env`) with Rwandan location awareness — it recognizes districts and Kigali sectors ("Remera" pools the whole Gasabo district but ranks sector matches first; "Kigali" spans all three Kigali districts).

**If the key is missing or over quota, it silently falls back** to a built-in keyword ranker — recommendations still appear, so their presence doesn't prove Gemini works. The tell: real AI gives natural sentences as reasons; the fallback gives the template *"Restaurants & Cafes in Gasabo — rated 4.5/5."* (The API logs `AI recommendation fallback: …` when degraded.)

Good prompts to try: *"healthy lunch near Remera"*, *"hotel in Musanze for gorilla trekking"*, *"pharmacy in Kicukiro"*, *"car wash in Gasabo"* — and *"ice skating rink"* to see the empty state.

---

## 7. Suggested end-to-end test sequence

1. **Setup** — migrate, run both seeds, confirm `PORT=5002`.
2. **As a visitor** — Home search suggestions → AI recommendations → a category tile → filters & pagination on `/businesses` → open a business → confirm the review form is absent.
3. **Register a Customer** → leave a review → try a second review on the same business (expect rejection) → click a Pricing plan (expect the silent bounce to `/dashboard`) → type `/superadmin` (expect bounce back).
4. **Register a Business Owner** → add a business → find it on `/businesses` → edit it → **subscribe it to Premium** → recheck `/businesses` and Home: it now has the green ring, "SPONSORED" pill, and top placement. Then delete a test business (remember: no confirmation).
5. **Log in as `seed.owner@smartbiz.rw`** to see a dashboard populated with all 90 businesses.
6. **Log in as `admin@smartbiz.rw`** → manage businesses (search, paginate, edit) → Users (search, open a row modal) → Subscriptions (KPIs and donut charts — populated because of step 4).
7. **Log out** — navbar reverts to Login/Register and protected URLs redirect to login.

That sequence exercises every screen, every role, and the full monetisation loop.
