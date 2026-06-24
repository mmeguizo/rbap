# RBAP IDM — Project Status

> Last updated: 2026-06-23

## Repo Structure

```
RBAP_IDM/
├── backend/          # NestJS v11 + Prisma v7 + PostgreSQL (main API)
├── frontend/         # Angular v20 + CoreUI (legacy, port 4200)
├── frontend_react/   # React 19 + Vite + Tailwind v4 + shadcn/ui (new, port 5173)
└── shadcn/vite-monorepo/  # Turbo monorepo — active dev target
    └── apps/web/     # React app with dashboard, auth, admin pages
    └── packages/ui/  # Shared shadcn/ui component library
```

## Build Commands

| Directory | Command | Description |
|---|---|---|
| `backend/` | `npm run start:dev` | NestJS dev server (port 3000) |
| `backend/` | `npm run lint` | ESLint + Prettier |
| `backend/` | `npm run test` | Jest unit tests |
| `backend/` | `npm run seed` | Seed DB |
| `shadcn/vite-monorepo/apps/web/` | `npm run dev` | Vite dev (port 5173, proxies /api to :3000) |
| `shadcn/vite-monorepo/apps/web/` | `npm run build` | `tsc -b && vite build` — zero TS errors required |
| `shadcn/vite-monorepo/apps/web/` | `npm run lint` | Lint check (tsc + ESLint) |

## What's Built

### Auth & Layout
- JWT auth (access 15m + refresh 7d) with Google OAuth2 (`@chmsu.edu.ph` only)
- Dev login: `POST /api/v1/auth/dev-login`
- DashboardLayout with collapsible sidebar (avatar, nav, theme cycle, sign-out)
- Session expiry detection (`isTokenExpired`), auto-redirect to login with `?expired=true`
- All pages behind auth guards
- **Header bar** with breadcrumb navigation + page title
- **Sidebar** with RBAP IDM branding, user role display, collapse toggle; filters nav items by role hierarchy
- **Alert dialog** component for confirmation prompts
- **Empty state** component for consistent placeholder UI
- **Error boundary** wraps protected routes
- **Page transitions** — fade-in + slide-up animation on page content
- **Responsive sidebar** — mobile overlay with backdrop, hamburger toggle on small screens

### Pages Built (React/shadcn monorepo)

| Page | Route | Features |
|---|---|---|
| HomePage | `/` | **Live dashboard**: plan status donut chart, plans-by-office bar chart, budget overview with progress bar, pending approvals list, KPI stat cards (users, plans, budget, pending) |
| MyPlansPage | `/my-plans` | Plans filtered to user's office only (P1) |
| PendingApprovalsPage | `/pending-approvals` | Plans from subordinate offices with SUBMITTED status (P1) |
| UsersPage | `/users` | Table + UserDetailModal (view/edit/deactivate/delete) |
| OfficesPage | `/offices` | Table + OfficeDetailModal (name/head/parent/members/delete) |
| PlansPage | `/plans` | Table + PlanDetailModal (create/view/edit/submit/approve/delete) |
| GoalsPage | `/goals` | Table with budget columns + progress bars + GoalDetailModal |
| ObjectivesPage | `/objectives` | Table + ObjectiveDetailModal (create/view/edit/delete) |

### Plan → Goals → Objectives Hierarchy
- `PlanDetailModal` has expandable Goals section with **goal completion progress bar**
- Click a goal row to expand/collapse and see its objectives (fetched lazily)
- Each goal/objective row has a ⋮ menu (View/Edit, Delete when DRAFT)
- Add Goal / Add Objective buttons (visible when plan is DRAFT)
- Child modals open as overlays on top; after any child CRUD, both hierarchy list and parent page refresh

### Budget & Progress (P1)
- **GoalsPage** — Budget requirement + allocation columns with mini progress bars showing % funded
- **PlanDetailModal** — Goal completion progress bar (completed / total goals) with color legend (NOT_STARTED amber, IN_PROGRESS blue, COMPLETED emerald)
- **HomePage** — Budget overview card with total allocated vs required

### Role-Based UI (P1)
- **Sidebar filtering**: nav items hidden per role hierarchy:
  - `OFFICE_HEAD(0)` → Dashboard, My Plans
  - `DIRECTORS(1)`+ → +All Plans, Pending Approvals, Goals, Objectives
  - `PRESIDENTS(3)`+ → +Offices
  - `ADMIN(4)` → +Users
