# CHMSU RBAP IDM — System Flow Guide

**Full Name:** CHMSU Dashboard-Based Quality Management and Monitoring System  
**Short Name:** RBAP IDM (Institutional Dashboard Monitoring)  
**Institution:** Carlos Hilado Memorial State University (CHMSU)

---

## The Big Picture

The system is built around a **Plan lifecycle** with three statuses:

```
DRAFT  ──(Office Head submits)──►  SUBMITTED  ──(Admin approves)──►  APPROVED
  ▲                                                                       │
  │ Edit freely                                                     Locked (read-only)
  └── Goals + Objectives can be added/edited only while DRAFT
```

---

## Step 0 — Admin Setup _(must happen first)_

Before any other role can use the system, an admin must:

### 1. Create Offices

> Admin → `/admin/offices` → **"New Office"**

```
Admin clicks "New Office"
  → Modal opens
  → Fill in office name and parent office (for hierarchy)
  → Save
  → POST /api/v1/offices/add-office
  → Office saved in DB with parentId (org tree)
```

### 2. Assign Roles and Offices to Users

> Admin → `/admin/users`

```
Click "Role" button on a user row
  → Select a role (OFFICE_HEAD, DIRECTORS, VICE_PRESIDENTS, etc.)
  → PATCH /api/v1/user/:id/role
  → user.role updated

Click "Office" button on a user row
  → Select the office to assign
  → PATCH /api/v1/user/:id/office
  → user.officeId updated
```

> ⚠️ **Important:** An `OFFICE_HEAD` with no assigned office **cannot create plans or goals.** Always assign an office before creating plans.

---

## Step 1 — Office Head Creates a Plan

> Login as an `OFFICE_HEAD` user who has an office assigned.

```
Login with CHMSU Google account (@chmsu.edu.ph) or password
  → GET /api/v1/auth/me
  → JWT stored in browser
  → Dashboard loads → "Create a draft plan" button is visible

Click "Create a draft plan"
  → Navigate to /plans/new
  → Fill form:
       - Planning Year
       - Campus
       - Program / Project / Activity / KRA
       - Strategic Alignment
       - Breakthrough Goals
       - Strategic Objectives
       - Date Prepared
       - Monitoring Frequency
       - Reporting Office
  → Click Save
  → POST /api/v1/plans
  → Plan saved with status: "DRAFT"
  → Redirected to /plans/:planId (plan detail page)
```

**Rules enforced by the server:**

- User role must be `OFFICE_HEAD`, `DIRECTORS`, `VICE_PRESIDENTS`, or `ADMIN`
- User must have an office assigned
- Only one plan per office per planning year is allowed

---

## Step 2 — Office Head Adds Goals

> Still on the `/plans/:planId` detail page, plan must be **DRAFT**.

```
Click "+ Add Goal" button
  → Fill in goal fields:
       - Result Level
       - Target Result
       - Key Actions
       - Key Risk
       - Mitigation Measures
       - Key Performance Indicator (KPI)
       - Target
       - Responsible Office/Person
       - Timeline
       - Fund Source
       - Means of Verification
  → Click Save
  → POST /api/v1/plans/:planId/goals
  → Goal saved under this plan
```

**Rules enforced by the server:**

- Plan must be **DRAFT** status
- User's assigned office must match the plan's office (Admin bypasses this)
- Admin can add goals to any plan regardless of status or office

---

## Step 3 — Office Head Adds Objectives Under a Goal

> Inside a goal row on the plan detail page.

```
Click "+ Add Objective" inside a goal
  → Fill in objective fields (same structure as goal fields)
  → Click Save
  → POST /api/v1/plans/:planId/goals/:goalId/objectives
  → Objective saved under that goal
```

**Rules enforced by the server:**

- Same rules as adding goals (DRAFT plan, matching office)

---

## Step 4 — Office Head Submits the Plan

> On the plan detail page, after all goals and objectives are entered.

```
Click "Submit for Review"
  → PATCH /api/v1/plans/:planId/submit
  → Plan status: "DRAFT" → "SUBMITTED"
  → Goals and Objectives are now LOCKED
     (no more adds, edits, or deletes by Office Head)
```

---

## Step 5 — Director / Vice President Reviews

> Login as `DIRECTORS` or `VICE_PRESIDENTS`.

