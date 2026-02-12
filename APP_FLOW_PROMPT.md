# Stitch Calendar - App Flow & Architecture Analysis

## 1. Project Overview
**Name:** Stitch Calendar
**Type:** Monthly Calendar & Scheduler PWA
**Stack:** React (Vite), TailwindCSS, React Router DOM, LocalStorage (Mock DB).
**Goal:** Personal and family organization with event tracking, categorization, and sharing capabilities.

## 2. Architecture & Data Flow

### Service Layer Pattern
The application abstracts data and auth logic behind service objects, allowing for easy swapping between Mock Data (current) and Supabase (future).
- **`authService.js`**: Handles `signIn`, `signUp`, `signOut`, `getSession`. Currently mocks async calls with `setTimeout` and `localStorage`.
- **`dataService.js`**: Central hub for all CRUD operations (Events, Types, Notifications). Implements "Mock SQL" logic (joins, filtering, permission checks) in JavaScript.

### State Management
- **`AuthContext.jsx`**: Global user session state. Wraps the app provider.
- **`useTheme.js`**: Handles Dark/Light mode persistence.
- **Local State**: Pages manage their own UI state (modals, form inputs).
- **SessionStorage**: Used in `CalendarPage` to persist view state (selected day, current month) during navigation.

### Routing (React Router)
- **Public:** `/login`, `/register`
- **Protected:** 
  - `/` (CalendarPage - Dashboard)
  - `/event/:id` (Create/Edit/View Event)
  - `/profile`, `/settings`, `/appearance`, `/notifications`
  - `/family-group`, `/event-types`, `/completed-tasks`

## 3. Core Data Models

### User (Profile)
- **Fields:** `id`, `email`, `full_name`, `avatar_url`, `family_id` (grouping), `allowed_editors` (permissions).
- **Logic:** Users belong to a `family_id`. They can grant specific other users edit rights via `allowed_editors`.

### Event
- **Fields:** `id`, `title`, `start_date`, `end_date`, `status` (scheduled, completed, overdue), `event_type_id`, `shared_with` (array), `is_recurring`.
- **Logic:**
  - **Permissions:** Visible if Owner OR Family (if shared) OR Direct Share OR Editor.
  - **Normalization:** `event_type_id` links to `EventTypes` for styling (color, icon). `dataService` performs a runtime "JOIN" to hydrate these props.

### Event Type
- **Fields:** `id`, `name`, `label`, `color_class`, `icon`, `user_id`.
- **Logic:** Categories for events. Users manage their own types.

## 4. Key Workflows

### Authentication Flow
1. User lands on `/login`.
2. `authService.signIn` checks credentials against `localStorage`.
3. Success -> Updates `AuthContext` -> Redirects to `/`.
4. App loads user preferences (theme, etc.).

### Calendar & Schedule Flow
1. **Dashboard (`CalendarPage`):**
   - Displays Monthly Grid (`Calendar.jsx`) and Agenda List (`Schedule.jsx`).
   - Fetches events via `dataService.getSchedule(day, date, userId)`.
   - **Smart Sorting:** Events are sorted by priority: Today > Future > Past.
2. **Interaction:**
   - **Tap Day:** Selects day, filters Schedule to show only that day.
   - **Tap Selected Day:** Opens `EventListModal` (Quick view).
   - **Tap Event:** Navigates to `/event/:id`.
   - **FAB:** Navigates to `/event/new`.

### Event Management Flow
1. **Creation:**
   - `/event/new` loads `EventPage` in "Create Mode".
   - User inputs details, selects `EventType` (loaded from `dataService`).
   - Saves -> `dataService.createEvent` -> Redirects back.
2. **Editing:**
   - `/event/:id` loads existing data.
   - Checks permissions (Owner vs Editor). Read-only if viewer.
   - Updates -> `dataService.updateEvent`.

### Family & Sharing Flow
1. **Grouping:**
   - Users can be invited to a "Family Group" via `FamilyGroupPage`.
   - `dataService.sendFamilyRequest` creates a notification.
2. **Notifications:**
   - Recipient sees alert in Header.
   - `NotificationsModal` allows Accept/Reject.
   - Accept -> Updates `family_id` to match inviter.
3. **Visibility:**
   - Events marked "Share with Family" are visible to all users with same `family_id`.

## 5. UI/UX Patterns
- **Responsive:** Mobile-first design using TailwindCSS.
- **Icons:** Material Symbols (Google).
- **Feedback:** Loading spinners, Toast notifications (via `FeedbackContext` - *implied*).
- **Navigation:** Bottom-like interaction on Mobile, Sidebar/Header on Desktop.

## 6. Supabase Integration Status
- **Ready:** Codebase contains commented-out Supabase calls (`// FUTURE: ...`).
- **Schema:** SQL Plan prepared (`supabase_schema_plan.sql`) matching the mock data structure.
- **Pending:** Swapping `localStorage` logic for real `supabase-js` calls in services.
