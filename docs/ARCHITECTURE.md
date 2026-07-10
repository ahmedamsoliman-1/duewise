# Duewise architecture and design principles

## Product vision

Duewise is a **household operations platform** designed to help families shift from reactive ("Did I forget something?") to proactive ("Here's what's coming up"). It's not a task manager or calendar app; it's a household CFO assistant that helps users anticipate and manage cyclical admin work.

**Tagline:** Your household's operating system, not your to-do list.

## Core principles

### 1. Recurring by default
Most household admin is cyclical: car registration every 2 years, passport renewal every 5 years, rent every month, medical checkups annually. The system should assume recurrence and make it easy to manage cycles, not one-off tasks.

### 2. Pre-filled workflows
Reduce cognitive load by guessing sensible defaults. When a user completes a task, the system should automatically suggest the next step. When they duplicate a document, pre-fill with context. Make it faster to manage than to think.

### 3. Visible workload
Help users understand the full scope of household work. Show aggregates: "45% of your work is medical, 30% is identity, 15% is vehicle." Help them see patterns they'd otherwise miss.

### 4. Distributed responsibility
Support family collaboration. Different household members are responsible for different domains (one person handles vehicle registration, another handles medical appointments). The system should help assign and track this.

### 5. Workflow-oriented
Focus on actions (complete, defer, delegate, remind) not just data. The app should guide users toward what to do next, not just show them what exists.

## Technical architecture

### Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, React Hook Form
- **Backend:** Firebase (Auth, Firestore, Storage), Next.js API routes as thin BFF layer
- **Validation:** Zod for schemas (form + API payload validation)
- **UI components:** Custom shadcn-style primitives (no external component library)

### Database schema (Firestore)

```
users/{uid}/
  tasks/
    - title: string
    - category: string
    - dueDate: string (ISO 8601)
    - status: "upcoming" | "due soon" | "overdue" | "completed"
    - recurrenceInterval: "none" | "weekly" | "monthly" | "yearly"
    - recurrenceEndDate?: string (ISO 8601)
    - reminderDates: string[] (ISO 8601)
    - familyMemberId?: string
    - linkedDocumentId?: string
    - linkedInventoryItemId?: string
    - notes: string
    - createdAt: timestamp
    - updatedAt: timestamp
    - position?: number (for custom ordering)

  subscriptions/
    - title: string
    - amount: number
    - dueDate: string (ISO 8601, first payment or renewal date)
    - status: "active" | "cancelled" | "expiring"
    - recurrenceInterval: "none" | "weekly" | "monthly" | "yearly"
    - recurrenceEndDate?: string
    - provider?: string
    - accountNumber?: string
    - familyMemberId?: string
    - notes: string
    - createdAt: timestamp
    - updatedAt: timestamp

  documents/
    - title: string
    - type: "passport" | "deed" | "will" | "insurance" | "medical" | "financial" | "other"
    - ownerName: string
    - expiryDate?: string
    - storagePath: string (GCS path)
    - fileUrl: string (signed read URL)
    - familyMemberId?: string
    - createdAt: timestamp
    - updatedAt: timestamp

  [other resources: family, inventory, life-events, dashboard, ...]

household/{householdId}/
  (future: shared collections for multi-user households)
```

### API structure

**Pattern:** Each resource has its own route with CRUD handlers + domain-specific logic.

```
/api/{resource}/route.ts
  - GET: list all items for current user
  - POST: create new item
  - PATCH: update item (with recurrence/workflow logic if applicable)
  - DELETE: remove item

/api/{resource}/{action}/route.ts
  - Upload URLs, pre-signed download links, etc.
```

**Example:** `/api/tasks/route.ts` handles task CRUD but also:
- On PATCH with status="completed": creates next occurrence if recurrence is active
- Calculates task status based on dueDate automatically
- Applies reminder date defaults

### Shared resource page pattern

The `ResourcePage` component is a generic CRUD + workflow orchestrator used by:
- Tasks, Subscriptions, Documents, Inventory, Life Events, Family

**Props (minimal):**
```typescript
type ResourcePageProps = {
  endpoint: string // "/api/tasks", "/api/documents", etc.
  schema: ZodSchema // form validation
  fields: Field[] // form field definitions
  columns: Column[] // table/grid display definitions
  defaults: Record<string, unknown> // new item template
  prepareSubmit?: (values) => Record // pre-process form data
  quickFilters?: QuickFilter[] // status, category filters
  mobileCardVariant?: "tasks" | ... // mobile UI variant
}
```

**This single component handles:**
- List/filter/search across all resources
- Create/edit/delete workflows
- Multi-select state and batch actions
- File uploads and storage integration
- Drag-and-drop reordering
- Mobile and desktop views
- Relation resolution (loading family members for dropdown, etc.)

### Key design decisions

1. **URL schema validation:** All form inputs are validated against Zod schemas. These same schemas validate API payloads. Single source of truth for data requirements.

