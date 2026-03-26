# Technical Decisions

## Stack Choices

### FastAPI (Backend)
**Chose because:** Async-first with native Pydantic validation, eliminating manual input checking boilerplate. Auto-generates OpenAPI docs at `/docs` so reviewers can explore the API without reading code. SQLAlchemy 2.0 async works seamlessly with FastAPI's dependency injection.

**Trade-off:** Smaller ecosystem than Django. No built-in admin panel; ORM migrations require Alembic as a separate tool. For this scope, the speed advantage outweighs the missing batteries.

### Hexagonal Architecture (Ports & Adapters)
**Chose because:** Clean separation between domain logic and infrastructure. The domain layer (entities, services, ports) has zero framework dependencies. This means:
- Swapping Postgres for MongoDB → change only the outbound adapter
- Replacing SMTP with SendGrid → swap the email adapter
- Business rules (e.g., "invitation can only be declined if not already used") live in domain services, not in API routes

**Structure:**
```
backend/
  domain/
    entities/       → Pure Python dataclasses (Driver, Vehicle, Campaign, Invitation, User)
    services/       → Business logic — zero DB or framework imports
    ports/          → Abstract interfaces (DriverRepository, EmailPort, etc.)
  adapters/
    inbound/
      api/          → FastAPI route handlers
      schemas/      → Pydantic request/response models with validation
      auth/         → JWT token creation + dependency for protected routes
    outbound/
      persistence/
        models/     → SQLAlchemy ORM models
        repositories/ → Concrete implementations of port interfaces
        database.py → Engine, session factory, Base
      email/
        smtp_adapter.py → SMTP implementation of EmailPort
```

**Why this matters:** The invitation decline feature demonstrates this well. The domain service (`invitation_service.py`) defines rules: "you can't decline a used invitation" and "you can't use a declined invitation." These rules are tested without any database — the tests use the real HTTP layer but the logic is infrastructure-agnostic.

**Trade-off:** More files and indirection than a flat structure. Overkill for 5 endpoints, but demonstrates production architecture thinking and makes the codebase navigable for new developers.

### React Native Web with Expo (Frontend)
**Chose because:** Wrapped Media is a vehicle wrap advertising company — their driver sign-up flow is primarily mobile. Expo with React Native Web was chosen specifically because:

1. **Mobile-first by design** — React Native's layout model (Flexbox, `View`/`Text` primitives) naturally produces mobile-optimized interfaces without media queries
2. **Single codebase, multiple targets** — The same screens can compile to iOS and Android apps via `expo build` if the startup needs native apps later. No rewrite required.
3. **Expo Router** — File-based routing (`app/login.tsx`, `app/signup.tsx`) matches Next.js conventions, making the project instantly navigable
4. **Web deployment** — `react-native-web` compiles React Native components to standard HTML/CSS, so the app runs in any browser today

**Why not plain React + Vite?**
A standard React app would be simpler for the admin dashboard (tables, charts), but the driver-facing flow (signup, vehicle registration) is the core product. Optimizing for mobile-first on the driver flow is more important than developer convenience on the admin side.

**Trade-off:** The dashboard fights React Native's layout model (no `<table>` element, no CSS Grid). I worked around this with flex layouts and horizontal scroll for narrow viewports. In production, I'd split the dashboard into a separate React app.

### NativeWind / Tailwind CSS (Styling)
**Chose because:** Tailwind's utility-first approach matches the Wrapped Media brand design (dark theme, lime-green accents, bold uppercase typography). NativeWind v2 bridges Tailwind classes into React Native's StyleSheet system.

**Reality:** NativeWind's `className` prop didn't reliably apply to all React Native components (`TextInput`, `TouchableOpacity`) on web. I created a shared `theme.ts` with a centralized design system using React Native `StyleSheet` — same dark theme, same colors, but with reliable cross-platform rendering.

