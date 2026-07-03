import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PWARegistration from "@/components/PWARegistration";
import CookieBanner from "@/components/legal/CookieBanner";
import { ShiftProvider } from "@/components/providers/ShiftProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

import { Plus_Jakarta_Sans } from "next/font/google";
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["500", "700", "800"],
});

import { Space_Grotesk } from "next/font/google";
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "SIGPAD",
  description: "SIGPAD - Sistema Inteligente de Gestión y Plataforma Avanzada de Seguridad Dinámica",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SIGPAD",
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

import { MainLayoutWrapper } from "@/components/layout/MainLayoutWrapper";

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
        className={`${inter.variable} ${plusJakartaSans.variable} ${spaceGrotesk.variable} font-sans bg-zinc-50 text-zinc-900 h-full overflow-x-hidden antialiased`}
      >
        <AuthProvider>
          <ShiftProvider>
            <PWARegistration />
            
            <MainLayoutWrapper>
              {children}
            </MainLayoutWrapper>

            <CookieBanner />
          </ShiftProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
