# Duewise Platform Improvement Plan

**Last Updated:** July 10, 2026 (Session 2 complete)
**Status:** Actively evolving based on feature prioritization

---

## Current Platform State

### ✅ Completed Features (Session 2)

1. **Recurring Workflows** - Tasks & subscriptions auto-create next occurrence
2. **Duplicate Actions** - Clone any resource with pre-filled context
3. **Multi-Select & Batch Operations** - Select multiple items, bulk delete
4. **Quick Completion** - Single-click task completion from grid/mobile views
5. **Complete & Next Step** - Mark complete and pre-fill follow-up form
6. **Drag-and-Drop Ordering** - Reorder items in grid view (UI only, not persisted)
7. **Redis Caching** - Optional, gracefully-degrading cache layer
8. **Full TypeScript** - All code validated and type-safe
9. **Comprehensive Documentation** - Architecture, product roadmap, Redis guide, session logs

### 📊 Active Infrastructure

- **Framework:** Next.js 15.3.4 (App Router) + React 19 + TypeScript 5.8
- **Backend:** Firebase (Auth, Firestore, Storage) + Google Cloud
- **UI:** Tailwind CSS + Lucide Icons + custom shadcn-style primitives
- **Forms:** React Hook Form + Zod validation
- **Data:** Nested Firestore structure (users/{uid}/{collections})
- **Caching:** Redis (optional, ENABLE_REDIS flag)
- **Performance:** CDN (Vercel), signed URLs for file access

---

## Limitations & Known Issues

### Cache Strategy (Current)

**TTLs:**
- Family members: 24h
- Documents: 24h
- Inventory: (not yet cached)
- Tasks: (not yet cached)

**Issues:**
1. If you update a task linked to a family member, family cache stays stale for 24h
2. No cascade invalidation (e.g., update task → auto-invalidate related family cache)
3. High-churn resources (tasks) cached too long
4. Filter results not cached (frequent recalculation)

**Current Workaround:** App works fine; just means stale data is possible for up to 24h

---

## Priority Improvements

### 🔴 **URGENT** (Next 1-2 weeks)

#### 1. Drag-and-Drop Persistence
**Status:** UI complete, backend missing
**What:** Position field should persist to Firestore when drag ends
**Files:** [components/tables/resource-page.tsx](../components/tables/resource-page.tsx)
**Effort:** 2-3 hours
**Benefit:** Orders persist across page reloads

#### 2. Add Inventory & Tasks to Redis Cache
**Status:** Family & documents cached; others not yet
**What:** Wrap inventory and tasks API GET with getOrSet()
**Files:** 
- [app/api/inventory/route.ts](../app/api/inventory/route.ts)
- [app/api/tasks/route.ts](../app/api/tasks/route.ts)
**Effort:** 30 min
**Benefit:** Complete caching coverage, 80% faster relation loading

#### 3. Fix Drag-and-Drop Grid Mobile Interaction
**Status:** Grid view doesn't drag well on mobile
**What:** Switch to tap-to-reorder or long-press-to-drag on mobile
**Files:** [components/tables/resource-page.tsx](../components/tables/resource-page.tsx)
**Effort:** 2 hours
**Benefit:** Better UX on phones/tablets

---

### 🟡 **HIGH PRIORITY** (This month)

#### 4. Dashboard with Deadline Summaries (Phase 5)
**What:** Home page showing:
- Overdue tasks count
- Due this week count
- Upcoming subscriptions (next 30 days)
- Recent life events timeline
- Quick action buttons

**Tech:** Server component fetching task/sub/event counts
**Files:** New [app/dashboard/page.tsx](../app/dashboard/page.tsx) (already exists, needs data)
**Effort:** 4-6 hours
**Benefit:** High-value dashboard experience, users see what needs attention

#### 5. Saved Filter Presets (Phase 6)
**What:** Users can save filter combinations and reload them
**Example:** "Overdue tasks", "All subscriptions due this month"
**Storage:** Firestore subcollection `users/{uid}/filterPresets`
**Files:** New schema, API route, UI selector
**Effort:** 3-4 hours
**Benefit:** Power users can quickly jump to important views

