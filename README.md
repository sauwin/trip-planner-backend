# TripPlanner Backend

REST API for **TripPlanner**, a travel-planning application with destination discovery, preference-based recommendations, trip planning and expense tracking. The API is implemented with Express, TypeScript, Prisma and PostgreSQL and is consumed by the [frontend](../trip-planner-frontend/).

## About

The backend exposes JSON endpoints under `/api`. It handles authentication and roles, the destination catalog, user preferences and activity, recommendations, reviews, trips and expenses, admin tools, and contact messages. Request bodies and query parameters are validated before they reach the application services.

## Features

- Account registration, login, logout, current-user lookup, access-token refresh and password reset
- `USER`, `ADMIN` and `SUPER_ADMIN` roles, with role checks on protected API routes
- Destination listing, search and details; admin create, update and delete operations
- Destination feature catalog, preference management and personalized recommendations
- User interactions: views, likes, ratings and saved destinations
- Destination reviews and moderation by administrators
- Trip planning with ordered destinations, planned dates and accommodation details
- Per-trip expenses in transport, food, activities and other categories
- Super-admin management of administrator roles and paginated audit history
- Contact form endpoint with email delivery when SMTP is configured
- PostgreSQL schema managed with Prisma migrations; sample catalog loaded by the seed script

## Roles

| Role | Value | API access |
| ---- | ----- | ---------- |
| User | `USER` | Authenticated user features, including preferences, recommendations, trips and reviews |
| Admin | `ADMIN` | User features plus destination management and review moderation |
| Super Admin | `SUPER_ADMIN` | Admin features plus admin-role management and audit history |

Authorization is enforced by backend middleware on protected routes. The frontend also applies route guards, but those guards are not a substitute for API authorization.

## Tech Stack

| Layer | Technology | What it is used for |
| ----- | ---------- | ------------------- |
| Runtime | Node.js | Runs the API server |
| Language | TypeScript | Application and API implementation |
| HTTP | Express 5 | REST routes and middleware |
| Database | PostgreSQL | Persistent application data |
| ORM | Prisma 7 | Database schema, migrations and queries |
| Validation | Zod | Request validation |
| Authentication | JSON Web Token, bcrypt | Signed access/refresh tokens and password hashing |
| Security | Helmet, CORS, express-rate-limit | HTTP security headers, origin policy and request limits |
| Email | Nodemailer | Password-reset and contact email delivery |
| Tests | Vitest, Supertest | Unit and API tests |

## Data Model

The Prisma schema defines 13 models and 4 enums. Its models cover users, administrator audit events, destinations and features, user preferences and interactions, reviews, trips and trip destinations, password-reset tokens, and expenses. Relations and constraints are defined in [`prisma/schema.prisma`](./prisma/schema.prisma); migration files are in [`prisma/migrations/`](./prisma/migrations/).

The seed script upserts the recommendation categories, features and sample destinations. Destination recommendation features can have primary or secondary weights.

## Project Structure

```text
trip-planner-backend/
├── prisma/
│   ├── migrations/             # Database migrations
│   ├── schema.prisma           # Prisma data model
│   ├── seed.ts                 # Sample recommendation catalog
│   └── ERD.svg                 # Generated entity-relationship diagram
├── scripts/                    # Supporting scripts
├── src/
│   ├── config/                 # Application configuration
│   ├── controllers/            # HTTP request handlers
│   ├── data/                   # Recommendation catalog data
│   ├── generated/              # Generated Prisma client
│   ├── lib/                    # Shared clients and utilities
│   ├── middleware/             # Authentication, validation, errors and limits
│   ├── repositories/           # Database access
│   ├── routes/                 # Express route definitions
│   ├── schemas/                # Zod request schemas
│   ├── services/               # Application and domain logic
│   ├── app.ts                  # Express application and route mounting
│   └── index.ts                # Server startup
├── tests/                      # Vitest and API tests
├── prisma.config.ts            # Prisma CLI configuration
└── .env.example                # Environment variable template
```

