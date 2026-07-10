import "server-only";

import { createClient, type RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;
let redisConnected = false;
let initAttempted = false;

export async function initRedis() {
  if (initAttempted) return;
  initAttempted = true;

  if (process.env.ENABLE_REDIS !== "true") {
    console.log("[Redis] Disabled: ENABLE_REDIS not set to 'true'");
    return;
  }

  if (!process.env.REDIS_URL) {
    console.warn("[Redis] ENABLE_REDIS=true but REDIS_URL not set");
    return;
  }

  try {
    redisClient = createClient({ url: process.env.REDIS_URL });

    redisClient.on("error", (err: Error) => {
      console.error("[Redis] Error:", err.message);
      redisConnected = false;
    });

    redisClient.on("connect", () => {
      console.log("[Redis] Connected");
      redisConnected = true;
    });

    await redisClient.connect();
  } catch (error) {
    console.warn(
      "[Redis] Failed to initialize:",
      error instanceof Error ? error.message : error
    );
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
    console.warn(
      `[Redis] Operation failed for ${key}, using fallback:`,
      error instanceof Error ? error.message : error
    );
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
    console.warn(
      `[Redis] Failed to invalidate ${key}:`,
      error instanceof Error ? error.message : error
    );
    // Non-blocking: continue even if invalidation fails
  }
}

export async function invalidateMultiple(keys: string[]): Promise<void> {
  if (!redisConnected || !redisClient || keys.length === 0) {
    return;
  }

  try {
    const deleted = await redisClient.del(keys);
    if (deleted > 0) {
      console.debug(`[Redis] Invalidated ${deleted} keys`);
    }
  } catch (error) {
    console.warn(
      `[Redis] Failed to invalidate multiple keys:`,
      error instanceof Error ? error.message : error
    );
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisConnected = false;
      console.log("[Redis] Connection closed");
    } catch (error) {
      console.warn("[Redis] Error closing connection:", error);
    }
  }
}

export function isRedisAvailable(): boolean {
  return redisConnected && redisClient !== null;
}
