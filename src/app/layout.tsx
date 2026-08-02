import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JEE Mains Mock Test Platform",
  description: "Practice JEE Mains with realistic mock tests. 30 questions, 60 minutes, +4/-1 marking scheme.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`min-h-full flex flex-col bg-slate-50 text-slate-900 ${inter.className}`}>
        {children}
      </body>
    </html>
  );
}
