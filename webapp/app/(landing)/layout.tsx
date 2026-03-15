import Navbar from "@/components/landing/Navbar"
import "../globals.css"
import { ReactNode } from "react"

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
    <html lang="en" className="font-sans ">
      <body className="bg-black text-white">
        <Navbar />
        {children}
      </body>
    </html>
  )
}