"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Menu,
  LayoutDashboard,
  Newspaper,
  FileText,
  BriefcaseBusiness,
  BarChart3,
  Bell,
  Settings,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { handleSignOut } from "@/app/(dashboard)/actions"

interface MobileMenuProps {
  userName?: string | null
  userEmail?: string | null
}

export function MobileMenu({ userName, userEmail }: MobileMenuProps) {
  const [open, setOpen] = useState(false)

  const menuItems = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "ダッシュボード",
    },
    {
      href: "/raindrops",
      icon: Newspaper,
      label: "記事一覧",
    },
    {
      href: "/summaries",
      icon: FileText,
      label: "要約一覧",
    },
    {
      href: "/jobs",
      icon: BriefcaseBusiness,
      label: "ジョブ管理",
    },
    {
      href: "/stats",
      icon: BarChart3,
      label: "統計",
    },
    {
      href: "/notifications",
      icon: Bell,
      label: "通知",
    },
    {
      href: "/settings",
      icon: Settings,
      label: "設定",
    },
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="sm:hidden text-slate-700"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle className="text-left">
            <span className="text-indigo-600 font-bold text-xl">Raindary</span>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-8 flex flex-col space-y-4">
          {/* ユーザー情報 */}
          <div className="pb-4 border-b border-slate-200">
            <p className="text-sm text-slate-700 font-medium">
              {userName || userEmail}
            </p>
          </div>

          {/* メニュー項目 */}
          <nav className="flex flex-col space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* ログアウト */}
          <div className="pt-4 border-t border-slate-200">
            <form action={handleSignOut}>
              <Button
                type="submit"
                variant="ghost"
                className="w-full justify-start text-slate-700 hover:bg-slate-100 hover:text-red-600"
              >
                <LogOut className="h-5 w-5 mr-3" />
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
