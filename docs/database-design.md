# Staff Task Scheduling & Monitoring Portal - Database Design

## 1. Document Purpose and Scope

This document defines the relational PostgreSQL database design for the Staff Task Scheduling & Monitoring Portal POC. It is derived from `docs/requirements.md` (source of truth for behavior) and `docs/architecture.md` (source of truth for the tech stack: PostgreSQL + Prisma).

The design is intentionally minimal — **5 tables** — sufficient to demonstrate the full POC workflow within a 2-3 day window. No triggers, stored procedures, or complex functions are used unless explicitly noted. Business rules that require joins or cross-row logic are enforced in the application service layer (per the architecture), with database constraints acting as the safety net.

**Tables:**

1. `roles` — application roles (ADMIN, STAFF)
2. `users` — all users (admins and staff)
3. `work_orders` — planned work to be performed
4. `task_assignments` — a work order assigned to a staff member
5. `task_status_history` — audit trail of status transitions

**Deliberately excluded:**

- `departments` — the requirements never mention departments, locations, teams, or organizational units. Adding it would introduce an unnecessary FK, extra seeding, and more UI. Excluded from the POC; can be added to the `users` table in a future phase.
- `staff_roles` lookup table — the staff job role is small, fixed, and known at design time (see Section 4). A lookup table adds no value for a POC and is represented as an enumerated column instead.
- `sessions` table — the architecture uses an encrypted HttpOnly cookie (`iron-session` / `jose`), so no server-side session store is required.

---

## 2. Design Principles

| Principle | Application |
|-----------|-------------|
| **Minimalism** | Only entities the workflows actually touch. No unused tables. |
| **Enums over lookup tables** | Fixed, small vocabularies (roles, skills, priority, status) use PostgreSQL `ENUM` types or `CHECK` constraints rather than extra tables. |
| **Audit trail by design** | Every status change is recorded in `task_status_history` with previous status, new status, actor, timestamp, and optional remark. |
| **DB constraints as safety net** | `NOT NULL`, `UNIQUE`, `CHECK`, `FK`, and exclusion constraints protect integrity; application logic provides friendly UX around them. |
| **No computed/derived statuses stored** | `OVERDUE` is derived at query time (Section 9), never persisted — it is a function of current time, not a stored fact. |
| **Simple keys** | `UUID` primary keys (`gen_random_uuid()`) with human-readable business codes where valuable (e.g., `wo_number`). |
| **Time handling** | Single timezone operation (`TZ` env var per architecture). Date stored as `DATE`, times as `TIME`, instants as `TIMESTAMPTZ`. |

---

## 3. Application Role vs Staff Job Role (Key Design Decision)

The portal has exactly two **application roles** that govern access:

- `ADMIN` — can create, assign, and monitor.
- `STAFF` (a.k.a. USER) — can execute assigned tasks.

Separately, staff have a **job role / skill** that governs *what kind of work they can do* (e.g., Cleaner, Technician, Guard). This is used for work-order matching.

**These are two different concepts stored in two different columns:**

| Concept | Column | Values | Purpose |
|---------|--------|--------|---------|
| Application role | `users.role_id` → `roles` | `ADMIN`, `STAFF` | Authentication / authorization (RBAC) |
| Staff job role / skill | `users.staff_role` | `CLEANER`, `TECHNICIAN`, `GUARD` | Work-order role matching / availability filtering |

**Why a separate `staff_role` column and not a second row in `roles`?**

- `roles` defines *application privileges* (what a user can do in the system). An admin is not a "Cleaner admin" — job roles only apply to staff.
- Keeping one `roles` table and adding a fixed vocabulary `staff_role` column keeps queries truthful: `users` with `role = ADMIN` and `users` with `role = STAFF` remain one table, but staff additionally carry a skill tag.
- `staff_role` is nullable — it is `NULL` for admins (they have no job role), and **required** for staff.

**POC-compatible representation of `staff_role`:**

- Recommended: a PostgreSQL `ENUM` (`staff_role_type`) — type-safe, indexable, human-readable, and trivially mapped to your Prisma `enum StaffRole`.
- Alternative considered: a `staff_roles` lookup table. This is cleaner if roles are user-managed in the future, but the requirements hard-code job roles as a "configured list" seeded for the POC, so an enum is sufficient. If a future phase needs admin-managed job roles, migrate the enum to a table.

