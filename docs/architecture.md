# Staff Task Scheduling & Monitoring Portal - Architecture Document

## 1. Architecture Overview

This document defines the technical architecture for the Staff Task Scheduling & Monitoring Portal POC. The system is a monolithic full-stack web application built on Next.js, with server-side API routes handling all backend logic, a React-based frontend with Tailwind CSS for the UI, PostgreSQL for persistence, and Prisma as the ORM.

The architecture is intentionally simple. It avoids microservices, message queues, caching layers, real-time infrastructure, and container orchestration. The goal is a working end-to-end demo within a 2-3 day development window for a 4-person team.

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
│         React + TypeScript + Tailwind CSS            │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (JSON)
┌──────────────────────▼──────────────────────────────┐
│              Next.js Application                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  App Router (Pages / Layouts / Middleware)     │  │
│  └───────────────────────┬───────────────────────┘  │
│  ┌───────────────────────▼───────────────────────┐  │
│  │  Route Handlers (API Routes)                  │  │
│  │  /api/auth/*                                  │  │
│  │  /api/work-orders/*                           │  │
│  │  /api/tasks/*                                 │  │
│  │  /api/staff/*                                 │  │
│  │  /api/dashboard/*                             │  │
│  └───────────────────────┬───────────────────────┘  │
│  ┌───────────────────────▼───────────────────────┐  │
│  │  Service Layer (Business Logic)               │  │
│  └───────────────────────┬───────────────────────┘  │
│  ┌───────────────────────▼───────────────────────┐  │
│  │  Prisma ORM                                  │  │
│  └───────────────────────┬───────────────────────┘  │
└──────────────────────────┼──────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │      PostgreSQL          │
              └─────────────────────────┘
```

**Key architectural decisions:**

- **Monolithic Next.js app:** Frontend and backend co-located in a single deployable unit. API routes handle all server logic.
- **Session-based auth:** A signed, HttpOnly session cookie stores the user ID and role. No JWT tokens in localStorage.
- **Server-side rendering:** Dashboards and data views use React Server Components where possible to reduce client-side JavaScript and simplify data fetching.
- **Zod at the boundary:** All incoming API payloads are validated with Zod schemas before touching business logic.
- **Prisma for all DB access:** Raw SQL is avoided. All queries go through Prisma's query builder or generated client.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | Next.js 14+ (App Router) | Server-side rendering, routing, API routes |
| UI Library | React 18+ | Component-based UI |
| Language | TypeScript | Type safety across frontend and backend |
| Styling | Tailwind CSS 3+ | Utility-first CSS, rapid UI development |
| Backend Runtime | Node.js (built into Next.js) | Server-side execution environment |
| API Layer | Next.js Route Handlers | RESTful API endpoints under `/api/*` |
| Database | PostgreSQL 14+ | Relational data storage |
| ORM | Prisma 5+ | Type-safe database access, migrations, seeding |
| Validation | Zod | Runtime schema validation with TypeScript inference |
| Authentication | `next-auth` or `jose` + `iron-session` | Secure session-based auth with HttpOnly cookies |
| Package Manager | npm or yarn | Dependency management |

---

## 3. High-Level System Architecture

The application is structured as a single Next.js project using the App Router. The directory layout separates concerns while keeping everything in one deployable unit.

### 3.1 Request Lifecycle

```
Browser Request
     │
     ▼
Next.js Middleware ──► Auth check (session cookie)
     │                     │
     │                No session → Redirect to /login
     │                     │
     ▼                     ▼
Page Component /     Route Handler
API Route Handler
     │                     │
     ▼                     ▼
Zod Validation        Zod Validation
     │                     │
     ▼                     ▼
Service Layer         Service Layer
     │                     │
     ▼                     ▼
Prisma Client         Prisma Client
     │                     │
     ▼                     ▼
PostgreSQL            PostgreSQL
```

### 3.2 Component Communication

- **Pages ↔ API Routes:** Pages call API routes via `fetch()` for data mutations and dynamic data loads.
- **Pages ↔ Server Components:** Static or semi-static data is fetched directly in React Server Components using Prisma.
- **API Routes ↔ Service Layer:** Route handlers delegate business logic to service functions. Route handlers handle HTTP concerns (status codes, response shape). Services handle rules and validation.
- **Service Layer ↔ Prisma:** Services call Prisma Client methods for all database operations.

---

## 4. Frontend Architecture

### 4.1 App Router Structure

The frontend uses Next.js App Router with route groups to separate admin and staff interfaces:

```
app/
├── (auth)/
│   ├── login/page.tsx              # Shared login page
│   └── layout.tsx                  # Auth layout (centered form)
├── (dashboard)/
│   ├── layout.tsx                  # Dashboard layout (sidebar, nav)
│   ├── admin/
│   │   ├── page.tsx                # Admin dashboard
│   │   ├── work-orders/
│   │   │   ├── new/page.tsx        # Create work order
│   │   │   ├── [id]/page.tsx       # Work order details
│   │   │   └── page.tsx            # List work orders
│   │   └── tasks/
│   │       └── page.tsx            # Monitor assigned tasks
│   ├── staff/
│   │   ├── page.tsx                # Staff dashboard
│   │   ├── tasks/
│   │   │   ├── page.tsx            # Today's tasks list
│   │   │   └── [id]/page.tsx       # Task details + actions
│   └── page.tsx                    # Root redirect based on role
├── api/
│   ├── auth/
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   └── me/route.ts
│   ├── work-orders/
│   │   ├── route.ts                # GET (list), POST (create)
│   │   ├── [id]/route.ts           # GET (details)
│   │   └── suitable-staff/route.ts # POST (find available staff)
│   ├── tasks/
│   │   ├── route.ts                # GET (list tasks)
│   │   ├── [id]/route.ts           # GET (task details)
│   │   ├── [id]/start/route.ts     # POST (start task)
│   │   ├── [id]/complete/route.ts  # POST (complete task)
│   │   └── [id]/remarks/route.ts   # POST (add remark), GET (list remarks)
│   └── dashboard/
│       ├── admin/route.ts          # GET (admin stats)
│       └── staff/route.ts          # GET (staff stats)
├── layout.tsx                      # Root layout
└── page.tsx                        # Root page (redirect)
```

### 4.2 Component Organization

```
components/
├── ui/                             # Reusable primitives
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Modal.tsx
│   └── Table.tsx
├── forms/
│   ├── LoginForm.tsx
│   ├── WorkOrderForm.tsx
│   └── RemarkForm.tsx
├── admin/
│   ├── AdminSidebar.tsx
│   ├── AdminDashboardStats.tsx
│   ├── WorkOrderList.tsx
│   ├── WorkOrderCard.tsx
│   ├── SuitableStaffList.tsx
│   └── TaskMonitorTable.tsx
├── staff/
│   ├── StaffSidebar.tsx
│   ├── StaffDashboardStats.tsx
│   ├── TodayTaskList.tsx
│   ├── TaskDetailCard.tsx
│   └── TaskRemarks.tsx
└── shared/
    ├── Header.tsx
    ├── StatusBadge.tsx
    └── EmptyState.tsx
```

### 4.3 Client vs Server Components

| Component Type | Rendering | Use Case |
|---------------|-----------|----------|
| Server Component (default) | Server-side | Dashboards, task lists, data tables — fetch data directly from Prisma in the component. |
| Client Component (`"use client"`) | Client-side | Forms, buttons, interactive elements — anything that handles user events, state, or `useState`/`useEffect`. |

The goal is to maximize Server Components and minimize client-side JavaScript. Client components are used only when interactivity is required.

### 4.4 State Management

No external state management library is used for the POC.

- **Server state:** Fetched via Server Components or API routes. Page refresh re-fetches.
- **Form state:** Local `useState` within form components.
- **URL state:** Query parameters for date filtering on the admin task list.
- **No global client state store** is needed for this POC scope.

### 4.5 Styling

Tailwind CSS is the sole styling approach. No CSS modules, styled-components, or additional CSS frameworks.

- Utility classes directly on elements.
- Consistent color palette using Tailwind's `blue` (primary), `gray` (neutral), `green` (success), `red` (error), `yellow` (warning) scales.
- A shared `tailwind.config.ts` extends the default theme with the portal's brand colors if needed.

---

## 5. Backend/API Architecture

### 5.1 Route Handler Pattern

Every API route handler follows a consistent pattern:

```
Route Handler (HTTP layer)
  │
  ├─ 1. Parse and validate request with Zod
  ├─ 2. Authenticate the session
  ├─ 3. Authorize the role
  ├─ 4. Call the service function
  └─ 5. Return JSON response
```

**Example structure:**

```typescript
// app/api/work-orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createWorkOrderSchema } from "@/lib/validations/work-order";
import { createWorkOrder } from "@/services/work-order";
import { getAuthSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // 1. Parse body
  const body = await request.json();

  // 2. Validate with Zod
  const parsed = createWorkOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 3. Authenticate
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 4. Call service
  try {
    const workOrder = await createWorkOrder(parsed.data);
    return NextResponse.json(workOrder, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create work order" },
      { status: 500 }
    );
  }
}
```

### 5.2 Service Layer

Business logic lives in service functions, separated from route handlers. This keeps logic testable and reusable.

```
lib/
├── auth/
│   ├── session.ts               # Session creation, retrieval, destruction
│   ├── middleware.ts             # Route protection logic
│   └── passwords.ts             # Password hashing (bcrypt)
├── validations/
│   ├── auth.ts                  # Login schema
│   ├── work-order.ts            # Work order create/assign schemas
│   ├── task.ts                  # Task action schemas
│   └── remark.ts                # Remark schemas
└── constants.ts                 # Enums, role lists, status values

services/
├── auth.service.ts              # Login, logout, session management
├── work-order.service.ts        # Create, list, find suitable staff
├── task.service.ts              # Start, complete, add remarks
├── staff.service.ts             # Staff queries, availability checks
└── dashboard.service.ts         # Aggregate statistics
```

### 5.3 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Authenticate user, create session |
| POST | `/api/auth/logout` | Any | Destroy session |
| GET | `/api/auth/me` | Any | Return current user from session |
| POST | `/api/work-orders` | ADMIN | Create a new work order |
| GET | `/api/work-orders` | ADMIN | List work orders (filterable by date) |
| GET | `/api/work-orders/[id]` | ADMIN | Get work order details |
| POST | `/api/work-orders/suitable-staff` | ADMIN | Find available staff for a work order |
| GET | `/api/tasks` | Any | List tasks (filtered by role: admin sees all, staff sees own) |
| GET | `/api/tasks/[id]` | Any | Get task details with remarks |
| POST | `/api/tasks/[id]/start` | STAFF | Transition task to IN_PROGRESS |
| POST | `/api/tasks/[id]/complete` | STAFF | Transition task to COMPLETED |
| GET | `/api/tasks/[id]/remarks` | Any | List remarks for a task |
| POST | `/api/tasks/[id]/remarks` | STAFF | Add a remark to a task |
| GET | `/api/dashboard/admin` | ADMIN | Admin dashboard statistics |
| GET | `/api/dashboard/staff` | STAFF | Staff dashboard statistics |

### 5.4 Response Format

All API responses follow a consistent JSON shape:

```json
// Success
{
  "data": { ... }
}

// Success (list)
{
  "data": [ ... ],
  "total": 25
}

// Error
{
  "error": "Human-readable error message",
  "details": { ... }  // Optional: Zod validation errors
}
```

---

## 6. Database Layer

### 6.1 Prisma Schema Overview

The database is PostgreSQL. The Prisma schema defines all models, enums, and relationships. Migrations are managed through `prisma migrate`.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  STAFF
}

enum StaffRole {
  CLEANER
  TECHNICIAN
  GUARD
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

enum TaskStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
}

model User {
  id           String      @id @default(cuid())
  email        String      @unique
  passwordHash String      @map("password_hash")
  firstName    String      @map("first_name")
  lastName     String      @map("last_name")
  role         Role
  staffRole    StaffRole?  @map("staff_role")  // Only for STAFF users
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  assignedTasks Task[]     @relation("AssignedTo")
  remarks       Remark[]   @relation("AuthorOf")

  @@map("users")
}

model WorkOrder {
  id             String     @id @default(cuid())
  title          String
  description    String
  requiredRole   StaffRole  @map("required_role")
  priority       Priority
  date           DateTime   @db.Date
  startTime      DateTime   @map("start_time")  // Time-only stored as DateTime
  endTime        DateTime   @map("end_time")    // Time-only stored as DateTime
  createdAt      DateTime   @default(now()) @map("created_at")
  updatedAt      DateTime   @updatedAt @map("updated_at")

  task           Task?

  @@map("work_orders")
}

model Task {
  id          String     @id @default(cuid())
  status      TaskStatus @default(SCHEDULED)
  startedAt   DateTime?  @map("started_at")
  completedAt DateTime?  @map("completed_at")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  workOrderId String     @unique @map("work_order_id")
  workOrder   WorkOrder  @relation(fields: [workOrderId], references: [id])

  assignedToId String    @map("assigned_to_id")
  assignedTo   User      @relation("AssignedTo", fields: [assignedToId], references: [id])

  remarks      Remark[]

  @@map("tasks")
}

model Remark {
  id        String   @id @default(cuid())
  text      String
  createdAt DateTime @default(now()) @map("created_at")

  taskId    String   @map("task_id")
  task      Task     @relation(fields: [taskId], references: [id])

  authorId  String   @map("author_id")
  author    User     @relation("AuthorOf", fields: [authorId], references: [id])

  @@map("remarks")
}
```

### 6.2 Key Relationships

```
User (1) ──────< (N) Task          # A staff member has many tasks
WorkOrder (1) ──── (1) Task        # A work order produces one task when assigned
Task (1) ──────< (N) Remark        # A task has many remarks
User (1) ──────< (N) Remark        # A user authors many remarks
```

### 6.3 Seeding Strategy

A Prisma seed script (`prisma/seed.ts`) populates the database with test data:

- **2 Admin users** (e.g., admin@portal.com, manager@portal.com)
- **5-8 Staff users** across 2-3 staff roles (CLEANER, TECHNICIAN, GUARD)
- **5-10 Sample work orders** for today and upcoming dates
- **3-5 Sample tasks** in various statuses (SCHEDULED, IN_PROGRESS, COMPLETED)
- **2-3 Sample remarks** on in-progress tasks

All passwords are bcrypt hashes of simple values (e.g., `password123`) for easy POC testing.

---

## 7. Authentication and Authorization

### 7.1 Session Management

The POC uses a cookie-based session approach. Options:

- **Option A: `iron-session`** — Lightweight, encrypted cookie session. No external store needed.
- **Option B: Custom with `jose`** — Signed JWT stored in an HttpOnly, Secure, SameSite=Lax cookie.

Either approach stores a minimal payload in the session:

```typescript
interface SessionPayload {
  userId: string;
  email: string;
  role: "ADMIN" | "STAFF";
  staffRole?: "CLEANER" | "TECHNICIAN" | "GUARD"; // Only for STAFF
}
```

### 7.2 Auth Flow

```
1. User submits email + password to POST /api/auth/login
2. Server looks up user by email
3. Server verifies password against stored bcrypt hash
4. On success:
   a. Create session payload with userId, email, role, staffRole
   b. Sign and encrypt the session data
   c. Set HttpOnly cookie on the response
   d. Return user info (without password hash)
5. On failure:
   a. Return 401 with generic "Invalid credentials" message
```

### 7.3 Middleware Protection

Next.js Middleware runs on every matched route and checks for a valid session:

```typescript
// middleware.ts (project root)
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("session");

  // Public routes: /login, /api/auth/login
  if (isPublicRoute(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // No session → redirect to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify and decode session (decrypt cookie)
  // If invalid → clear cookie, redirect to login
  // If valid → check role-based access for /admin/* and /staff/* routes

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### 7.4 Server-Side Session Retrieval

In Route Handlers and Server Components, the session is retrieved via a helper:

```typescript
// lib/auth/session.ts
export async function getAuthSession(): Promise<SessionPayload | null> {
  // Read cookie, decrypt, validate, return payload or null
}
```

This function is called at the top of every protected Route Handler and Server Component.

---

## 8. Role-Based Access

### 8.1 Route-Level Protection

| Route Pattern | Allowed Role | Behavior on Violation |
|--------------|-------------|----------------------|
| `/login` | Public | Redirect to dashboard if already authenticated |
| `/admin/*` | ADMIN | Redirect to `/staff` if STAFF, redirect to `/login` if unauthenticated |
| `/staff/*` | STAFF | Redirect to `/admin` if ADMIN, redirect to `/login` if unauthenticated |
| `/api/work-orders/*` | ADMIN | Return 401 if not ADMIN |
| `/api/dashboard/admin` | ADMIN | Return 401 if not ADMIN |
| `/api/tasks/*/start` | STAFF | Return 401 if not STAFF |
| `/api/tasks/*/complete` | STAFF | Return 401 if not STAFF |
| `/api/tasks/*/remarks` (POST) | STAFF | Return 401 if not STAFF |

### 8.2 API-Level Authorization

Every Route Handler enforces role at the handler level, after retrieving the session. This is a defense-in-depth measure — Middleware handles page-level redirects, but API handlers independently verify authorization.

### 8.3 Data-Level Authorization

Staff users can only see and interact with their own data:

- **Task list:** Filtered to `task.assignedToId === session.userId`
- **Task details:** Verified that `task.assignedToId === session.userId`
- **Start/Complete/Remark:** Verified that the task belongs to the logged-in staff member

Admin users have unrestricted access to all records.

---

## 9. Work Order Flow

### 9.1 Create Work Order

```
Admin Action:
  1. Admin navigates to /admin/work-orders/new
  2. Admin fills in:
     - Title
     - Description
     - Required Staff Role (dropdown: CLEANER, TECHNICIAN, GUARD)
     - Priority (dropdown: LOW, MEDIUM, HIGH)
     - Date (date picker, today or future only)
     - Start Time (time picker)
     - End Time (time picker)
  3. Admin clicks "Find Available Staff"

