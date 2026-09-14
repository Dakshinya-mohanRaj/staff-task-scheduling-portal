# Staff Task Scheduling & Monitoring Portal - POC Requirements

## 1. Project Overview

The Staff Task Scheduling & Monitoring Portal is a web-based application designed to streamline the process of creating, assigning, and tracking work orders within an organization. Administrators can create work orders, match them to suitable staff based on role and availability, and monitor progress in real time. Staff members can view their assigned tasks, update task status, and add remarks throughout the workday.

This document outlines the requirements for a Proof of Concept (POC) build with a realistic scope for a 2-3 day development timeline.

## 2. Problem Statement

Organizations that rely on manual or fragmented methods to assign and track staff tasks face several challenges:

- **Lack of visibility** into which staff are available and what tasks are assigned on a given day.
- **No centralized system** for creating and distributing work orders to the right personnel.
- **Difficulty matching** task requirements to staff with appropriate roles and availability.
- **No real-time tracking** of task progress from assignment through completion.
- **Inefficient communication** between administrators and field/staff workers regarding task status.

A lightweight scheduling portal addresses these gaps by providing a single platform for task lifecycle management.

## 3. POC Objective

The objective of this POC is to demonstrate the core workflow of:

1. Role-based authentication (Admin vs Staff).
2. Admin-driven work order creation with role matching and availability checking.
3. Day-based task assignment and scheduling.
4. Staff-driven task execution and status updates.
5. Basic monitoring and dashboard statistics.

The POC validates that the concept is viable and provides a foundation for future development. It is not intended for production use.

## 4. User Roles

The application supports two roles. Each role has a distinct set of permissions and a dedicated workflow.

### 4.1 ADMIN

- Full access to work order creation, assignment, and monitoring.
- Can view dashboards with aggregate task and staffing statistics.
- Can view available/suitable staff for a given work order.
- Cannot execute tasks or submit task-level remarks.

### 4.2 USER / STAFF

- Can view tasks assigned to them for the current day.
- Can view task details, start a task, add remarks, and mark tasks as completed.
- Cannot create or assign work orders.
- Cannot view other users' tasks or dashboards with admin-level statistics.

## 5. Admin Functional Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| AF-01 | Login | Admin authenticates using email and password. Upon successful login, redirected to the admin dashboard. |
| AF-02 | View Dashboard | Admin sees a summary view including total work orders, tasks by status (Scheduled, In Progress, Completed), and staff availability for the current day. |
| AF-03 | Create Work Order | Admin can create a new work order by providing a title, description, required staff role, priority level, date, start time, and end time. |
| AF-04 | View Suitable Users | After filling in work order details (role, date, time), the system displays a list of staff members who match the required role and are available during the specified time window. |
| AF-05 | Assign Work Order | Admin selects a suitable user from the list and assigns the work order to them. The task is created with a status of SCHEDULED. |
| AF-06 | View Assigned Tasks | Admin can view a list of all work orders and their current assignment status, filterable by date. |
| AF-07 | Monitor Task Status | Admin can see the real-time status of each assigned task (SCHEDULED, IN_PROGRESS, or COMPLETED) from the assigned tasks view. |

## 6. User/Staff Functional Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| UF-01 | Login | Staff authenticates using email and password. Upon successful login, redirected to the staff dashboard. |
| UF-02 | View Dashboard | Staff sees a summary view including today's assigned tasks, task status counts, and any relevant personal statistics. |
| UF-03 | View Today's Assigned Tasks | Staff sees a list of tasks assigned to them for the current day, ordered by start time. |
| UF-04 | View Task Details | Staff can view full details of a task including title, description, priority, scheduled time window, and any previously added remarks. |
| UF-05 | Start Task | Staff can change a task's status from SCHEDULED to IN_PROGRESS. This action is available only when the task's scheduled start time has been reached. |
| UF-06 | Add Remarks | Staff can add text-based remarks to a task at any point during execution. Remarks are timestamped and visible to both admin and staff. |
| UF-07 | Mark Task as Completed | Staff can change a task's status from IN_PROGRESS to COMPLETED. This action is available only when the task is currently IN_PROGRESS. |

## 7. Work Order Requirements

