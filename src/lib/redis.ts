// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClient(): any {
  if (!process.env.REDIS_URL) return null

  if (!_client) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis")
    _client = new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false,
      lazyConnect: true,
    })
  }

  return _client
}

/**
 * Redisからキャッシュ値を取得する。
 * RedisURLが未設定またはキーが存在しない場合はnullを返す。
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getClient()
  if (!client) return null

  try {
    const value = await client.get(key)
    if (value === null) return null
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

/**
 * Redisにキャッシュ値をセットする。
 * RedisURLが未設定の場合は何もしない。
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  const client = getClient()
  if (!client) return

  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds)
  } catch {
    // キャッシュ書き込み失敗は無視する
  }
}

/**
 * Redisのキャッシュを削除する。
 */
export async function cacheDel(key: string): Promise<void> {
  const client = getClient()
  if (!client) return

  try {
    await client.del(key)
  } catch {
    // 削除失敗は無視する
  }
}

/**
 * 分散ロックを取得する（NX + EX）。
 * 取得できた場合はtrue、既にロックされている場合はfalseを返す。
 * RedisURLが未設定の場合は常にtrueを返す（ロックなし）。
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number
): Promise<boolean> {
  const client = getClient()
  if (!client) return true

  try {
    const result = await client.set(key, "1", "EX", ttlSeconds, "NX")
    return result === "OK"
  } catch {
    return true
  }
}

/**
 * 分散ロックを解放する。
 */
export async function releaseLock(key: string): Promise<void> {
  await cacheDel(key)
}