System Action:
  4. Frontend sends POST /api/work-orders/suitable-staff
     with { requiredRole, date, startTime, endTime }
  5. Backend validates inputs with Zod
  6. Backend queries:
     a. Find all users WHERE role = STAFF AND staffRole = requiredRole
     b. For each candidate, check for overlapping tasks on the given date
     c. Return list of available staff with their existing tasks for the day
  7. Frontend displays the suitable staff list
```

### 9.2 Assign Work Order

```
System Action (continued):
  8. Admin selects a staff member from the list
  9. Admin clicks "Assign"

System Action:
  10. Frontend sends POST /api/work-orders
      with { title, description, requiredRole, priority, date, startTime, endTime, assignedToId }
  11. Backend validates all fields with Zod
  12. Backend creates WorkOrder record
  13. Backend creates Task record linked to the WorkOrder:
      - status: SCHEDULED
      - assignedToId: selected staff member
  14. Backend returns the created work order and task
  15. Frontend shows success and redirects to work order list
```

---

## 10. Staff Allocation Flow

### 10.1 Role Matching

```
Given a work order requiring role R on date D during time window [T_start, T_end]:

Step 1: Query all users WHERE role = STAFF AND staffRole = R
        Result: candidate list C

Step 2: For each user U in C:
        a. Query all tasks WHERE assignedToId = U.id
           AND task.workOrder.date = D
           AND task.status IN (SCHEDULED, IN_PROGRESS)
        b. For each existing task E, check for time overlap:
           overlap = E.workOrder.startTime < T_end AND E.workOrder.endTime > T_start
        c. If any overlap exists, U is NOT available
        d. If no overlap, U IS available

