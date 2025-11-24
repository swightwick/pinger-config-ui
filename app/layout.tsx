import type { Metadata } from 'next'
import { Mulish } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const mulish = Mulish({
  subsets: ['latin'],
  variable: '--font-mulish',
})

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
      <body className={`${mulish.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
