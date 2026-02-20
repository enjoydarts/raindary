import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { raindropImport } from "@/inngest/functions/raindrop-import"
import { raindropExtract } from "@/inngest/functions/raindrop-extract"
import { raindropSummarize } from "@/inngest/functions/raindrop-summarize"
import { classifyThemes } from "@/inngest/functions/classify-themes"
import { cleanupJobHistory } from "@/inngest/functions/cleanup-job-history"
import {
  generateWeeklyDigest,
  generateWeeklyDigestManual,
} from "@/inngest/functions/generate-digest"
import { regenerateEmbeddings, regenerateEmbeddingsFailure } from "@/inngest/functions/regenerate-embeddings"

/**
 * Inngest関数を登録
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    raindropImport,
    raindropExtract,
    raindropSummarize,
    classifyThemes,
    cleanupJobHistory,
    generateWeeklyDigest,
    generateWeeklyDigestManual,
    regenerateEmbeddings,
    regenerateEmbeddingsFailure,
  ],
})
