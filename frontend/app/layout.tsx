import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import ClientShell from "@/components/ClientShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "GreenPulse — Logistics Intelligence Platform",
  description: "Real-time Intelligent Logistics Orchestration for Indian Freight, powered by Pathway AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
