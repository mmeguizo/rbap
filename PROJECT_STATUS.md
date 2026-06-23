# RBAP IDM — Project Status

> Last updated: 2026-06-23

## Repo Structure

```
RBAP_IDM/
├── backend/          # NestJS v11 + Prisma v7 + PostgreSQL (main API)
├── frontend/         # Angular v20 + CoreUI (legacy, port 4200)
├── frontend_react/   # React 19 + Vite + Tailwind v4 + shadcn/ui (new, port 5173)
└── shadcn/vite-monorepo/  # Experimental Turbo monorepo (active dev target)
    └── apps/web/     # The web app with dashboard, auth, admin pages
```

## Build Commands

| Directory | Command | Description |
|---|---|---|
| `backend/` | `npm run start:dev` | NestJS dev server (port 3000) |
| `backend/` | `npm run lint` | ESLint + Prettier |
| `backend/` | `npm run test` | Jest unit tests |
| `backend/` | `npm run seed` | Seed DB |
| `shadcn/vite-monorepo/apps/web/` | `npm run dev` | Vite dev (port 5173, proxies /api to :3000) |
| `shadcn/vite-monorepo/apps/web/` | `npm run build` | TypeScript + Vite build |
| `shadcn/vite-monorepo/apps/web/` | `npm run lint` | Lint check (tsc + ESLint) |

## What's Built

### Auth & Layout
- JWT auth (access 15m + refresh 7d) with Google OAuth2 (`@chmsu.edu.ph` only)
- Dev login: `POST /api/v1/auth/dev-login`
- DashboardLayout with collapsible sidebar (avatar, nav, theme cycle, sign-out)
- Session expiry detection (`isTokenExpired`), auto-redirect to login with `?expired=true`
- All users/offices/plans/goals/objectives pages behind auth guards
- **Header bar** with breadcrumb navigation + page title (`header-bar.tsx`)
- **Sidebar** enhanced with RBAP IDM branding, user role display, collapse toggle (`sidebar.tsx`)
- **Alert dialog** component (`@workspace/ui`) for confirmation prompts
- **Empty state** component for consistent placeholder UI

### Pages Built (React/shadcn monorepo)

| Page | Route | Features |
|---|---|---|
| HomePage | `/` | **Live dashboard**: plan status donut chart, plans-by-office bar chart, budget overview with progress bar, pending approvals list, KPI stat cards (users, plans, budget, pending) |
| UsersPage | `/users` | Table + UserDetailModal (view/edit/deactivate/delete) |
| OfficesPage | `/offices` | Table + OfficeDetailModal (name/head/parent/members/delete) |
| PlansPage | `/plans` | Table + PlanDetailModal (create/view/edit/submit/approve/delete) |
| GoalsPage | `/goals` | Table + GoalDetailModal (create/view/edit/delete) |
| ObjectivesPage | `/objectives` | Table + ObjectiveDetailModal (create/view/edit/delete) |

### Plan → Goals → Objectives Hierarchy
- `PlanDetailModal` now has an expandable Goals section at the top
- Click a goal row to expand/collapse and see its objectives (fetched lazily)
- Each goal/objective row has a ⋮ menu (View/Edit, Delete when DRAFT)
- Add Goal / Add Objective buttons (visible when plan is DRAFT)
- Child modals (`GoalDetailModal`, `ObjectiveDetailModal`) open as overlays on top
- After any child CRUD, both the hierarchy list and parent page refresh

### UI Polish (P0)
- **Confirmation dialogs** — `ConfirmDialog` component using `AlertDialog` wired into all destructive actions across modals and page-level dropdowns (delete, deactivate, submit, approve)
- **Empty states** — `EmptyState` component integrated into all 5 list pages (Users, Plans, Goals, Objectives, Offices)
- **Error boundary** — `ErrorBoundary` component wraps all protected routes
- **Page transitions** — fade-in + slide-up animation on page content
- **Responsive sidebar** — mobile overlay with backdrop, hamburger toggle on small screens
- **Animation polish** — hover shadows on cards, loading skeletons, progress bar transitions

### Known Issues
- `GET /user/user-id` throws 500 if `userId` query param missing
- Pre-existing lint errors in `AuthContext.tsx` and `LoginPage.tsx` (setState in effect + context co-export) — not from this work
- Build chunk size warning (~950 kB, recharts adds ~370 kB) — can be split with dynamic imports later

## Next Steps (Priority Order)

| Priority | Phase | What It Does |
|---|---|---|
| 🔴 P0 | Dashboard & Analytics | Replace dead stat cards with live charts, KPIs, budget tracking, pending approvals |
| 🔴 P0 | UI Beautification | Premium sidebar with branding, breadcrumbs, header bar, animations, confirmation dialogs, proper empty states |
| 🟠 P1 | Role-Based UI | Hide/show nav items and actions per role, add "My Plans" and "Pending Approvals" pages |
| 🟠 P1 | Budget & Progress | Wire the existing budget fields into the UI, add progress bars and completion rings |
| 🟡 P2 | Office Tree View | Visual org chart instead of flat table |
| 🟡 P2 | Reporting & Export | PDF/Excel export matching your RBAP templates, import from Excel |
| 🟢 P3 | Register, Notifications, Activity Log | Fill remaining functional gaps |
| 🟢 P3 | Polish & QA | Error boundaries, form validation, responsive mobile, accessibility |

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
