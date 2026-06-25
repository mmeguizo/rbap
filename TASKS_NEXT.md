# RBAP IDM — Next Phase Task Queue

> Generated: 2026-06-25 | Based on thorough codebase scan of backend + shadcn/vite-monorepo

## Quality Verification Results

P0 and P1 claims in PROJECT_STATUS.md were verified against actual code. Here's the real status:

| Phase | Claim | Verdict |
|-------|-------|---------|
| P0 | passwordHash/googleId excluded via `select` | ✅ VERIFIED — offices.service.ts lines 10-25, 47-70 |
| P0 | Budget aggregation via Prisma `groupBy` | ✅ VERIFIED — plans.service.ts lines 473-501 |
| P0 | Zero `.catch(console.error)` patterns | ✅ VERIFIED — all catches use `toast.error()` |
| P0 | AuthContext uses `navigate()` not `window.location.href` | ✅ VERIFIED — lines 63, 126 |
| P0 | setState side-effect fix | ✅ VERIFIED — API call outside setExpandedGoals callback |
| P1 | Budget columns on all plan tables | ✅ VERIFIED — Plans/MyPlans/PendingApprovals/Goals pages |
| P1 | Sidebar role filtering | ✅ VERIFIED — correct minRole gates |
| P1 | Role-gated modal actions | ✅ VERIFIED — hasMinRole/canWriteOffice in all 5 modals |
| P1 | HomePage dashboard with charts + error toast | ✅ VERIFIED — PieChart, BarChart, KPIs, toast on error |

## Pre-Fix Issues (do these FIRST before any P2/P3 work)

These are real issues found during the scan — fix them before adding new features:

### PF-1: Fix sidebar duplicate ROLE_HIERARCHY constant
- **File:** `shadcn/vite-monorepo/apps/web/src/components/sidebar.tsx` lines 23-29
- **What:** Sidebar defines its own `ROLE_HIERARCHY` instead of importing from `@/lib/roles`
- **Risk:** If `lib/roles.ts` is updated, sidebar silently diverges
- **Fix:** Replace local constant with `import { ROLE_HIERARCHY } from "@/lib/roles"`
- **Also:** Remove dead `hideRoles` property from NavItem interface (line 36) and filter (line 84)
- **Test:** Verify sidebar nav items still filter correctly after import change
- **Estimated effort:** 10 minutes

### PF-2: Fix GET /user/user-id 500 crash when userId missing
- **File:** `backend/src/users/users.controller.ts` line 76-78
- **What:** `getUserInfoById(@Query('userId') userId: string)` passes `undefined` to Prisma when param missing
- **Fix:** Add `@IsNotEmpty()` validation or a `ValidationPipe` check, or add a guard clause throwing `BadRequestException`
- **Test:** `curl http://localhost:3000/api/v1/user/user-id` → should return 400, not 500
- **Estimated effort:** 15 minutes

### PF-3: Fix wrong exception type in UsersController
- **File:** `backend/src/users/users.controller.ts` lines 108, 130, 157, 192
- **What:** Four methods throw `ForbiddenException('User not found')` — should be `NotFoundException`
- **Also:** These checks are redundant (the service throws NotFoundException already). Either remove the duplicate checks or fix the exception type.
- **Test:** Verify the correct HTTP status code (404, not 403) when requesting a non-existent user
- **Estimated effort:** 10 minutes

### PF-4: Clean up dead code
- **File:** `backend/src/offices/dto/offices.dto.ts` — entire file is commented-out type aliases
- **Action:** Delete the file if unused, or restore it if needed
- **Test:** Build and tests still pass
- **Estimated effort:** 5 minutes

---

## P2 — Office Tree View (Visual Org Chart)

### Task OTV-1: Backend — Add tree endpoint
- **What:** Add `GET /api/v1/offices/tree` that returns all offices with parentId/children in a nested tree structure
- **Where:** `backend/src/offices/offices.controller.ts` + `offices.service.ts`
- **Details:**
  - New method `getOfficeTree()` in service that fetches all ACTIVE offices, builds parent→children map, returns root nodes (offices with no parent)
  - Response shape: `{ id, name, headId, head: { name }, children: [...] }` (recursive)
  - Use existing `officeListSelect` pattern for field selection
  - Guard with `@Roles('DIRECTORS', 'VICE_PRESIDENTS', 'PRESIDENTS', 'ADMIN')`
