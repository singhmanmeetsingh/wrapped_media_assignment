# Driver Onboarding App — Step-by-Step Build Plan

---

## PHASE 1: DOCKER + PROJECT SCAFFOLDING

### Step 1.1: Create project root
- Create `driver-onboarding/` folder
- Run `git init`
- Create `.gitignore` covering:
  - Python: `__pycache__/`, `*.pyc`, `.venv/`, `*.db`
  - Node: `node_modules/`, `.expo/`, `dist/`, `web-build/`
  - Docker: `pgdata/`
  - IDE: `.vscode/`, `.idea/`
  - Env: `.env`

### Step 1.2: Create backend Dockerfile
- Base image: `python:3.11-slim`
- Install system deps: `gcc`, `libpq-dev` (needed for asyncpg)
- Set working directory: `/app`
- Copy `requirements.txt`, run `pip install`
- Copy all source code
- Expose port 8000
- Default CMD: `uvicorn main:app --host 0.0.0.0 --port 8000`

### Step 1.3: Create backend requirements.txt
- `fastapi==0.115.0`
- `uvicorn[standard]==0.30.0`
- `sqlalchemy[asyncio]==2.0.35`
- `asyncpg==0.29.0`
- `alembic==1.13.0`
- `pydantic[email]==2.9.0`
- `pydantic-settings==2.5.0`
- `python-dateutil==2.9.0`
- `httpx==0.27.0`
- `pytest==8.3.0`
- `pytest-asyncio==0.24.0`

### Step 1.4: Create backend placeholder main.py
- Minimal FastAPI app that returns `{"message": "API is running"}` on GET `/`
- This is temporary — just to verify the container starts

### Step 1.5: Create frontend Dockerfile
- Base image: `node:18-alpine`
- Set working directory: `/app`
- Copy `package.json` and lock file, run `npm install`
- Copy all source code
- Expose port 3000
- CMD: `npx expo start --web --port 3000`

### Step 1.6: Initialize frontend project
- Create `package.json` with Expo dependencies:
  - `expo`, `react`, `react-dom`, `react-native`, `react-native-web`
  - `@react-navigation/native`, `@react-navigation/native-stack`
  - `recharts` (for dashboard chart)
  - `react-native-safe-area-context`, `react-native-screens`
- Create minimal `App.tsx` that renders "Hello World"
- Create `app.json` with Expo config (name, web bundler)
- Create `babel.config.js` and `tsconfig.json`

### Step 1.7: Create .dockerignore files
- `backend/.dockerignore`: `__pycache__`, `*.pyc`, `.pytest_cache`, `.venv`, `*.db`
- `frontend/.dockerignore`: `node_modules`, `.expo`, `dist`, `web-build`

### Step 1.8: Create docker-compose.yml
- Service `db`:
  - Image: `postgres:16-alpine`
  - Environment: `POSTGRES_USER=driver_app`, `POSTGRES_PASSWORD=driver_app_dev`, `POSTGRES_DB=driver_onboarding`
  - Ports: `5432:5432`
  - Healthcheck: `pg_isready -U driver_app -d driver_onboarding` every 5s, 5 retries, 10s start period
  - Volume: `pgdata:/var/lib/postgresql/data` — NAMED VOLUME for database persistence
- Service `backend`:
  - Build from `./backend`
  - Ports: `8000:8000`
  - Depends on `db` with condition `service_healthy`
  - Environment: `DATABASE_URL`, `CORS_ORIGINS=http://localhost:3000`
  - Volume: `./backend:/app` — BIND MOUNT for hot reload (local code changes reflected instantly)
  - Command: `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- Service `frontend`:
  - Build from `./frontend`
  - Ports: `3000:3000`
  - Depends on `backend`
  - Environment: `EXPO_PUBLIC_API_URL=http://localhost:8000`
  - Volume: `./frontend:/app` — BIND MOUNT for hot reload
  - Volume: `/app/node_modules` — ANONYMOUS VOLUME to protect container's node_modules from being overwritten by the bind mount
- Declared volumes: `pgdata`

### Step 1.8a: Understand the 3 types of volumes in this project

There are 3 different volume types serving 3 different purposes:

**1. Named volume — `pgdata:/var/lib/postgresql/data` (db service)**
- Purpose: DATABASE PERSISTENCE
- What it does: Postgres stores all data files here. Without this volume, every `docker-compose down` followed by `docker-compose up` would wipe all drivers, vehicles, and campaigns
- Survives: `docker-compose down` (data kept) 
- Destroyed by: `docker-compose down -v` (the -v flag deletes named volumes)
- Declared in top-level `volumes:` section of docker-compose.yml

**2. Bind mounts — `./backend:/app` and `./frontend:/app` (backend + frontend services)**
- Purpose: HOT RELOAD during development
- What they do: Map your local source code directory directly into the container. When you edit `main.py` on your machine, the file inside the container changes too. Uvicorn and Expo detect the change and auto-restart/refresh
- Without these: You'd need to run `docker-compose build` after every code change
- Production note: REMOVE these in production Dockerfiles — production containers should be self-contained with code baked in at build time

**3. Anonymous volume — `/app/node_modules` (frontend service only)**
- Purpose: PROTECT container's node_modules
- What it does: The bind mount `./frontend:/app` maps your entire local frontend folder into the container, which would overwrite the container's `/app/node_modules` (installed during `docker build`). This anonymous volume tells Docker to keep the container's own node_modules intact
- Why only frontend: The backend uses pip which installs to system Python paths, not inside `/app`. The frontend's node_modules lives inside `/app` and would get clobbered by the bind mount without this protection
- Common symptom without it: "Module not found" errors because the container's node_modules gets replaced by your local (possibly empty or wrong-platform) node_modules

**Full docker-compose.yml volumes section:**
```yaml
services:
  db:
    volumes:
      - pgdata:/var/lib/postgresql/data       # Named volume — DB persistence

  backend:
    volumes:
      - ./backend:/app                         # Bind mount — hot reload

  frontend:
    volumes:
      - ./frontend:/app                        # Bind mount — hot reload
      - /app/node_modules                      # Anonymous volume — protect deps

volumes:
  pgdata:                                      # Declare named volume
```

