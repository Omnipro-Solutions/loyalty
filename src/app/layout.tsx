import type { Metadata } from "next"
import { DM_Sans } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"

// DM Sans variable font. The Figma UI kit locks text styles to
// `fontVariationSettings: '"opsz" 14'`; the browser's default
// `font-optical-sizing: auto` on the variable font resolves to the same
// optical size range at our 11-15px UI text sizes, so no manual override
// is needed here. Verify against Figma screenshots in the pixel-perfect loop.
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Loyalty System",
  description: "El motor de promociones que tus tiendas entienden.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={cn("h-full", "antialiased", dmSans.variable, "font-sans")}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
