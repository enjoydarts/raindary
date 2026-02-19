import { buildExtractFactsPrompt, ExtractedFacts } from "../extract-facts"

describe("extract-facts", () => {
  describe("buildExtractFactsPrompt", () => {
    it("should build prompt with article text", () => {
      const articleText = "This is a test article about React hooks."
      const result = buildExtractFactsPrompt(articleText)

      expect(result).toHaveProperty("system")
      expect(result).toHaveProperty("userMessage")

      expect(result.system).toContain("JSON形式で出力")
      expect(result.system).toContain("keyPoints")
      expect(result.system).toContain("mainClaim")
      expect(result.system).toContain("caveats")
      expect(result.system).toContain("keywords")

      expect(result.userMessage).toContain(articleText)
      expect(result.userMessage).toContain("【記事本文】")
    })

    it("should include extraction rules in system prompt", () => {
      const result = buildExtractFactsPrompt("test")

      expect(result.system).toContain("keyPoints: 記事の重要なポイントを3〜5個")
      expect(result.system).toContain("mainClaim: 記事の核心的な主張を1文で")
      expect(result.system).toContain("caveats: 注意点や制約があれば記載")
      expect(result.system).toContain("keywords: 技術キーワードを5〜10個")
    })

    it("should truncate long article text", () => {
      const longText = "a".repeat(150000)
      const result = buildExtractFactsPrompt(longText)

      // 120,000文字 + "[以降省略...]" で切り詰められる
      expect(result.userMessage.length).toBeLessThan(longText.length + 1000)
      expect(result.userMessage).toContain("[以降省略...]")
    })

    it("should not truncate short article text", () => {
      const shortText = "This is a short article."
      const result = buildExtractFactsPrompt(shortText)

      expect(result.userMessage).not.toContain("[以降省略...]")
      expect(result.userMessage).toContain(shortText)
    })

    it("should handle empty article text", () => {
      const result = buildExtractFactsPrompt("")

      expect(result.system).toBeDefined()
      expect(result.userMessage).toContain("【記事本文】")
    })

    it("should handle Japanese article text", () => {
      const japaneseText = "これは日本語の記事です。Reactのフックについて説明します。"
      const result = buildExtractFactsPrompt(japaneseText)

      expect(result.userMessage).toContain(japaneseText)
    })

    it("should handle special characters", () => {
      const specialText = "Article with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?"
      const result = buildExtractFactsPrompt(specialText)

      expect(result.userMessage).toContain(specialText)
    })

    it("should include JSON format example", () => {
      const result = buildExtractFactsPrompt("test")

      expect(result.system).toContain("```json")
      expect(result.system).toContain('"keyPoints"')
      expect(result.system).toContain('"mainClaim"')
      expect(result.system).toContain('"caveats"')
      expect(result.system).toContain('"keywords"')
    })
  })

  describe("ExtractedFacts interface", () => {
    it("should have correct structure", () => {
      const facts: ExtractedFacts = {
        keyPoints: ["point1", "point2"],
        mainClaim: "main claim",
        caveats: ["caveat1"],
        keywords: ["React", "TypeScript"],
      }

      expect(facts).toHaveProperty("keyPoints")
      expect(facts).toHaveProperty("mainClaim")
      expect(facts).toHaveProperty("caveats")
      expect(facts).toHaveProperty("keywords")

      expect(Array.isArray(facts.keyPoints)).toBe(true)
      expect(Array.isArray(facts.caveats)).toBe(true)
      expect(Array.isArray(facts.keywords)).toBe(true)
      expect(typeof facts.mainClaim).toBe("string")
    })
  })
})