**Document in DECISIONS.md:** In production, remove the bind mounts. The Dockerfile `COPY . .` bakes code into the image at build time. The pgdata named volume stays — you always need database persistence. The anonymous node_modules volume also goes away since there's no bind mount to conflict with.

### Step 1.9: Create .env.example and configure environment variables

The project uses environment variables to connect the 3 containers to each other. The docker-compose.yml sets all of them with working defaults — the reviewer should NEVER need to create a `.env` file.

**Create `.env.example` file in project root (for documentation only):**

```
# ──────────────────────────────────────────
# Database (db container)
# ──────────────────────────────────────────
POSTGRES_USER=driver_app
POSTGRES_PASSWORD=driver_app_dev
POSTGRES_DB=driver_onboarding

# ──────────────────────────────────────────
# Backend (backend container)
# ──────────────────────────────────────────
# Connection string to Postgres. Uses "db" as hostname because
# that's the service name in docker-compose — Docker's internal
# DNS resolves "db" to the Postgres container's IP.
DATABASE_URL=postgresql+asyncpg://driver_app:driver_app_dev@db:5432/driver_onboarding

# Comma-separated list of allowed frontend origins for CORS.
# Must match the URL the browser uses to access the frontend.
CORS_ORIGINS=http://localhost:3000

# "development" enables hot reload and verbose logging.
ENVIRONMENT=development

# ──────────────────────────────────────────
# Frontend (frontend container)
# ──────────────────────────────────────────
# The URL the browser uses to call the backend API.
# NOTE: This is http://localhost:8000 (not http://backend:8000)
# because the BROWSER makes the request, not the container.
# The browser is on the host machine, which accesses the backend
# through the published port 8000.
EXPO_PUBLIC_API_URL=http://localhost:8000
```

**How the environment variables flow between containers:**

```
┌──────────────────────────────────────────────────────────────┐
│  docker-compose.yml sets these env vars:                      │
│                                                               │
│  db container:                                                │
│    POSTGRES_USER=driver_app                                   │
│    POSTGRES_PASSWORD=driver_app_dev                           │
│    POSTGRES_DB=driver_onboarding                              │
│    ↓ Postgres reads these and creates the user + database     │
│                                                               │
│  backend container:                                           │
│    DATABASE_URL=postgresql+asyncpg://driver_app:driver_app_dev│
│                  @db:5432/driver_onboarding                   │
│    ↑ "db" = hostname of the Postgres container (Docker DNS)   │
│    ↑ Credentials must match POSTGRES_USER/PASSWORD above      │
│    ↑ Database name must match POSTGRES_DB above               │
│                                                               │
│    CORS_ORIGINS=http://localhost:3000                          │
│    ↑ Must match where the browser loads the frontend from     │
│                                                               │
│  frontend container:                                          │
│    EXPO_PUBLIC_API_URL=http://localhost:8000                   │
│    ↑ NOT http://backend:8000 — the browser can't resolve      │
│      Docker container hostnames. The browser is on the host   │
│      machine and reaches the backend via published port 8000  │
└──────────────────────────────────────────────────────────────┘
```

**Common mistakes to watch for:**
1. `DATABASE_URL` uses `db` as the hostname (the docker-compose service name), NOT `localhost`. The backend container talks to the db container over Docker's internal network.
2. `EXPO_PUBLIC_API_URL` uses `localhost:8000`, NOT `backend:8000`. The frontend runs in the BROWSER on the reviewer's machine, not inside the container. The browser doesn't know about Docker hostnames.
3. `CORS_ORIGINS` must match the frontend URL exactly — `http://localhost:3000` (not https, not port 3001, not missing the protocol).
4. The `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` values in the db service must match the credentials in `DATABASE_URL`. If they don't, the backend can't connect.
5. The `EXPO_PUBLIC_` prefix is required by Expo — without it, the env var is not available in the frontend JavaScript code.

**Where each service reads its env vars:**
- `db` → Postgres reads `POSTGRES_*` vars automatically on startup
- `backend` → `config.py` reads `DATABASE_URL`, `CORS_ORIGINS`, `ENVIRONMENT` via pydantic-settings
- `frontend` → Expo exposes `EXPO_PUBLIC_*` vars to JavaScript via `process.env`

**Testing env vars are correct:**
After containers start:
```bash
# Verify backend can read its config
docker-compose exec backend python -c "from config import settings; print(settings.DATABASE_URL)"

# Verify Postgres credentials work
docker-compose exec db psql -U driver_app -d driver_onboarding -c "SELECT 1;"

# Verify frontend env var
docker-compose exec frontend sh -c "echo $EXPO_PUBLIC_API_URL"
```

### Step 1.10: Verify everything starts
- Run `docker-compose up --build`
- Check: Postgres logs show "ready to accept connections"
- Check: `curl http://localhost:8000` returns the placeholder JSON
- Check: Frontend dev server starts on port 3000
- Fix any startup errors before moving on

### Step 1.11: Commit
```
git add -A
git commit -m "chore: project scaffolding with Docker (3 containers)"
```

---

## PHASE 2: DATABASE SCHEMA + MIGRATIONS

### Step 2.1: Create database connection module
- File: `backend/database.py`
- Create async SQLAlchemy engine from `DATABASE_URL` env var
- Create `async_sessionmaker` with `AsyncSession`
- Create `Base` class (DeclarativeBase)
- Create `get_db()` async generator for FastAPI dependency injection
- The session should `expire_on_commit=False` so returned objects remain usable

### Step 2.2: Create config module
- File: `backend/config.py`
- Use `pydantic-settings` `BaseSettings` class
- Fields: `DATABASE_URL`, `CORS_ORIGINS`, `ENVIRONMENT`
- All have defaults matching docker-compose values
- Load from `.env` file if present

### Step 2.3: Create Campaign model
- File: `backend/models/campaign.py`
- Table name: `campaigns`
- Columns:
  - `id`: UUID primary key, default `uuid.uuid4`
  - `campaign_id`: String(100), unique, not null, indexed — THIS IS THE ?ref= VALUE
  - `name`: String(255), not null
  - `source`: String(50), not null — values like "facebook", "google", "referral"
  - `created_at`: DateTime, not null, default `utcnow`