Step 3: Return available staff list
```

### 10.2 Time Overlap Algorithm

Two time windows overlap when:

```
ExistingTask.StartTime < NewTask.EndTime
  AND
ExistingTask.EndTime > NewTask.StartTime
```

**Example:**

```
Existing: 09:00 - 12:00
New:      10:00 - 14:00
Overlap:  10:00 - 12:00  ← CONFLICT

Existing: 09:00 - 11:00
New:      14:00 - 17:00
Overlap:  none  ← AVAILABLE
```

### 10.3 Assignment Conflict Prevention

The overlap check is enforced both:

1. **At suggestion time:** When the admin clicks "Find Available Staff," only non-conflicting users are shown.
2. **At assignment time:** The backend re-checks availability before creating the task. If a conflict is detected (e.g., another admin assigned the same slot in the meantime), the assignment is rejected with a 409 Conflict error.

### 10.4 Staff List Display

For each available staff member, the response includes:

```json
{
  "id": "clx123...",
  "firstName": "John",
  "lastName": "Doe",
  "staffRole": "TECHNICIAN",
  "tasksOnDate": 2,
  "timeSlots": [
    { "startTime": "09:00", "endTime": "11:00" },
    { "startTime": "14:00", "endTime": "16:00" }
  ]
}
```

---

## 11. Day-Based Scheduling Flow

### 11.1 Date Handling

- All dates are stored as PostgreSQL `DATE` type (via Prisma `@db.Date`).
- Start and end times are stored as `TIMESTAMP` but the date portion is the work order's scheduled date. The time portion is the scheduled time.
- The server operates in a single timezone (configured via `TZ` environment variable). No timezone conversion logic is needed for the POC.

### 11.2 Admin Date View

```
1. Admin navigates to /admin/tasks or /admin/work-orders
2. A date selector allows choosing a date (defaults to today)
3. API returns all work orders/tasks for the selected date
4. Each task card shows:
   - Title, time window, assigned staff, status badge, priority badge
