# Duewise product plan

## Completed: Phase 1–4 (active workflow system)

This session focused on transforming Duewise from a passive record manager into an active workflow tool. The changes now make the app feel like a household operations system.

### Recurring workflows ✅
**Implemented:**
- Tasks now support recurring intervals (weekly, monthly, yearly) with end-date controls
- Subscriptions support the same recurrence pattern
- When a recurring task is marked completed, the system automatically creates the next occurrence if recurrence is still active
- When a recurring subscription item is cancelled, the next occurrence is created for the following cycle
- **Files:** [app/api/tasks/route.ts](app/api/tasks/route.ts), [app/api/subscriptions/route.ts](app/api/subscriptions/route.ts), [lib/dates/recurring.ts](lib/dates/recurring.ts), [types/task.ts](types/task.ts), [types/subscription.ts](types/subscription.ts)

### Duplicate and bulk actions ✅
**Implemented:**
- All resources (tasks, subscriptions, documents, inventory, etc.) now support duplicate actions from both grid and table views
- Selected items can now be batch-deleted with a single action
- Bulk deletion clears the selection after completion
- Mobile and desktop experiences both support the same batch workflows
- **Files:** [components/tables/resource-page.tsx](components/tables/resource-page.tsx)

### Shared selection and state management ✅
**Implemented:**
- Multi-select checkboxes in grid cards, mobile cards, and table rows
- Selected item count displays in a persistent action bar
- Clear selection button for quick reset
- Selection state persists across view changes until explicitly cleared
- **Files:** [components/tables/resource-page.tsx](components/tables/resource-page.tsx)

### Quick task completion workflow ✅
**Implemented:**
- Single-click "Complete" button on all task views (grid, mobile, table)
- Batch completion for multiple selected tasks
- "Complete and add next step" action that marks a task done and opens a pre-filled follow-up form
  - Carries over: category, assigned family member, linked documents/inventory
  - Pre-fills notes with context from the original task
  - Prefixes title with "Follow up:" for clarity
  - Opens the new form directly for immediate action
- **Files:** [components/tables/resource-page.tsx](components/tables/resource-page.tsx), [lib/tasks/follow-up.ts](lib/tasks/follow-up.ts)

### Ordering and prioritization (partial) ✅
**Implemented:**
- Drag-and-drop card reordering in grid view
- Visual feedback during drag state ("Moving" label)
- Position-based item ordering utility
- Ordering state reflects in the filtered list view
- **Files:** [lib/utils/ordering.ts](lib/utils/ordering.ts), [components/tables/resource-page.tsx](components/tables/resource-page.tsx)

---

## Future roadmap

### Phase 5 — Proactive reminders and alerts (high impact)
**Goals:** Make the app feel like an active assistant, not a passive record.

- **Smart summaries:** Dashboard widget showing "this week's deadlines," "overdue items," and "upcoming recurring tasks"
- **Reminder patterns:** Pre-configured reminders (1 week before, 3 days before, 1 day before) for tasks with due dates
- **Follow-up nudges:** After completing a recurring task, a small prompt asking "when's the next step?"
- **Calendar view:** Visual timeline of all upcoming deadlines across resources
- **Overdue flags:** Visual badges and filters for items past their due date

**Implementation hints:**
- Add a dashboard route that aggregates across all collections
- Use date comparison helpers to flag urgent items
- Store reminder preferences per resource type
- Add a "snooze" action to defer reminders temporarily

### Phase 6 — Saved views and filters (high usability)
**Goals:** Let users create personalized operating systems within Duewise.

- **Save filters:** "My active tasks," "Family docs due soon," "All medical," "All insurance renewals"
- **Filter presets:** Common household patterns (school admin, medical, vehicle, identity, insurance)
- **Pinned collections:** Quick-access buttons to frequently-used filtered views
- **Sort options:** By due date, by category, by assigned person, by custom order
- **Filter combinations:** Search + filter + sort working together seamlessly

