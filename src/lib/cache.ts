/**
 * SIGPAD Server-Side Cache Utilities
 *
 * PROBLEMA ORIGINAL: SimpleCache usaba Map() en memoria.
 * En Vercel, cada función serverless puede ejecutarse en instancias distintas
 * y la memoria se borra cuando la función se "enfría" (cold start).
 * Resultado: la caché era efectiva 0% del tiempo en producción.
 *
 * SOLUCIÓN: Usar `unstable_cache` de Next.js que persiste entre invocaciones
 * usando el sistema de Data Cache de Next.js (respaldado por el filesystem
 * de Vercel o memoria compartida según el entorno).
 *
 * Para operaciones de escritura (POST/PATCH/DELETE), usar `revalidateTag`
 * para invalidar el cache del endpoint afectado.
 */

import { unstable_cache, revalidateTag } from 'next/cache';

/**
 * Crea un fetcher con caché persistente entre invocaciones serverless.
 * @param key - Identificador único del cache (ej: 'employees-tenant-abc')
 * @param fetcher - Función async que obtiene los datos reales
 * @param options - { revalidate: segundos, tags: string[] para invalidación }
 */
export function createCachedFetcher<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { revalidate?: number; tags?: string[] } = {}
) {
  const { revalidate = 60, tags = [key] } = options;
  return unstable_cache(fetcher, [key], { revalidate, tags });
}

/**
 * Invalida el cache de un tag específico cuando se modifica un recurso.
 * Llamar desde los handlers POST/PATCH/DELETE después de escribir en DB.
 *
 * Ejemplo: tras crear un empleado → invalidarTag('employees')
 */
export function invalidarCache(tag: string) {
  try {
    (revalidateTag as any)(tag);
  } catch (e) {
    // En desarrollo o contextos donde revalidateTag no está disponible, ignorar
    console.warn(`[CACHE] No se pudo invalidar tag: ${tag}`, e);
  }
  try {
    serverCache.invalidateAll();
  } catch {}
}

/**
 * Tags de caché estándar de SIGPAD.
 * Usar estos tags en createCachedFetcher y invalidarCache
 * para mantener consistencia.
 */
export const CACHE_TAGS = {
  employees: 'employees',
  objectives: 'objectives',
  cameras: 'cameras',
  inventory: 'inventory',
  authorizedUsers: 'authorized-users',
  shifts: 'shifts',
  payroll: 'payroll',
} as const;

// ─── Compatibilidad hacia atrás ───────────────────────────────────────────────
// SimpleCache se mantiene para uso en tests o contextos sin Next.js cache
class SimpleCache {
  private cache = new Map<string, { timestamp: number; data: any }>();

  get(key: string, ttlMs: number) {
    const entry = this.cache.get(key);
    if (entry && (Date.now() - entry.timestamp < ttlMs)) {
      return entry.data;
    }
    return null;
  }

  set(key: string, data: any) {
    this.cache.set(key, { timestamp: Date.now(), data });
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateAll() {
    this.cache.clear();
  }
}

/** @deprecated Usar createCachedFetcher() en su lugar */
export const serverCache = new SimpleCache();
