import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/layout/SiteChrome";
import AppProviders from "@/components/providers/AppProviders";

export const metadata: Metadata = {
  title: "MahabsCrafto",
  description: "A heritage-inspired marketplace delivering handcrafted goods with rich style and seamless checkout.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || "http://localhost:3000"),
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
    title: "MahabsCrafto",
    description: "A heritage-inspired marketplace for handcrafted goods with elegant product discovery and order tracking.",
    type: "website",
    locale: "en_US",
    images: ["/file.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "MahabsCrafto",
    description: "A heritage-inspired marketplace for handcrafted goods with elegant product discovery and order tracking.",
    images: ["/file.svg"],
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
      <body className="min-h-full bg-background text-foreground" suppressHydrationWarning>
        <AppProviders>
          <SiteChrome>{children}</SiteChrome>
        </AppProviders>
      </body>
    </html>
  );
}
