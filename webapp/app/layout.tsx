import "./globals.css"
import { ReactNode } from "react"
import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Lora, IBM_Plex_Mono } from "next/font/google"
import { Toaster } from "sonner"

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontSerif = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
})

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "DevDraft",
  description: "AI powered hackathon screening system",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}
      >
        <Toaster position="top-right" closeButton />
        {children}
      </body>
    </html>
  )
}