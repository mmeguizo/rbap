# AGENTS.md — RBAP IDM

## Repository layout

Entrypoint is the monorepo root. Active code lives in three sibling directories:

| Directory | Tech | Purpose |
|---|---|---|
| `backend/` | NestJS v11 + TypeScript + Prisma v7 + PostgreSQL | Main API |
| `frontend/` | Angular v20 + CoreUI | Legacy frontend (port 4200) |
| `frontend_react/` | React 19 + Vite + Tailwind v4 + shadcn/ui | New frontend (port 5173) |

`shadcn/vite-monorepo/` is an experimental Turbo monorepo scaffold, not wired into the main app.

## Backend — commands (run from `backend/`)

| Command | What |
|---|---|
| `npm run start:dev` | Start dev server with watch |
| `npm run lint` | ESLint + Prettier fix |
| `npm run test` | Jest unit tests (`src/**/*.spec.ts`) |
| `npm run test:e2e` | Jest e2e tests (`test/*.e2e-spec.ts`) |
| `npm run test:api:audit` | Playwright API audit (`test/playwright/`) |
| `npm run seed` | Seed DB via `prisma/seed.ts` |
| `npx prisma migrate dev` | Apply Prisma migrations |

No root-level scripts. Each sub-project manages its own dependencies (`npm install` inside each).

## API architecture

- Global prefix: `/api/v1`
- Swagger docs: `/api/docs` (requires `SWAGGER_ENABLED=true` + basic auth via `SWAGGER_USER`/`SWAGGER_PASSWORD`)
- Env config: `backend/.env`
- Global `ValidationPipe` with `whitelist: true` strips unknown fields
- CORS allows both Angular (`:4200`) and React (`:5173`) origins
- Root `/` redirects to Swagger

## Prisma

- Schema: `backend/prisma/schema.prisma`
- All Prisma queries must use `select` — never return raw rows
- Never call `findMany` without `take` (paginate via DTO)
- Use `$transaction` for multi-write atomicity
- Catch `Prisma.PrismaClientKnownRequestError` code `P2025` (record not found) on update/delete

## RBAP data model

```
Plan (one per office per year — unique on officeId + planningYear)
 └── Goal
      └── Objective
```

Plan statuses: `DRAFT → SUBMITTED → APPROVED`
Goal/Objective statuses: `NOT_STARTED | IN_PROGRESS | COMPLETED`

## Auth

- JWT access token (15m) + refresh token (7d)
- Google OAuth2 restricted to `@chmsu.edu.ph`
- Dev login: `POST /api/v1/auth/dev-login`
- Controllers use `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles()` decorator
- `req.user` typed as `AuthenticatedUser` from `src/auth/types/authenticated-user.type.ts`

## Office hierarchy access rules

Implemented in `src/offices/offices.service.ts` and reused by plans/goals/objectives:

| Role | Sees |
|---|---|
| `OFFICE_HEAD` | Own office only |
| `DIRECTORS` | Own office + direct children |
| `VICE_PRESIDENTS` | Own office + subtree |
| `PRESIDENTS` / `ADMIN` | All active offices |

## Backend module pattern

Every module follows: `<module>.module.ts`, `<module>.controller.ts`, `<module>.service.ts`, `dto/` (create, update, query), `types/`. Controllers only extract request data, call service, return result — no logic. Services hold all business logic and Prisma calls.

## Important conventions

- **Backend does ALL work** — frontend only renders. Never return raw DB rows; always shape responses.
- NestJS built-in exceptions only: `NotFoundException`, `ForbiddenException`, `BadRequestException`, `UnauthorizedException`
- List endpoints return `{ data, total, page, limit }`
- `backend/COPILOT_INSTRUCTIONS.md` has detailed code patterns (controller, service, DTO, error handling) — consult before writing new modules

## Known issues

- `GET /user/user-id` throws 500 if `userId` query param is missing (controller passes `undefined` to service)
- Testing is currently **not prioritized** — compile/error validation is the primary check after edits

## Frontend (React)

- Dev: `npm run dev` from `frontend_react/` — starts Vite on port 5173, proxies `/api` to `localhost:3000`
- Build: `npm run build`
- Component library: shadcn/ui with Tailwind v4
- Path alias: `@` → `src/`