---

## 4. Enumerations

### 4.1 `app_role` (stored in `roles` table)

| Value | Meaning |
|-------|---------|
| `ADMIN` | Full access: create/assign/monitor work orders, dashboard statistics |
| `STAFF` | Can start/complete tasks, add remarks, view own tasks |

### 4.2 `staff_role_type` (column on `users`)

| Value | Example use |
|-------|-------------|
| `CLEANER` | Cleaning and janitorial tasks |
| `TECHNICIAN` | Repairs, HVAC, electrical/mechanical |
| `GUARD` | Security and surveillance tasks |

### 4.3 `priority_type` (column on `work_orders`)

| Value | Notes |
|-------|-------|
| `LOW` | Non-urgent |
| `MEDIUM` | Default when not specified |
| `HIGH` | Urgent |

### 4.4 `work_order_status` (column on `work_orders`)

| Value | Meaning |
|-------|---------|
| `ASSIGNED` | Work order has been assigned to a staff member (default; the POC always assigns at creation) |
| `CANCELLED` | Admin cancelled the work order |

### 4.5 `assignment_status` (column on `task_assignments`)

| Value | Meaning | Terminal? |
|-------|---------|-----------|
| `SCHEDULED` | Assigned, not yet started | No |
| `IN_PROGRESS` | Started by the staff member | No |
| `COMPLETED` | Finished by the staff member | Yes |
| `CANCELLED` | Canceled by an admin | Yes |

`OVERDUE` is **not** a stored status — see Section 9.

---

## 5. Table Designs

### 5.1 Table: `roles`

**Purpose:** The fixed list of application roles for role-based access control. Provides a stable reference for `users.role_id` so role references can never point to an invalid value.

| Column | Data type | PK | FK | NOT NULL | UNIQUE | Default | Notes / Indexes |
|--------|-----------|----|----|----------|--------|---------|-----------------|
| `id` | `UUID` | ✔ | | ✔ | | `gen_random_uuid()` | Primary key |
| `code` | `VARCHAR(20)` | | | ✔ | ✔ | | Business code: `ADMIN`, `STAFF`. Index on `code` (via UNIQUE). |
| `name` | `VARCHAR(50)` | | | ✔ | | | Display name, e.g., "Admin", "Staff" |
| `description` | `VARCHAR(255)` | | | | | `NULL` | Optional detail |
| `created_at` | `TIMESTAMPTZ` | | | ✔ | | `now()` | |

**Seeded rows:** `('ADMIN', 'Admin'), ('STAFF', 'Staff / User')`.

---

### 5.2 Table: `users`

**Purpose:** All people who can log into the portal — both admins and staff. Carries authentication data, application role, staff job role, and active/inactive status.

| Column | Data type | PK | FK | NOT NULL | UNIQUE | Default | Notes / Indexes |
|--------|-----------|----|----|----------|--------|---------|-----------------|
| `id` | `UUID` | ✔ | | ✔ | | `gen_random_uuid()` | Primary key |
| `first_name` | `VARCHAR(100)` | | | ✔ | | | |
| `last_name` | `VARCHAR(100)` | | | ✔ | | | |
| `email` | `VARCHAR(255)` | | | ✔ | ✔ | | **Unique index `uq_users_email`** (prevents duplicate emails) |
| `password_hash` | `VARCHAR(255)` | | | ✔ | | | bcrypt hash of the password |
| `role_id` | `UUID` | | `roles.id` ✔ | ✔ | | | Application role (`ADMIN`/`STAFF`). **Index `ix_users_role_id`.** |
| `staff_role` | `staff_role_type` | | | | | `NULL` | Job role/skill. `NULL` for admins, **required** for staff (app-enforced). **Index `ix_users_staff_role`.** |
| `is_active` | `BOOLEAN` | | | ✔ | | `true` | Active/inactive status. Inactive users cannot log in and are excluded from assignment. **Index `ix_users_is_active`.** |
| `created_at` | `TIMESTAMPTZ` | | | ✔ | | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | | | ✔ | | `now()` | |

**Row-level rules (CHECK + app):**