- Relationship: `drivers` back_populates "campaign"

### Step 2.4: Create Driver model
- File: `backend/models/driver.py`
- Table name: `drivers`
- Columns:
  - `id`: UUID primary key, default `uuid.uuid4`
  - `full_name`: String(255), not null
  - `email`: String(255), unique, not null, indexed
  - `phone`: String(20), not null
  - `license_number`: String(50), not null
  - `license_state`: String(50), not null
  - `campaign_id`: UUID, ForeignKey to campaigns.id, NULLABLE
  - `created_at`: DateTime, not null, default `utcnow`, INDEXED (dashboard filters by this)
- Relationships:
  - `campaign` back_populates "drivers"
  - `vehicles` back_populates "driver", cascade "all, delete-orphan"

### Step 2.5: Create Vehicle model
- File: `backend/models/vehicle.py`
- Table name: `vehicles`
- Columns:
  - `id`: UUID primary key, default `uuid.uuid4`
  - `driver_id`: UUID, ForeignKey to drivers.id with `ondelete="CASCADE"`, not null
  - `make`: String(100), not null
  - `model`: String(100), not null
  - `year`: Integer, not null
  - `insurance_policy_number`: String(100), not null
  - `insurance_expiry`: Date, not null
  - `created_at`: DateTime, not null, default `utcnow`
- Relationship: `driver` back_populates "vehicles"

### Step 2.6: Create models __init__.py
- Import all 3 models so Alembic can discover them

### Step 2.7: Initialize Alembic
- Run `alembic init alembic` inside backend container
- Edit `alembic.ini`: set `sqlalchemy.url` to empty (will be overridden)
- Edit `alembic/env.py`:
  - Import `settings.DATABASE_URL`
  - Import `Base.metadata` from database module
  - Set `target_metadata = Base.metadata`
  - Make sure all models are imported

### Step 2.8: Generate initial migration
- Run `alembic revision --autogenerate -m "initial schema"`
- Verify the migration creates all 3 tables with correct columns, indexes, foreign keys
- Review manually — check UUID defaults, indexes, cascade rules

### Step 2.9: Run migration
- Run `alembic upgrade head`
- Verify tables exist in Postgres

### Step 2.10: Commit
```
git commit -m "feat: database schema with Alembic migrations"
```

### Step 2.11: Create seed script
- File: `backend/seed.py`
- Define 5 campaigns:
  - `fb_spring_2026` / "Spring Driver Push" / facebook
  - `goog_march_2026` / "Google March Campaign" / google
  - `ref_bonus_2026` / "Referral Bonus Program" / referral
  - `tt_viral_2026` / "TikTok Viral Campaign" / tiktok
  - `email_win_2026` / "Email Win-Back Campaign" / email
- MUST BE IDEMPOTENT: check if campaign_id exists before inserting each one
- Can be run standalone: `python seed.py`

### Step 2.12: Update docker-compose backend command
- Change to: `sh -c "alembic upgrade head && python seed.py && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"`
- Runs migrations → seeds → starts server on every container start
- All idempotent, safe to repeat

### Step 2.13: Verify seed
- `docker-compose up --build`
- `docker-compose exec db psql -U driver_app -d driver_onboarding -c "SELECT * FROM campaigns;"`
- Should see 5 rows
- Restart container — still exactly 5 rows

### Step 2.14: Commit
```
git commit -m "feat: idempotent seed script with 5 campaigns"
```

---

## PHASE 3: BACKEND API

### Step 3.1: Create Pydantic schemas for drivers
- File: `backend/schemas/driver.py`
- `DriverCreate` with validators:
  - `full_name`: strip whitespace, reject empty, max 255
  - `email`: EmailStr (Pydantic validates format)
  - `phone`: strip, count digits, reject if <7 or >15, store original formatting
  - `license_number`: strip, reject empty
  - `license_state`: strip, reject empty
  - `ref`: Optional[str] = None
- `DriverResponse` with `model_config = {"from_attributes": True}`
- `DriverDetailResponse` extending DriverResponse with vehicles list

### Step 3.2: Create Pydantic schemas for vehicles
- File: `backend/schemas/vehicle.py`
- `VehicleCreate` with validators:
  - `make`: strip, reject empty, max 100
  - `model`: strip, reject empty, max 100
  - `year`: must be 1900-2027 inclusive
  - `insurance_policy_number`: strip, reject empty, max 100
  - `insurance_expiry`: date type (Pydantic parses YYYY-MM-DD)
- `VehicleResponse`

### Step 3.3: Create Pydantic schemas for campaigns
- File: `backend/schemas/campaign.py`
- `DailySignupCount`: date (str), count (int)
- `CampaignStats`: id, campaign_id, name, source, total_signups, completed_signups, conversion_rate, signups_over_time
- `CampaignListResponse`: campaigns list

### Step 3.4: Commit
```
git commit -m "feat: Pydantic request/response schemas with validation"
```

### Step 3.5: Create driver service
- File: `backend/services/driver_service.py`
- `create_driver(db, data)`:
  1. If ref provided → look up campaign by campaign_id string
  2. Found → use campaign UUID. Not found → set NULL, log warning
  3. No ref → NULL
  4. Check email uniqueness → raise custom error if duplicate
  5. Insert driver, commit, return
- `get_driver(db, driver_id)`:
  1. Query by UUID, eager load vehicles
  2. Not found → raise error
  3. Return driver with vehicles

### Step 3.6: Create driver route
- File: `backend/routes/drivers.py`
- `POST /api/drivers`: validate body → call service → handle DuplicateEmail (409) → return 201
- `GET /api/drivers/{driver_id}`: parse UUID → call service → handle NotFound (404) → return 200

### Step 3.7: Verify driver endpoints
- `docker-compose up --build`
- Test with curl:
  ```
  curl -X POST http://localhost:8000/api/drivers \
    -H "Content-Type: application/json" \
    -d '{"full_name":"Jane","email":"jane@test.com","phone":"5551234567","license_number":"DL123","license_state":"California","ref":"fb_spring_2026"}'
  ```
