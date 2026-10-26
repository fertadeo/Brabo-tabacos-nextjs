import type { Metadata, Viewport } from "next"
import { APP_NAME, LOGO_MARK_PATH } from "@/lib/brand"

export const metadata: Metadata = {
  title: `Preventa calle | ${APP_NAME}`,
  description: "Toma de pedidos en la calle para repartidores",
  applicationName: "Brabo Preventa",
  manifest: "/manifest-preventa.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Preventa",
  },
  icons: {
    icon: [{ url: LOGO_MARK_PATH, type: "image/png" }],
    apple: LOGO_MARK_PATH,
  },
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function PreventaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-50 antialiased">
      {children}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
              window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw-preventa.js').catch(function () {});
              });
            }
          `,
        }}
      />
    </div>
  )
}