- `staff_role` may only be non-`NULL` for staff. Since `role_id` is a FK to another table, this cross-table rule is enforced in the application layer (and optionally via a trigger — see Section 12).
- Login queries filter `WHERE is_active = true`.

---

### 5.3 Table: `work_orders`

**Purpose:** A unit of planned work created by an admin: what needs doing, what skill is required, and when it should happen. One work order produces exactly one assignment in this POC.

| Column | Data type | PK | FK | NOT NULL | UNIQUE | Default | Notes / Indexes |
|--------|-----------|----|----|----------|--------|---------|-----------------|
| `id` | `UUID` | ✔ | | ✔ | | `gen_random_uuid()` | Primary key |
| `wo_number` | `VARCHAR(30)` | | | ✔ | ✔ | | Human-readable reference, e.g., `WO-0001`. **Unique index** `uq_s_work_orders_wo_number`. |
| `title` | `VARCHAR(200)` | | | ✔ | | | Work order title (3–200 chars per requirements) |
| `description` | `TEXT` | | | ✔ | | | Work order description (10–2000 chars per requirements) |
| `required_staff_role` | `staff_role_type` | | | ✔ | | | Skill required to perform the work. **Index `ix_work_orders_required_staff_role`.** |
| `priority` | `priority_type` | | | ✔ | | `'MEDIUM'` | `LOW`/`MEDIUM`/`HIGH` |
| `scheduled_date` | `DATE` | | | ✔ | | | Work date (today or future; app-validated). **Index `ix_work_orders_scheduled_date`.** |
| `start_time` | `TIME` | | | ✔ | | | Scheduled start time |
| `end_time` | `TIME` | | | ✔ | | | Scheduled end time |
| `status` | `work_order_status` | | | ✔ | | `'ASSIGNED'` | Work order lifecycle |
| `created_by` | `UUID` | | `users.id` ✔ | ✔ | | | The admin who created it. **Index `ix_work_orders_created_by`.** |
| `created_at` | `TIMESTAMPTZ` | | | ✔ | | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | | | ✔ | | `now()` | |

**Row-level rules (CHECK):**

- `CHECK (end_time > start_time)` — end must be after start (also enforced by Zod).
- `scheduled_date >= CURRENT_DATE` — **not** enforceable as a `CHECK` (non-immutable), enforced by application validation per requirements.

---

### 5.4 Table: `task_assignments`

**Purpose:** The assignment of a work order to a specific staff member, carrying the assignment-specific status, the scheduled slot, and execution timestamps. This is the "task" the staff member sees and executes.

The scheduled `date`/`start_time`/`end_time` are **copied onto the assignment** at creation time. This intentional denormalization gives the assignment a durable snapshot of its schedule — it is the copy the staff dashboard reads, and it feeds the availability/overlap checks.

| Column | Data type | PK | FK | NOT NULL | UNIQUE | Default | Notes / Indexes |
|--------|-----------|----|----|----------|--------|---------|-----------------|
| `id` | `UUID` | ✔ | | ✔ | | `gen_random_uuid()` | Primary key |
| `work_order_id` | `UUID` | | `work_orders.id` ✔ | ✔ | ✔ | | **1:1 with work_orders** — a work order cannot be assigned twice. **Partial index / UNIQUE.** |
| `assigned_to_id` | `UUID` | | `users.id` ✔ | ✔ | | | The staff member. **Index `ix_task_assignments_assigned_to` (incl. date, see index table).** |
| `assigned_by_id` | `UUID` | | `users.id` ✔ | ✔ | | | The admin who assigned it |
| `scheduled_date` | `DATE` | | | ✔ | | | Copied from work order. **Index `ix_task_assignments_assigned_to_date`.** |
| `start_time` | `TIME` | | | ✔ | | | Copied from work order |
| `end_time` | `TIME` | | | ✔ | | | Copied from work order |
| `scheduled_range` | `TSRANGE` | | | ✔ | | *generated* | Generated column `tsrange(scheduled_date + start_time, scheduled_date + end_time, '[)')`. Base for the overlap exclusion constraint. |
| `status` | `assignment_status` | | | ✔ | | `'SCHEDULED'` | Task lifecycle (Section 9). **Index `ix_task_assignments_status`.** |
| `started_at` | `TIMESTAMPTZ` | | | | | `NULL` | Set when status → `IN_PROGRESS` |
| `completed_at` | `TIMESTAMPTZ` | | | | | `NULL` | Set when status → `COMPLETED` |
| `cancelled_at` | `TIMESTAMPTZ` | | | | | `NULL` | Set when status → `CANCELLED` |
| `cancellation_reason` | `VARCHAR(500)` | | | | | `NULL` | Reason for cancellation |
| `created_at` | `TIMESTAMPTZ` | | | ✔ | | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | | | ✔ | | `now()` | |

