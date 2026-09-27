# FinWise AI Backend

## Overview
This is the Node.js + Express + TypeScript backend foundation for FinWise AI.
The backend serves as the source of truth for all financial data, utilizing PostgreSQL and Prisma for robust, type-safe data modeling. It also features a fully functional, secure authentication system.

## Technology Stack
- **Runtime**: Node.js
- **Framework**: Express
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma (v5.22.0)
- **Validation**: Zod
- **Auth**: bcryptjs, jsonwebtoken

## Environment Setup
Create a `.env` file in the `backend/` directory:
```
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/FinWise?schema=public"
JWT_ACCESS_SECRET="your_secure_access_secret"
JWT_REFRESH_SECRET="your_secure_refresh_secret"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
```

## Development Commands
- **Install dependencies:** `npm install`
- **Run development server:** `npm run dev` (uses `tsx watch`)
- **Build for production:** `npm run build`
- **Start production server:** `npm run start`
- **Run tests:** `npx tsx tests/auth.test.ts`

## Prisma Commands & Migration Workflow
- Generate Client: `npm run prisma:generate`
- Validate Schema: `npx prisma validate`
- Format Schema: `npx prisma format`
- Apply Migrations: `npx prisma migrate dev --name <migration_name>`

## Authentication Endpoints
- `POST /api/auth/register` - Creates a new user and returns a token.
- `POST /api/auth/login` - Authenticates user, issues access token and sets refresh cookie.
- `POST /api/auth/refresh` - Issues a new access token using a valid HttpOnly refresh cookie.
- `POST /api/auth/logout` - Revokes current session and clears cookies.
- `POST /api/auth/logout-all` - Revokes all active sessions for the user.
- `GET /api/auth/me` - Retrieves the authenticated user profile.

## Cookie / Session Architecture
Authentication relies on short-lived Access Tokens (JWT) sent via the `Authorization` header, and long-lived Refresh Tokens stored in an `HttpOnly` cookie.
- **Refresh Token Storage**: The raw refresh token is securely stored in a `finwise_refresh` HttpOnly cookie. The database only stores a SHA-256 hash of this token (`refreshTokenHash`), protecting users even if the database is compromised.
- **Session Revocation**: A `Session` record tracks activity, expiration, and revocation status for each device logged in. Logging out actively marks the session as revoked in the database.

## Remember Me Behavior
During Login, the user can pass `rememberMe: true/false`.
- **ON**: The backend sets the refresh cookie `maxAge` to 7 days. The user remains authenticated across browser restarts.
- **OFF**: The backend sets the refresh cookie as a session cookie (no `maxAge`). The authentication naturally ends when the browser session ends or after 1 day internally.

## Security Notes
- **Passwords**: Hashed securely using `bcryptjs` (Node-native replacement used when Argon2 compilation is unavailable).
- **Rate Limiting**: Global API is limited to 100 requests / 15 min, and auth routes strictly limited to 20 requests / 15 min.
- **Helmet**: Adds security headers.
- **CORS**: Configured rigidly to only allow the predefined `FRONTEND_URL` with credentials. Wildcards are disabled.

## Multi-User Data Isolation
- Queries must always use the `req.user.id` resolved by `requireAuth` middleware to filter resources.
- `userId` is never trusted directly from `req.body` or `req.params`.
