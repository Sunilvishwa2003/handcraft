const siteUrl = process.env.NEXT_PUBLIC_URL || "https://mahabscrafto.com";
const sitemapUrl = `${siteUrl}/sitemap.xml`;

export const dynamic = "force-static";

export default function Robots() {
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    }
  );
}
