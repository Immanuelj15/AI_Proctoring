import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Examination Platform",
  description: "AI-powered online examination and evaluation platform with automated proctoring and performance analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <Link href="/" className="header-brand">
            <div className="logo-icon">AI</div>
            <div>
              <h1 className="header-title">AI Examination Platform</h1>
              <p className="header-subtitle">Automated Proctoring & Candidate Analytics</p>
            </div>
          </Link>

          {/* Navigation Bar Links */}
          <nav className="nav-links">
            <Link href="/" className="nav-link-item">
              🏠 Home
            </Link>
            <Link href="/dashboard" className="nav-link-item">
              🖥️ Dashboard
            </Link>
            <Link href="/proctor-live" className="nav-link-item">
              🛡️ Live Proctoring
            </Link>
            <Link href="/grading" className="nav-link-item">
              📝 Grading Portal
            </Link>
            <Link href="/login" className="nav-link-item btn-nav-login">
              🔐 Sign In
            </Link>
          </nav>
        </header>

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
