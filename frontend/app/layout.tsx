import type { Metadata, Viewport } from "next";
import Header from "@/components/common/Header";
import { LocaleProvider } from "@/lib/i18n";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import PwaInitializer from "@/components/pwa/PwaInitializer";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Proctor Examination Platform | Enterprise AI Assessment Engine",
  description: "Next-generation AI-powered online examination platform with real-time biometric proctoring, dual-track LLM grading, and tamper-evident SHA-256 scorecard verification.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI Proctor",
  },
};

export const viewport: Viewport = {
  themeColor: "#12172B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#12172B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <LocaleProvider>
          <PwaInitializer />
          <Header />

          <main className="app-main">
            {children}
          </main>

          <InstallPrompt />

          <footer className="app-footer">
            <p>AI-Based Intelligent Examination Platform &copy; 2026. All rights reserved.</p>
          </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}
