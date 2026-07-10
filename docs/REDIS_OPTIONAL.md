# Redis integration (optional, conditional)

## Overview

This document describes Duewise's **optional, gracefully-degrading Redis caching layer**. Redis is used to reduce Firestore reads and improve relation loading performance, but the app works normally if Redis is unavailable or disabled.

**Key principle:** Redis is a performance optimization, not a requirement. If Redis URL is not configured or connection fails, Duewise falls back to direct Firestore reads.

## Why Redis?

### Current pain points
- Every page load triggers relation fetches (family members, documents, inventory)
- Even though these change rarely, they're fetched from Firestore every time
- At scale (1000+ households), this becomes expensive and slow

### What Redis solves
1. **Relation caching:** Cache family members, document titles, inventory items for 1-24 hours
2. **Rate limiting:** Prevent abuse on file uploads, batch operations
3. **Session hints:** Store lightweight session data (optional)
4. **Future:** Real-time features, multi-user live updates

### Expected benefits
- ~20–50ms faster relation loading (negligible for single users)
- ~70–80% reduction in Firestore reads for relations (significant cost savings at scale)
- Better handling of rate-limited operations

## Architecture

### Conditional startup

Redis connection is optional and non-blocking:

```typescript
// middleware or app initialization
import { initRedis } from '@/lib/redis/client';

// On app startup (can be async/parallel with other init)
initRedis().catch(err => {
  console.warn('Redis initialization failed, app will work without caching:', err);
});
```

If `REDIS_URL` is not set, Redis is silently skipped. If connection fails, app continues normally.

### Cache pattern

All caching uses a `getOrSet` helper that handles fallbacks:

```typescript
const data = await getOrSet(
  'cache-key',
  async () => fetchFromFirestore(), // Fallback
  3600 // TTL in seconds
);
```

If Redis is unavailable, `getOrSet` immediately uses the fallback.

### Invalidation pattern

After any write (create, update, delete), related cache keys are invalidated:

```typescript
await invalidate('family:user-123');
await invalidate('documents:user-123');
```

If Redis is unavailable, invalidation is skipped silently.

## Setup

### Prerequisites
- Redis instance (local, Upstash, Redis Cloud, or equivalent)
- Redis URL in format: `redis://[user]:[password]@host:port`

### Installation

1. **Add Redis dependency:**
   ```bash
   npm install redis
   ```

2. **Set environment variable:**
   ```bash
   # .env.local (development)
   REDIS_URL=redis://localhost:6379
   
   # Vercel (production)
   # Set REDIS_URL in Vercel dashboard > Settings > Environment Variables
   ```

3. **If using Upstash or other cloud Redis:**
   ```bash
   REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_ENDPOINT:PORT
   ```

### Disable Redis (optional)

To disable Redis and use only Firestore:
- **Don't set `REDIS_URL`** environment variable
- The app will work identically but without caching

## Implementation guide

### Core Redis client

File: `lib/redis/client.ts`

```typescript
import { createClient, type RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let redisConnected = false;

export async function initRedis() {
  if (!process.env.REDIS_URL) {
    console.log('[Redis] Disabled: REDIS_URL not set');
    return;
  }

  try {
    redisClient = createClient({ url: process.env.REDIS_URL });
    
    redisClient.on('error', (err) => {
      console.error('[Redis] Error:', err.message);
      redisConnected = false;
    });
    
    redisClient.on('connect', () => {
      console.log('[Redis] Connected');
      redisConnected = true;
    });

    await redisClient.connect();
  } catch (error) {
    console.warn('[Redis] Failed to initialize:', error instanceof Error ? error.message : error);
    redisConnected = false;
    redisClient = null;
  }
}

export async function getOrSet<T>(
  key: string,
  fallback: () => Promise<T>,
  ttlSeconds = 3600
): Promise<T> {
  // If Redis is not available, skip caching entirely
  if (!redisConnected || !redisClient) {
    return fallback();
  }

  try {
    // Try to get from cache
    const cached = await redisClient.get(key);
    if (cached) {
      console.debug(`[Redis] Cache hit: ${key}`);
      return JSON.parse(cached);
    }

    // Cache miss: fetch fresh data
    console.debug(`[Redis] Cache miss: ${key}`);
    const fresh = await fallback();
    
    // Store in cache
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(fresh));
    return fresh;
  } catch (error) {
    console.warn(`[Redis] Operation failed for ${key}, using fallback:`, 
      error instanceof Error ? error.message : error);
    // Fallback to fresh data
    return fallback();
  }
}

export async function invalidate(key: string): Promise<void> {
  if (!redisConnected || !redisClient) {
    return;
  }

  try {
    const deleted = await redisClient.del(key);
    if (deleted > 0) {
      console.debug(`[Redis] Invalidated: ${key}`);
    }
  } catch (error) {
    console.warn(`[Redis] Failed to invalidate ${key}:`, 
      error instanceof Error ? error.message : error);
    // Non-blocking: continue even if invalidation fails
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisConnected = false;
      console.log('[Redis] Connection closed');
    } catch (error) {
      console.warn('[Redis] Error closing connection:', error);
    }
  }
}
```