**Row-level rules (CHECK):**

- `CHECK (end_time > start_time)`
- `CHECK (status <> 'IN_PROGRESS' OR started_at IS NOT NULL)` — in-progress implies a start instant.
- `CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL)` — completed implies a completion instant.
- `CHECK (status <> 'SCHEDULED' OR started_at IS NULL)` — a scheduled task cannot have a start instant.
- `CHECK (status <> 'CANCELLED' OR cancelled_at IS NOT NULL)` — cancelled implies a cancel instant.

**Exclusion constraint (overlap prevention):**

```
EXCLUDE USING gist (
  assigned_to_id WITH =,
  scheduled_range WITH &&
)
```

Requires `CREATE EXTENSION btree_gist`. This is the database-level guarantee that one staff member can never carry two assignments with overlapping time windows on the same day (see Section 12).

---

### 5.5 Table: `task_status_history`

**Purpose:** Append-only audit trail of every status transition for every assignment. Supports the "monitor task status" and audit requirements, and enables the admin to see when and by whom each change happened.

| Column | Data type | PK | FK | NOT NULL | UNIQUE | Default | Notes / Indexes |
|--------|-----------|----|----|----------|--------|---------|-----------------|
| `id` | `UUID` | ✔ | | ✔ | | `gen_random_uuid()` | Primary key |
| `task_assignment_id` | `UUID` | | `task_assignments.id` ✔ | ✔ | | | **Index `ix_task_status_history_assignment` (incl. `changed_at`).** |
| `previous_status` | `assignment_status` | | | | | `NULL` | `NULL` for the initial `SCHEDULED` creation record |
| `new_status` | `assignment_status` | | | ✔ | | | The status the assignment moved to |
| `changed_by_id` | `UUID` | | `users.id` ✔ | ✔ | | | Who performed the transition (staff for start/complete, admin for cancel/assign) |
| `changed_at` | `TIMESTAMPTZ` | | | ✔ | | `now()` | |
| `remark` | `VARCHAR(1000)` | | | | | `NULL` | Optional note attached to the transition (1–1000 chars per requirements) |

Rows are **inserted but never updated or deleted** in this POC.

---

## 6. Task Status Lifecycle

### 6.1 Primary lifecycle (POC workflows)

```
SCHEDULED  →  IN_PROGRESS  →  COMPLETED
```

| From | To | Trigger | Actor | Conditions enforced |
|------|----|---------|-------|---------------------|
| *(creation)* | `SCHEDULED` | Admin assigns work order | Admin | Staff matches skill; staff is active; no time overlap |
| `SCHEDULED` | `IN_PROGRESS` | Staff clicks "Start Task" | Assigned staff | `now() >= scheduled_date + start_time`; assignment belongs to actor; atomic `UPDATE ... WHERE status = 'SCHEDULED'` |
| `IN_PROGRESS` | `COMPLETED` | Staff clicks "Mark as Completed" | Assigned staff | Assignment belongs to actor; atomic `UPDATE ... WHERE status = 'IN_PROGRESS'` |

Each transition inserts a row into `task_status_history` **within the same database transaction** as the status update.

### 6.2 Handling `CANCELLED`

`CANCELLED` is a supported, terminal status kept for sensible lifecycle management. It is not part of the primary POC screens but the schema and rules must not break if it is used.

| From | To | Who | Rule |
|------|----|-----|------|
| `SCHEDULED` | `CANCELLED` | Admin | Allowed — cancels a not-yet-started task, freeing the time slot |
| `IN_PROGRESS` | `CANCELLED` | Admin | Allowed but **exceptional** (e.g., incorrect assignment). Alternatively modeled as "cancelled with work done" — out of POC scope. Documented, not built in UI. |
| `COMPLETED` | `CANCELLED` | — | **Not allowed** (terminal). |

