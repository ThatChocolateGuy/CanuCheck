import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DOMCleanup } from '@/components/dom-cleanup'
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CanuCheck 🤖🍁",
  description: "Your Smart Canadian Product Explorer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DOMCleanup />
            <TooltipProvider delayDuration={200}>
              {children}
            </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