### Initialize Redis on app startup

File: `app/layout.tsx`

```typescript
import { initRedis } from '@/lib/redis/client';

// Call during app initialization (runs once)
initRedis().catch(err => {
  console.warn('[Redis] Initialization skipped, app will work without caching');
});

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

### Use in API routes

Example: Cache family member list

File: `app/api/family/route.ts`

```typescript
import { getOrSet, invalidate } from '@/lib/redis/client';

export async function GET(request: NextRequest) {
  const user = await requireUser(request);

  const data = await getOrSet(
    `family:${user.uid}`,
    async () => {
      // Fallback: fetch from Firestore
      const snapshot = await userCollection(user.uid, 'family').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    86400 // Cache for 24 hours
  );

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  const body = await request.json();

  // Create new family member in Firestore
  const ref = await userCollection(user.uid, 'family').add(body);
  const doc = await ref.get();

  // Invalidate cache
  await invalidate(`family:${user.uid}`);

  return NextResponse.json({ data: { id: ref.id, ...doc.data() } });
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser(request);
  const body = await request.json();
  const id = z.string().parse(body.id);

  // Update in Firestore
  await userCollection(user.uid, 'family').doc(id).update(body);
  const doc = await userCollection(user.uid, 'family').doc(id).get();

  // Invalidate cache
  await invalidate(`family:${user.uid}`);

  return NextResponse.json({ data: { id, ...doc.data() } });
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser(request);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) throw apiError(new Error('Missing id'));

  await userCollection(user.uid, 'family').doc(id).delete();

  // Invalidate cache
  await invalidate(`family:${user.uid}`);

  return NextResponse.json({ success: true });
}
```

## Cache keys and TTLs

### Recommended cache keys and expiration times

| Resource | Key pattern | TTL | Reason |
|----------|------------|-----|--------|
| Family members | `family:{userId}` | 86400 (24h) | Rarely change, heavy on reads |
| Documents list | `documents:{userId}` | 86400 (24h) | Metadata cached, file URLs signed separately |
| Inventory | `inventory:{userId}` | 43200 (12h) | Moderate change frequency |
| Life events | `life-events:{userId}` | 86400 (24h) | Historical, rarely changed |
| Task counts | `task-counts:{userId}` | 3600 (1h) | Changes frequently |
| Filter results | `filter:{userId}:{filterKey}` | 1800 (30m) | Volatile, recompute often |
| Rate limit | `ratelimit:{userId}:{action}` | 300 (5m) | Sliding window |

### Invalidation triggers

Cache invalidation should happen whenever data changes:

```typescript
// Example: invalidate related caches after any write
async function invalidateRelated(userId: string) {
  await Promise.all([
    invalidate(`family:${userId}`),
    invalidate(`documents:${userId}`),
    invalidate(`inventory:${userId}`),
    // ... other related keys
  ]);
}
```

## Monitoring and debugging

### Checking Redis status

```bash
# If using local Redis
redis-cli ping
# Output: PONG

# Check connected clients
redis-cli client list

