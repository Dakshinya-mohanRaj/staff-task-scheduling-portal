# Staff Task Scheduling & Monitoring Portal (POC)

A full-stack web app for a college scenario: the **HOD** creates college work orders, picks the responsibility (faculty/coordinator) that matches, and assigns them to suitable staff members. **Staff** (faculty/coordinators) log in, see today's assigned tasks, start them, add progress updates/remarks, and complete them. The HOD monitors progress in real time.

## User roles

- **HOD** – create & assign work orders, monitor task progress and history.
- **STAFF** – faculty/coordinators who execute assigned tasks.

Staff responsibilities: General Faculty, Placement, Training, Academic, Programs & Events, Student Activities, Maintenance, Documentation.

## Tech stack

- **Next.js 16** (App Router, React 19, TypeScript, Tailwind CSS v4)
- **Prisma 7** + **PostgreSQL** (Neon)
- JWT-based session auth (HTTP-only cookies), bcrypt password hashing

## How it works

**HOD flow:**
`Login → HOD Dashboard → Create Work Order → select responsibility → select suitable faculty/coordinator → set date/time/priority → assign → monitor task progress and history`

**STAFF flow:**
`Login → Staff Dashboard → view assigned tasks → open task → Start Task → Add Remark/Progress Update → Complete Task`

Key features:

- HOD dashboard with daily stats, task pipeline, staff availability, and recent work orders.
- Create Work Order form with live matching of suitable staff (availability + no overlap), college responsibility labels, and friendly conflict handling.
- Staff dashboard scoped to the logged-in user's assigned tasks (today / upcoming / completed / overdue).
- Task detail page with the full lifecycle (start / remark / complete), success & error feedback, and an activity timeline with timestamps.
- Rule enforcement is rooted in the backend services; the UI only surfaces what the server allows.
- Facility-level features: no separate admin UI — the privileged role is HOD only.
- The system prevents overlapping task assignments to the same staff member.

## Project structure

```
frontend/
├── app/
│   ├── (auth)/login/        # Login page
│   ├── (dashboard)/         # HOD (/admin) and STAFF (/staff) dashboards
│   └── api/                 # Backend API route handlers (next.js API layer)
│       ├── auth/            # login, logout, me
│       ├── dashboard/       # admin (hod) + staff stats
│       ├── work-orders/     # CRUD + suitable-staff matching
│       └── tasks/           # task detail, start, complete, remarks
├── lib/
│   ├── auth/                # JWT sessions, password hashing
│   ├── services/            # work-orders, tasks, dashboard business logic
│   ├── dal.ts               # data access + role guards (HOD / STAFF)
│   └── prisma.ts            # Prisma 7 client (Neon PostgreSQL)
└── prisma/
    └── schema.prisma        # Database schema + seed
```

## Getting started

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Configure environment (`frontend/.env`):

   ```env
   DATABASE_URL=postgresql://...   # Neon (or any PostgreSQL)
   SESSION_SECRET=<random secret>
   ```

3. Set up the database and seed demo data:

   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

4. Run in development:

   ```bash
   npm run dev
   ```

5. Production build/start:

   ```bash
   npm run build
   npm start
   ```

The app runs on `http://localhost:3001` in this environment.

## Quality

- `npm run lint` – ESLint clean
- `npm run build` – production build + type checking pass

## Documentation

- `docs/requirements.md` – requirements (HOD/STAFF roles, flows, dashboards)
- `docs/architecture.md` – architecture, API reference, data model
- `docs/database-design.md` – database design