5. Admin can click into a task to see full details and status history
```

### 11.3 Staff Today View

```
1. Staff navigates to /staff/tasks
2. API returns tasks WHERE:
   - assignedToId = current user's ID
   - workOrder.date = today's date
3. Tasks are ordered by startTime ascending
4. Each task card shows:
   - Title, time window, status badge, priority badge
5. "Start" button is enabled only when:
   - status = SCHEDULED
   - current time >= scheduled start time
```

---

## 12. Task Status Flow

### 12.1 State Machine

```
         ┌──────────────┐
         │  SCHEDULED   │
         └──────┬───────┘
                │
                │ Staff clicks "Start Task"
                │ Condition: currentTime >= scheduledStartTime
                │
         ┌──────▼───────┐
         │ IN_PROGRESS  │
         └──────┬───────┘
                │
                │ Staff clicks "Mark as Completed"
                │ Condition: task.status === IN_PROGRESS
                │
         ┌──────▼───────┐
         │  COMPLETED   │
         └──────────────┘
```

### 12.2 Start Task

```
POST /api/tasks/[id]/start

1. Validate: task exists, assigned to current user, status = SCHEDULED
2. Validate: current time >= scheduled start time
3. Update task:
   - status = IN_PROGRESS
   - startedAt = current timestamp
