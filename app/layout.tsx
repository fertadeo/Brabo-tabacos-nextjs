import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Toaster } from "sonner"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { ToastProvider } from "@/contexts/ToastContext"
import { APP_NAME, COMPANY_TAGLINE, LOGO_MARK_PATH } from "@/lib/brand"

export const metadata: Metadata = {
  title: `${APP_NAME} - Sistema de Gestión Empresarial`,
  description: `${COMPANY_TAGLINE} (${APP_NAME})`,
  generator: "Fenec Studio",
  icons: {
    icon: [{ url: LOGO_MARK_PATH, type: "image/png" }],
    apple: LOGO_MARK_PATH,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" translate="no" className="dark" suppressHydrationWarning>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <ToastProvider>
              {children}
              <Toaster theme="dark" position="top-right" richColors closeButton />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