- Verify 201 response with campaign_id populated
- Test with unknown ref → 201 with campaign_id null
- Test duplicate email → 409

### Step 3.8: Commit
```
git commit -m "feat: POST /api/drivers — driver sign-up endpoint"
```

### Step 3.9: Create vehicle service
- File: `backend/services/vehicle_service.py`
- `create_vehicle(db, driver_id, data)`:
  1. Check driver exists → raise NotFound if not
  2. Create vehicle, commit, return

### Step 3.10: Create vehicle route
- File: `backend/routes/vehicles.py`
- `POST /api/drivers/{driver_id}/vehicles`: parse UUID → validate body → call service → handle NotFound (404) → return 201

### Step 3.11: Verify vehicle endpoint
- Use driver UUID from step 3.7
- ```
  curl -X POST http://localhost:8000/api/drivers/{UUID}/vehicles \
    -H "Content-Type: application/json" \
    -d '{"make":"Toyota","model":"Camry","year":2022,"insurance_policy_number":"POL-123","insurance_expiry":"2027-06-15"}'
  ```
- Verify 201 response
- Test with nonexistent driver → 404
- Test with invalid year → 422

### Step 3.12: Commit
```
git commit -m "feat: POST /api/drivers/{id}/vehicles — vehicle registration"
```

### Step 3.13: Create campaign service
- File: `backend/services/campaign_service.py`
- `get_campaign_stats(db, start_date, end_date)`:
  1. Fetch all campaigns
  2. For each campaign calculate:
     - **total_signups**: COUNT drivers where campaign matches AND created_at in range
     - **completed_signups**: COUNT DISTINCT drivers who have ≥1 vehicle with insurance_expiry >= today AND campaign matches AND created_at in range
     - **conversion_rate**: completed/total, or 0.0 if total is 0
     - **signups_over_time**: GROUP BY date, COUNT per day
  3. Return all campaigns (even with 0 sign-ups)

- CRITICAL QUERIES:
  - completed must use `COUNT(DISTINCT d.id)` not `COUNT(*)` — a driver with 3 valid vehicles counts as 1
  - insurance check is `v.insurance_expiry >= CURRENT_DATE` — dynamic, not stored
  - date range on `d.created_at`, NOT `campaign.created_at`
  - end_date should include the full day (add 1 day or use `<= end_date 23:59:59`)

### Step 3.14: Create campaign route
- File: `backend/routes/campaigns.py`
- `GET /api/campaigns`: parse start_date, end_date query params → validate range → call service → return 200

### Step 3.15: Verify campaign endpoint
- ```
  curl http://localhost:8000/api/campaigns
  ```
- Should see all 5 campaigns with the sign-up from step 3.7 counted
- Test with date range: `curl "http://localhost:8000/api/campaigns?start_date=2026-01-01&end_date=2026-12-31"`
- Test invalid range: start > end → 422

### Step 3.16: Commit
```
git commit -m "feat: GET /api/campaigns — dashboard analytics with date filter"
```

### Step 3.17: Create health route
- File: `backend/routes/health.py`
- `GET /api/health`: try SELECT 1 → 200 healthy or 503 unhealthy

### Step 3.18: Wire up main.py
- Import all routers
- Add CORS middleware with origins from settings
- Add global exception handler
- Include all routers with /api prefix

### Step 3.19: Commit
```
git commit -m "feat: health check and FastAPI app wiring with CORS"
```

---

## PHASE 4: FRONTEND

### Step 4.0: Understand the two separate user flows

This app serves TWO different audiences with different screens and design needs:

**DRIVER FLOW (public, mobile-first):**
These screens are what drivers see on their phones after clicking a campaign ad (Facebook, Google, etc). Design for small screens — single column, large touch targets, full-width inputs, keyboard-aware scrolling.
```
/signup?ref=...  → SignUpScreen (driver enters personal info)
/vehicle/:id     → VehicleScreen (driver registers vehicle)
/success         → SuccessScreen (confirmation, driver is done)
```
The driver never sees the dashboard. Their journey ends at the success screen.

**ADMIN DASHBOARD (internal, desktop-first):**
This screen is for the startup's internal team — marketing managers, ops leads — who want to see which campaigns are performing well. Design for wide screens — data tables, charts, date filters, dense analytics layout.
```
/dashboard       → DashboardScreen (campaign analytics)
```
Drivers never access this route. In production, this would be behind authentication. For the MVP, it's unprotected (noted in DECISIONS.md as a known limitation).

**Why this matters for implementation:**
- SignUpScreen, VehicleScreen, SuccessScreen → use ScrollView, mobile padding, stacked vertical layout, touch-friendly input heights (44px minimum), phone/email keyboard types
- DashboardScreen → use wide table layout, horizontal data display, recharts for visualization, date range pickers, no mobile keyboard concerns

### Step 4.1: Set up navigation
- File: `App.tsx`
- Configure React Navigation with web URL linking
- Routes: `/signup`, `/vehicle/:driverId`, `/success`, `/dashboard`
- Linking config so URL params work in browser
- NOTE: No navigation link between the driver flow and the dashboard — they are separate user journeys

### Step 4.2: Commit
```
git commit -m "feat: navigation setup with web URL routing"
```

### Step 4.3: Create TypeScript types
- File: `frontend/src/types/index.ts`
- Interfaces matching all backend schemas:
  - DriverInput, DriverResponse, DriverDetailResponse
  - VehicleInput, VehicleResponse
  - DailySignupCount, CampaignStats, CampaignListResponse
  - ApiError

### Step 4.4: Create API client
- File: `frontend/src/api/client.ts`
- Base URL from env var with fallback
- Generic request function with:
  - JSON content type
  - 10-second timeout (AbortController)
  - Error parsing (status + detail)
- Exported functions: createDriver, createVehicle, getCampaigns, getDriver