2. **Recurrence on the item, not a relation:** Tasks and subscriptions have `recurrenceInterval` and `recurrenceEndDate` as properties, not links to a Recurrence collection. Simpler queries, fewer joins.

3. **Next occurrence created server-side:** When marking a recurring task complete, the backend immediately creates the next occurrence. This ensures consistency and prevents UI race conditions.

4. **Position-based ordering:** Items have an optional `position` field. Reordering is done by renumbering positions. No sort indices or explicit ordering rules.

5. **Thin API routes:** Routes are mostly BFF (backend-for-frontend) glue. Business logic lives in `lib/` (calculation of status, recurrence, etc.). This keeps logic testable and reusable.

6. **Client-side filtering and sorting:** The resource page filters and sorts in-memory. For large lists (100+ items), this might need server-side implementation, but works well for typical household data.

## File organization

```
app/
  api/
    {resource}/
      route.ts (main CRUD + domain logic)
      {action}/route.ts (file uploads, special operations)
  {resource}/
    page.tsx (resource page + configuration)

components/
  tables/
    resource-page.tsx (generic CRUD orchestrator, ~1,400 lines)
  cards/
    *-client.tsx (mobile-specific variants)
  ui/
    (primitives: button, card, input, badge, etc.)

lib/
  api/
    client.ts (fetch wrapper)
    crud.ts (generic CRUD handlers)
    errors.ts (error handling)
  {domain}/
    (helpers for specific domains)
  dates/
    recurring.ts (recurrence helpers)
    status.ts (task status calculation)
  validators/
    schemas.ts (all Zod schemas)
  firestore/
    collections.ts (collection references)
    readers.ts (read helpers)

types/
  {resource}.ts (type definitions per resource)
```

## Adding a new resource

To add a new resource (e.g., "vet appointments"):

1. **Define type:** `types/vet-appointment.ts`
2. **Add schema:** `lib/validators/schemas.ts` (add `vetAppointmentSchema`)
3. **Add API route:** `app/api/vet-appointments/route.ts` (use generic CRUD or add custom logic)
4. **Add page:** `app/vet-appointments/page.tsx` (configure `ResourcePage` with fields, columns, filters)
5. **Add to navigation:** `components/layout/app-shell.tsx`

The `ResourcePage` component handles the rest: forms, lists, bulk actions, filtering.

## UI/UX patterns

### Actions
Every resource item has consistent actions:
- **Edit** (pencil icon)
- **Delete** (trash icon)
- **Duplicate** (copy icon)
- **Complete** (checkmark, tasks only)
- **Select** (checkbox, for batch operations)

### Views
Each resource supports 3 views:
- **Grid:** Cards with preview images (documents), status badges, quick actions
- **Table:** Compact rows, good for dense information, desktop only
- **Mobile:** Cards optimized for touch, single-column layout

### Filters
- **Quick filters:** Status, category, assigned person (configured per resource)
- **Search:** Full-text search across all visible text
- **Sort:** By due date, category, custom order

### Batch operations (when items selected)
- **Complete** (tasks only)
- **Delete** (all resources)
- **Clear selection**

## Performance considerations

### Current limitations
- Lists are filtered/sorted in-memory (OK for <200 items)
- All relation options loaded on mount (OK for <500 family members)
- No pagination or virtualization yet

### For future optimization
- Server-side filtering/sorting when lists exceed 100 items
- Lazy-load relation options
- Virtualize long lists with react-window
- Cache relation options in localStorage
- Debounce search input

## Testing strategy

### Unit tests
- Recurrence calculation logic ([lib/dates/recurring.test.ts](lib/dates/recurring.test.ts))
- Validators ([lib/validators/schemas.ts](lib/validators/schemas.ts) via Zod)
- Helpers (date, ordering, etc.)

### Manual testing (recommended)
- CRUD flows per resource
- Batch operations (select, complete, delete)
- Recurrence workflows
- File uploads and storage
- Mobile and desktop views
- Cross-browser compatibility

### CI/CD
- TypeScript: `npm run typecheck`
- Linting: `npm run lint`
- Tests: (add Jest/Vitest when needed)

## Future architectural work

1. **Extract batch operations:** Move multi-select and batch action logic to a custom hook or context
2. **Extract form handling:** Move form state to a separate form manager
3. **Refactor drag-drop:** Separate drag-drop orchestration into a utility
4. **Add caching layer:** Firebase offline persistence for better mobile support
5. **Add analytics:** Opt-in event tracking for usage patterns
6. **Add notifications:** Firebase Cloud Messaging for deadline reminders

## Deployment and infrastructure

- **Hosting:** Vercel (Next.js)
- **Database:** Firebase Firestore (serverless)
- **Storage:** Google Cloud Storage (via Firebase)
- **Auth:** Firebase Authentication
- **Monitoring:** (recommend: Sentry, LogRocket)

**Environment variables:**
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

All secrets loaded from Vercel environment panel; `.env.local` for local development.
