# TripPlanner backend

The TripPlanner REST API, implemented with Express, TypeScript, Prisma, and
PostgreSQL. The API handles accounts, destinations, preferences and
recommendations, trips, reviews, expenses, and contact messages.

## Requirements

- Node.js and npm
- PostgreSQL

## Run locally

From this directory:

```powershell
npm ci
Copy-Item .env.example .env
```

Set `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` in `.env`.
The example file documents optional settings, including the frontend URL,
bootstrap super-admin email, and SMTP configuration.

Apply database migrations and load the sample catalog:

```powershell
npx prisma migrate deploy
npm run db:seed
```

Start the API with `npm run dev`. By default, it listens on port `3000`.
Configure SMTP settings if you want password-reset and contact emails to be
delivered.

## Validate

```powershell
npm run build
npm test
```
