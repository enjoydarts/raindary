import type { Metadata } from "next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Raindary - 自分語り要約",
  description: "Raindrop.ioの記事をAI要約するツール",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