**Design system (`src/theme.ts`):**
- `colors` — Lime (#CCFF00), dark palette (#0A0A0A → #333333), neutrals, semantic (red for errors, lime for success)
- `shared` — Reusable styles: `card`, `input`, `buttonPrimary`, `buttonOutline`, `errorBox`, `label`, `heading`
- `webSelectStyle` / `webDateStyle` / `webInputStyle` — CSS styles for HTML `<select>`, `<input type="date">` elements

### Redux Toolkit (State Management)
**Chose because:** Predictable state management with built-in immutability via Immer. Specifically used for:

1. **Auth token management** — Single source of truth for JWT token
2. **Persistence** — Token saved to `localStorage` on login, loaded on app start. This means the dashboard survives page refresh without re-authentication.
3. **Logout propagation** — `dispatch(logout())` clears both Redux state and localStorage in one action

**Why not React Context?** Context re-renders every consumer on any state change. With Redux, only components that `useAppSelector` for specific slices re-render. Also, Redux DevTools provide time-travel debugging.

### MailHog (Email Testing)
**Chose because:** The invitation flow requires sending emails with signup links. MailHog runs as a Docker container that:
- Catches all SMTP email on port 1025 (no emails leave the system)
- Provides a web UI at http://localhost:8069 to view sent emails
- Zero configuration — no SendGrid API keys, no email accounts needed

**How it integrates:**
- `SmtpEmailAdapter` implements the `EmailPort` interface (hexagonal architecture)
- Sends to `mailhog:1025` (Docker network hostname)
- In production, swap the adapter to SendGrid/SES — domain service unchanged

### PostgreSQL (over SQLite)
**Chose because:** Production thinking:
1. Concurrent write safety — multiple drivers signing up simultaneously won't hit SQLite's single-writer lock
2. Real migration tooling with Alembic (4 migrations: initial schema, users, invitations, declined column)
3. UUID primary keys work natively
4. Closer to what a real logistics startup would run

**Trade-off:** Requires Docker (extra container), vs SQLite which is just a file. Docker Compose absorbs this cost.

### Docker Compose with 4 Containers
**Chose because:** "Must run with a single command." Docker Compose guarantees this regardless of the reviewer's local Python/Node/Postgres versions.

**Container breakdown:**
| Container  | Image              | Purpose                                  | Volumes                          |
|------------|--------------------|------------------------------------------|----------------------------------|
| `db`       | postgres:16-alpine | Database with health check               | `pgdata` named volume            |
| `backend`  | python:3.11-slim   | FastAPI + Alembic migrations + seed      | Bind mount for hot reload        |
| `frontend` | node:18-alpine     | Expo web app                             | Bind mount + anonymous node_modules |
| `mailhog`  | mailhog/mailhog    | SMTP catch-all + web UI                  | None (stateless)                 |

**Startup sequence:** `db` (with healthcheck) → `mailhog` → `backend` (runs `alembic upgrade head && python seed.py && uvicorn`) → `frontend`

---

## Database Design

### Schema (4 migrations)

Five tables: `campaigns`, `drivers`, `vehicles`, `users`, `invitations`.

**Migration history:**
1. `initial_schema` — campaigns, drivers, vehicles tables
2. `add_users_table` — users table for admin auth
3. `add_invitations_table` — invitations with token, used/used_at
4. `add_declined_to_invitations` — declined/declined_at columns

**campaigns.campaign_id vs campaigns.id:**
The `campaign_id` column (e.g., "fb_spring_2026") is the human-readable string used in invitation links. The `id` column is a UUID primary key for foreign key references. Marketing can create descriptive slugs without worrying about database internals.

**drivers.campaign_id is nullable:**
NULL means the driver arrived organically or the ref didn't match. We NEVER block a sign-up over a bad campaign reference — acquiring a driver is more valuable than perfect attribution.

**No stored "completed" boolean:**
A driver is "completed" if they have at least one vehicle with `insurance_expiry >= today`. Calculated dynamically because completion status changes as insurance expires.

**invitations table:**
- `token` (UUID, unique, indexed) — Link token sent to driver
- `used` / `used_at` — Marked when driver completes signup
- `declined` / `declined_at` — Marked when driver explicitly declines
- `campaign_id` (FK) — Links invitation to campaign for conversion tracking

---

## Key Design Decisions

### Invitation-Based Driver Onboarding
Instead of open sign-up URLs, drivers receive invitation emails:
1. Admin sends invitation from dashboard (email + campaign)
2. Backend creates invitation record, sends email via SMTP
3. Email contains link: `frontend/signup?token={uuid}`
4. Driver clicks link → frontend validates token (public endpoint) → pre-fills email
5. Driver completes signup → token marked as used
6. Or driver clicks "Decline Invitation" → token marked as declined

**Why:** Prevents spam sign-ups, enables accurate per-invitation conversion tracking, and gives drivers explicit opt-out.

### Decline Invitation Feature
Drivers can decline invitations, which:
- Marks the invitation as `declined=true` with timestamp
- Prevents the token from being used for signup afterward
- Shows declined count per campaign in the dashboard
- Factors into conversion rate calculation (lowers the rate)
- Shows "Invitation Declined" confirmation screen

**State machine:** An invitation can only be in one final state:
```
PENDING → USED (driver signed up)
PENDING → DECLINED (driver declined)
USED → cannot decline
DECLINED → cannot use or re-decline
```

### Conversion Rate Calculation
```
conversion_rate = completed_signups / total_invitations_sent
```
If no invitations tracked, falls back to `completed_signups / total_signups`.
If denominator is 0, returns 0.0.

Declined invitations **lower the conversion rate**, giving admins a true picture of campaign effectiveness. A campaign with 10 invites, 3 completions, and 5 declines shows 30%.

### JWT Authentication
- **Protected endpoints:** GET /api/campaigns (stats), GET /api/drivers/{id}, POST /api/invitations
- **Public endpoints:** POST /api/drivers (signup), POST /api/drivers/{id}/vehicles, GET /api/invitations/{token}/validate, POST /api/invitations/{token}/decline, GET /api/campaigns/refs
- Token persisted to `localStorage` — dashboard survives page refresh
- Expired/invalid tokens → 401, missing tokens → 403

### "Completed Sign-Up" Definition
A driver counts as "completed" when they have **at least one vehicle** where `insurance_expiry >= today`.

Edge cases:
- 3 vehicles (2 expired, 1 valid) → 1 completed (COUNT DISTINCT on driver_id)
- 0 vehicles → not completed
- All expired → not completed

---

## Frontend Design

### Wrapped Media Branding
- Dark theme (#0A0A0A background, #1A1A1A cards, #333333 borders)
- Lime-green accent (#CCFF00) matching the Wrapped Media website
- Bold condensed uppercase typography for headings
- Wrapped Media logo centered at top of every screen
- Outlined CTA buttons with lime border for secondary actions

### Responsive Layout
- Driver forms: max-width 440px centered, full-width on mobile
- Dashboard: max-width 960px centered
- Campaign table: flex layout on desktop, horizontal scroll on mobile (<700px breakpoint via `useWindowDimensions`)
- All touch targets minimum 48px height for mobile usability

### Validation Strategy (Defense in Depth)
Both frontend AND backend validate — frontend for UX, backend for security:

| Field              | Frontend                              | Backend                        |
|--------------------|---------------------------------------|--------------------------------|
| Phone              | Strips non-digits, exactly 10 digits, maxLength=10 | 7-15 digits (more permissive) |
| Email              | Regex pattern on change               | Pydantic EmailStr              |
| Insurance expiry   | `min` attr = tomorrow, future-only    | Date type (Pydantic)           |
| Vehicle year       | Select dropdown 1990-2027             | 1900-2027 range validator      |
| Names              | Required, max 255, trim               | Same validators in Pydantic    |
| Invitation email   | Inline regex validation on dashboard  | Pydantic EmailStr              |

---

## Test Strategy

### Backend Tests (66 tests, pytest + httpx AsyncClient)

**Infrastructure:** Separate `driver_onboarding_test` database. Tables created before each test, dropped after. Tests use `httpx.AsyncClient` with `ASGITransport` — no actual HTTP server needed.

| Test File             | Tests | What's Covered                                                    |
|-----------------------|-------|-------------------------------------------------------------------|
| `test_health.py`      | 2     | Root endpoint, DB health check                                    |
| `test_auth.py`        | 11    | Register, login, duplicate, bad password, JWT enforcement on 3 protected endpoints |
| `test_drivers.py`     | 15    | CRUD, campaign linking, validation (10 edge cases), whitespace trimming, 404/422 |
| `test_vehicles.py`    | 13    | Create, multiple, boundary years (1900/2027), missing fields, nonexistent driver |
| `test_campaigns.py`   | 9     | Public refs, stats fields, signups/completed counting, expired insurance, date filters |
| `test_invitations.py` | 16    | Create, validate, used-after-signup, **decline** (6 tests), **conversion rate with declined** (2 tests) |

**Key test for the decline feature:**
`test_conversion_rate_accounts_for_declined` — Creates 2 invitations for the same campaign, completes 1, declines 1. Asserts conversion rate = 0.5 (not 1.0).

---

## Scaling Considerations

### What works at current scale (5 campaigns, <1000 drivers)
- Single Postgres instance handles all queries
- Dashboard query loops per campaign — acceptable with 5
- No caching needed
- MailHog sufficient for dev/testing

### What breaks at growth (50+ campaigns, 100K+ drivers)
- **Dashboard query**: Per-campaign loop → single aggregated SQL with JOINs and GROUP BY
- **Connection pooling**: Add PgBouncer for concurrent load
- **Caching**: Redis with 30-60 second TTL for dashboard stats
- **Rate limiting**: Per-IP middleware on signup endpoint
- **Pagination**: Cursor-based for campaigns and drivers
- **Email**: Replace MailHog with SendGrid/SES + background job queue (Celery/ARQ)

### What I'd add with more time
- E2E tests with Playwright for the full invitation → signup → vehicle → dashboard flow
- CI/CD pipeline with GitHub Actions
- Email normalization (lowercase before uniqueness check)
- WebSocket real-time dashboard updates
- Campaign CRUD API (currently seed-only)
- API versioning (/api/v1/)

---

## Known Limitations

1. No rate limiting — bots could spam sign-ups
2. No email verification during sign-up
3. Dashboard has no pagination (fine for 5 campaigns, not for 500)
4. No real-time updates on dashboard (requires manual refresh)
5. Campaign management is seed-only — no CRUD API
6. Insurance validation is date-only — no document verification
7. Single backend instance — no horizontal scaling config
8. NativeWind className partially applied — some screens use inline StyleSheet for reliability with react-native-web