#### 6. Smart TTL Strategy for Redis
**What:** Replace fixed 24h TTLs with adaptive caching:
```typescript
// Example: shorter TTL for frequently-updated resources
const ttl = resource === 'tasks' ? 3600 : 86400;
```
**Files:** [app/api/tasks/route.ts](../app/api/tasks/route.ts), [app/api/family/route.ts](../app/api/family/route.ts), etc.
**Effort:** 1 hour
**Benefit:** More accurate cache expiration, reduced stale data

---

### 🟢 **MEDIUM PRIORITY** (This quarter)

#### 7. Cascade Invalidation for Related Caches
**What:** When updating task → also invalidate related family/document/inventory caches
```typescript
// On task PATCH: invalidate task cache AND related caches
await invalidateMultiple([
  `tasks:${userId}`,
  `family:${userId}`, // if task links to family
  `documents:${userId}`, // if task links to document
]);
```
**Files:** [app/api/tasks/route.ts](../app/api/tasks/route.ts) (patch handler)
**Effort:** 2 hours
**Benefit:** Eliminates 24h stale data risk; improves consistency

#### 8. Event-Based Cache Invalidation
**What:** Use Firestore Cloud Functions to listen for document changes and auto-invalidate Redis
**Tech:** Firebase Cloud Functions (Node.js runtime)
**Benefit:** Most robust; no manual invalidation needed
**Effort:** 6-8 hours (setup + testing)
**Tradeoff:** Adds infrastructure complexity

#### 9. Proactive Reminders & Alerts (Phase 5)
**What:** Email/push notifications for:
- Tasks due today
- Subscriptions renewing in 3 days
- Life events upcoming

**Tech:** Firestore Cloud Scheduler + SendGrid (email) + Firebase Cloud Messaging (push)
**Files:** New Cloud Functions, email templates
**Effort:** 8-10 hours
**Benefit:** High engagement, core value-add

#### 10. Bulk Import from CSV
**What:** Upload spreadsheet of tasks, subscriptions, or inventory items
**Tech:** CSV parser (papaparse library), validate against schemas, batch Firestore writes
**Files:** New upload API endpoint, UI uploader
**Effort:** 4-5 hours
**Benefit:** Reduces manual data entry for households with lots of items

---

### 🔵 **FUTURE** (Next 6+ months)

#### 11. Mobile App (Flutter or React Native)
**What:** Native iOS/Android apps with offline support
**Tech:** Flutter + Firebase SDK
**Effort:** 40-60 hours
**Benefit:** Better mobile experience than web

#### 12. Household Collaboration
**What:** Invite family members, assign tasks, track who completed what
**Tech:** Sub-roles (admin, editor, viewer), activity log
**Files:** New permission schema, API auth layer
**Effort:** 12-16 hours
**Benefit:** Transforms from personal to household admin tool

#### 13. Advanced Analytics & Insights
**What:** Charts showing:
- Task completion trends
- Most-used categories
- Spending patterns (subscriptions)
- Busiest months

**Tech:** Aggregation queries, Chart.js
**Effort:** 6-8 hours
**Benefit:** Helps users understand patterns

#### 14. Integrations
**What:** Connect to:
- Google Calendar (show due dates)
- Slack (receive reminders)
- Zapier (automation)

**Tech:** OAuth, webhooks
**Effort:** 8-10 hours per integration
**Benefit:** Extends reach beyond web app

#### 15. AI-Powered Assistant
**What:** Claude/GPT integration to:
- Suggest tasks based on past patterns
- Auto-categorize items
- Generate recurring reminders

**Tech:** OpenAI API, streaming responses
**Effort:** 4-6 hours
**Benefit:** Competitive differentiator

---

## Redis & Caching Strategy