- **Test:** `curl http://localhost:3000/api/v1/offices/tree` → returns nested JSON tree
- **Estimated effort:** 30-45 minutes
- **Dependencies:** None

### Task OTV-2: Frontend — Office tree page with expand/collapse
- **What:** New page at `/offices/tree` showing hierarchical org chart
- **Where:** `shadcn/vite-monorepo/apps/web/src/pages/OfficeTreePage.tsx`
- **Details:**
  - Fetch from new `/offices/tree` endpoint
  - Render recursive tree component with indentation, expand/collapse chevrons
  - Each node shows: office name, head name, member count
  - Click node → opens OfficeDetailModal (reuse existing modal)
  - Loading skeleton, error toast, empty state (follow existing page patterns)
  - Add route in `App.tsx` and nav item in `sidebar.tsx` (minRole: DIRECTORS)
- **Test:** Login as DIRECTOR → navigate to Office Tree → see nested offices → expand/collapse works → click opens detail modal
- **Estimated effort:** 1-2 hours
- **Dependencies:** OTV-1

### Task OTV-3: Frontend — Add visual org chart (optional enhancement)
- **What:** Replace or supplement the tree list with a visual org chart (boxes connected by lines)
- **Details:**
  - Use a lightweight library (react-organizational-chart or custom SVG/CSS)
  - Show office boxes with name + head, connected by lines showing parent→child relationships
  - Toggle between "tree list" view and "org chart" view
  - Responsive — horizontal scroll on mobile
- **Test:** Toggle to org chart view → see visual hierarchy → works on mobile
- **Estimated effort:** 2-3 hours
- **Dependencies:** OTV-2
- **Note:** This can be skipped if OTV-2's tree list is sufficient

---

## P2 — Reporting & Export

### Task REP-1: Backend — Plan PDF export endpoint
- **What:** `GET /api/v1/plans/:id/export/pdf` generates a PDF of a single plan with its goals and objectives
- **Where:** `backend/src/plans/plans.controller.ts` + new `plans/pdf-export.service.ts`
- **Details:**
  - Fetch plan + goals (with objectives) using Prisma select
  - Generate PDF using `pdfkit` or `pdfmake` (install via npm)
  - Include: plan metadata (office, year, campus, strategic alignment), goals table (result level, KPI, budget, status), objectives per goal
  - RBAP-formatted header with CHMSU branding
  - Return as `application/pdf` with `Content-Disposition: attachment`
  - Guard with `@Roles('DIRECTORS', 'VICE_PRESIDENTS', 'PRESIDENTS', 'ADMIN')`
- **Test:** `curl -O http://localhost:3000/api/v1/plans/{id}/export/pdf` → opens valid PDF with plan data
- **Estimated effort:** 1.5-2 hours
- **Dependencies:** None

### Task REP-2: Frontend — Download PDF button
- **What:** Add "Export PDF" button to PlanDetailModal and PlansPage row actions
- **Where:** `plan-detail-modal.tsx`, `pages/PlansPage.tsx`, `pages/MyPlansPage.tsx`
- **Details:**
  - Add API method `plansApi.exportPdf(planId)` in `api.ts` (returns blob)
  - Add `FileDown` icon button in modal header and table row dropdown
  - On click: call API, create blob URL, trigger download via hidden `<a>` click
  - Show loading state on button while downloading
  - Error toast if export fails
- **Test:** Click "Export PDF" on a plan → browser downloads PDF → open and verify content
- **Estimated effort:** 45-60 minutes
- **Dependencies:** REP-1

### Task REP-3: Backend — Plans Excel export endpoint
- **What:** `GET /api/v1/plans/export/excel?officeId=&year=&status=` exports filtered plans to Excel
- **Where:** `backend/src/plans/plans.controller.ts` + new `plans/excel-export.service.ts`
- **Details:**
  - Accept same filters as `findAll` (officeId, year, status, search)
  - Generate `.xlsx` using `exceljs` (install via npm)
  - Sheet 1 "Plans": one row per plan with office, year, status, budget columns
  - Sheet 2 "Goals": all goals within filtered plans with parent plan reference
  - Sheet 3 "Objectives": all objectives within those goals
  - Auto-fit column widths, bold headers, status color coding
  - Return as `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Test:** `curl http://localhost:3000/api/v1/plans/export/excel` → downloads valid .xlsx with 3 sheets
- **Estimated effort:** 1.5-2 hours
- **Dependencies:** None

