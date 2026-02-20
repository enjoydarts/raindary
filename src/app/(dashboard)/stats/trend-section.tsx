"use client"

import { useMemo, useState } from "react"
import { TrendingDown, TrendingUp } from "lucide-react"

type ToneFilter = "all" | "neutral" | "snarky" | "enthusiastic" | "casual"

type TrendDeltaValue = { text: string; positive: boolean } | null

type Series = Array<{ label: string; value: number }>

type TrendData = {
  summarySeries: Series
  costSeries: Series
  tokenSeries: Series
  summaryDelta: TrendDeltaValue
  costDelta: TrendDeltaValue
  tokenDelta: TrendDeltaValue
}

function TrendDelta({ value }: { value: TrendDeltaValue }) {
  if (!value) {
    return <span className="text-xs text-slate-500">前期間比較なし</span>
  }

  const Icon = value.positive ? TrendingUp : TrendingDown
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        value.positive ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {value.text}
    </span>
  )
}

function MiniBarChart({
  data,
  colorClass,
  emptyLabel,
}: {
  data: Series
  colorClass: string
  emptyLabel: string
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 0)

  if (maxValue === 0) {
    return (
      <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div>
      <div className="flex h-36 items-end gap-1 rounded-lg bg-slate-50 p-2">
        {data.map((item) => {
          const height = Math.max((item.value / maxValue) * 100, item.value > 0 ? 4 : 0)
          return (
            <div key={item.label} className="group relative flex-1">
              <div className={`w-full rounded-sm ${colorClass}`} style={{ height: `${height}%` }} />
              <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">
                {item.value.toLocaleString()}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

export function TrendSection({
  toneFilters,
  trendSeriesByTone,
}: {
  toneFilters: Array<{ value: ToneFilter; label: string }>
  trendSeriesByTone: Record<ToneFilter, TrendData>
}) {
  const [selectedTone, setSelectedTone] = useState<ToneFilter>("all")
  const current = useMemo(
    () => trendSeriesByTone[selectedTone] ?? trendSeriesByTone.all,
    [selectedTone, trendSeriesByTone]
  )

  return (
    <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">30日推移</h2>
          <p className="text-sm text-slate-500">要約数・コスト・トークンの時系列</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toneFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setSelectedTone(filter.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedTone === filter.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">要約数 / 日</h3>
            <TrendDelta value={current.summaryDelta} />
          </div>
          <MiniBarChart data={current.summarySeries} colorClass="bg-indigo-500" emptyLabel="要約データがありません" />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">コスト / 日 (USD)</h3>
            <TrendDelta value={current.costDelta} />
          </div>
          <MiniBarChart data={current.costSeries} colorClass="bg-emerald-500" emptyLabel="コストデータがありません" />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">トークン / 日</h3>
            <TrendDelta value={current.tokenDelta} />
          </div>
          <MiniBarChart data={current.tokenSeries} colorClass="bg-amber-500" emptyLabel="トークンデータがありません" />
        </div>
      </div>
    </div>
  )
}
