import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/db"
import { users } from "@/db/schema"
import { encrypt } from "@/lib/crypto"

/**
 * Raindrop.io OAuth コールバックハンドラー
 * NextAuthの標準フローではなく、カスタムでトークン交換を処理
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  console.log("[raindrop][callback] Received callback", { code: code?.substring(0, 8), error })

  // エラーハンドリング
  if (error) {
    console.error("[raindrop][callback] OAuth error:", error)
    return NextResponse.redirect(new URL("/login?error=oauth_error", request.url))
  }

  if (!code) {
    console.error("[raindrop][callback] Missing code")
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url))
  }

  try {
    // Step 1: トークン交換
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/raindrop/callback`
    console.log("[raindrop][callback] NEXTAUTH_URL:", process.env.NEXTAUTH_URL)
    console.log("[raindrop][callback] redirect_uri:", redirectUri)

    const tokenResponse = await fetch("https://raindrop.io/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: process.env.AUTH_RAINDROP_ID,
        client_secret: process.env.AUTH_RAINDROP_SECRET,
        redirect_uri: redirectUri,
      }),
    })

    const tokenText = await tokenResponse.text()
    console.log("[raindrop][callback] Token response status:", tokenResponse.status)
    console.log("[raindrop][callback] Token response body:", tokenText.substring(0, 200))

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status} ${tokenText}`)
    }

    const tokens = JSON.parse(tokenText)
    const { access_token, refresh_token, expires_in } = tokens

    if (!access_token) {
      throw new Error("No access token in response")
    }

    // Step 2: ユーザー情報取得
    const userResponse = await fetch("https://api.raindrop.io/rest/v1/user", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      throw new Error(`User info request failed: ${userResponse.status} ${errorText}`)
    }

    const userData = await userResponse.json()
    console.log("[raindrop][callback] User ID:", userData.user?._id)

    const raindropUser = userData.user
    if (!raindropUser || !raindropUser._id || !raindropUser.email) {
      throw new Error("Invalid user data from Raindrop")
    }

    // Step 3: データベースにユーザー情報とトークンを保存
    const encryptedAccessToken = encrypt(access_token)
    const encryptedRefreshToken = refresh_token ? encrypt(refresh_token) : null
    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null

    await db
      .insert(users)
      .values({
        id: raindropUser._id.toString(),
        email: raindropUser.email,
        name: raindropUser.fullName || raindropUser.email,
        image: raindropUser.avatar || null,
        raindropAccessToken: encryptedAccessToken,
        raindropRefreshToken: encryptedRefreshToken,
        raindropTokenExpiresAt: expiresAt,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: raindropUser.fullName || raindropUser.email,
          image: raindropUser.avatar || null,
          raindropAccessToken: encryptedAccessToken,
          raindropRefreshToken: encryptedRefreshToken,
          raindropTokenExpiresAt: expiresAt,
          updatedAt: new Date(),
        },
      })

    console.log("[raindrop][callback] User saved to database")

    // Step 4: セッションを作成
    const sessionData = {
      userId: raindropUser._id.toString(),
      email: raindropUser.email,
      name: raindropUser.fullName || raindropUser.email,
      image: raindropUser.avatar || null,
    }

    const cookieValue = JSON.stringify(sessionData)
    console.log("[raindrop][callback] Setting session cookie:", cookieValue.substring(0, 100))

    // cookies() APIを使ってCookieを設定（Next.js App Routerで推奨）
    const cookieStore = await cookies()
    cookieStore.set("raindrop-session", cookieValue, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    console.log("[raindrop][callback] Cookie set, redirecting to /dashboard")

    // リダイレクト
    return NextResponse.redirect(new URL("/dashboard", request.url))
  } catch (error) {
    console.error("[raindrop][callback] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url))
  }
}