### Task REP-4: Frontend — Download Excel button
- **What:** Add "Export Excel" button to PlansPage with current filters applied
- **Where:** `pages/PlansPage.tsx`
- **Details:**
  - Add "Export" button in page header (next to search bar)
  - Pass current filters (officeId, year, status, search) to export endpoint
  - Download blob, trigger file save
  - Loading state + error toast
- **Test:** Filter plans by year/status → click Export Excel → downloaded file reflects filters
- **Estimated effort:** 30-45 minutes
- **Dependencies:** REP-3

### Task REP-5: Backend — Excel import for plan creation
- **What:** `POST /api/v1/plans/import/excel` accepts an Excel file and creates plans/goals/objectives
- **Where:** `backend/src/plans/plans.controller.ts` + new `plans/excel-import.service.ts`
- **Details:**
  - Accept multipart/form-data with `.xlsx` file
  - Parse using `exceljs`, validate against template format
  - Create plan + nested goals + nested objectives in a `$transaction`
  - Return summary: `{ plansCreated: N, goalsCreated: N, objectivesCreated: N, errors: [...] }`
  - Validate: officeId must exist, planningYear + officeId must be unique, required fields present
  - Guard with `@Roles('DIRECTORS', 'VICE_PRESIDENTS', 'PRESIDENTS', 'ADMIN')`
- **Test:** Upload valid template Excel → plans appear in DB → upload invalid file → get validation errors
- **Estimated effort:** 2-3 hours
- **Dependencies:** None

### Task REP-6: Frontend — Import Excel UI
- **What:** Add "Import" button to PlansPage with file upload dialog
- **Where:** `pages/PlansPage.tsx`, new component `components/import-plans-dialog.tsx`
- **Details:**
  - "Import" button in page header
  - Dialog with: template download link, file input (drag-and-drop zone), validation preview, import button
  - Show import summary after success (N plans created, N errors)
  - Refresh page data after successful import
  - Provide downloadable Excel template with correct column headers
- **Test:** Click Import → download template → fill it out → upload → plans appear in list
- **Estimated effort:** 1-1.5 hours
- **Dependencies:** REP-5

---

## P3 — Register, Notifications, Activity Log

### Task REG-1: Frontend — Registration page
- **What:** New page at `/register` with registration form
- **Where:** `shadcn/vite-monorepo/apps/web/src/pages/RegisterPage.tsx`
- **Details:**
  - Form fields: name, email, password, confirm password, office (dropdown)
  - Backend registration endpoint already exists: `POST /api/v1/auth/register`
  - Client-side validation: email format, password min length, passwords match
  - On success: show "Registration submitted, pending approval" message, link to login
  - On error: show error message from API
  - Add route in App.tsx (public, no auth required)
  - Add link from LoginPage: "Don't have an account? Register"
- **Test:** Navigate to /register → fill form → submit → success message → try login
- **Estimated effort:** 1-1.5 hours
- **Dependencies:** None

### Task NOT-1: Backend — Notification model + migration
- **What:** Add Notification model to Prisma schema and run migration
- **Where:** `backend/prisma/schema.prisma`
- **Details:**
  ```prisma
  model Notification {
    id        String   @id @default(cuid())
    userId    String
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    title     String
    message   String
    type      NotificationType @default(INFO)
    read      Boolean  @default(false)
    link      String?  // e.g., "/plans/abc123"
    createdAt DateTime @default(now())
    @@index([userId, read])
  }
  enum NotificationType { INFO, WARNING, SUCCESS, ERROR }
  ```
  - Run `npx prisma migrate dev --name add-notifications`
  - Run `npx prisma generate`
- **Test:** Migration applies cleanly, Prisma client has Notification model
- **Estimated effort:** 15-20 minutes
- **Dependencies:** None

### Task NOT-2: Backend — Notification service + controller
- **What:** Create full CRUD module for notifications
- **Where:** `backend/src/notifications/` (notifications.module.ts, .controller.ts, .service.ts, dto/)
- **Details:**
  - `GET /notifications` — list user's notifications (paginated, newest first, filterable by read/unread)
  - `GET /notifications/unread-count` — return `{ count: N }`
  - `PATCH /notifications/:id/read` — mark single as read
  - `PATCH /notifications/read-all` — mark all as read
  - Use Prisma select pattern, JwtAuthGuard + RolesGuard
  - Notifications are scoped to the authenticated user (from JWT)