Effect: `cancelled_at` is set, an optional `cancellation_reason` is stored, and the workflow state machine rejects the assignment for further start/complete actions. Once cancelled, the former time slot is again considered available.

### 6.3 Handling `OVERDUE`

`OVERDUE` is **derived, never stored**. An assignment is overdue when:

```
status IN ('SCHEDULED', 'IN_PROGRESS')
  AND (scheduled_date + end_time) < now()
```

Rationale: stored statuses must be immutable facts written at a point in time; "overdue" is a function of the moving clock, so persisting it guarantees staleness. The admin monitor and dashboard derive it at query time.

```sql
-- Suggested view for the admin monitor (not persisted)
CREATE VIEW v_overdue_assignments AS
SELECT ta.*
FROM task_assignments ta
WHERE ta.status IN ('SCHEDULED', 'IN_PROGRESS')
  AND (ta.scheduled_date + ta.end_time) < now();
```

Transition handling for an overdue assignment:
- An **overdue** `SCHEDULED` task can no longer be started after its window ends — the start-time condition (`now() >= start`) fails the *other* non-obvious side? No: the start rule is `now() >= start_time`. Credible POC rule: a task whose window has fully elapsed cannot be started; it remains `SCHEDULED`/`OVERDUE` and awaits admin resolution (cancel or admin adjustment). We cap: `start` allowed only while `now() < scheduled_date + end_time`; after that it is reported as OVERDUE.
- An **overdue** `IN_PROGRESS` task can still be moved to `COMPLETED` by the staff member — completion is time-independent.

---

## 7. Relationships

| Relationship | Cardinality | Expressed by | Notes |
|--------------|-------------|--------------|-------|
| `roles` 1 → N `users` | One role, many users | `users.role_id` FK → `roles.id` | `ADMIN`, `STAFF` |
| `users` 1 → N `work_orders.created_by` | One admin creates many work orders | `work_orders.created_by` FK → `users.id` | Restricted to admins (app-enforced) |
| `work_orders` 1 → 1 `task_assignments` | One work order, one assignment | `task_assignments.work_order_id` FK → `work_orders.id`, **UNIQUE** | A work order cannot be assigned to two people |
| `users` 1 → N `task_assignments.assigned_to` | One staff member, many assignments | `task_assignments.assigned_to_id` FK → `users.id` | Restricted to active staff (app-enforced) |
| `users` 1 → N `task_assignments.assigned_by` | One admin assigns many tasks | `task_assignments.assigned_by_id` FK → `users.id` | |
| `task_assignments` 1 → N `task_status_history` | One assignment, many status events | `task_status_history.task_assignment_id` FK → `task_assignments.id` | Append-only audit trail |
| `users` 1 → N `task_status_history.changed_by` | One user performs many transitions | `task_status_history.changed_by_id` FK → `users.id` | |

---

## 8. ER Diagram

```
┌──────────────────┐        ┌──────────────────────────────┐
│      roles       │        │           users              │
├──────────────────┤        ├──────────────────────────────┤
│ id          PK   │        │ id                    PK     │
│ code        UQ   │        │ first_name             NN    │
│ name             │        │ last_name              NN    │
│ description      │        │ email                  UQ NN │
│ created_at       │        │ password_hash           NN   │
└────────┬─────────┘        │ role_id      FK ─────────────┤──▶ roles.id
         │                  │ staff_role          (enum)   │
         │ 1               │ is_active       bool NN     │
         ▼ N               │ created_at / updated_at      │
╭──────────────────────╮   └────────────┬──────────┬───────┘
│ users.role_id        │                │ 1        │ 1
└──────────────────────┘                │          │
                                        │ N        │ N
                              ┌─────────▼──┐   ┌───▼──────────────────────┐
                              │work_orders │   │     task_assignments    │
                              ├────────────┤   ├──────────────────────────┤
                              │ id    PK   │   │ id                  PK  │
                              │ wo_numberUQ│   │ work_order_id FK UQ 1───┼──▶ work_orders.id
                              │ title  NN  │   │ assigned_to_id FK    1──┼──▶ users.id (staff)
                              │ description│   │ assigned_by_id FK     1─┼──▶ users.id (admin)
                              │ required_  │   │ scheduled_date         │
                              │   staff_   │   │ start_time             │
                              │   role     │   │ end_time               │
                              │ priority   │   │ scheduled_range(generated)
                              │ scheduled_ │   │ status (enum)          │
                              │   date     │   │ started_at / completed_ │
                              │ start_time │   │   at / cancelled_at     │
                              │ end_time   │   │ cancellation_reason     │
                              │ status  NN │   └─────────┬───────────────┘
                              │ created_by │             │ 1
                              │ FK──▶users │             │ N
                              └────────────┘     ┌───────▼────────────────┐
                                                 │   task_status_history  │
                                                 ├────────────────────────┤
                                                 │ id               PK   │
                                                 │ task_assignment_id FK─┼──▶ task_assignments.id
                                                 │ previous_status (enum)│
                                                 │ new_status (enum) NN  │
                                                 │ changed_by_id FK  1───┼──▶ users.id
                                                 │ changed_at            │
                                                 │ remark                │
                                                 └────────────────────────┘
```

