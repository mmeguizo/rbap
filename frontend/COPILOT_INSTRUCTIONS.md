# RBAP Frontend — Copilot / Agent Instructions

> **Agent Mode Rule:** If you are in agent mode, skip all tutorials, explanations, and mentor-style commentary.
> Just implement. Use clean, readable code with comments everywhere.
> Do not ask clarifying questions unless the requirement is truly ambiguous.
>
> **Exception for Trace Requests:** If the user asks to trace how something flows from frontend to backend or backend to frontend, explain it visually.
> Use numbered steps, arrow-style flow maps, exact file/function references, and short code excerpts for the real navigation/request lines.

---

## Trace / Visual Flow Rule

When the user asks questions like:

- "trace this from frontend to backend"
- "where does this navigate after login"
- "show me how this reaches the backend"
- "follow the trail from API back to the UI"

respond with a **visual execution trail**.

Always show:

1. The starting trigger in the UI
2. The next service call or router action
3. The HTTP request that leaves the browser
4. The backend file that receives it
5. The response path back into Angular state, signals, or template rendering

Preferred format:

```txt
User clicks button
  -> component method
  -> service method
  -> HTTP request
  -> backend controller
  -> backend service
  -> response returns
  -> Angular stores data
  -> template shows result
```

If the flow includes redirects or route changes, always point out the exact line that does the redirect or `router.navigate(...)`.

---

## Project Identity

**App:** RBAP — CHMSU Dashboard-Based Quality Management and Monitoring System  
**Framework:** Angular 20 (standalone components, no NgModule)  
**UI Library:** CoreUI Angular v5.5.21  
**Language:** TypeScript (strict mode — no `any`)  
**Routing:** `provideRouter` with `withHashLocation()` and lazy loading  
**Asset Entry Point:** `/chmsu-min.jpg` served from `public/` root  
**API Base URL:** Read from `environment.ts` — never hardcode URLs

---

## Core Rule: Frontend Is Dumb

> The frontend **displays data** and **calls services**.  
> All logic, calculations, filtering, sorting, and decisions happen on the **backend**.  
> If you are computing something in a component — move it to a service or, better, ask the backend to do it.

**Bad (never do this in a component):**

```ts
// ❌ Logic inside a component
this.completedGoals = this.goals.filter((g) => g.status === 'COMPLETED').length;
```

**Good (call the backend or service):**

```ts
// ✅ Backend already returns the count — component just displays it
this.stats = await this.goalsService.getSummary();
```

---

## Folder Structure

Every feature follows this layout. Create all these files when building a new feature.

```
src/app/
├── core/                        ← app-wide singleton services, interceptors, guards
│   ├── services/
│   │   └── auth.service.ts      ← handles HTTP calls to /auth endpoints
│   ├── interceptors/
│   │   └── auth.interceptor.ts  ← attaches Bearer token to every request
│   └── guards/
│       └── auth.guard.ts        ← protects routes from unauthenticated access
│
├── shared/                      ← reusable across features
│   ├── components/              ← shared UI components (e.g., spinner, avatar)
│   ├── directives/              ← custom Angular directives
│   ├── pipes/                   ← custom pipes (e.g., date format, truncate)
│   └── utils/                   ← pure helper functions (no Angular dependencies)
│       └── date.utils.ts        ← example: format date strings
│
├── types/                       ← all TypeScript interfaces and types live here
│   ├── auth.types.ts
│   ├── goal.types.ts
│   └── user.types.ts
│
├── layout/
│   └── default-layout/          ← the shell (sidebar + header + router-outlet)
│
└── views/                       ← one folder per page/feature
    ├── login/
    │   ├── login.component.ts   ← component — calls AuthService, handles form
    │   ├── login.component.html ← template — no logic
    │   └── login.component.scss ← styles scoped to this component
    ├── dashboard/
    └── goals/                   ← future
```

---

## File Naming Rules

| What it is       | Naming pattern           | Example               |
| ---------------- | ------------------------ | --------------------- |
| Component        | `<feature>.component.ts` | `goals.component.ts`  |
| Service (HTTP)   | `<feature>.service.ts`   | `goals.service.ts`    |
| Type / Interface | `<feature>.types.ts`     | `goal.types.ts`       |
| Utility function | `<domain>.utils.ts`      | `date.utils.ts`       |
| Interceptor      | `<name>.interceptor.ts`  | `auth.interceptor.ts` |
| Guard            | `<name>.guard.ts`        | `auth.guard.ts`       |
| Route config     | `<feature>.routes.ts`    | `goals.routes.ts`     |

---

## Service Pattern (HTTP Calls)

Every HTTP call lives in a service inside `core/services/`.  
Components **never** call `HttpClient` directly.

