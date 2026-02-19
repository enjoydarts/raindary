/**
 * K-means クラスタリング実装
 * embeddingベクトルをクラスタリングしてテーマを自動分類
 */

import { cosineSimilarity } from "./embeddings"

export interface ClusterResult {
  clusters: number[]
  centroids: number[][]
  labels: string[]
}

/**
 * ユークリッド距離を計算
 */
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2)
  }
  return Math.sqrt(sum)
}

/**
 * 最も近いクラスタを見つける
 */
function findClosestCentroid(point: number[], centroids: number[][]): number {
  let minDistance = Infinity
  let closestIndex = 0

  for (let i = 0; i < centroids.length; i++) {
    const distance = euclideanDistance(point, centroids[i])
    if (distance < minDistance) {
      minDistance = distance
      closestIndex = i
    }
  }

  return closestIndex
}

/**
 * K-means クラスタリング
 * @param vectors - 埋め込みベクトルの配列
 * @param k - クラスタ数（デフォルト: 5）
 * @param maxIterations - 最大イテレーション数（デフォルト: 100）
 */
export function kmeans(
  vectors: number[][],
  k: number = 5,
  maxIterations: number = 100
): number[] {
  if (vectors.length === 0) {
    return []
  }

  if (vectors.length <= k) {
    // データ数がクラスタ数以下の場合、各データを別クラスタに割り当て
    return vectors.map((_, i) => i)
  }

  const n = vectors.length
  const dim = vectors[0].length

  // 初期centroidをランダムに選択（K-means++法）
  const centroids: number[][] = []
  const firstIndex = Math.floor(Math.random() * n)
  centroids.push([...vectors[firstIndex]])

  for (let i = 1; i < k; i++) {
    const distances: number[] = []
    let sumDistances = 0

    for (let j = 0; j < n; j++) {
      const minDist = Math.min(
        ...centroids.map((c) => euclideanDistance(vectors[j], c))
      )
      distances.push(minDist * minDist)
      sumDistances += minDist * minDist
    }

    // 確率的に次のcentroidを選択
    let r = Math.random() * sumDistances
    for (let j = 0; j < n; j++) {
      r -= distances[j]
      if (r <= 0) {
        centroids.push([...vectors[j]])
        break
      }
    }
  }

  // クラスタ割り当て
  let clusters = new Array(n).fill(0)
  let oldClusters = new Array(n).fill(-1)
  let iteration = 0

  while (iteration < maxIterations && clusters.some((c, i) => c !== oldClusters[i])) {
    oldClusters = [...clusters]

    // 各点を最も近いcentroidに割り当て
    for (let i = 0; i < n; i++) {
      clusters[i] = findClosestCentroid(vectors[i], centroids)
    }

    // centroidを更新
    for (let i = 0; i < k; i++) {
      const clusterPoints = vectors.filter((_, idx) => clusters[idx] === i)

      if (clusterPoints.length > 0) {
        const newCentroid = new Array(dim).fill(0)
        for (const point of clusterPoints) {
          for (let d = 0; d < dim; d++) {
            newCentroid[d] += point[d]
          }
        }
        for (let d = 0; d < dim; d++) {
          newCentroid[d] /= clusterPoints.length
        }
        centroids[i] = newCentroid
      }
    }

    iteration++
  }

  return clusters
}

/**
 * クラスタ番号を動的に生成されたテーマラベルに変換
 * LLMを使って各クラスタの代表的な要約からテーマを自動命名
 */
export async function assignThemeLabels(
  clusters: number[],
  summaries: { id: string; summary: string }[],
  apiKey?: string
): Promise<Map<string, string>> {
  const k = Math.max(...clusters) + 1
  const themeMap = new Map<string, string>()

  // クラスタごとに要約を分類
  const clusterSummaries: Map<number, Array<{ id: string; summary: string }>> = new Map()

  for (let i = 0; i < clusters.length; i++) {
    const clusterId = clusters[i]

    if (!clusterSummaries.has(clusterId)) {
      clusterSummaries.set(clusterId, [])
    }
    clusterSummaries.get(clusterId)!.push(summaries[i])
  }

  // クラスタごとにLLMでテーマを生成
  const clusterThemes = new Map<number, string>()

  for (const [clusterId, clusterItems] of clusterSummaries.entries()) {
    // 代表的な要約を最大5個抽出
    const representativeSummaries = clusterItems.slice(0, 5).map((item) => item.summary)

    try {
      if (!apiKey) {
        console.warn("[clustering] OpenAI API key not set, using default theme")
        clusterThemes.set(clusterId, "その他")
        continue
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "あなたは記事要約のテーマを命名する専門家です。与えられた要約群の共通テーマを1-2単語の日本語で簡潔に命名してください。例: TypeScript, セキュリティ, データベース設計, UI/UX, DevOps など。テーマ名のみを返してください。",
            },
            {
              role: "user",
              content: `以下の要約群の共通テーマを1-2単語で命名してください:\n\n${representativeSummaries.join("\n\n")}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 20,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenAI API error: ${response.status} ${error}`)
      }

      const data = await response.json()
      const themeName = data.choices[0]?.message?.content?.trim() || "その他"
      clusterThemes.set(clusterId, themeName)

      console.log(`[clustering] Cluster ${clusterId} theme: ${themeName}`)
    } catch (error) {
      console.error(`[clustering] Failed to generate theme for cluster ${clusterId}:`, error)
      clusterThemes.set(clusterId, "その他")
    }
  }

  // 各要約にテーマを割り当て
  for (let i = 0; i < clusters.length; i++) {
    const clusterId = clusters[i]
    const theme = clusterThemes.get(clusterId) || "その他"
    themeMap.set(summaries[i].id, theme)
  }

  return themeMap
}