4. Return updated task
```

### 12.3 Complete Task

```
POST /api/tasks/[id]/complete

1. Validate: task exists, assigned to current user, status = IN_PROGRESS
2. Update task:
   - status = COMPLETED
   - completedAt = current timestamp
3. Return updated task
```

### 12.4 Add Remark

```
POST /api/tasks/[id]/remarks

1. Validate: task exists, assigned to current user, status = IN_PROGRESS
2. Validate remark text with Zod (1-1000 chars)
3. Create remark:
   - text: provided text
   - authorId: current user ID
   - taskId: provided task ID
4. Return created remark
```

---

## 13. Admin Module

### 13.1 Pages and Views

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin` | Summary stats for today: total work orders, status breakdown, staff availability count |
| Create Work Order | `/admin/work-orders/new` | Form to create and assign a work order |
| Work Orders List | `/admin/work-orders` | List of all work orders with date filter, showing status and assigned staff |
| Work Order Details | `/admin/work-orders/[id]` | Full details of a work order and its linked task, including remarks |
| Task Monitor | `/admin/tasks` | List of all tasks for a selected date, filterable by status, showing assigned staff |

### 13.2 Admin Workflows

**Create and Assign:**
```
/admin/work-orders/new
  → Fill form (title, description, role, priority, date, start, end)
  → Click "Find Available Staff"
  → System shows matching available staff
  → Select a staff member
  → Click "Assign"
  → Redirect to work orders list
```

