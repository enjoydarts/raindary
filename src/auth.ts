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
  // JWTセッションを使用（Edge Runtime対応）
  session: {
    strategy: "jwt",
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account, profile }) {
      // 初回ログイン時にアカウント情報をトークンに追加
      if (account && profile) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      // トークンからセッションにユーザー情報をコピー
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async signIn({ user, account }) {
      // Raindrop.ioのトークンを暗号化してusersテーブルに保存
      if (account?.provider === "raindrop" && account.access_token && user.id) {
        // 動的インポート（Edge Runtimeの問題を回避）
        const { encrypt } = await import("@/lib/crypto")

        const encryptedAccessToken = encrypt(account.access_token)
        const encryptedRefreshToken = account.refresh_token
          ? encrypt(account.refresh_token)
          : null
        const expiresAt = account.expires_at
          ? new Date(account.expires_at * 1000)
          : null

        await db
          .update(users)
          .set({
            raindropAccessToken: encryptedAccessToken,
            raindropRefreshToken: encryptedRefreshToken,
            raindropTokenExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))

        console.log("[auth] Raindrop tokens encrypted and saved for user:", user.id)
      }

      return true
    },
  },
})