### Current Implementation ✅
- **Family members:** Cached 24h
- **Documents:** Cached 24h
- **Fallback:** If Redis unavailable, uses Firestore (graceful degradation)
- **Flag:** `ENABLE_REDIS=true/false` controls on/off
- **Invalidation:** Manual on POST/PATCH/DELETE

### Recommended Next Steps

**Short term (1-2 weeks):**
1. Add inventory & tasks to cache
2. Implement smart TTLs (shorter for high-churn resources)
3. Add cascade invalidation for related resources

**Medium term (1-2 months):**
1. Implement event-based invalidation via Cloud Functions
2. Add Redis metrics/monitoring dashboard
3. Document cache effectiveness (hit rate, latency improvement)

**Long term (3-6 months):**
1. Consider read-through cache pattern (auto-refresh before expiry)
2. Implement cache warming on user login
3. Add cache versioning for schema changes

---

## Architecture Improvements

### ResourcePage Component (~1,400 lines)
**Issue:** Component is reaching complexity limit
**Solution:** Extract concerns into custom hooks
```typescript
// Proposed structure:
- useResourceState()           // items, selected, editing
- useResourceSelection()        // multiselect logic
- useBatchOperations()         // delete, complete, etc.
- useResourceOrdering()        // drag-drop reordering
- useResourceFilters()         // search, filter, sort
- useResourceFormHandling()    // create, edit, cancel
```
**Benefit:** Easier testing, better reusability
**Effort:** 4-6 hours
**Priority:** Medium (do after Phase 6)

### Nested Firestore Structure Tradeoffs
**Current:** `users/{uid}/{collections}`
**Limitation:** No cross-household analytics (only per-user)
**Future consideration:** Flat schema for analytics
```typescript
// Current (nested):
collections('users').doc(uid).collection('tasks')

// Future (flat, requires migration):
collections('tasks').where('userId', '==', uid)
```
**When:** Only if multi-user collaboration is added
**Migration:** Dual-write strategy during transition

---

## Developer Experience

### Documentation ✅
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Design decisions
- [REDIS_OPTIONAL.md](./REDIS_OPTIONAL.md) - Cache setup
- [product-roadmap.md](./product-roadmap.md) - Feature roadmap
- SESSION_*.md files - Session work logs

### Testing
**Current:** Recurrence logic has unit tests
**Gaps:**
- No API route tests
- No component tests
- No E2E tests

**Recommended:**
- Add Jest + @testing-library for components
- Add Vitest for API routes
- Consider Playwright for E2E

**Effort:** 10-15 hours to add solid test coverage

### CI/CD
**Current:** TypeScript checking only (npm run typecheck)
**Recommended:**
- Linting (ESLint)
- Formatting (Prettier)
- Unit tests (Jest/Vitest)
- E2E tests on main branches (Playwright)

**Setup:** 2-3 hours with GitHub Actions

---

## Recommended Next Session Plan

### 👍 **If prioritizing user value:**
1. Dashboard with deadline summaries (Phase 5)
2. Proactive reminders & alerts
3. Saved filter presets (Phase 6)

### 👍 **If prioritizing platform stability:**
1. Drag-and-drop position persistence
2. Cache invalidation improvements
3. Test coverage (unit + E2E)

### 👍 **If prioritizing scale readiness:**
1. Add all resources to Redis cache
2. Implement event-based invalidation
3. Multi-user preparation (collaboration prep)

---

## Success Metrics

- **User engagement:** DAU, task completion rate
- **Performance:** P50/P95 latency, cache hit rate
- **Cost:** Firestore reads/writes, database spending
- **Developer velocity:** PR merge time, bug fix time
- **Reliability:** Error rate, uptime

---

## Open Questions

1. **Collaboration:** When should we add multi-user support?
2. **Mobile:** Web-only or native apps in the roadmap?
3. **Scaling:** At what user count do we implement event-based caching?
4. **Monetization:** Free tier forever or premium features?
5. **Analytics:** Flat schema migration timeline?

---

**Next review date:** August 7, 2026 (after implementing Phase 5-6)
