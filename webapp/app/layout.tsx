import "./globals.css"
import { ReactNode } from "react"
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata = {
  title: "HackSelect",
  description: "AI powered hackathon screening system"
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}>
        <Toaster 
        position="top-right"
        closeButton
        />
        {children}
      </body>
    </html>
  )
}