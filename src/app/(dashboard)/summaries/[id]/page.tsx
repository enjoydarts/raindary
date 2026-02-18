import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { withRLS } from "@/db/rls"
import { summaries, raindrops } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import Image from "next/image"
import Link from "next/link"
import { ClipboardList, Zap, Flame, MessageCircle, FileText } from "lucide-react"

const TONE_LABELS = {
  neutral: { label: "客観的", Icon: ClipboardList },
  snarky: { label: "毒舌", Icon: Zap },
  enthusiastic: { label: "熱量高め", Icon: Flame },
  casual: { label: "カジュアル", Icon: MessageCircle },
} as const

export default async function SummaryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id
  const { id } = await params

  // RLS対応: 自分の要約を取得
  const [summary] = await withRLS(userId, async (tx) => {
    return await tx
      .select({
        id: summaries.id,
        summary: summaries.summary,
        tone: summaries.tone,
        rating: summaries.rating,
        ratingReason: summaries.ratingReason,
        model: summaries.model,
        isPublic: summaries.isPublic,
        createdAt: summaries.createdAt,
        articleTitle: raindrops.title,
        articleLink: raindrops.link,
        articleCover: raindrops.cover,
        articleExcerpt: raindrops.excerpt,
      })
      .from(summaries)
      .innerJoin(
        raindrops,
        and(eq(summaries.raindropId, raindrops.id), eq(summaries.userId, raindrops.userId))
      )
      .where(eq(summaries.id, id))
      .limit(1)
  })

  if (!summary) {
    notFound()
  }

  const toneInfo = TONE_LABELS[summary.tone as keyof typeof TONE_LABELS] || {
    label: summary.tone,
    Icon: FileText
  }
  const ToneIcon = toneInfo.Icon

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <Link
          href="/summaries"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          要約一覧に戻る
        </Link>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* カバー画像 */}
        {summary.articleCover && (
          <div className="relative aspect-[21/9] overflow-hidden bg-slate-100">
            <Image src={summary.articleCover} alt="" fill className="object-cover" />
          </div>
        )}

        <div className="p-8">
          {/* 記事タイトル */}
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{summary.articleTitle}</h1>

          {/* メタ情報 */}
          <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-slate-200">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
              <ToneIcon className="h-3.5 w-3.5" />
              {toneInfo.label}
            </span>
            {summary.isPublic === 1 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                公開中
              </span>
            )}
            {summary.rating && (
              <span className="text-yellow-400 text-sm">
                {"★".repeat(summary.rating)}
                {"☆".repeat(5 - summary.rating)}
              </span>
            )}
            <span className="text-sm text-slate-500">
              {new Date(summary.createdAt).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "Asia/Tokyo",
              })}
            </span>
          </div>

          {/* 要約 */}
          <div className="prose prose-lg max-w-none">
            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{summary.summary}</p>
          </div>

          {/* 評価理由 */}
          {summary.ratingReason && (
            <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">評価理由</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{summary.ratingReason}</p>
            </div>
          )}

          {/* 元記事へのリンク */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <a
              href={summary.articleLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              元記事を読む
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>

          {/* フッター */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500">モデル: {summary.model}</p>
          </div>
        </div>
      </article>
    </div>
  )
}