# Monitor cache operations
redis-cli MONITOR
```

### Logs to watch

Redis operations log at DEBUG/WARN levels:

```
[Redis] Connected
[Redis] Cache hit: family:user-123
[Redis] Cache miss: documents:user-123
[Redis] Invalidated: family:user-123
[Redis] Failed to initialize: Connection refused
[Redis] Operation failed for family:user-123, using fallback: timeout
```

### Performance metrics

To measure caching effectiveness, track:
- Cache hit rate: `cache hits / total reads`
- Latency: Compare response times with/without Redis
- Firestore read reduction: Monitor `InstanceId.database_reqs` in Firebase console

### Troubleshooting

**Problem:** "Redis disabled: REDIS_URL not set"
- **Solution:** Set `REDIS_URL` in `.env.local` or Vercel dashboard
- **Alternative:** This is normal; app works fine without Redis

**Problem:** "Failed to initialize: Connection refused"
- **Solution:** Check Redis server is running (`redis-server` or cloud provider)
- **Alternative:** Redis is optional; app continues without caching

**Problem:** "Cache operation failed for X, using fallback"
- **Solution:** Check Redis connection and memory usage
- **Alternative:** This is expected behavior; fallback is working

**Problem:** "High Firestore reads despite Redis"
- **Solution:** Check cache invalidation logic; ensure you're calling `invalidate()` after writes
- **Alternative:** Verify cache TTLs are appropriate for your workload

## Performance considerations

### Expected improvements
- Relation loading: ~20–50ms faster (negligible for single users)
- Firestore costs: ~70–80% reduction in relation reads
- Rate limiting: Requests blocked immediately without Firestore call

### When to enable Redis
✅ Scale: 100+ households
✅ Budget: Firestore costs are significant
✅ Performance: Noticeable latency on relation loading
❌ Simplicity: Want to minimize operational complexity
❌ Scale: Single-user/small-scale usage

### When Redis is overkill
- Single household or small test
- Limited Firestore usage (already cheap)
- Simple app with few relations to cache
- Free tier already sufficient

## Deployment

### Vercel + Upstash (recommended for Vercel)

1. Create Upstash account (free tier available)
2. Create Redis database
3. Copy connection string
4. In Vercel dashboard:
   - Go to project > Settings > Environment Variables
   - Add `REDIS_URL` with the Upstash connection string
5. Deploy; Redis is automatically available

### Vercel + Self-hosted Redis

Same as above, but set `REDIS_URL` to your self-hosted Redis endpoint.

### Local development

1. Install Redis: `brew install redis` (macOS) or equivalent
2. Start Redis: `redis-server`
3. Set in `.env.local`: `REDIS_URL=redis://localhost:6379`
4. Dev server uses local Redis automatically

### Next.js + Docker

If containerizing, include Redis:

```dockerfile
FROM redis:7-alpine
# or use a separate container orchestrated with docker-compose
```

## Disabling Redis

To temporarily or permanently disable Redis:

1. **Remove `REDIS_URL` from environment**
   - App will detect this on startup and skip Redis initialization
   - No code changes needed

2. **Or set a flag:**
   ```typescript
   if (!process.env.REDIS_ENABLED || process.env.REDIS_ENABLED === 'false') {
     // Skip Redis
   }
   ```

## Future enhancements

### Possible additions (not yet implemented)
- **Cache warming:** Pre-load common queries on user login
- **Cache invalidation patterns:** TTL vs. event-driven invalidation
- **Analytics:** Track cache hit rates per key
- **Distributed caching:** Share cache across instances (if deployed on multiple servers)
- **Pub/Sub:** Real-time invalidation across instances
- **Rate limiting:** Token bucket or sliding window algorithms

### When to consider
- Once you have 100+ concurrent users
- When Firestore costs become significant
- If you need real-time features (live updates across devices)

## References

- [Redis documentation](https://redis.io/docs/)
- [node-redis client](https://github.com/redis/node-redis)
- [Upstash (managed Redis)](https://upstash.com)
- [Firebase Firestore caching best practices](https://firebase.google.com/docs/firestore/best-practices)

## Summary

**Conditional Redis caching** gives Duewise the option to scale without complexity:
- ✅ Zero configuration needed to start (app works without Redis)
- ✅ Free opt-in performance boost when needed
- ✅ Graceful degradation if Redis becomes unavailable
- ✅ Easy to enable/disable via environment variable
- ✅ Low operational overhead

Use this pattern when you're ready to scale beyond single-household usage or need to reduce Firestore costs.
