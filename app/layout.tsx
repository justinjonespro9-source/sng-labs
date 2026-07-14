import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import {
  PRODUCTION_SITE_URL,
  siteAssets,
  siteDescription,
  siteTitle,
} from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCTION_SITE_URL),
  title: siteTitle,
  description: siteDescription,
  applicationName: "SNG Labs",
  authors: [{ name: "SNG Labs LLC" }],
  creator: "SNG Labs LLC",
  publisher: "SNG Labs LLC",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: siteAssets.logo, type: "image/png" }],
    apple: [{ url: siteAssets.logo, type: "image/png" }],
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    locale: "en_US",
    siteName: "SNG Labs",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
