import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PDF Insight Extractor',
  description: 'Upload PDFs and extract insights with AI-powered semantic search',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