Notable: `wor_orders.created_by → users`, `task_assignments.assigned_to_id → users`, `task_assignments.assigned_by_id → users`, and `task_status_history.changed_by_id → users` all point back at `users` (self-reference from four different roles).

---

## 9. Example Records (Seed Data)

### 9.1 `roles`

| id | code | name |
|----|------|------|
| `550e8400-e29b-41d4-a716-446655440001` | `ADMIN` | Admin |
| `550e8400-e29b-41d4-a716-446655440002` | `STAFF` | Staff / User |

### 9.2 `users` — 1 admin + 2 staff with different job roles

| id | first_name | last_name | email | password_hash | role_id | staff_role | is_active |
|----|-----------|-----------|-------|---------------|---------|------------|-----------|
| `u-10000000-0000-0000-0000-000000000001` | Dana | Richards | `admin@portal.com` | `$2b$12$...hash1` | `...0001` (ADMIN) | `NULL` | `true` |
| `u-10000000-0000-0000-0000-000000000002` | Priya | Nair | `priya@portal.com` | `$2b$12$...hash2` | `...0002` (STAFF) | `TECHNICIAN` | `true` |
| `u-10000000-0000-0000-0000-000000000003` | Carlos | Mendez | `carlos@portal.com` | `$2b$12$...hash3` | `...0002` (STAFF) | `CLEANER` | `true` |

### 9.3 `work_orders` — 2 work orders

| id | wo_number | title | description | required_staff_role | priority | scheduled_date | start_time | end_time | status | created_by |
|----|-----------|-------|-------------|---------------------|----------|----------------|------------|----------|--------|------------|
| `wo-20000000-0000-0000-0000-000000000001` | `WO-0001` | HVAC repair – Lobby unit | Repair the lobby air-conditioning unit and replace the filter. | `TECHNICIAN` | `HIGH` | `2026-09-14` | `09:00` | `12:00` | `ASSIGNED` | admin u-...001 |
| `wo-20000000-0000-0000-0000-000000000002` | `WO-0002` | Lobby cleaning | Deep clean the lobby and entrance glass. | `CLEANER` | `MEDIUM` | `2026-09-14` | `14:00` | `16:00` | `ASSIGNED` | admin u-...001 |

### 9.4 `task_assignments`

| id | work_order_id | assigned_to_id | assigned_by_id | scheduled_date | start_time | end_time | scheduled_range | status | started_at | completed_at |
|----|---------------|----------------|----------------|----------------|------------|----------|-----------------|--------|------------|--------------|
| `ta-30000000-0000-0000-0000-000000000001` | `WO-0001` | u-...002 (Priya, TECH) | admin u-...001 | `2026-09-14` | `09:00` | `12:00` | `[2026-09-14 09:00, 2026-09-14 12:00)` | `IN_PROGRESS` | `2026-09-14 09:05` +00 | `NULL` |
| `ta-30000000-0000-0000-0000-000000000002` | `WO-0002` | u-...003 (Carlos, CLN) | admin u-...001 | `2026-09-14` | `14:00` | `16:00` | `[2026-09-14 14:00, 2026-09-14 16:00)` | `SCHEDULED` | `NULL` | `NULL` |

