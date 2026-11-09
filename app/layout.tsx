import { ClerkProvider } from "@clerk/nextjs"
import { shadcn } from "@clerk/ui/themes"
import { Geist, Geist_Mono, Manrope } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ConvexProvider } from "@/features/auth/components/convex-provider"
import { cn } from "@/lib/utils"

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        manrope.variable
      )}
    >
      <body>
        <ClerkProvider appearance={{ theme: shadcn }}>
          <ConvexProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </ConvexProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
