import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import PWARegistration from "@/components/PWARegistration";
import CookieBanner from "@/components/legal/CookieBanner";
import { ShiftProvider } from "@/components/providers/ShiftProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

import { Outfit } from "next/font/google";
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Si.Ge.S",
  description: "Si.Ge.S - El sistema que potencia la gestión de toda empresa de seguridad privada",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Si.Ge.S",
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: "#F9FAFB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${inter.variable} ${outfit.variable} font-sans bg-zinc-50 text-zinc-900 h-full overflow-x-hidden antialiased`}
      >
        <AuthProvider>
          <ShiftProvider>
            <PWARegistration />
            
            {/* Shell — Sidebar and Header are hidden on /operador and /login by their own internal logic */}
            <Sidebar />
            <AppHeader />
            
            {/* Main Content */}
            <main className="min-h-screen pt-16 lg:pl-[240px] pb-24 lg:pb-0">
              <div className="w-full h-full">
                {children}
              </div>
            </main>
            <CookieBanner />
          </ShiftProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
