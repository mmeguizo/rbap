# RBAP Frontend — Feature Flow Trail

> This file is your **code map**.  
> When you want to know _"where does the code for feature X live and how does it work?"_,  
> look it up here. Each section follows a feature from the first click to the final response.

---

## How to Read This File

Each feature shows a chain like this:

```
User Action
  → Component (the page/view file)
    → Service (the HTTP caller)
      → Backend API endpoint
        → Service sends back data
          → Component updates the template
```

Files are linked with their path so you can jump directly to the code.

---

## 1. App Bootstrap — How the App Starts

**File:** `src/main.ts`

```
main.ts
  → bootstrapApplication(AppComponent, appConfig)
    → appConfig (src/app/app.config.ts)
        - provideRouter(routes)        ← loads the routes
        - provideHttpClient()          ← enables HTTP calls
        - provideAnimationsAsync()     ← enables CoreUI animations
          → routes (src/app/app.routes.ts)
              - '' → redirects to /login
              - '/login' → LoginComponent (lazy loaded)
              - ''  → DefaultLayoutComponent (shell) → children:
                  - '/dashboard' → DashboardComponent (lazy loaded)
              - '**' → redirects to /login
```

**Key idea:** The app loads the router first. Angular decides which component to show based on the URL.

---

## 2. Login Page — What Happens When You Open `/login`

### Step 1: Angular loads the component

**File:** `src/app/views/login/login.component.ts`  
Angular sees the route `/login`, lazy-loads the `LoginComponent`, and renders its template.

### Step 2: Template renders

**File:** `src/app/views/login/login.component.html`  
The login form and the "Login with Google" button are shown.  
The logo is loaded from `/chmsu-min.jpg` (public folder, set in `logoUrl`).

### Step 3: User clicks "Login with Google" — IMPLEMENTED ✅

**File:** `src/app/views/login/login.component.ts` → `loginWithGoogle()`

```
User clicks "Login with Google" button
  → loginWithGoogle() calls AuthService.loginWithGoogle()
      → Redirects browser: window.location.href = '…/api/v1/auth/google'
          → Backend (GoogleAuthGuard) redirects to Google's login screen
              → User signs in with @chmsu.edu.ph Google account
                  → Google redirects back to: GET /api/v1/auth/google/callback
                      → Backend validates profile, issues tokens
                      → Backend redirects browser to:
                          /#/auth/callback?access_token=xxx&refresh_token=yyy
                              → AuthCallbackComponent.ngOnInit() runs:
                                  → Reads tokens from URL query params
                                  → AuthService.handleCallback(accessToken, refreshToken)
                                      → Saves tokens to localStorage
                                      → GET /api/v1/auth/me (interceptor adds Bearer token)
                                      → Backend returns UserProfile
                                      → Saves profile to localStorage
                                      → Updates currentUser signal
                                  → Router navigates to /dashboard
```

**Files involved:**
| File | Role |
|------|------|
| `src/app/views/login/login.component.ts` | Triggers the login on button click |
| `src/app/core/services/auth.service.ts` | `loginWithGoogle()`, `handleCallback()`, `fetchMe()` |
| `src/app/core/interceptors/auth.interceptor.ts` | Attaches Bearer token to every HTTP request |
| `src/app/views/auth-callback/auth-callback.component.ts` | Processes tokens from URL, navigates |
| `src/app/types/auth.types.ts` | `UserProfile` and `TokenResponse` interfaces |

**About the username in the header:**

> The app does NOT decode the JWT to get the username.  
> After login, `GET /auth/me` is called → backend returns the full profile including `name`.  
> The profile is cached in `localStorage` as `rbap_user` (plain JSON).  
> `DefaultLayoutComponent` reads `AuthService.currentUser` signal → `userInitials()` computed signal.  
> `localStorage` after login: `rbap_access_token`, `rbap_refresh_token`, `rbap_user`.

---

## 3. Shell (Sidebar + Header) — How the Layout Works

**File:** `src/app/layout/default-layout/default-layout.component.ts`

The `DefaultLayoutComponent` is the wrapper shown after login. It contains:

- The left sidebar (`<c-sidebar id="rbap-sidebar">`)
- The top header (`<c-header>`)
- A `<router-outlet>` where child pages (like Dashboard) are rendered

```
User is on /dashboard
  → Router checks authGuard (src/app/core/guards/auth.guard.ts)
      → authGuard reads localStorage for 'rbap_access_token'
          → Token found → allow navigation
          → Token missing → redirect to /login
              → DefaultLayoutComponent renders:
                  ├── Sidebar (reads navItems from _nav.ts)
                  │     → navItems: array of links (e.g., Dashboard)
                  │     → logoUrl: '/chmsu-min.jpg' (logo image from public folder)
                  └── <router-outlet>
                        → DashboardComponent is rendered here
```

**Header avatar and name:**

```
DefaultLayoutComponent has:
  → currentUser = this.authService.currentUser  (reactive signal)
  → userInitials = computed(() => getUserInitials(currentUser()?.name))

Template reads:
  → {{ userInitials() }}            → e.g. "MM" in the avatar badge
  → {{ currentUser()?.name }}       → e.g. "Mark Meguizo" in the header title
```

**Nav items (sidebar links):**  
**File:** `src/app/layout/default-layout/_nav.ts`  
Add new sidebar links in this file only. Do not hardcode links in the HTML.

### Sidebar Toggle Flow

