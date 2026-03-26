# Driver Onboarding App

## Prerequisites

- Docker Desktop (v4.0+) with Docker Compose

That's it. No Python, Node, or Postgres installation needed.

## Quick Start

```bash
git clone <repo> && cd driver-onboarding
docker-compose up --build
```

First run takes 2-3 minutes (building images, installing dependencies).
Subsequent runs take ~10 seconds.

## What Starts

| Service  | URL                       | Purpose                              |
|----------|---------------------------|--------------------------------------|
| Frontend | http://localhost:3000      | Driver sign-up + admin dashboard     |
| Backend  | http://localhost:8000      | REST API                             |
| API Docs | http://localhost:8000/docs | Auto-generated Swagger UI            |
| MailHog  | http://localhost:8069      | Email inbox (view invitation emails) |
| Postgres | localhost:5435             | Database                             |

The backend automatically runs database migrations and seeds 5 sample campaigns on startup.

## Try It Out

### Admin Flow

1. **Register an admin account:**
   http://localhost:3000/register

2. **Login and view the dashboard:**
   http://localhost:3000/dashboard

3. **Send a driver invitation** from the dashboard (email + campaign)

4. **View the invitation email** at http://localhost:8069 (MailHog)

### Driver Flow

5. **Click the invitation link** in the MailHog email — it opens the signup form with pre-filled email

6. **Complete the signup** (name, phone, license)

7. **Register a vehicle** (make, model, year, insurance)

8. **Check the dashboard** — campaign stats, conversion rates, and sign-up charts update in real-time

### Driver Can Also Decline

- On the signup page, drivers see a **Decline Invitation** button
- Declined invitations are tracked and shown in the dashboard
- Conversion rate accounts for declined invitations

### Available Campaign Refs

| Ref Parameter   | Campaign Name           | Source   |
|-----------------|-------------------------|----------|
| fb_spring_2026  | Spring Driver Push      | facebook |
| goog_march_2026 | Google March Campaign   | google   |
| ref_bonus_2026  | Referral Bonus Program  | referral |
| tt_viral_2026   | TikTok Viral Campaign   | tiktok   |
| email_win_2026  | Email Win-Back Campaign | email    |

## Run Tests

```bash
# Backend tests (66 tests)
docker-compose exec backend pytest tests/ -v

# Create test DB first (one-time)
docker-compose exec db psql -U driver_app -d postgres -c "CREATE DATABASE driver_onboarding_test OWNER driver_app;"
```

## Stop

```bash
docker-compose down
```

## Full Reset (wipe database)

```bash
docker-compose down -v
docker-compose up --build
```

## Running Tests Locally (Outside Docker)

If you prefer to run tests on your host machine instead of inside the Docker container, follow these steps:

### 1. Start the database

```bash
cd driver-onboarding
docker compose up -d db
```

### 2. Create the test database (one-time)

```bash
docker compose exec db psql -U driver_app -d driver_onboarding -c "CREATE DATABASE driver_onboarding_test;"
```

### 3. Install Python dependencies

```bash
cd driver-onboarding/backend
pip install -r requirements.txt
```

### 4. Set environment variables

The Docker DB is exposed on port **5435** locally, but the default config points to `db:5432` (Docker internal hostname). Override it:

```bash
export DATABASE_URL="postgresql+asyncpg://driver_app:driver_app_dev@localhost:5435/driver_onboarding"
export SMTP_HOST=localhost
export SMTP_PORT=1026
```

### 5. Run the tests

```bash
cd driver-onboarding/backend

# Run all tests
pytest -v

# Run a specific test file
pytest -v tests/test_auth.py

# Run a single test function
pytest -v tests/test_auth.py::test_function_name
```