**Monitor Tasks:**
```
/admin/tasks?date=2026-09-14
  → See all tasks for the date
  → Status badges show SCHEDULED / IN_PROGRESS / COMPLETED
  → Click into any task to see details and remarks
  → No real-time updates; refresh to see latest status
```

### 13.3 Dashboard Statistics

```
Admin Dashboard for date D:
  - Total work orders on date D
  - SCHEDULED count
  - IN_PROGRESS count
  - COMPLETED count
  - Total staff with matching role
  - Staff with at least one task on date D
  - Staff with no tasks on date D (available)
```

---

## 14. User/Staff Module

### 14.1 Pages and Views

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/staff` | Summary stats for today: task counts, next upcoming task |
| Today's Tasks | `/staff/tasks` | List of tasks assigned to the staff member for today, ordered by start time |
| Task Details | `/staff/tasks/[id]` | Full task details with action buttons (Start, Complete) and remarks section |

### 14.2 Staff Workflows

**View and Execute:**
```
/staff/tasks
  → See today's tasks ordered by start time
  → Click into a task
  → Task detail page shows:
    - Title, description, time window, priority
    - Current status badge
    - "Start Task" button (enabled if SCHEDULED and time has arrived)
    - "Mark as Completed" button (enabled if IN_PROGRESS)
    - Remarks section (view existing, add new while IN_PROGRESS)
```

### 14.3 Dashboard Statistics

```
Staff Dashboard for today:
  - Total tasks assigned to this staff member
  - SCHEDULED count
  - IN_PROGRESS count
  - COMPLETED count
  - Next upcoming task: { title, startTime }
```

---

## 15. API Communication Flow

### 15.1 Frontend to Backend

All data communication between the React frontend and the Next.js API routes uses the `fetch` API over HTTP (same origin, same server).

**For Server Components (default):**

```typescript
// In a React Server Component — direct Prisma call, no fetch needed
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const stats = await prisma.task.groupBy({ ... });
  return <DashboardStats stats={stats} />;
}
```

**For Client Components:**

```typescript
"use client";

async function handleAssign(staffId: string) {
  const response = await fetch("/api/work-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...formData, assignedToId: staffId }),
  });

  const result = await response.json();

  if (!response.ok) {
    setError(result.error);
    return;
  }

  router.push("/admin/work-orders");
}
```

### 15.2 Error Communication

| HTTP Status | Meaning | Response Shape |
|------------|---------|----------------|
| 200 | Success | `{ "data": ... }` |
| 201 | Created | `{ "data": ... }` |
| 400 | Validation error | `{ "error": "...", "details": { ... } }` |
| 401 | Unauthorized | `{ "error": "Unauthorized" }` |
| 403 | Forbidden | `{ "error": "Forbidden" }` |
| 404 | Not found | `{ "error": "Not found" }` |
| 409 | Conflict (e.g., assignment conflict) | `{ "error": "..." }` |
| 500 | Server error | `{ "error": "Internal server error" }` |

---

## 16. Error Handling Approach

### 16.1 Backend Error Handling

- **Zod validation errors:** Caught in the Route Handler, returned as 400 with flattened error details.
- **Business logic errors:** Service functions throw typed errors (e.g., `AssignmentConflictError`, `TaskNotFoundError`). Route Handlers catch these and return appropriate HTTP status codes.
- **Database errors:** Prisma errors are caught and translated to user-friendly messages. Raw Prisma errors are never exposed to the client.
- **Unhandled errors:** A top-level try/catch in each Route Handler catches unexpected errors and returns a generic 500 response.

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
  }
}

export class AssignmentConflictError extends AppError {
  constructor(message = "Staff member is no longer available for this time slot") {
    super(message, 409, "ASSIGNMENT_CONFLICT");
  }
}

export class TaskNotFoundError extends AppError {
  constructor() {
    super("Task not found", 404, "TASK_NOT_FOUND");
  }
}

export class InvalidTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(`Cannot transition from ${from} to ${to}`, 400, "INVALID_TRANSITION");
  }
}
```

