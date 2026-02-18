/**
 * 個人情報をマスクするユーティリティ関数
 */

/**
 * ユーザーIDをマスク
 * 例: "clx123abc" -> "clx***abc"
 */
export function maskUserId(userId: string | undefined | null): string {
  if (!userId) return "undefined"
  if (userId.length <= 6) return "***"
  return `${userId.slice(0, 3)}***${userId.slice(-3)}`
}

/**
 * メールアドレスをマスク
 * 例: "user@example.com" -> "u***@example.com"
 */
export function maskEmail(email: string | undefined | null): string {
  if (!email) return "undefined"
  const [localPart, domain] = email.split("@")
  if (!domain) return "***"
  const maskedLocal = localPart.length > 1 ? `${localPart[0]}***` : "***"
  return `${maskedLocal}@${domain}`
}

/**
 * 名前をマスク
 * 例: "John Doe" -> "J*** D***"
 */
export function maskName(name: string | undefined | null): string {
  if (!name) return "undefined"
  const parts = name.split(" ")
  return parts.map(part => part.length > 1 ? `${part[0]}***` : "***").join(" ")
}

/**
 * セッション情報をマスク
 */
export function maskSession(session: any): any {
  if (!session) return null

  return {
    user: session.user ? {
      id: maskUserId(session.user.id),
      email: maskEmail(session.user.email),
      name: maskName(session.user.name),
      image: session.user.image ? "[MASKED]" : undefined,
    } : undefined,
    expires: session.expires,
  }
}
