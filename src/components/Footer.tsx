import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap justify-center gap-4 md:order-2 md:gap-2">
            <Button variant="link" size="sm" asChild>
              <Link href="/about">Raindaryについて</Link>
            </Button>
            <Separator orientation="vertical" className="hidden h-4 md:inline-block" />
            <Button variant="link" size="sm" asChild>
              <Link href="/privacy">プライバシーポリシー</Link>
            </Button>
            <Separator orientation="vertical" className="hidden h-4 md:inline-block" />
            <Button variant="link" size="sm" asChild>
              <Link href="/terms">利用規約</Link>
            </Button>
          </div>
          <div className="md:order-1">
            <p className="text-center text-sm text-muted-foreground md:text-left">
              &copy; {currentYear} Raindary. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