- **Test:** Create test notifications via Prisma Studio → list endpoint returns them → mark read works
- **Estimated effort:** 1 hour
- **Dependencies:** NOT-1

### Task NOT-3: Backend — Trigger notifications on plan events
- **What:** Auto-create notifications when plans are submitted or approved
- **Where:** `backend/src/plans/plans.service.ts` — inside `submit()` and `approve()` methods
- **Details:**
  - On plan submit: notify all PRESIDENTS/ADMIN users that a new plan is pending approval
  - On plan approve: notify the plan creator that their plan was approved
  - Use `$transaction` to ensure notification creation is atomic with the status change
  - Query for target users: `prisma.user.findMany({ where: { role: { in: ['PRESIDENTS', 'ADMIN'] }, status: 'ACTIVE' } })`
- **Test:** Submit a plan → check PRESIDENTS user notifications → approve plan → check creator notifications
- **Estimated effort:** 45-60 minutes
- **Dependencies:** NOT-2

### Task NOT-4: Frontend — Notification bell + dropdown
- **What:** Add notification bell icon to header bar with unread count badge and dropdown list
- **Where:** `components/header-bar.tsx`, new `components/notification-bell.tsx`
- **Details:**
  - Bell icon in header bar (next to breadcrumbs)
  - Badge showing unread count (red circle with number)
  - Dropdown on click: list of recent notifications (last 10-20)
  - Click notification → mark as read + navigate to link if present
  - "Mark all read" button
  - "View all" link → notifications page (optional, Task NOT-5)
  - Poll for unread count every 60 seconds (or use WebSocket later)
  - Add `notificationsApi` to `api.ts`
- **Test:** Trigger notification (submit a plan as another user) → bell badge increments → dropdown shows notification
- **Estimated effort:** 1-1.5 hours
- **Dependencies:** NOT-3

### Task ACT-1: Backend — Activity log model + migration
- **What:** Add ActivityLog model to Prisma schema
- **Where:** `backend/prisma/schema.prisma`
- **Details:**
  ```prisma
  model ActivityLog {
    id        String   @id @default(cuid())
    userId    String
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    action    String   // e.g., "PLAN_CREATED", "PLAN_SUBMITTED", "USER_DEACTIVATED"
    entity    String   // e.g., "Plan", "User", "Office"
    entityId  String   // the ID of the affected resource
    details   Json?    // optional metadata: { planTitle: "...", officeName: "..." }
    createdAt DateTime @default(now())
    @@index([userId])
    @@index([entity, entityId])
    @@index([createdAt])
  }
  ```
  - `npx prisma migrate dev --name add-activity-log`
  - `npx prisma generate`
- **Test:** Migration applies cleanly
- **Estimated effort:** 15-20 minutes
- **Dependencies:** None

### Task ACT-2: Backend — Activity log service + logging on key actions
- **What:** Service to write activity logs, integrated into existing services
- **Where:** `backend/src/activity-log/` (module, service), plus hooks in plans/users/offices services
- **Details:**
  - `ActivityLogService.log(userId, action, entity, entityId, details?)` — simple write method
  - Integrate into: Plan create/submit/approve/delete, User status changes, Office create/update/delete
  - `GET /activity-log` endpoint — paginated, filterable by userId, entity, action, date range
  - ADMIN only for browsing all logs; users can see their own logs
  - Use Prisma select, proper pagination with `$transaction([findMany, count])`
- **Test:** Perform actions → check activity logs via endpoint → filter by user/entity
- **Estimated effort:** 1-1.5 hours
- **Dependencies:** ACT-1

### Task ACT-3: Frontend — Activity log page
- **What:** New page `/activity-log` showing audit trail with filters
- **Where:** `pages/ActivityLogPage.tsx`
- **Details:**
  - Table: timestamp, user, action, entity, details
  - Filters: date range, user, action type, entity type
  - Follow existing table pattern (loading → error → empty → data)
  - ADMIN sees all logs; other roles see own logs only
  - Paginated server-side (use backend pagination from ACT-2)
  - Add route + sidebar nav item (minRole: ADMIN)
- **Test:** Navigate to Activity Log → see recent actions → filter by action type → pagination works
- **Estimated effort:** 1-1.5 hours
- **Dependencies:** ACT-2

---

## P3 — Polish & QA