### 16.2 Frontend Error Handling

- **API errors:** Displayed as inline error messages or toast notifications. No browser alerts.
- **Form errors:** Displayed below the relevant form field using the Zod error details.
- **Page-level errors:** A simple error boundary component catches rendering errors and displays a fallback UI with a "Retry" button.

---

## 17. Validation Approach

### 17.1 Schema Definitions

All validation schemas are defined in `lib/validations/` using Zod. Each schema is a single source of truth for both the expected input shape and the TypeScript type.

```typescript
// lib/validations/work-order.ts
import { z } from "zod";

export const createWorkOrderSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  requiredRole: z.enum(["CLEANER", "TECHNICIAN", "GUARD"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  date: z.string().refine((val) => {
    const date = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }, "Date must be today or in the future"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  assignedToId: z.string().cuid(),
}).refine((data) => data.endTime > data.startTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
```

### 17.2 Validation Strategy

| Layer | What is validated |
|-------|-------------------|
| Zod schemas (API boundary) | All incoming request bodies. Invalid input is rejected before reaching business logic. |
| Prisma (database) | Unique constraints, foreign key constraints, required fields. These are the last line of defense. |
| Service layer (business rules) | Availability checks, status transition rules, ownership verification. |
| Frontend forms | Quick client-side validation for immediate feedback. Server-side validation is always enforced regardless. |

---

## 18. Project Folder Structure

```
staff-task-scheduling-portal/
├── app/                              # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   ├── work-orders/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── tasks/
│   │   │       └── page.tsx
│   │   ├── staff/
│   │   │   ├── page.tsx
│   │   │   └── tasks/
│   │   │       ├── page.tsx
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── route.ts
│   │   │   ├── logout/
│   │   │   │   └── route.ts
│   │   │   └── me/
│   │   │       └── route.ts
│   │   ├── work-orders/
│   │   │   ├── route.ts
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   └── suitable-staff/
│   │   │       └── route.ts
│   │   ├── tasks/
│   │   │   ├── route.ts
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts
│   │   │   │   ├── start/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── complete/
│   │   │   │   │   └── route.ts
│   │   │   │   └── remarks/
│   │   │   │       └── route.ts
│   │   └── dashboard/
│   │       ├── admin/
│   │       │   └── route.ts
│   │       └── staff/
│   │           └── route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── forms/
│   ├── admin/
│   ├── staff/
│   └── shared/
├── lib/
│   ├── auth/
│   │   ├── session.ts
│   │   ├── middleware.ts
│   │   └── passwords.ts
│   ├── validations/
│   │   ├── auth.ts
│   │   ├── work-order.ts
│   │   ├── task.ts
│   │   └── remark.ts
│   ├── errors.ts
│   ├── constants.ts
│   └── prisma.ts
├── services/
│   ├── auth.service.ts
│   ├── work-order.service.ts
│   ├── task.service.ts
│   ├── staff.service.ts
│   └── dashboard.service.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/
│   └── favicon.ico
├── middleware.ts                      # Next.js Middleware (auth)
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
├── package.json
├── .env                               # DATABASE_URL, SESSION_SECRET, TZ
├── .env.example
└── .gitignore
```

---

## 19. Development Workflow for the 4-Person Team

### 19.1 Team Roles and Task Allocation

| Person | Focus Area | Primary Tasks |
|--------|-----------|---------------|
| **Dev 1** | Backend / API | Prisma schema, migrations, seed data, API route handlers, service layer |
| **Dev 2** | Auth / Infra | Authentication flow, session management, middleware, project setup, `.env` config |
| **Dev 3** | Admin UI | Admin pages, work order forms, staff selection, task monitor, dashboard stats |
| **Dev 4** | Staff UI | Staff pages, today's tasks, task details, start/complete flow, remarks |

### 19.2 Development Timeline

**Day 1 (Foundation):**

| Time | Dev 1 | Dev 2 | Dev 3 | Dev 4 |
|------|-------|-------|-------|-------|
| Morning | Prisma schema + migrations | Project setup, auth flow | Login page UI | Component scaffolding |
| Afternoon | Seed data + service layer | Session + middleware | Admin layout + sidebar | Staff layout + sidebar |