- **MyPlansPage** — `/my-plans`, lists plans filtered to user's office
- **PendingApprovalsPage** — `/pending-approvals`, lists SUBMITTED plans from subordinate offices
- **Role-gated actions inside modals**:
  - **PlanDetailModal** — Add Goal/Add Objective/Save/Submit/Delete: only for plan's owning office (OFFICE_HEAD+) or any office (PRESIDENTS/ADMIN). Approve: PRESIDENTS/ADMIN only.
  - **GoalDetailModal** — Save/Delete: only for goal's owning office (OFFICE_HEAD+) or any office (PRESIDENTS/ADMIN)
  - **ObjectiveDetailModal** — Save/Delete: only for objective's owning office (OFFICE_HEAD+) or any office (PRESIDENTS/ADMIN)
  - **UserDetailModal** — Role change, Office assignment, Activate/Deactivate, Delete: ADMIN only
  - **OfficeDetailModal** — Name/Head/Parent edits + Save/Delete: ADMIN only

### P0 Gap Fixes Applied
- **LoginPage** — removed dead links to `/forgot-password` and `/register` (routes don't exist yet)
- **Sidebar** — Offices nav item restricted to ADMIN only (matching backend `@Roles('ADMIN')`)
- **OfficeDetailModal** — edit controls gated by ADMIN role; read-only view for non-ADMIN
- **PlanDetailModal** — removed `officesApi.getAll()` call (ADMIN-only, caused 403 for all other users)
- **HomePage** — added error toast on dashboard data load failure; removed dead `activeUsers` code
- **Error handling** — added `toast.error()` on silent catch blocks (goal/objective delete)

### Known Issues
- `GET /user/user-id` throws 500 if `userId` query param missing
- Pre-existing lint errors in `AuthContext.tsx` and `LoginPage.tsx` (setState in effect + context co-export) — not from this work
- Build chunk size warning (~965 kB, recharts adds ~370 kB) — can be split with dynamic imports later
- Budget on HomePage capped at 1000 goals (hard limit on `goalsApi.browse`)

## Next Steps (Priority Order)

| Priority | Phase | Status | What It Does |
|---|---|---|---|
| ✅ P0 | Dashboard & Analytics | Done | Live stat cards, donut chart, bar chart, budget overview, pending approvals; fixed error handling, dead code |
| ✅ P0 | UI Beautification | Done | Premium sidebar, breadcrumbs, header, animations, confirm dialogs, empty states, error boundary; fixed role mismatches, dead login links |
| ✅ P1 | Role-Based UI | Done | Sidebar role filtering, My Plans page, Pending Approvals page, role-gated modal actions |
| 🟠 P1 | Budget & Progress | In progress | Goal progress bar in PlanDetailModal done; budget columns in GoalsPage done; **remaining**: budget columns in PlansPage table |
| 🟡 P2 | Office Tree View | Pending | Visual org chart instead of flat table |
| 🟡 P2 | Reporting & Export | Pending | PDF/Excel export matching RBAP templates, import from Excel |
| 🟢 P3 | Register, Notifications, Activity Log | Pending | Fill remaining functional gaps |
| 🟢 P3 | Polish & QA | Pending | Form validation, responsive mobile, accessibility |

## Key Patterns

- All Prisma queries use `select` — never raw rows
- Controllers only extract request data, call service, return result — no logic
- Services hold all business logic and Prisma calls
- NestJS built-in exceptions: `NotFoundException`, `ForbiddenException`, `BadRequestException`, `UnauthorizedException`
- List endpoints return `{ data, total, page, limit }`
- `ValidationPipe` with `whitelist: true` strips unknown fields
- CORS allows both Angular (`:4200`) and React (`:5173`) origins
- Backend prefix: `/api/v1`; Swagger: `/api/docs` (requires `SWAGGER_ENABLED=true`)
- React paths: `@` → `src/`, component imports via `@workspace/ui/components/xxx`

## Role Hierarchy

| Role | Level | Nav Access | Office Write Access |
|---|---|---|---|
| OFFICE_HEAD | 0 | Dashboard, My Plans | Own office only |
| DIRECTORS | 1 | +All Plans, Pending Approvals, Goals, Objectives | Own office only |
| VICE_PRESIDENTS | 2 | Same as DIRECTORS | Own office only |
| PRESIDENTS | 3 | +Offices | Any office |
| ADMIN | 4 | +Users | Any office |

## Key Files

| File | Purpose |
|---|---|
| `src/lib/api.ts` | All API endpoint definitions |
| `src/lib/roles.ts` | Role helpers: `ROLE_HIERARCHY`, `hasMinRole`, `canWriteOffice` |
| `src/contexts/AuthContext.tsx` | Auth state + user with `role` and `office.id` |
| `src/components/sidebar.tsx` | Role-filtered nav items |
| `src/components/dashboard-layout.tsx` | Layout with responsive sidebar |
| `src/components/plan-detail-modal.tsx` | Plan CRUD + expandable goal hierarchy |
| `src/pages/HomePage.tsx` | Dashboard with charts and KPIs |
