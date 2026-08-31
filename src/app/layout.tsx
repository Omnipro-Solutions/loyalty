import type { Metadata } from "next"
import { DM_Sans, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/toast"
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

// Solo para los dígitos del código de verificación 2FA (01.2, Figma
// "JetBrains_Mono:Medium") — tabular figures para que el dígito no salte
// de ancho al escribir.
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Loyalty System",
  description: "El motor de promociones que tus tiendas entienden.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={cn(
        "h-full",
        "antialiased",
        dmSans.variable,
        jetBrainsMono.variable,
        "font-sans"
      )}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
