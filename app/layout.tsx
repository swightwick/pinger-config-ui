import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pinger config',
  description: 'Display user configuration data',
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
