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
 * テーマラベルの定義
 */
export const THEME_LABELS = {
  0: "frontend",
  1: "backend",
  2: "ai",
  3: "devops",
  4: "other",
} as const

export type ThemeLabel = (typeof THEME_LABELS)[keyof typeof THEME_LABELS]

/**
 * クラスタ番号をテーマラベルに変換
 * 各クラスタの代表的なキーワードから判定
 */
export function assignThemeLabels(
  clusters: number[],
  summaries: { id: string; summary: string }[]
): Map<string, ThemeLabel> {
  const k = Math.max(...clusters) + 1
  const themeMap = new Map<string, ThemeLabel>()

  // クラスタごとにキーワードを集計してテーマを判定
  const clusterKeywords: Map<number, string[]> = new Map()

  for (let i = 0; i < clusters.length; i++) {
    const clusterId = clusters[i]
    const summary = summaries[i].summary.toLowerCase()

    if (!clusterKeywords.has(clusterId)) {
      clusterKeywords.set(clusterId, [])
    }
    clusterKeywords.get(clusterId)!.push(summary)
  }

  // クラスタごとにテーマを判定
  const clusterThemes = new Map<number, ThemeLabel>()

  for (const [clusterId, summaryTexts] of clusterKeywords.entries()) {
    const allText = summaryTexts.join(" ")

    // キーワードベースで分類
    const frontendScore =
      (allText.match(/react|vue|angular|frontend|css|html|ui|ux|component/g) || [])
        .length
    const backendScore =
      (allText.match(/api|server|database|backend|node|python|java|go|rust/g) || [])
        .length
    const aiScore =
      (allText.match(/ai|ml|llm|gpt|claude|machine learning|deep learning|neural/g) ||
        []).length
    const devopsScore =
      (allText.match(/docker|kubernetes|ci\/cd|deploy|devops|aws|gcp|azure/g) || [])
        .length

    const scores = [
      { theme: "frontend" as ThemeLabel, score: frontendScore },
      { theme: "backend" as ThemeLabel, score: backendScore },
      { theme: "ai" as ThemeLabel, score: aiScore },
      { theme: "devops" as ThemeLabel, score: devopsScore },
    ]

    const maxScore = Math.max(...scores.map((s) => s.score))
    const theme =
      maxScore > 0
        ? scores.find((s) => s.score === maxScore)!.theme
        : ("other" as ThemeLabel)

    clusterThemes.set(clusterId, theme)
  }

  // 各要約にテーマを割り当て
  for (let i = 0; i < clusters.length; i++) {
    const clusterId = clusters[i]
    const theme = clusterThemes.get(clusterId) || "other"
    themeMap.set(summaries[i].id, theme)
  }

  return themeMap
}
