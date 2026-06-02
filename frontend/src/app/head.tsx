const siteUrl = process.env.NEXT_PUBLIC_URL || "https://mahabscrafto.com";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Mahabs Crafto",
  url: siteUrl,
  logo: `${siteUrl}/file.svg`,
  description:
    "Mahabs Crafto offers handcrafted Vinayagar, Murugan, Hanuman statues, stone name boards, and traditional Tamil Nadu decor.",
};

export default function Head() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
    />
  );
}