### Step 4.5: Create shared components
- `FormInput.tsx` — text input with label, error state, red border on error, 44px min height
- `StateDropdown.tsx` — US states + Canadian provinces, sorted, with placeholder
- `DatePickerInput.tsx` — cross-platform date picker (HTML input on web)
- `LoadingSpinner.tsx` — centered ActivityIndicator with optional message

### Step 4.6: Create validation utils
- File: `frontend/src/utils/validation.ts`
- Functions: validateEmail, validatePhone, validateRequired, validateYear
- Return error message string or null

### Step 4.7: Commit
```
git commit -m "feat: shared components, API client, types, validation utils"
```

### Step 4.8: Build SignUpScreen (DRIVER-FACING, MOBILE-FIRST)
- Audience: Drivers on their phones clicking campaign ads
- Design: Single column, large inputs (44px height), full-width buttons, mobile keyboard handling
- Extract ?ref= from URL on mount (Linking API)
- 5 form fields: name, email, phone, license number, license state dropdown
- Inline validation on blur for each field
- Submit button disabled until all fields filled
- On submit: loading state → POST /api/drivers → navigate to vehicle screen
- Handle errors: 409 → "email already registered", 422 → field errors, network → banner
- Prevent double submit: disable button on first tap
- Mobile-first: ScrollView with keyboardShouldPersistTaps="handled", full-width fields, safe area padding

### Step 4.9: Commit
```
git commit -m "feat: SignUpScreen with validation and ref param capture"
```

### Step 4.10: Build VehicleScreen (DRIVER-FACING, MOBILE-FIRST)
- Audience: Same driver, continuing from sign-up on their phone
- Design: Same mobile-first layout as SignUpScreen
- Get driverId from nav params, redirect to signup if missing
- Fetch driver name on mount, show "Hi, Jane!"
- 5 fields: make, model, year dropdown (2027→1990), policy number, expiry date picker
- On submit: POST /api/drivers/{id}/vehicles → show success
- "Add Another Vehicle" button after first success — clears form
- "Finish" button → navigates to success (only enabled after ≥1 vehicle)
- Track and display vehicle count
- Preserve form data on error

### Step 4.11: Commit
```
git commit -m "feat: VehicleScreen with multi-vehicle registration"
```

### Step 4.12: Build SuccessScreen
- Static screen: green checkmark, "You're All Set!", driver name, vehicle count
- No API calls, just display data from nav params

### Step 4.13: Commit
```
git commit -m "feat: SuccessScreen confirmation"
```

### Step 4.14: Build DashboardScreen (ADMIN-FACING, DESKTOP-FIRST)
- Audience: Internal team (marketing, ops) viewing campaign performance on laptop/desktop
- Design: Wide layout, data table with multiple columns, charts, date range pickers
- NOT part of the driver flow — drivers never see this screen
- In production this would be behind authentication (noted as known limitation)
- Fetch campaigns on mount (no date filter = all time)
- Date range filter: two date pickers + Apply button + Clear button
- Campaign table:
  - Columns: name, source (colored badge), total, completed, conversion rate
  - Conversion rate color coded: red <20%, yellow 20-50%, green >50%
  - Show all campaigns even with 0 sign-ups
  - 0 total → "0.0%" not "NaN%"
- Sign-ups over time chart:
  - recharts LineChart, one line per campaign
  - Tooltip, legend, responsive
  - Empty state: "No sign-ups in this date range"
- Loading skeleton while fetching
- Error state with retry button

### Step 4.15: Commit
```
git commit -m "feat: DashboardScreen with campaign table and chart"
```

### Step 4.16: End-to-end verification
- `docker-compose up --build`
- Walk through: signup → vehicle → success → dashboard
- Test edge cases: empty fields, duplicate email, missing ref, direct URL access
- Fix anything broken

### Step 4.17: Commit fixes
```
git commit -m "fix: [description of what was fixed]"
```

---

## PHASE 5: TESTS

### Step 5.1: Set up backend test infrastructure
- File: `backend/tests/conftest.py`
- Create separate test database: `driver_onboarding_test`
- Fixtures:
  - `db_session` — clean DB per test (create tables before, drop after)
  - `client` — httpx AsyncClient with DB override
  - `seed_campaigns` — insert 2 test campaigns
  - `create_test_driver` — helper to create driver via API

### Step 5.2: Write driver tests
- File: `backend/tests/test_drivers.py`
- Happy path: success, valid ref, unknown ref (still creates), no ref, empty ref
- Validation 422: missing name, empty name, invalid email, missing email, short phone, missing phone, missing license number, empty license number, missing license state, name too long
- Conflict 409: duplicate email
- Data: trims whitespace, phone with formatting allowed
- GET: success, includes vehicles, not found (404), invalid UUID (422)

### Step 5.3: Commit
```
git commit -m "test: driver sign-up endpoint tests"
```

### Step 5.4: Write vehicle tests
- File: `backend/tests/test_vehicles.py`
- Happy path: success, correct driver_id in response, multiple vehicles
- Validation 422: missing make, empty make, missing model, missing year, year 1899 (too low), year 2028 (too high), year 1900 (boundary ok), year 2027 (boundary ok), missing policy, empty policy, missing expiry, invalid date
- Allowed: past insurance expiry, special chars in make, numbers in model
- Not found: nonexistent driver (404), invalid UUID (422)

### Step 5.5: Commit
```
git commit -m "test: vehicle registration endpoint tests"
```

### Step 5.6: Write campaign tests
- File: `backend/tests/test_campaigns.py`
- Need careful setup: create drivers on specific dates, vehicles with specific expiry dates
- Retrieval: returns all campaigns, zero signups still listed
- Counting: total correct, completed with valid insurance, expired not counted, no vehicles not counted, multiple vehicles one valid counts as 1, multiple all expired counts as 0, organic driver not in any campaign
- Conversion: correct calculation, zero total = 0.0, all completed = 1.0
- Date filtering: range works, start only, end only, invalid range (422), no results in range
- Signups over time: aggregation correct, respects date filter

### Step 5.7: Commit
```
git commit -m "test: campaign dashboard endpoint tests"
```

### Step 5.8: Write health test
- `test_health_check_healthy` → 200