**Implementation hints:**
- Add a saved-filters collection in Firestore
- Create quick-filter UI in the sidebar or top nav
- Extend the resource page to support sort options
- Use URL params to persist filter state

### Phase 7 — Advanced templates and workflows (quality of life)
**Goals:** Reduce repetitive data entry and make common workflows instant.

- **Workflow templates:** "Annual vehicle renewal" (registration + insurance + inspection), "Back to school" (supplies + physicals + payments)
- **Template sharing:** Let users share household-specific templates
- **Smart defaults:** Remember common values and settings per resource
- **Batch creation:** Create multiple items from a single template with variations
- **Template library:** Suggestions based on region, household size, etc.

**Implementation hints:**
- Extend the existing template system in resource pages
- Store template metadata (use count, last used, household relevance)
- Add a template marketplace or community collection
- Pre-populate form fields based on household profile

### Phase 8 — Household insights and reporting (engagement)
**Goals:** Help users understand their household admin patterns and workload.

- **Admin calendar:** Heatmap of busy months (e.g., September is school month, April is tax month)
- **Category breakdown:** "45% of your tasks are medical, 30% are identity, 15% are vehicle"
- **Workload distribution:** Show tasks assigned to each family member
- **Trends:** "Last year you had 120 tasks; this year you're on pace for 135"
- **Completion stats:** Streak of on-time completions, average time-to-completion

**Implementation hints:**
- Add analytics collection in Firestore (opt-in)
- Create a simple report dashboard
- Use date ranges to calculate trends
- Show aggregates without storing sensitive task details

### Phase 9 — Mobile app and offline support (reach)
**Goals:** Make the app truly portable for real household work.

- **Mobile app:** React Native or Flutter version with offline-first sync
- **Voice actions:** "Remind me to pay rent on the 1st"
- **Notifications:** Native push notifications for deadlines and reminders
- **Offline forms:** Create and edit items offline, sync when reconnected
- **Badges and alerts:** Persistent home screen badge for overdue items

**Implementation hints:**
- Evaluate React Native for code reuse or Flutter for performance
- Set up a sync queue for offline edits
- Integrate Firebase Cloud Messaging for notifications
- Use service workers to cache critical data

### Phase 10 — Household collaboration (multi-user)
**Goals:** Turn Duewise into a shared household operating system.

- **Family member roles:** Admin, contributor, viewer per household
- **Assignment and due dates:** "Ahmed, you're handling the car registration this month"
- **Comments and notes:** Discuss follow-ups and decisions on items
- **Activity feed:** "Sarah marked the insurance renewal complete"
- **Shared calendars:** Export household deadlines to Google Calendar, Outlook, etc.

**Implementation hints:**
- Implement household-level access control in Firestore rules
- Add comment collection linked to each resource
- Create a simple notification system for assigned tasks
- Add webhook integrations for calendar exports

---

## Development priorities

### High impact, low effort (do now)
1. Smart dashboard with deadline summaries
2. Save and restore filter presets
3. Auto-fill reminder dates for recurring items
4. "Mark complete" button enhancements (sound feedback, quick animations)

### High impact, medium effort (do soon)
1. Proactive reminder notifications
2. Advanced sort options per resource
3. Template library expansion
4. Basic household insights dashboard

### Lower priority (backlog)
1. Calendar view for all deadlines
2. Household collaboration and multi-user roles
3. Mobile app
4. Analytics and reporting

---

## Product philosophy

Duewise should feel like a **household CFO assistant**, not a task manager. It's for managing the unglamorous admin work that most households do on ad-hoc cycles: vehicle registration, passport renewals, insurance renewals, school payments, medical checkups. The goal is to help users shift from "remembering" to "managing," and from reactive (missing deadlines) to proactive (getting 90 days ahead).

Key principles:
- **Recurring by default:** Most household admin is cyclical, not one-off
- **Minimal cognitive load:** Pre-filled forms, templates, smart defaults
- **Visible workload:** Help users see the full scope of household work
- **Distributed responsibility:** Support family collaboration and accountability
- **Workflow-oriented:** Focus on actions (complete, defer, delegate) not just data