```
Navigate to /plans
  → GET /api/v1/plans
  → Server returns only plans from offices BELOW this user in the org tree
     (Director sees Office Heads under their office only)

Click on a plan to view it
  → Can see all goals and objectives
  → Can post remarks on goals and objectives
  → Cannot edit goals or objectives (different office)
```

**Hierarchy visibility rule:**
| Role | Can see plans from |
|------|--------------------|
| `OFFICE_HEAD` | Own office only |
| `DIRECTORS` | Office Heads under their office |
| `VICE_PRESIDENTS` | Directors under their office |
| `PRESIDENTS` | All offices |
| `ADMIN` | All offices |

---

## Step 6 — Admin Approves the Plan

> Login as `ADMIN`.

```
Navigate to /plans (or pending approvals section)
  → Find the SUBMITTED plan
  → Click "Approve"
  → PATCH /api/v1/plans/:planId/approve
  → Plan status: "SUBMITTED" → "APPROVED"
  → Plan is now permanently read-only for all non-admin roles
```

---

## Quick Demo Script

| #   | Who         | Action                            | Route                        |
| --- | ----------- | --------------------------------- | ---------------------------- |
| 1   | Admin       | Create offices in hierarchy       | `/admin/offices`             |
| 2   | Admin       | Assign roles and offices to users | `/admin/users`               |
| 3   | Office Head | Log in and create a plan          | `/plans/new`                 |
| 4   | Office Head | Add goals to the plan             | `/plans/:id`                 |
| 5   | Office Head | Add objectives under each goal    | `/plans/:id`                 |
| 6   | Office Head | Submit plan for review            | `/plans/:id` → Submit button |
| 7   | Director    | Log in and view submitted plan    | `/plans`                     |
| 8   | Director    | Post a remark on a goal           | `/plans/:id`                 |
| 9   | Admin       | Approve the plan                  | `/plans` → Approve button    |

---

## Permission Cheat Sheet

| Action                | Allowed Roles                                          | Extra Condition                                                                 |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Create office         | `ADMIN`                                                | —                                                                               |
| Assign user role      | `ADMIN`                                                | —                                                                               |
| Assign user office    | `ADMIN`                                                | —                                                                               |
| Create plan           | `OFFICE_HEAD`, `DIRECTORS`, `VICE_PRESIDENTS`, `ADMIN` | User must have an office assigned                                               |
| Add / edit goals      | Same + all roles                                       | Plan must be **DRAFT**; user's office must match plan's office (Admin bypasses) |
| Add / edit objectives | Same                                                   | Same as goals                                                                   |
| Submit plan           | `OFFICE_HEAD` (own plan)                               | Plan must be **DRAFT**                                                          |
| Approve plan          | `ADMIN` only                                           | Plan must be **SUBMITTED**                                                      |
| Post remarks          | All roles                                              | Must be in accessible hierarchy scope                                           |
| View plans            | All roles                                              | Only sees plans from accessible offices in their hierarchy                      |

---

## Role Descriptions

| Role              | Access                                                                          |
| ----------------- | ------------------------------------------------------------------------------- |
| `ADMIN`           | Full system access — manage users, offices, goals, approve plans, view all data |
| `PRESIDENTS`      | Full view and oversight of all plans, goals, objectives, and remarks            |
| `VICE_PRESIDENTS` | Monitor goals/objectives of Directors under their supervision; post remarks     |
| `DIRECTORS`       | View and respond to remarks from assigned Office Heads; escalate to VP          |
| `OFFICE_HEAD`     | Create goals and objectives for their own office; post remarks; submit plans    |

---

## User Login Methods

| Method       | How                                                                          |
| ------------ | ---------------------------------------------------------------------------- |
| Google OAuth | Click "Login with Google" — only `@chmsu.edu.ph` email addresses are allowed |
| Password     | Username + password (for accounts that have a password set)                  |

---

## Plan Status Definitions

| Status      | Meaning                                                           |
| ----------- | ----------------------------------------------------------------- |
| `DRAFT`     | Plan is being prepared. Goals and objectives can be added/edited. |
| `SUBMITTED` | Plan has been submitted for review. No edits allowed.             |
| `APPROVED`  | Plan has been approved by Admin. Fully locked.                    |

---

_Document generated: May 26, 2026_