## API Routes

All routes are prefixed with `/api`.

| Route group | Purpose |
| ----------- | ------- |
| `/health` | Health check |
| `/auth` | Registration, login, refresh, logout, password reset and current user |
| `/destinations` | Destination listing, search, details and admin management |
| `/feature-categories` | Recommendation catalog metadata |
| `/preferences` | Read and save user preferences |
| `/recommendations` | Personalized destination recommendations |
| `/interactions` | Record and query user-destination interactions |
| `/trips` | Trips, trip destinations and nested trip expenses |
| `/reviews` | Destination reviews |
| `/admin` | Super-admin user-role management and audit history |
| `/contact` | Contact form submission |

## Getting Started

### Requirements

- Node.js and npm
- PostgreSQL

### Run locally

From this directory:

```powershell
npm ci
Copy-Item .env.example .env
```

Set `DATABASE_URL`, `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `.env`. Configure the database URL in Prisma's expected `postgresql://...` format. Review the other values in `.env.example` as needed, then apply migrations, seed the catalog and start the development server:

```powershell
npx prisma migrate deploy
npm run db:seed
npm run dev
```

The seed script also removes feature and category records that are no longer in the current catalog. Cascading deletes can remove their destination-feature assignments and user preferences, so rerun it only where that cleanup is intended; back up production data first.

The API listens on port `3000` by default. `PORT` can change this. Set `FRONTEND_URL` to the frontend origin if it differs from `http://localhost:5173`. Configure SMTP variables to deliver password-reset and contact emails; without a working SMTP configuration, email delivery is unavailable.

### Configuration

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `DATABASE_URL` | — | PostgreSQL connection URL |
| `PORT` | `3000` | HTTP server port |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |
| `SUPER_ADMIN_EMAIL` | — | Email address granted the super-admin role when the account exists or registers |
| `JWT_ACCESS_SECRET` | — | Secret used to sign access tokens |
| `JWT_REFRESH_SECRET` | — | Secret used to sign refresh tokens; use a different value from the access-token secret |
| `JWT_ACCESS_EXPIRES` | `15m` | Access-token lifetime |
| `JWT_REFRESH_EXPIRES` | `7d` | Refresh-token lifetime |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | See `.env.example` | SMTP connection and sender configuration |
| `PASSWORD_RESET_EXPIRES_MIN` | `30` | Password-reset link lifetime in minutes |
| `CONTACT_EMAIL` | `SMTP_USER` | Inbox for contact-form messages |

Do not commit `.env` or use example secrets in a deployed environment.

## Authentication and Security

- Passwords are hashed before storage; the API issues signed access and refresh tokens.
- Access-token and refresh-token lifetimes are configurable using the `JWT_*` variables.
- Refresh tokens are checked against the user's `sessionVersion`; it is incremented on logout, password reset and role changes to invalidate existing refresh tokens. Access tokens do not include this version and can remain valid until they expire.
- Authentication, role authorization, request validation, CORS, security headers and rate limits are applied by server middleware and routes.
- The super-admin bootstrap runs during server startup using `SUPER_ADMIN_EMAIL`.

## Super-admin Audit History

The audit history records destination creation, updates and deletion, review moderation, and admin-role additions and removals. Entries are written in the same database transaction as each action and remain available if the related user or destination is later deleted. The API returns the history newest-first using cursor pagination.

Deployments must apply all pending Prisma migrations, including the migration that adds the audit log:

```powershell
npx prisma migrate deploy
```

## Testing

### Build and tests

```powershell
npm run build
npm test
```

`npm run build` runs the TypeScript compiler. `npm test` runs the Vitest suite once.

### Useful scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Run the API with automatic restart during development |
| `npm run build` | Compile TypeScript into `dist/` |
| `npm start` | Run the compiled API |
| `npm run db:seed` | Seed the recommendation catalog |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
