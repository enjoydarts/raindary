import { buildGenerateSummaryPrompt, GeneratedSummary, Tone } from "../generate-summary"
import { ExtractedFacts } from "../extract-facts"

describe("generate-summary", () => {
  const mockFacts: ExtractedFacts = {
    keyPoints: ["Point 1", "Point 2", "Point 3"],
    mainClaim: "This is the main claim of the article",
    caveats: ["Caveat 1"],
    keywords: ["React", "TypeScript", "Jest"],
  }

  describe("buildGenerateSummaryPrompt", () => {
    const tones: Tone[] = ["snarky", "neutral", "enthusiastic", "casual"]

    tones.forEach((tone) => {
      describe(`tone: ${tone}`, () => {
        it("should build prompt with correct structure", () => {
          const result = buildGenerateSummaryPrompt(mockFacts, tone)

          expect(result).toHaveProperty("system")
          expect(result).toHaveProperty("userMessage")
        })

        it("should include tone in system prompt", () => {
          const result = buildGenerateSummaryPrompt(mockFacts, tone)

          expect(result.system).toContain(tone)
        })

        it("should include requirements in system prompt", () => {
          const result = buildGenerateSummaryPrompt(mockFacts, tone)

          expect(result.system).toContain("400〜700文字")
          expect(result.system).toContain("記事の概要")
          expect(result.system).toContain("注目ポイント")
          expect(result.system).toContain("実用性の評価")
          expect(result.system).toContain("5段階評価")
        })

        it("should include JSON format example", () => {
          const result = buildGenerateSummaryPrompt(mockFacts, tone)

          expect(result.system).toContain("```json")
          expect(result.system).toContain('"summary"')
          expect(result.system).toContain('"rating"')
          expect(result.system).toContain('"reason"')
        })

        it("should include facts in user message", () => {
          const result = buildGenerateSummaryPrompt(mockFacts, tone)

          expect(result.userMessage).toContain("【抽出された事実】")
          expect(result.userMessage).toContain(JSON.stringify(mockFacts, null, 2))
        })

        it("should include tone in user message", () => {
          const result = buildGenerateSummaryPrompt(mockFacts, tone)

          expect(result.userMessage).toContain("【口調】")
          expect(result.userMessage).toContain(tone)
        })
      })
    })

    describe("tone descriptions", () => {
      it("should include snarky tone description", () => {
        const result = buildGenerateSummaryPrompt(mockFacts, "snarky")
        expect(result.system).toContain("毒舌")
      })

      it("should include neutral tone description", () => {
        const result = buildGenerateSummaryPrompt(mockFacts, "neutral")
        expect(result.system).toContain("客観的")
      })

      it("should include enthusiastic tone description", () => {
        const result = buildGenerateSummaryPrompt(mockFacts, "enthusiastic")
        expect(result.system).toContain("熱量高め")
      })

      it("should include casual tone description", () => {
        const result = buildGenerateSummaryPrompt(mockFacts, "casual")
        expect(result.system).toContain("カジュアル")
      })
    })

    describe("facts handling", () => {
      it("should handle empty keyPoints", () => {
        const facts: ExtractedFacts = {
          ...mockFacts,
          keyPoints: [],
        }

        const result = buildGenerateSummaryPrompt(facts, "neutral")

        expect(result.userMessage).toContain(JSON.stringify(facts, null, 2))
      })

      it("should handle empty caveats", () => {
        const facts: ExtractedFacts = {
          ...mockFacts,
          caveats: [],
        }

        const result = buildGenerateSummaryPrompt(facts, "neutral")

        expect(result.userMessage).toContain(JSON.stringify(facts, null, 2))
      })

      it("should handle many keywords", () => {
        const facts: ExtractedFacts = {
          ...mockFacts,
          keywords: [
            "React",
            "TypeScript",
            "Next.js",
            "Tailwind",
            "Jest",
            "Docker",
          ],
        }

        const result = buildGenerateSummaryPrompt(facts, "neutral")

        expect(result.userMessage).toContain("React")
        expect(result.userMessage).toContain("Docker")
      })

      it("should handle Japanese text in facts", () => {
        const facts: ExtractedFacts = {
          keyPoints: ["ポイント1", "ポイント2"],
          mainClaim: "これは主張です",
          caveats: ["注意点1"],
          keywords: ["React", "TypeScript"],
        }

        const result = buildGenerateSummaryPrompt(facts, "casual")

        expect(result.userMessage).toContain("ポイント1")
        expect(result.userMessage).toContain("これは主張です")
      })
    })

    describe("output format", () => {
      it("should specify JSON-only output requirement", () => {
        const result = buildGenerateSummaryPrompt(mockFacts, "neutral")

        expect(result.system).toContain("必ずJSON形式のみを返してください")
      })

      it("should request JSON output in user message", () => {
        const result = buildGenerateSummaryPrompt(mockFacts, "neutral")

        expect(result.userMessage).toContain("JSON形式で出力してください")
      })
    })
  })

  describe("GeneratedSummary interface", () => {
    it("should have correct structure", () => {
      const summary: GeneratedSummary = {
        summary: "This is a summary of the article",
        rating: 4,
        reason: "Well-written and practical",
      }

      expect(summary).toHaveProperty("summary")
      expect(summary).toHaveProperty("rating")
      expect(summary).toHaveProperty("reason")

      expect(typeof summary.summary).toBe("string")
      expect(typeof summary.rating).toBe("number")
      expect(typeof summary.reason).toBe("string")
    })

    it("should accept rating values from 1 to 5", () => {
      for (let rating = 1; rating <= 5; rating++) {
        const summary: GeneratedSummary = {
          summary: "test",
          rating,
          reason: "test",
        }

        expect(summary.rating).toBeGreaterThanOrEqual(1)
        expect(summary.rating).toBeLessThanOrEqual(5)
      }
    })
  })
})