```
User clicks hamburger button (mobile)
  → button has [cSidebarToggle]="rbap-sidebar"
      → CoreUI toggles the sidebar visibility by matching the id "rbap-sidebar"
          → If sidebar opens on mobile:
              → .sidebar-backdrop overlay is shown (via @if sidebar.visible)
                  → User clicks backdrop
                      → cSidebarToggle on the backdrop button fires
                          → Sidebar closes
```

---

## 4. Dashboard — Placeholder Page

**File:** `src/app/views/dashboard/dashboard.component.ts`

Currently a blank page inside the shell.  
When data is added, the flow will be:

```
DashboardComponent initializes (ngOnInit)
  → calls DashboardService.getSummary()   ← (to be created)
      → HTTP GET /api/v1/goals?summary=true  ← backend computes everything
          → Backend returns: { totalGoals, completed, inProgress, notStarted }
              → DashboardComponent sets: this.stats = response
                  → Template displays the numbers in stat cards
```

**Key rule:** The dashboard does **not** compute totals. The backend returns already-computed counts.

---

## 5. Authentication Guard — Protecting Routes

**File:** `src/app/core/guards/auth.guard.ts` _(to be created)_

```
User navigates to /dashboard without a token
  → AuthGuard.canActivate() runs
      → Checks localStorage for access_token
          → Token missing? → redirects to /login
          → Token present? → allows navigation
              → (Optional) calls GET /auth/me to verify the token is still valid
```

---

## 6. HTTP Interceptor — Attaching the Token to Every Request

**File:** `src/app/core/interceptors/auth.interceptor.ts` _(to be created)_

```
Any service makes an HTTP call (e.g., GoalsService.getAll())
  → Angular passes the request through all registered interceptors
      → AuthInterceptor runs
          → Reads access_token from localStorage
          → Clones the request and adds: Authorization: Bearer <token>
              → Modified request is sent to the backend
                  → Backend validates the token (JwtAuthGuard)
                      → Response flows back to the service
```

---

## 7. Goals Feature — Full Flow (To Be Built)

```
User opens /goals page
  → GoalsComponent initializes
      → calls GoalsService.getAll({ page: 1, limit: 10 })
          → HTTP GET /api/v1/goals?page=1&limit=10
              → AuthInterceptor attaches the Bearer token
                  → Backend JwtAuthGuard validates the token
                  → Backend RolesGuard checks the user's role
                  → GoalsService (backend) fetches goals filtered by hierarchy
                      → Returns: { data: Goal[], total, page, limit }
                          → Frontend GoalsService receives the response
                              → GoalsComponent sets: this.goals and this.total
                                  → Template renders the goals list

User clicks "Create Goal"
  → GoalFormComponent collects: title, description, targetDate
      → User clicks "Save"
          → GoalsService.create(formData) is called
              → HTTP POST /api/v1/goals
                  → Backend validates DTO (class-validator)
                  → Backend creates Goal in DB (Prisma)
                  → Returns: newly created Goal
                      → Frontend service returns the new goal
                          → Component adds it to the local list
                          → Success toast shown
```

**Files involved (when built):**
| File | Role |
|------|------|
| `src/app/views/goals/goals.component.ts` | Page component — calls service, manages UI state |
| `src/app/views/goals/goal-form.component.ts` | Form component — captures input, emits save event |
| `src/app/core/services/goals.service.ts` | All HTTP calls for goals |
| `src/app/types/goal.types.ts` | `Goal`, `CreateGoalDto`, `GoalStatus` types |

---

## 8. Token Refresh Flow (To Be Built)

```
Any HTTP request returns 401 Unauthorized
  → AuthInterceptor catches the 401
      → Calls AuthService.refreshToken()
          → HTTP POST /api/v1/auth/refresh  (sends refresh_token)
              → Backend validates the refresh token
              → Backend returns a new access_token + refresh_token
                  → AuthInterceptor stores new tokens
                  → Retries the original request with the new token
                      → If refresh also fails → redirect to /login
```

---

## Quick Reference: Where Is Each Thing?

| Thing                  | File                                                        | Status |
| ---------------------- | ----------------------------------------------------------- | ------ |
| App entry point        | `src/main.ts`                                               | ✅     |
| App config / providers | `src/app/app.config.ts`                                     | ✅     |
| All routes             | `src/app/app.routes.ts`                                     | ✅     |
| Shell layout           | `src/app/layout/default-layout/default-layout.component.ts` | ✅     |
| Sidebar nav links      | `src/app/layout/default-layout/_nav.ts`                     | ✅     |
| Login page             | `src/app/views/login/login.component.ts`                    | ✅     |
| Dashboard page         | `src/app/views/dashboard/dashboard.component.ts`            | ✅     |
| Auth callback page     | `src/app/views/auth-callback/auth-callback.component.ts`    | ✅     |
| Auth service (HTTP)    | `src/app/core/services/auth.service.ts`                     | ✅     |
| Auth guard             | `src/app/core/guards/auth.guard.ts`                         | ✅     |
| Auth interceptor       | `src/app/core/interceptors/auth.interceptor.ts`             | ✅     |
| All TS types           | `src/app/types/auth.types.ts`                               | ✅     |
| Utility functions      | `src/app/shared/utils/user.utils.ts`                        | ✅     |
| Environment config     | `src/environments/environment.ts`                           | ✅     |
| Logo asset             | `public/chmsu-min.jpg` → served at `/chmsu-min.jpg`         | ✅     |
