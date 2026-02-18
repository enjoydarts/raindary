import type { NextAuthConfig } from "next-auth"

/**
 * Edge Runtime対応のNextAuth設定
 * ミドルウェアで使用
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")

      // 必要最小限のログのみ出力（個人情報を含まない）
      if (isOnDashboard || !isLoggedIn) {
        console.log("[middleware][authorized] Path:", nextUrl.pathname, "| Logged in:", isLoggedIn)
      }

      if (isOnDashboard) {
        return isLoggedIn
      }

      return true
    },
  },
  providers: [], // ミドルウェアではプロバイダー不要
}
