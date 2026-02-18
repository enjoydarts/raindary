import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { Realtime } from "ably"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.ABLY_API_KEY) {
    return NextResponse.json({ error: "Ably not configured" }, { status: 500 })
  }

  try {
    const ably = new Realtime({ key: process.env.ABLY_API_KEY })

    // ユーザー専用チャンネルのみアクセス可能なトークンを発行
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: session.user.id,
      capability: {
        [`user:${session.user.id}`]: ["subscribe"], // 自分のチャンネルのみsubscribe可能
      },
      ttl: 60 * 60 * 1000, // 1時間有効
    })

    return NextResponse.json(tokenRequest)
  } catch (error) {
    console.error("[ably-token] Failed to create token:", error)
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    )
  }
}