### Step 5.9: Set up frontend test infrastructure
- Install: jest, @testing-library/react-native, @testing-library/jest-native
- Mock API client
- Mock navigation (useNavigation, useRoute)

### Step 5.10: Write SignUpScreen tests
- Renders all fields, submit disabled when empty, enabled when filled
- Shows email error, required field error, duplicate email error (409), network error
- Navigates on success, disables during submission, re-enables on error

### Step 5.11: Write VehicleScreen tests
- Renders all fields, redirects without driver_id
- Shows driver name, add another clears form, finish navigates
- Vehicle count updates, shows field errors

### Step 5.12: Write DashboardScreen tests
- Renders table, shows loading, shows empty state
- Date filter triggers refetch, conversion rate shows percentage
- Zero conversion shows "0.0%", handles API error with retry

### Step 5.13: Write validation utility tests
- Valid/invalid email, empty email
- Valid phone formats, too short phone
- Required: empty fails, whitespace fails, valid passes

### Step 5.14: Commit
```
git commit -m "test: frontend component and validation tests"
```

### Step 5.15: Run ALL tests, fix failures
- `docker-compose exec backend pytest tests/ -v`
- `docker-compose exec frontend npm test -- --watchAll=false`
- Every test must pass

### Step 5.16: Commit fixes
```
git commit -m "fix: resolve test failures"
```

---

## PHASE 6: DOCUMENTATION

### Step 6.1: Write SETUP.md

This file must be SHORT, SCANNABLE, and WORK PERFECTLY the first time the reviewer tries it. No walls of text.

**Exact structure to generate:**

```markdown
# Driver Onboarding App

## Prerequisites

- Docker Desktop (v4.0+) with Docker Compose

That's it. No Python, Node, or Postgres installation needed.

## Quick Start

git clone <repo> && cd driver-onboarding
docker-compose up --build

First run takes 2-3 minutes (building images, installing dependencies).
Subsequent runs take ~10 seconds.

## What Starts

| Service   | URL                        | Purpose                    |
|-----------|----------------------------|----------------------------|
| Frontend  | http://localhost:3000       | Driver sign-up + dashboard |
| Backend   | http://localhost:8000       | REST API                   |
| API Docs  | http://localhost:8000/docs  | Auto-generated Swagger UI  |
| Postgres  | localhost:5432              | Database                   |

The backend automatically runs database migrations and seeds 5
sample campaigns on first startup.

## Try It Out

1. Sign up as a driver:
   http://localhost:3000/signup?ref=fb_spring_2026

2. Register a vehicle (after sign-up)

3. View the campaign dashboard:
   http://localhost:3000/dashboard

### Available Campaign Refs

Use these as the ?ref= parameter:

| Ref Parameter     | Campaign Name            | Source   |
|-------------------|--------------------------|----------|
| fb_spring_2026    | Spring Driver Push       | facebook |
| goog_march_2026   | Google March Campaign    | google   |
| ref_bonus_2026    | Referral Bonus Program   | referral |
| tt_viral_2026     | TikTok Viral Campaign    | tiktok   |
| email_win_2026    | Email Win-Back Campaign  | email    |

## Run Tests

# Backend tests
docker-compose exec backend pytest tests/ -v

# Frontend tests
docker-compose exec frontend npm test -- --watchAll=false

## Stop

docker-compose down

## Full Reset (wipe database)

docker-compose down -v
docker-compose up --build
```

**Key points:**
- Reviewer should go from clone to running app in ONE command
- No .env file creation needed — defaults work out of the box
- Table of campaign refs lets them test immediately
- Test commands are copy-pasteable
- The Swagger UI link (FastAPI auto-generates this) is a bonus that shows professionalism

### Step 6.2: Commit
```
git commit -m "docs: add SETUP.md with single-command setup"
```

---

### Step 6.3: Write DECISIONS.md

This file shows the reviewer HOW YOU THINK. Every decision should follow the pattern: what you chose → why → what you traded off → what you'd do differently at scale.

**Exact structure to generate:**