A work order represents a discrete unit of work that needs to be performed by a staff member within a defined time window.

### 7.1 Work Order Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Title | Text | Yes | Short descriptive name for the work order. |
| Description | Text | Yes | Detailed description of the work to be performed. |
| Required Staff Role | Enum | Yes | The role required to perform this task (e.g., Cleaner, Technician, Guard). Configurable for the POC. |
| Priority | Enum | Yes | One of: LOW, MEDIUM, HIGH. |
| Date | Date | Yes | The date on which the task should be performed. Must be today or a future date. |
| Start Time | Time | Yes | The scheduled start time for the task. |
| End Time | Time | Yes | The scheduled end time for the task. Must be after the start time. |

### 7.2 Work Order Lifecycle

1. Admin creates a work order.
2. Admin reviews suitable/available staff.
3. Admin assigns the work order to a staff member. A task is created with status SCHEDULED.
4. The assigned staff member starts and completes the task (see Section 10).

## 8. Staff Allocation Requirements

### 8.1 Role Matching

When an admin creates a work order with a required staff role, the system filters available users to show only those whose assigned role matches the required role.

### 8.2 Availability Checking

A staff member is considered available for a work order if:

- Their role matches the required staff role.
- They do not already have a task assigned on the same date with an overlapping time window.

Time windows overlap if:

```
TaskA.StartTime < TaskB.EndTime AND TaskA.EndTime > TaskB.StartTime
```

### 8.3 Staff List Display

The suitable staff list should display for each user:

- Full name
- Assigned role
- Number of tasks already assigned on the selected date
- Their scheduled time slots for the selected date (to help the admin understand existing commitments)

If no suitable staff are available, the system should display an appropriate message.

## 9. Day-Based Scheduling Requirements

### 9.1 Date Selection

- All work orders are created for a specific date.
- The date must be today or a future date. Past dates are not selectable.
- Tasks for a given date are grouped and displayed accordingly in both admin and staff views.

### 9.2 Daily Task View

- **Admin View:** The admin can select a date to view all work orders and their statuses for that day, including which staff members are assigned to each task.
- **Staff View:** The staff member sees only their own tasks for today. A separate view or toggle for upcoming dates is not required in this POC.

### 9.3 Time Window Enforcement

- Tasks can only be started when the current time is at or past the scheduled start time.
- Tasks can only be marked as completed when they are currently in IN_PROGRESS status.

## 10. Task Status Workflow

Tasks follow a strict linear status lifecycle:

```
SCHEDULED  -->  IN_PROGRESS  -->  COMPLETED
```

### 10.1 Status Definitions

| Status | Description | Allowed Transitions |
|--------|-------------|---------------------|
| SCHEDULED | Task has been assigned to a staff member but has not been started. | To IN_PROGRESS |
| IN_PROGRESS | Staff member has started working on the task. | To COMPLETED |
| COMPLETED | Staff member has finished the task. | None (terminal state) |

### 10.2 Transition Rules

| From | To | Trigger | Condition |
|------|----|---------|-----------|
| SCHEDULED | IN_PROGRESS | Staff clicks "Start Task" | Current time >= scheduled start time. Task is assigned to the logged-in staff member. |
| IN_PROGRESS | COMPLETED | Staff clicks "Mark as Completed" | Task is currently IN_PROGRESS. Task is assigned to the logged-in staff member. |

### 10.3 Remarks

- Remarks can be added while the task is in IN_PROGRESS status.
- Each remark stores the text, the author (staff member name), and a timestamp.
- Remarks are visible to both the admin (in task details view) and the staff member.

## 11. Dashboard Requirements

### 11.1 Admin Dashboard

The admin dashboard should display the following statistics for the current day (or a selected date):

- Total work orders for the date.
- Work orders by status: Scheduled count, In Progress count, Completed count.
- Total staff members with the matching role.
- Number of staff with at least one task assigned today.
- Number of staff available (no tasks assigned) today.

### 11.2 Staff Dashboard

The staff dashboard should display the following statistics for the current day:

- Total tasks assigned to the staff member for today.
- Tasks by status: Scheduled count, In Progress count, Completed count.
- Next upcoming task (title and start time), if any.

### 11.3 Data Freshness

