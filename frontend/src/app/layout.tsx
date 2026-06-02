import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/layout/SiteChrome";
import AppProviders from "@/components/providers/AppProviders";

const siteUrl = process.env.NEXT_PUBLIC_URL || "https://mahabscrafto.com";
const siteTitle = "Mahabs Crafto | Vinayagar, Murugan, Hanuman Statues & Stone Name Boards";
const siteDescription =
  "Buy handcrafted Vinayagar, Murugan, Hanuman statues, stone name boards, and traditional Tamil Nadu home decor from Mahabs Crafto.";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: new URL(siteUrl),
  },
  keywords: [
    "Vinayagar statue",
    "Murugan statue",
    "Hanuman statue",
    "stone name board",
    "Tamil Nadu handicrafts",
    "home decor statues",
    "stone carving",
    "granite statues",
    "Mahabs Crafto",
  ],
  icons: {
    icon: [
      {
        url: "/favicon.ico?v=2",
        type: "image/x-icon",
        sizes: "16x16 32x32 48x48",
      },
      {
        url: "/favicon.ico?v=2",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
    shortcut: [
      {
        url: "/favicon.ico?v=2",
        type: "image/x-icon",
        sizes: "16x16 32x32 48x48",
      },
    ],
    apple: [
      {
        url: "/favicon.ico?v=2",
        type: "image/x-icon",
        sizes: "16x16 32x32 48x48",
      },
    ],
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    locale: "en_US",
    url: new URL(siteUrl),
    images: [
      {
        url: "/file.svg",
        width: 1200,
        height: 630,
        alt: "Mahabs Crafto",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/file.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const themeColor = "#131921";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full overflow-x-hidden bg-background text-foreground" suppressHydrationWarning>
        <AppProviders>
          <SiteChrome>{children}</SiteChrome>
        </AppProviders>
      </body>
    </html>
  );
}