### 9.5 `task_status_history`

| id | task_assignment_id | previous_status | new_status | changed_by_id | changed_at | remark |
|----|--------------------|-----------------|------------|---------------|------------|--------|
| `h-40000000-0000-0000-0000-000000000001` | `ta-...001` | `NULL` | `SCHEDULED` | admin u-...001 | `2026-09-13 17:30` | `Assigned to Priya for HVAC repair` |
| `h-40000000-0000-0000-0000-000000000002` | `ta-...001` | `SCHEDULED` | `IN_PROGRESS` | u-...002 (Priya) | `2026-09-14 09:05` | `Started repair work` |
| `h-40000000-0000-0000-0000-000000000003` | `ta-...002` | `NULL` | `SCHEDULED` | admin u-...001 | `2026-09-13 18:00` | `Assigned to Carlos for cleaning` |

---

## 10. Recommended Indexes

| # | Table | Columns | Type / Purpose |
|---|-------|---------|----------------|
| 1 | `users` | `email` | **UNIQUE** index — login lookup + duplicate email prevention |
| 2 | `users` | `role_id` | Role-based queries / filtering |
| 3 | `users` | `staff_role` | Staff-role matching for availability search |
| 4 | `users` | `is_active` | Filtering active candidates |
| 5 | `work_orders` | `scheduled_date` | Day-based scheduling views |
| 6 | `work_orders` | `required_staff_role` | Find work orders needing a skill |
| 7 | `work_orders` | `status` | Filtering open/cancelled orders |
| 8 | `work_orders` | `created_by` | Admin's own orders |
| 9 | `work_orders` | `wo_number` | **UNIQUE** — human-readable reference |
| 10 | `task_assignments` | `work_order_id` | **UNIQUE** — 1:1 integrity |
| 11 | `task_assignments` | `(assigned_to_id, scheduled_date, start_time)` | Staff daily views + availability checks (overlap scan) |
| 12 | `task_assignments` | `status` | Status-count dashboards |
| 13 | `task_assignments` | `assigned_to_id, scheduled_range` | Backs the `EXCLUDE USING gist` overlap constraint |
| 14 | `task_status_history` | `(task_assignment_id, changed_at)` | Timeline per assignment / audit queries |

Composite indexes (11, 14) are the most important for the POC hot paths: staff "today's tasks" and admin "suitable staff" scans.

---

## 11. Database Rules for Data Integrity

### 11.1 Preventing duplicate emails

```sql
CREATE UNIQUE INDEX uq_users_email ON users (lower(email));
```

A functional unique index on `lower(email)` prevents case-variant duplicates (`A@x.com` vs `a@x.com`).

### 11.2 Preventing invalid role references

```sql
ALTER TABLE users
  ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id);
```

Along with the `staff_role` only-for-staff rule (Section 12, app-enforced for POC because it spans two tables). `role_id` can only ever reference an existing, seeded row in `roles`.

### 11.3 Preventing assignment of inactive users

The FK `task_assignments.assigned_to_id → users.id` guarantees the user exists, but the gate on `is_active` spans a column from the *parent* row, so it is enforced in the application service layer (transactional check at assignment time):

```
SELECT 1 FROM users WHERE id = :staffId AND role = STAFF AND is_active = TRUE
```

An optional `BEFORE INSERT` trigger can enforce it at the DB level; not needed for a 2-3 day POC (see Section 12).

### 11.4 Preventing overlapping assignments (time-overlap)

Two overlapping windows: `A.start < B.end AND A.end > B.start`.

**DB-level guarantee (recommended, catches races):**

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE task_assignments
  ADD CONSTRAINT no_overlapping_assignments
  EXCLUDE USING gist (
    assigned_to_id WITH =,
    scheduled_range WITH &&
  );
```

Where `scheduled_range` is a generated column:

```sql
ALTER TABLE task_assignments
  ADD COLUMN scheduled_range TSRANGE
  GENERATED ALWAYS AS (
    tsrange(scheduled_date + start_time, scheduled_date + end_time, '[)')
  ) STORED;
