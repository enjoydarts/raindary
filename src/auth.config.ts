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
      console.log("[middleware][authorized] Checking authorization")
      console.log("[middleware][authorized] Path:", nextUrl.pathname)
      console.log("[middleware][authorized] Auth object:", JSON.stringify(auth, null, 2))
      console.log("[middleware][authorized] Has user:", !!auth?.user)
      console.log("[middleware][authorized] User:", auth?.user)

      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")

      console.log("[middleware][authorized] isLoggedIn:", isLoggedIn)
      console.log("[middleware][authorized] isOnDashboard:", isOnDashboard)

      if (isOnDashboard) {
        if (isLoggedIn) {
          console.log("[middleware][authorized] Access granted to dashboard")
          return true
        }
        console.log("[middleware][authorized] Access denied - redirecting to login")
        return false
      }

      console.log("[middleware][authorized] Public path - allowing access")
      return true
    },
  },
  providers: [], // ミドルウェアではプロバイダー不要
}