### Task POL-1: Install react-hook-form + zod, create FormField component
- **What:** Add form validation infrastructure
- **Where:** `shadcn/vite-monorepo/apps/web/`
- **Details:**
  - Install `react-hook-form` and `@hookform/resolvers` in apps/web
  - Create `components/ui/form.tsx` — shadcn Form component wrapping react-hook-form
  - Create `components/ui/form-field.tsx` — reusable label + input + error message
  - Add a shared `schemas.ts` with zod schemas for common validations (email, password, required string, number range)
  - Create `components/ui/textarea.tsx` if not present (needed for goals/objectives forms)
- **Test:** FormField renders with label, input, and shows validation error on blur
- **Estimated effort:** 45-60 minutes
- **Dependencies:** None

### Task POL-2: Migrate LoginPage to react-hook-form
- **What:** Refactor LoginPage to use react-hook-form + zod validation
- **Where:** `pages/LoginPage.tsx`
- **Details:**
  - Replace manual useState fields with useForm + zodResolver
  - Schema: email (required, email format), password (required, min 6 chars)
  - Show field-level errors (inline below each input)
  - Keep existing toast error for API failures
  - Keep Google OAuth and dev-login buttons unchanged
  - This is a small, safe migration to prove the pattern works
- **Test:** Submit empty form → see field errors → enter invalid email → see format error → valid login still works
- **Estimated effort:** 30-45 minutes
- **Dependencies:** POL-1

### Task POL-3: Migrate one modal to react-hook-form (goal-detail-modal)
- **What:** Refactor GoalDetailModal to use react-hook-form + zod
- **Where:** `components/goal-detail-modal.tsx`
- **Details:**
  - Create zod schema for goal fields (resultLevel, targetResult, keyActions, etc. — all required strings)
  - Replace manual useState fields with useForm
  - Add field-level error messages
  - Keep role gating, create/edit mode, and toast error handling intact
  - This modal has the most fields — good test of the form pattern
- **Test:** Open create goal → leave fields empty → submit → see all required errors → fill fields → submit works
- **Estimated effort:** 1-1.5 hours
- **Dependencies:** POL-1

### Task POL-4: Migrate remaining modals to react-hook-form
- **What:** Refactor objective-detail-modal, office-detail-modal, user-detail-modal
- **Where:** `components/objective-detail-modal.tsx`, `office-detail-modal.tsx`, `user-detail-modal.tsx`
- **Details:**
  - Same pattern as POL-3
  - Objective schema: similar to goal fields
  - Office schema: name (required, min 2 chars), headId (optional), parentId (optional)
  - User schema: name, email, role, office assignment
- **Test:** Each modal → empty submit shows errors → valid submit works → edit mode pre-fills correctly
- **Estimated effort:** 1.5-2 hours
- **Dependencies:** POL-3

### Task POL-5: Migrate plan-detail-modal to react-hook-form
- **What:** Refactor PlanDetailModal (the most complex modal)
- **Where:** `components/plan-detail-modal.tsx`
- **Details:**
  - This modal has nested goal/objective creation inline
  - Extract the plan-level form to useForm while keeping goal/objective inline forms as-is (or migrate them too)
  - Plan schema: planningYear, campus, strategic fields, monitoring frequency
  - Keep expandable goals section unchanged
- **Test:** Edit plan → validation on save → goals expand/collapse still works → submit/approve actions still work
- **Estimated effort:** 1-1.5 hours
- **Dependencies:** POL-4

### Task POL-6: Route-level role guards
- **What:** Prevent direct URL navigation to restricted routes
- **Where:** `App.tsx` or new `components/role-guard.tsx`
- **Details:**
  - Create `<RoleGuard minRole={ROLE_HIERARCHY.DIRECTORS}>` component wrapping routes
  - Redirect to `/` with toast "You don't have permission to access that page"
  - Apply: Users → ADMIN, Offices → ADMIN, All Plans → DIRECTORS, Pending Approvals → DIRECTORS, Goals/Objectives → DIRECTORS
  - Dashboard and My Plans remain accessible to all authenticated users
- **Test:** Login as OFFICE_HEAD → manually navigate to `/users` → redirected to `/` with toast
- **Estimated effort:** 30-45 minutes
- **Dependencies:** PF-1 (to use imported ROLE_HIERARCHY)