```

If a second admin tries to assign the same staff member to an overlapping slot, the `INSERT` fails with an exclusion violation (`23P01`), which the app maps to a friendly "staff is not available" message.

**Application-level check (friendlier + primary):**

Per the architecture, the service re-runs the overlap query inside the assignment transaction and returns a 409 before relying on the constraint:

```sql
SELECT ta.id
FROM task_assignments ta
WHERE ta.assigned_to_id = :staffId
  AND ta.scheduled_date = :date
  AND ta.status IN ('SCHEDULED', 'IN_PROGRESS')
  AND ta.start_time < :end_time
  AND ta.end_time > :start_time;
```

### 11.5 Preventing invalid status transitions

Sequence enforcement happens in the application with **atomic conditional updates**, so a concurrent request cannot double-advance status:

```
UPDATE task_assignments
SET status = 'IN_PROGRESS', started_at = now(), updated_at = now()
WHERE id = :id
  AND status = 'SCHEDULED'
  AND (scheduled_date + start_time) <= now();

-- rowCount == 1 → success, then INSERT task_status_history
-- rowCount == 0 → invalid transition (already started, not started yet, or not owned)
```

Additional defensive `CHECK` constraints ensure auxiliary timestamps stay consistent with status (already listed in 5.4). The `task_status_history` table is the immutable record of every valid transition and doubles as the audit trail.

---

## 12. Application-Enforced Rules (Why Some Rules Are Not DB Constraints)

The following rules span multiple rows/tables and, in the POC, live in the service layer. A production build may promote them to triggers or stored procedures; doing so now would add complexity without a functional gain.

| Rule | DB support | Application enforcement |
|------|-----------|-------------------------|
| `staff_role` required for staff only | FK to `roles` validates existence; cross-table check would need a trigger | Service layer validates on user creation/update |
| Cannot assign inactive users | FK enforces existence | `is_active` + `role = STAFF` check at assignment |
| `scheduled_date >= today` | Not enforceable (non-immutable `CHECK`) | Zod validation (per requirements §12) |
| Role matching: work-order skill = staff skill | No constraint possible | Availability query filters `staff_role = required_staff_role` |
| Time window start rule (`now() >= start`) | Not expressible as immutable `CHECK` | Atomic conditional update in service |
| Transition sequence SCHEDULED → IN_PROGRESS → COMPLETED | `CHECK` guards auxiliary columns | Atomic conditional update + history insert (single transaction) |

---

## 13. Assumptions

1. **1:1 work order ↔ assignment** — per requirements §7.2 the admin assigns at creation time, so a work order is never multiply assigned. The UNIQUE constraint on `task_assignments.work_order_id` enforces this. Re-assignment is an admin action performed as cancel-and-recreate; not modeled as a re-slot workflow.
2. **`CANCELLED` exists but is not a primary POC screen** — it is modeled and defined so the lifecycle is complete and test data can include it; the UI does not expose it in this POC.
3. **`OVERDUE` is derived** at query time and never stored (Section 6.3), because it depends on the moving clock.
4. **Staff job roles** are a fixed enum (`CLEANER`, `TECHNICIAN`, `GUARD`), seeded and hard-coded per requirements §7.1 "configurable list", not admin-managed. A future `staff_roles` lookup table can replace the enum without schema breakage.
5. **Password hashing** with bcrypt; only the hash is stored. Schema migration from `password_hash` in a future version is trivial.
6. **Single timezone** operation throughout (`TZ` env var), with `TIMESTAMPTZ` for instants and plain `DATE`/`TIME` for the schedule — keeps overlap comparisons simple and unambiguous.
7. **`scheduled_range` generated column** requires PostgreSQL 12+ (generated columns) and `btree_gist` for the exclusion constraint. If the team prefers, the exclusion constraint can be dropped and the app-level overlap check (11.4) becomes the sole guard.
8. **Enum types** (`staff_role_type`, `priority_type`, `work_order_status`, `assignment_status`) map directly to Prisma enums per the architecture document; `roles` remains a real table because it is referenced as a FK target.
9. **Remarks** (requirements §10.3) are attached to status transitions in `task_status_history.remark`. In-progress task remarks are recorded as a transition event (status stays `IN_PROGRESS`) so every remark has an author and timestamp as required.