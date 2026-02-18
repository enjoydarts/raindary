"use client"

import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      expand={false}
      toastOptions={{
        style: {
          background: "white",
          border: "2px solid #cbd5e1",
          color: "#0f172a",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        },
        className: "text-sm font-medium",
        classNames: {
          success: "border-green-500 bg-green-50",
          error: "border-red-500 bg-red-50",
          info: "border-blue-500 bg-blue-50",
          warning: "border-yellow-500 bg-yellow-50",
        },
      }}
    />
  )
}
