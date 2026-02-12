import NextAuth from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { encrypt } from "@/lib/crypto"
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
  token: {
    url: "https://raindrop.io/oauth/access_token",
    async request(context: any) {
      const { params, provider } = context

      const response = await fetch(provider.token.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: params.code,
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
          redirect_uri: params.redirect_uri,
        }),
      })

      const tokens = await response.json()

      return {
        tokens,
      }
    },
  },
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

export const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(db),
  providers: [RaindropProvider],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Raindrop.ioのトークンを暗号化してusersテーブルに保存
      if (account?.provider === "raindrop" && account.access_token && user.id) {
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
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")

      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // ログインページにリダイレクト
      }

      return true
    },
  },
  session: {
    strategy: "database",
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