### Task POL-7: Lazy loading for routes
- **What:** Convert route imports to React.lazy() with Suspense
- **Where:** `App.tsx`
- **Details:**
  - Replace static imports with `const XPage = React.lazy(() => import("@/pages/XPage"))`
  - Add `<Suspense fallback={<PageSkeleton />}>` around routes
  - Create a simple `PageSkeleton` component (sidebar-width skeleton)
  - This reduces initial bundle size by splitting per-route chunks
- **Test:** `npm run build` → no errors → multiple JS chunks output → page transitions show skeleton briefly
- **Estimated effort:** 30 minutes
- **Dependencies:** None

### Task POL-8: Mobile responsiveness pass
- **What:** Review and fix all pages for mobile layout
- **Where:** All pages in `pages/`, modal components
- **Details:**
  - Tables: ensure horizontal scroll on small screens (`overflow-x-auto`)
  - Modals: ensure `max-w-[95vw]` on small screens, buttons stack vertically
  - HomePage: KPI cards stack 1-per-row on mobile (currently 4 columns)
  - Charts: reduce height on mobile, ensure labels fit
  - Search bars: full width, not truncated
  - Pagination: compact on mobile
  - Test on 375px and 414px viewport widths
- **Test:** Open each page at 375px width → no horizontal overflow → all content readable → modals usable
- **Estimated effort:** 1.5-2 hours
- **Dependencies:** None

### Task POL-9: Accessibility (a11y) audit and fixes
- **What:** Ensure WCAG 2.1 AA compliance for all pages
- **Where:** All components and pages
- **Details:**
  - Add `aria-label` to icon-only buttons (sidebar toggle, action menus, theme toggle)
  - Ensure all form inputs have associated `<label>` elements
  - Add focus-visible styles to all interactive elements (buttons, links, inputs, selects)
  - Ensure color contrast ratios meet 4.5:1 minimum (check theme colors)
  - Add `role="alert"` to error toasts
  - Add `alt` text to any images/icons used decoratively
  - Ensure keyboard navigation works: Tab through sidebar, modals, tables, dropdowns
  - Add skip-to-content link at top of page
- **Test:** Tab through entire app → all elements receive visible focus → screen reader announces meaningful labels → color contrast checker passes
- **Estimated effort:** 1.5-2 hours
- **Dependencies:** None

### Task POL-10: Build chunk optimization
- **What:** Split recharts into a separate chunk via dynamic import
- **Where:** `pages/HomePage.tsx`
- **Details:**
  - recharts adds ~370 kB to the main bundle
  - Dynamic import: `const { PieChart, Pie, Cell, BarChart, Bar, ... } = await import("recharts")` or use React.lazy for chart components
  - Wrap charts in Suspense with skeleton placeholder
  - Verify build size improvement with `npm run build`
- **Test:** `npm run build` → main chunk < 600 kB → charts load on HomePage navigation
- **Estimated effort:** 30 minutes
- **Dependencies:** None

---

## Execution Order (Recommended)

```
Week 1: Pre-fixes + Foundation
  PF-1 (sidebar import fix) → PF-2 (500 fix) → PF-3 (exception types) → PF-4 (dead code)
  POL-1 (form infra) → POL-2 (LoginPage form)

Week 2: Reporting (highest user value after core)
  REP-1 (PDF backend) → REP-2 (PDF frontend)
  REP-3 (Excel export backend) → REP-4 (Excel export frontend)
  REP-5 (Excel import backend) → REP-6 (Excel import frontend)

Week 3: Office Tree + Notifications
  OTV-1 (tree endpoint) → OTV-2 (tree page) → [OTV-3 optional]
  NOT-1 (notification model) → NOT-2 (notification CRUD) → NOT-3 (plan triggers) → NOT-4 (bell UI)

Week 4: Activity Log + Polish
  ACT-1 (activity model) → ACT-2 (activity service) → ACT-3 (activity page)
  POL-3 → POL-4 → POL-5 (form migrations)
  POL-6 (role guards) → POL-7 (lazy loading)

Week 5: Final Polish
  POL-8 (mobile pass) → POL-9 (a11y audit) → POL-10 (chunk optimization)
```

## Testing Each Chunk

Every task above has a concrete test criterion. The agent/user should:
1. Complete the task
2. Run the test listed under "Test:"
3. Only move to the next task if the test passes
4. Run `npm run build` (frontend) or `npm run test` (backend) after each task to catch regressions

## Files to Never Touch

- `frontend/` — Legacy Angular, frozen
- `frontend_react/` — Legacy React stub, frozen
- Only work in `backend/` and `shadcn/vite-monorepo/`