Dashboard statistics should reflect the current state of data. In the POC, page refresh or navigation back to the dashboard is sufficient to update the data. Real-time push updates are not required.

## 12. Validation Requirements

### 12.1 Form Validation

| Field | Rule |
|-------|------|
| Title | Required. Minimum 3 characters, maximum 200 characters. |
| Description | Required. Minimum 10 characters, maximum 2000 characters. |
| Required Staff Role | Required. Must be a valid role from the configured list. |
| Priority | Required. Must be one of LOW, MEDIUM, HIGH. |
| Date | Required. Must be today or a future date. |
| Start Time | Required. Must be a valid time. |
| End Time | Required. Must be after the start time. |
| Staff Assignment | Required before a work order can be saved. At least one suitable staff member must be available; otherwise, the admin must adjust the date/time/role. |

### 12.2 Login Validation

| Field | Rule |
|-------|------|
| Email | Required. Must be a valid email format. |
| Password | Required. Minimum 6 characters. |

### 12.3 Remarks Validation

| Field | Rule |
|-------|------|
| Remark Text | Required. Minimum 1 character, maximum 1000 characters. |

## 13. Non-Functional Requirements for the POC

| Aspect | Requirement |
|--------|-------------|
| Platform | Web-based (desktop browser). No mobile responsiveness required for this POC. |
| Authentication | Session-based or token-based (e.g., JWT). Must persist login across page navigations within a session. |
| Authorization | Role-based access control. Each route/view must be restricted to the appropriate role. |
| Data Storage | A relational database (e.g., PostgreSQL or SQLite) for the POC. Pre-seeded with test data including at least 2 admin users, 5-8 staff members across 2-3 roles, and 5-10 sample work orders. |
| Performance | Acceptable for up to 50 concurrent users and 500 work orders per day. No load testing required for the POC. |
| Error Handling | Graceful display of user-friendly error messages for failed operations (login failure, assignment conflict, validation errors). No unhandled exceptions in the UI. |
| Browser Support | Latest versions of Chrome, Firefox, and Edge. |
| Timezone | All times stored and displayed in a consistent timezone (e.g., the local timezone of the deployment). No timezone conversion logic required for the POC. |

## 14. POC Success Criteria

The POC is considered successful if the following end-to-end workflows can be demonstrated:

1. **Admin Login:** An admin user can log in and is redirected to the admin dashboard.
2. **Staff Login:** A staff user can log in and is redirected to the staff dashboard.
3. **Work Order Creation:** An admin can create a work order with all required fields.
4. **Staff Matching:** The system correctly shows available staff based on role and availability.
5. **Task Assignment:** An admin can assign a work order to an available staff member. The task appears as SCHEDULED on the staff member's dashboard.
6. **Task Execution:** The assigned staff member can view the task, start it (IN_PROGRESS), add remarks, and mark it as completed (COMPLETED).
7. **Status Monitoring:** The admin can monitor the task status transition from SCHEDULED to IN_PROGRESS to COMPLETED.
8. **Availability Constraint:** The system prevents assigning overlapping tasks to the same staff member.
9. **Validation:** The system enforces required fields and shows appropriate error messages for invalid input.
10. **Dashboard Statistics:** Both dashboards display accurate summary statistics.

## 15. Features Explicitly Excluded from the POC

The following features are explicitly out of scope for this POC and may be considered for future development:

- Email notifications (task assignment, status changes, reminders)
- WhatsApp or SMS notifications
- AI-based features (smart scheduling, predictive analytics, recommendations)
- Advanced analytics and reporting dashboards
- Payroll or billing integration
- Attendance management or check-in/check-out tracking
- File or document uploads (task attachments, photo evidence)
- Complex calendar views with drag-and-drop scheduling
- Mobile application (native or responsive web)
- Microservices architecture (monolithic or simple service structure is acceptable for the POC)
- Kubernetes or container orchestration (Docker may be used for local development, but orchestration is not required)
- Advanced reporting with export capabilities (PDF, Excel)
- Payment processing or invoicing features
- Multi-tenant support
- Audit logging
- Two-factor authentication
- SSO / LDAP integration
- API rate limiting or throttling
- Real-time notifications via WebSockets or Server-Sent Events