**Day 2 (Core Features):**

| Time | Dev 1 | Dev 2 | Dev 3 | Dev 4 |
|------|-------|-------|-------|-------|
| Morning | Work order + task APIs | Auth testing + fixes | Work order creation form | Today's tasks list |
| Afternoon | Staff allocation APIs | Dashboard APIs | Suitable staff + assignment | Task details + actions |

**Day 3 (Polish):**

| Time | Dev 1 | Dev 2 | Dev 3 | Dev 4 |
|------|-------|-------|-------|-------|
| Morning | Remarks + remaining APIs | Error handling + edge cases | Dashboard stats + monitoring | Remarks + task completion |
| Afternoon | Bug fixes, integration | Final testing + seed data | UI polish + validation | UI polish + validation |

### 19.3 Branch Strategy

- `main` — Stable, deployable branch.
- `dev` — Integration branch for daily merges.
- Feature branches: `feat/admin-dashboard`, `feat/task-status`, `feat/auth`, etc.

Merge flow: `feature branch` → `dev` → `main` (end of each day or after review).

### 19.4 Communication Protocol

- Daily sync at start and end of each day.
- API contract shared early (endpoint signatures, request/response shapes) so frontend and backend can develop in parallel.
- Shared TypeScript types in `lib/types.ts` or derived from Zod schemas to ensure frontend/backend type alignment.

---

## 20. POC Deployment Architecture

### 20.1 Local Development

```
Developer Machine
├── Next.js dev server (port 3000)
├── PostgreSQL (local install or Docker container)
└── .env with local connection string
```

Each developer runs the full stack locally. PostgreSQL can be installed directly or run via a simple Docker command:

```bash
docker run -d --name scheduling-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=scheduling_portal postgres:16
```

This is the only Docker usage for the POC — no Docker Compose, no orchestration.

### 20.2 POC Demo Deployment

For the POC demo, deploy as a single unit:

```
┌─────────────────────────────────┐
│        Single Host / VM         │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Next.js App (node)       │  │
│  │  - Serves frontend        │  │
│  │  - Handles API routes     │  │
│  │  - Runs on port 3000      │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  PostgreSQL               │  │
│  │  - Single database        │  │
│  │  - Runs on port 5432      │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

**Deployment options for the POC:**

- **Option A: Railway / Render / Fly.io** — Deploy the Next.js app and a managed PostgreSQL instance. Simplest for POC.
- **Option B: Single VPS (e.g., DigitalOcean, Linode)** — Run both Next.js and PostgreSQL on one machine.
- **Option C: Local machine for demo** — Run on a team member's laptop connected to the same network.

### 20.3 Environment Variables

```env
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/scheduling_portal"
SESSION_SECRET="a-random-32-char-string-for-encryption"
TZ="Asia/Kolkata"
NODE_ENV="development"
```

---

## 21. Future MVP Expansion Path

The POC architecture is designed to be a subset of a larger system. After a successful POC, the following areas can be expanded:

### 21.1 Phase 2 — Production Readiness

| Area | POC | Future MVP |
|------|-----|------------|
| Auth | Simple session cookie | NextAuth.js with multiple providers, password reset |
| Database | Single PostgreSQL | Connection pooling (PgBouncer), automated backups |
| Deployment | Single host | Docker container, CI/CD pipeline |
| Error tracking | Console logs | Sentry or similar error tracking service |
| Logging | None | Structured logging with Pino or Winston |
| Testing | None | Unit tests (Vitest), integration tests (Playwright) |

### 21.2 Phase 3 — Feature Expansion

- **Notifications:** Email (Nodemailer/Resend) and optional WhatsApp (Twilio/API) for task assignment and status updates.
- **Calendar view:** A week/month calendar with drag-and-drop scheduling.
- **Recurring tasks:** Templates for repeating work orders.
- **Mobile responsiveness:** Responsive design or a dedicated mobile app.
- **Reporting:** PDF/Excel export of task history and completion stats.
- **File attachments:** Upload photos or documents to tasks.
- **Real-time updates:** WebSocket-based live status updates on dashboards.
- **Multi-location:** Support for multiple sites/departments with location-based task assignment.

### 21.3 Phase 4 — Advanced Features

- **AI-assisted scheduling:** Optimal staff assignment based on history and availability patterns.
- **Attendance integration:** Check-in/check-out tied to task start/complete.
- **Payroll integration:** Time tracking per task for billing/payroll calculations.
- **Advanced analytics:** Trend analysis, performance metrics, workload balancing.
- **Role-based reporting:** Department managers see only their team's data.
- **SSO/LDAP:** Enterprise authentication integration.
