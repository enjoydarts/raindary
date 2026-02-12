import NextAuth from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { authConfig } from "@/auth.config"
import type { NextAuthConfig } from "next-auth"

// Raindrop.io OAuth プロバイダー定義
const RaindropProvider = {
  id: "raindrop",
  name: "Raindrop.io",
  type: "oauth" as const,
  authorization: {
    url: "https://raindrop.io/oauth/authorize",
    params: {
      scope: "",
    },
  },
  // プロキシエンドポイントを使用（NextAuthの標準OAuth2フローに対応）
  token: `${process.env.NEXTAUTH_URL}/api/auth/raindrop-proxy/token`,
  userinfo: "https://api.raindrop.io/rest/v1/user",
  clientId: process.env.AUTH_RAINDROP_ID,
  clientSecret: process.env.AUTH_RAINDROP_SECRET,
  profile(profile: any) {
    return {
      id: profile.user._id.toString(),
      name: profile.user.fullName || profile.user.email,
      email: profile.user.email,
      image: profile.user.avatar || null,
    }
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db),
  providers: [RaindropProvider],
  trustHost: true,
  basePath: "/api/auth",
  // JWTセッションを使用（Edge Runtime対応）
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      console.log("[auth][jwt] JWT callback called", {
        hasAccount: !!account,
        hasProfile: !!profile,
        sub: token.sub,
      })
      // 初回ログイン時にアカウント情報をトークンに追加
      if (account && profile) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      console.log("[auth][session] Session callback called")
      console.log("[auth][session] Token sub:", token.sub)
      console.log("[auth][session] Session object:", JSON.stringify(session, null, 2))
      console.log("[auth][session] Session.user:", JSON.stringify(session.user, null, 2))

      // トークンからセッションにユーザー情報をコピー
      if (token.sub && session.user) {
        session.user.id = token.sub
        console.log("[auth][session] Set user.id to:", token.sub)
      } else {
        console.log("[auth][session] WARNING: Cannot set user.id", {
          hasSub: !!token.sub,
          hasUser: !!session.user,
        })
      }

      console.log("[auth][session] Returning session:", JSON.stringify(session, null, 2))
      return session
    },
    async signIn({ user, account }) {
      console.log("[auth][signIn] ===== SIGNIN CALLBACK STARTED =====")
      console.log("[auth][signIn] User:", user?.id, user?.email)
      console.log("[auth][signIn] Account provider:", account?.provider)
      console.log("[auth][signIn] Has access token:", !!account?.access_token)
      try {
        console.log("[auth][signIn] Starting signIn callback", {
          userId: user.id,
          provider: account?.provider,
          hasAccessToken: !!account?.access_token,
        })

        // Raindrop.ioのトークンを暗号化してusersテーブルに保存
        if (account?.provider === "raindrop" && account.access_token && user.id) {
          // 動的インポート（Edge Runtimeの問題を回避）
          const { encrypt } = await import("@/lib/crypto")

          console.log("[auth][signIn] Encrypting tokens")

          const encryptedAccessToken = encrypt(account.access_token)
          const encryptedRefreshToken = account.refresh_token
            ? encrypt(account.refresh_token)
            : null
          const expiresAt = account.expires_at
            ? new Date(account.expires_at * 1000)
            : null

          console.log("[auth][signIn] Saving to database for user:", user.id)

          await db
            .update(users)
            .set({
              raindropAccessToken: encryptedAccessToken,
              raindropRefreshToken: encryptedRefreshToken,
              raindropTokenExpiresAt: expiresAt,
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id))

          console.log("[auth][signIn] Raindrop tokens encrypted and saved for user:", user.id)
        }

        console.log("[auth][signIn] signIn callback completed successfully")
        return true
      } catch (error) {
        console.error("[auth][signIn] Error in signIn callback:", error)
        console.error("[auth][signIn] Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        // エラーが発生してもログインは続行
        return true
      }
    },
  },
})