```markdown
# Technical Decisions

## Stack Choices

### FastAPI (Backend)
**Chose because:** Async-first with native support for Pydantic
validation, which eliminates manual input checking boilerplate.
Auto-generates OpenAPI docs at /docs — the reviewer can explore
the API without reading code.

**Trade-off:** Smaller ecosystem than Django. No built-in admin
panel, ORM migrations require Alembic as a separate tool. For
this scope, the speed advantage outweighs the missing batteries.

### React Native Web with Expo (Frontend)
**Chose because:** The assignment says the sign-up flow is "mostly
used on phones." React Native Web compiles to mobile-optimized
web views from a single codebase. If the startup later wants a
native iOS/Android app, the screens are already built.

**Trade-off:** Heavier toolchain than plain React + Vite. The
dashboard (a desktop-first tool) fights React Native's layout
model — a standard React app with a table library would have
been simpler for that one screen. I accepted this trade-off to
keep a single codebase.

**What I'd change:** In a real project, I'd split the dashboard
into a separate React app (internal tool) and keep React Native
only for the driver-facing flow.

### PostgreSQL (over SQLite)
**Chose because:** The assignment allows SQLite, but I chose
Postgres to demonstrate production thinking:
1. Concurrent write safety — multiple drivers signing up
   simultaneously won't hit SQLite's single-writer lock
2. Real migration tooling with Alembic
3. UUID primary keys work natively (SQLite requires extensions)
4. Closer to what a real logistics startup would run

**Trade-off:** Requires Docker (an extra container), vs SQLite
which is just a file. Docker Compose absorbs this cost — the
reviewer runs one command either way.

### Docker with 3 Containers
**Chose because:** The assignment requires "must run with a single
command." Docker Compose guarantees this regardless of the
reviewer's local Python/Node versions. Each service is isolated
and independently restartable.

**Container breakdown:**
- `db` — Postgres 16, with a named volume (`pgdata`) so data
  survives restarts. Only destroyed with `docker-compose down -v`
- `backend` — FastAPI on Python 3.11, bind-mounted for hot reload
  during development. In production, code is baked into the image
- `frontend` — Expo on Node 18, bind-mounted for hot reload.
  Anonymous volume on `/app/node_modules` prevents the host bind
  mount from overwriting container-installed dependencies

**Trade-off:** First build takes 2-3 minutes. Subsequent starts
are ~10 seconds. Acceptable for a take-home; a Makefile with
local Python/Node would be faster but brittle across environments.

---

## Database Design

### Schema

Three tables: `campaigns`, `drivers`, `vehicles`.

**campaigns.campaign_id vs campaigns.id:**
The `campaign_id` column (e.g., "fb_spring_2026") is the
human-readable string used in URLs (?ref=fb_spring_2026). The
`id` column is a UUID primary key used for foreign key
references. This separation means marketing can create
descriptive campaign slugs without worrying about database
internals, and renaming a campaign doesn't break driver links.

**drivers.campaign_id is nullable:**
A NULL campaign means either:
- The driver arrived organically (no ?ref= param in URL)
- The ?ref= value didn't match any known campaign

We NEVER block a sign-up over a bad campaign reference. Acquiring
a driver is more valuable than tracking attribution perfectly.
The unknown ref is logged as a warning for debugging.

**No stored "completed" boolean:**
A driver is "completed" if they have at least one vehicle with
`insurance_expiry >= today`. This is calculated dynamically in
the dashboard query rather than stored as a flag. Reason: a
driver's completion status changes over time as insurance
expires. A stored flag would require a daily batch job to update,
adding complexity for no benefit at this scale.

**Indexes:**
- `campaigns.campaign_id` — indexed for fast ref lookup during
  sign-up
- `drivers.email` — unique index for duplicate detection
- `drivers.created_at` — indexed for dashboard date range queries

### Seed Data
Five campaigns covering common channels: Facebook, Google,
Referral, TikTok, Email. The seed script is idempotent — safe to
run on every container start without duplicating data.

---

## Key Design Decisions

### Campaign Tracking Flow
1. Marketing creates URLs: `app.com/signup?ref=fb_spring_2026`
2. Frontend extracts the `ref` query parameter on page load
3. Backend receives `ref` in the sign-up POST body
4. Backend looks up campaigns WHERE `campaign_id = ref`
5. If found → links driver to campaign via UUID foreign key
6. If not found → creates driver anyway with NULL campaign
7. Dashboard aggregates sign-ups per campaign for conversion analysis

### "Completed Sign-Up" Definition
A driver counts as "completed" when they have **at least one
vehicle** where `insurance_expiry >= today`.

Edge cases handled:
- Driver with 3 vehicles (2 expired, 1 valid) → counts as 1
  completed (not 3 — we COUNT DISTINCT on driver_id)
- Driver with 0 vehicles → not completed
- Driver with all expired vehicles → not completed
- Insurance expires tomorrow → still completed today, not
  tomorrow

### Conversion Rate
`completed_signups / total_signups` per campaign.
If total is 0 → returns 0.0 (not NaN or divide-by-zero error).

---

## Scaling Considerations

### What works at current scale (5 campaigns, <1000 drivers)
- Single Postgres instance handles all queries efficiently
- Single backend instance handles concurrent sign-ups
- Dashboard query runs per-campaign loop — acceptable with 5 campaigns
- No caching needed

### What breaks at growth (50+ campaigns, 100K+ drivers)
- **Dashboard query**: Currently loops per campaign with multiple
  queries each. Needs rewrite to single aggregated SQL with JOINs
  and GROUP BY
- **Connection pooling**: No PgBouncer — Postgres will hit
  max_connections under heavy concurrent load
- **Caching**: Dashboard hits DB on every load. Add Redis with
  30-60 second TTL
- **Rate limiting**: No protection against spam sign-ups. Add
  per-IP rate limiting middleware
- **Pagination**: GET /api/campaigns returns everything. Add
  cursor-based pagination
- **Background jobs**: Email confirmations, insurance
  verification would need Celery/ARQ + Redis

### What I'd add with more time
- **Authentication**: Dashboard is unprotected. Add JWT or
  session-based auth for internal tools
- **Email normalization**: Lowercase emails before uniqueness
  check (currently case-sensitive)
- **E2E tests**: Playwright or Cypress for the full signup →
  vehicle → dashboard flow
- **CI/CD**: GitHub Actions running tests on every push
- **Input sanitization**: XSS protection on frontend display
- **Monitoring**: Request logging middleware with structured
  JSON logs, health check alerting
- **API versioning**: /api/v1/ prefix for future breaking changes

---

## Known Limitations

1. No authentication on any endpoint
2. No rate limiting — bots could spam sign-ups
3. No email verification during sign-up
4. Frontend state is lost on page refresh during sign-up flow
   (driver_id stored in navigation state, not persisted)
5. Dashboard has no pagination (fine for 5 campaigns, not for 500)
6. No WebSocket/real-time updates on dashboard
7. Campaign management is seed-only — no CRUD API for campaigns
8. Insurance validation is date-only — no document verification
9. Single backend instance — no horizontal scaling configuration
10. Test database requires separate Postgres instance or transaction
    rollback strategy
```

**Why this structure works for the reviewer:**
- Shows you think beyond the assignment scope
- Every "trade-off" section proves you didn't just follow a tutorial
- The scaling section shows you understand production concerns
- "Known limitations" shows honesty — you know what's missing and chose not to build it

### Step 6.4: Commit
```
git commit -m "docs: add DECISIONS.md with technical rationale"
```

---

### Step 6.5: Write PROMPTS.md

This is the most unique deliverable. The reviewer wants to see:
1. How you prompted AI tools
2. Whether you caught mistakes
3. Whether you understand what was generated

**DO NOT fabricate this file.** Fill it in DURING your Claude Code session, not after. Copy-paste actual prompts and note actual problems.

**Structure to follow:**

