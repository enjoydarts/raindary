import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"

interface DigestMarkdownProps {
  content: string
}

function normalizeDigestMarkdown(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line

      if (/^＃+/.test(trimmed)) {
        return trimmed.replace(/^＃+/u, (m) => "#".repeat(m.length))
      }

      const bulletMatch = trimmed.match(/^[・●•◦▪]\s*(.+)$/u)
      if (bulletMatch) {
        return `- ${bulletMatch[1]}`
      }

      const numberedParenMatch = trimmed.match(/^(\d+)[\)）]\s*(.+)$/u)
      if (numberedParenMatch) {
        return `${numberedParenMatch[1]}. ${numberedParenMatch[2]}`
      }

      return line
    })
    .join("\n")
}

export function DigestMarkdown({ content }: DigestMarkdownProps) {
  const normalizedContent = normalizeDigestMarkdown(content)

  return (
    <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h2: ({ children }) => (
            <h2 className="mt-5 mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="my-2">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="marker:text-slate-500">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900 dark:text-slate-100">{children}</strong>
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  )
}
