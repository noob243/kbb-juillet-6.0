/**
 * Safe localStorage helper with automatic QuotaExceededError recovery.
 * Guarantees that no uncaught storage errors crash the application,
 * and prunes non-critical caches if browser quota is exhausted.
 */

import { AppUser } from '../types/rbac';

// Non-critical cache keys that can safely be evicted if storage is full
const LOW_PRIORITY_CACHE_KEYS = [
  'kbb_cache_auditLogs',
  'kbb_cache_correspondances',
  'kbb_cache_events',
  'kbb_cache_tasks'
];

/**
 * Strips huge base64 strings or payloads from users before saving to localStorage
 */
export function sanitizeUsersForStorage(users: AppUser[]): AppUser[] {
  if (!Array.isArray(users)) return [];
  return users.map(user => {
    // If photoUrl is a massive base64 string (> 1000 chars), omit or placeholder it in cache
    let safePhotoUrl = user.photoUrl;
    if (safePhotoUrl && safePhotoUrl.startsWith('data:') && safePhotoUrl.length > 1000) {
      safePhotoUrl = undefined; // Don't bloat local cache with raw base64; will load from Firestore/session
    }

    return {
      ...user,
      photoUrl: safePhotoUrl
    };
  });
}

/**
 * Safely sets an item in localStorage with quota recovery
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    const isQuotaError = 
      error?.name === 'QuotaExceededError' ||
      error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error?.code === 22 ||
      error?.code === 1014;

    if (isQuotaError) {
      console.warn(`[Storage] Quota exceeded when saving key "${key}". Purging non-critical caches...`);

      // 1. Evict non-essential caches
      for (const lowPriorityKey of LOW_PRIORITY_CACHE_KEYS) {
        if (lowPriorityKey !== key) {
          try {
            localStorage.removeItem(lowPriorityKey);
          } catch (e) {}
        }
      }

      // 2. Retry setting the item after eviction
      try {
        localStorage.setItem(key, value);
        console.info(`[Storage] Successfully saved "${key}" after cache pruning.`);
        return true;
      } catch (retryError) {
        console.warn(`[Storage] Still unable to save "${key}" after pruning. Continuing in-memory without crashing.`);
        return false;
      }
    } else {
      console.warn(`[Storage] Unable to save key "${key}":`, error?.message);
      return false;
    }
  }
}

/**
 * Safely retrieves an item from localStorage
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`[Storage] Error reading key "${key}":`, error);
    return null;
  }
}

/**
 * Safely removes an item from localStorage
 */
export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[Storage] Error removing key "${key}":`, error);
  }
}