```ts
// src/app/core/services/auth.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, UserProfile } from '../../types/auth.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // inject HttpClient — Angular's built-in HTTP tool
  private readonly http = inject(HttpClient);

  // base URL from environment — never hardcode this
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  /**
   * Redirects the user to Google OAuth login.
   * The backend handles the redirect to Google.
   */
  loginWithGoogle(): void {
    window.location.href = `${this.baseUrl}/google`;
  }

  /**
   * Fetches the currently authenticated user's profile.
   * Returns null if not logged in.
   */
  async getMe(): Promise<UserProfile | null> {
    try {
      // firstValueFrom converts an Observable into a Promise
      return await firstValueFrom(this.http.get<UserProfile>(`${this.baseUrl}/me`));
    } catch {
      // if the server returns 401/403, the user is not authenticated
      return null;
    }
  }
}
```

---

## Type Definition Pattern

All types and interfaces live in `src/app/types/`.  
Never define a type inside a component or service file.

```ts
// src/app/types/auth.types.ts

/** The shape of a user returned from GET /auth/me */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  officeId: string | null;
}

/** All possible user roles — must match the backend Role enum exactly */
export type UserRole = 'ADMIN' | 'PRESIDENTS' | 'VICE_PRESIDENTS' | 'DIRECTORS' | 'OFFICE_HEAD';

/** The shape of the token pair returned after login */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
}
```

---

## Component Pattern

Components handle:

- Rendering templates
- Calling services
- Managing local UI state (loading, error messages)

Components **do not**:

- Contain business logic
- Call `HttpClient`
- Compute derived values (those come from the backend or a utility function)

```ts
// src/app/views/goals/goals.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { GoalsService } from '../../core/services/goals.service';
import { Goal } from '../../types/goal.types';

@Component({
  selector: 'app-goals',
  standalone: true,
  templateUrl: './goals.component.html',
})
export class GoalsComponent implements OnInit {
  private readonly goalsService = inject(GoalsService);

  // --- UI state ---
  goals: Goal[] = [];
  isLoading = false;
  errorMessage = '';

  async ngOnInit(): Promise<void> {
    await this.loadGoals();
  }

  /** Fetches the goals list from the service on page load */
  private async loadGoals(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.goals = await this.goalsService.getAll();
    } catch (error) {
      // show a friendly message — do not expose raw errors to the user
      this.errorMessage = 'Could not load goals. Please try again.';
      console.error('[GoalsComponent] loadGoals failed:', error);
    } finally {
      // always stop the spinner, even if the request failed
      this.isLoading = false;
    }
  }
}
```

---

## Utility Function Pattern

Pure functions (no Angular, no HTTP) live in `src/app/shared/utils/`.

```ts
// src/app/shared/utils/date.utils.ts

/** Formats an ISO date string to a human-readable short date, e.g. "May 19, 2026" */
export function formatShortDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Returns true if a given ISO date is in the past */
export function isOverdue(isoString: string): boolean {
  return new Date(isoString) < new Date();
}
```

---

## Comment Standard

Use comments to explain **why**, not what. Always comment:

- The purpose of a function (one line above it)
- Any non-obvious logic
- Side effects or external dependencies

```ts
// ✅ Good comment
/** Clears the stored token so the next request will be treated as unauthenticated */
clearToken(): void {
  localStorage.removeItem('access_token');
}

// ❌ Bad comment — states the obvious
// sets isLoading to true
this.isLoading = true;
```

---

## CoreUI Component Rules

- Always use CoreUI components from `@coreui/angular` instead of writing raw HTML where a component exists.
- Use `c-sidebar`, `c-header`, `c-card`, `c-badge`, etc.
- Sidebar id is `rbap-sidebar` — do not change this, it is referenced by `cSidebarToggle` across the template.

---

## Environment Files

| File                                   | Used when                |
| -------------------------------------- | ------------------------ |
| `src/environments/environment.ts`      | Development (`ng serve`) |
| `src/environments/environment.prod.ts` | Production (`ng build`)  |

Always use `environment.apiUrl` for the base API URL.

```ts
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
};
```

---

## Suggestions to Add to This File

The following are topics you could expand this instructions file with.  
Ask the agent: _"Add [item] to COPILOT_INSTRUCTIONS.md"_

- [ ] Error handling interceptor (global 401 redirect, toast notifications)
- [ ] Token storage and refresh token flow
- [ ] Route guard implementation (`AuthGuard` + `RoleGuard`)
- [ ] Reactive form pattern with `class-validator`-compatible validation messages
- [ ] Pagination component standard (connected to backend `page` / `limit` query params)
- [ ] Loading skeleton / spinner component standard
- [ ] Notification bell (real-time polling or SSE from backend)
- [ ] Dark mode toggle and theme persistence
- [ ] Accessibility rules (ARIA labels, keyboard navigation)
- [ ] Unit test file standard (what to test in components vs services)
