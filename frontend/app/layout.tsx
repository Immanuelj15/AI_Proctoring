import type { Metadata } from "next";
import Header from "@/components/common/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Proctor Examination Platform | Enterprise AI Assessment Engine",
  description: "Next-generation AI-powered online examination platform with real-time biometric proctoring, dual-track LLM grading, and tamper-evident SHA-256 scorecard verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />

        <main className="app-main">
          {children}
        </main>

        <footer className="app-footer">
          <p>AI-Based Intelligent Examination Platform &copy; 2026. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