```markdown
# AI Prompts & Workflow

## Tool Used

Claude Code (Anthropic CLI agent) — interactive terminal session.

## Approach

I used a detailed project plan document as my starting context,
then fed Claude Code one phase at a time. After each phase, I
verified the output manually before moving to the next.

---

## Session Log

### Prompt 1: Project Scaffolding (Phase 1)
**What I asked:**
> [Paste your exact Phase 1 prompt here]

**What Claude Code generated:**
- docker-compose.yml with 3 services
- Dockerfiles for backend and frontend
- .gitignore, .dockerignore files

**What worked:**
- [e.g., "Docker configuration was correct on the first try,
  all three containers started without errors"]

**What I had to fix:**
- [e.g., "The frontend Dockerfile was missing the --legacy-peer-deps
  flag on npm install, causing dependency conflicts"]
- [e.g., "The anonymous volume for node_modules was not included,
  causing 'Module not found' errors"]

---

### Prompt 2: Database Schema (Phase 2)
**What I asked:**
> [Paste your exact prompt]

**What worked:**
- [e.g., "SQLAlchemy models were well-structured with correct
  relationships and cascade rules"]

**What I had to fix:**
- [e.g., "Alembic env.py was configured for synchronous SQLAlchemy
  but we're using async — had to switch to async engine in the
  migration runner"]

---

### Prompt 3: Backend API (Phase 3)
**What I asked:**
> [Paste your exact prompt]

**What worked:**
- [list specifics]

**What I had to fix:**
- [list specifics]

**What I caught that could have been a bug:**
- [e.g., "The campaign dashboard query was counting vehicles
  instead of distinct drivers for completed sign-ups. A driver
  with 3 valid vehicles would have counted as 3 completions
  instead of 1. I caught this during curl testing and corrected
  the query to use COUNT(DISTINCT d.id)"]

---

### Prompt 4: Frontend (Phase 4)
[Same pattern]

### Prompt 5: Tests (Phase 5)
[Same pattern]

### Prompt 6: Documentation (Phase 6)
[Same pattern]

---

## Summary

### Where AI helped most
- Boilerplate generation: Dockerfiles, SQLAlchemy models, Pydantic
  schemas, and route wiring were correct and saved significant time
- Test scaffolding: generating the test file structure and fixture
  setup was faster than writing from scratch
- [Add your actual observations]

### Where AI led me astray
- [e.g., "Generated SQLite connection code initially despite
  being told to use Postgres — had to explicitly correct"]
- [e.g., "The conversion rate query had a subtle bug counting
  vehicles instead of distinct drivers"]
- [e.g., "Frontend date picker component didn't work on web
  platform — had to replace with HTML input fallback"]
- [Add your actual observations]

### What I verified manually
- Every API endpoint tested with curl before building frontend
- Ran the full signup → vehicle → dashboard flow end-to-end
- Checked conversion rate math with known test data
- Verified idempotent seed script by running it twice
- Confirmed database persistence across container restarts
- [Add your actual verification steps]

### Time breakdown
- Phase 1 (Scaffolding): ~X min
- Phase 2 (Database): ~X min
- Phase 3 (Backend API): ~X min
- Phase 4 (Frontend): ~X min
- Phase 5 (Tests): ~X min
- Phase 6 (Docs): ~X min
- Debugging/fixing AI output: ~X min
- Total: ~X hours
```

**Key rules for PROMPTS.md:**
1. Be HONEST — don't pretend AI was perfect or that you caught every bug
2. Be SPECIFIC — "fixed a bug" is weak; "the query used COUNT(*) instead of COUNT(DISTINCT d.id) for completed signups" is strong
3. Include the ACTUAL prompts — reviewers want to see how you communicate with AI tools
4. Show VERIFICATION — every fix you describe should explain how you caught it (curl, test, visual check)
5. Include a time breakdown — shows you're self-aware about your process

**What the reviewer is looking for:**
- Can you direct AI effectively? (good prompts = good output)
- Can you catch when AI generates bugs? (the real skill)
- Do you understand what was generated? (not just copy-paste)
- Are you honest about the process? (fabricated PROMPTS.md is obvious)

### Step 6.6: Commit
```
git commit -m "docs: add PROMPTS.md documenting AI workflow"
```

### Step 6.7: Final review
- `docker-compose down -v` (clean slate — -v removes pgdata volume too)
- `docker-compose up --build` (fresh start)
- Checklist:
  1. App starts with one command? ✓/✗
  2. Sign-up works at /signup?ref=fb_spring_2026? ✓/✗
  3. Vehicle registration works? ✓/✗
  4. Dashboard shows data? ✓/✗
  5. Date filter works? ✓/✗
  6. All tests pass? ✓/✗
  7. SETUP.md is accurate? ✓/✗
  8. DECISIONS.md is thoughtful? ✓/✗
  9. DB persistence: sign up a driver, run `docker-compose down` then `docker-compose up` — driver data still there? ✓/✗
  10. DB reset: run `docker-compose down -v` then `docker-compose up --build` — clean slate, only seed data? ✓/✗
  11. Hot reload: edit a backend file locally — does uvicorn auto-restart? ✓/✗
  12. Hot reload: edit a frontend file locally — does Expo refresh? ✓/✗

### Step 6.8: Create git bundle
```
git bundle create your-name.bundle --all
```

---

## COMPLETE COMMIT HISTORY

```
 1. chore: project scaffolding with Docker (3 containers)
 2. feat: database schema with Alembic migrations
 3. feat: idempotent seed script with 5 campaigns
 4. feat: Pydantic request/response schemas with validation
 5. feat: POST /api/drivers — driver sign-up endpoint
 6. feat: POST /api/drivers/{id}/vehicles — vehicle registration
 7. feat: GET /api/campaigns — dashboard analytics with date filter
 8. feat: health check and FastAPI app wiring with CORS
 9. feat: navigation setup with web URL routing
10. feat: shared components, API client, types, validation utils
11. feat: SignUpScreen with validation and ref param capture
12. feat: VehicleScreen with multi-vehicle registration
13. feat: SuccessScreen confirmation
14. feat: DashboardScreen with campaign table and chart
15. test: driver sign-up endpoint tests
16. test: vehicle registration endpoint tests
17. test: campaign dashboard endpoint tests
18. test: frontend component and validation tests
19. fix: resolve test failures
20. docs: add SETUP.md
21. docs: add DECISIONS.md
22. docs: add PROMPTS.md
```
