import type { Metadata } from "next";
import ProductDetailClient from "@/components/ProductDetailClient";
import { isValidObjectId } from "@/lib/api";
import { Product } from "@/lib/types";

const siteUrl = process.env.NEXT_PUBLIC_URL || "https://mahabscrafto.com";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.mahabscrafto.com";

async function fetchProduct(id: string): Promise<Product | null> {
  const response = await fetch(`${apiUrl}/products/${id}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as Product;
}

function resolveImageUrl(imageUrl?: string) {
  if (!imageUrl) return `${siteUrl}/file.svg`;
  return imageUrl.startsWith("http") ? imageUrl : new URL(imageUrl, siteUrl).toString();
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  if (!isValidObjectId(params.id)) {
    return {
      title: "Product not found | Mahabs Crafto",
      description: "The requested product does not exist on Mahabs Crafto.",
      alternates: { canonical: new URL(`${siteUrl}/products`) },
    };
  }

  const product = await fetchProduct(params.id);
  if (!product) {
    return {
      title: "Product not found | Mahabs Crafto",
      description: "The requested product does not exist on Mahabs Crafto.",
      alternates: { canonical: new URL(`${siteUrl}/products`) },
    };
  }

  const title = `${product.name} | Mahabs Crafto`;
  const description = product.description
    ? product.description.slice(0, 160)
    : "Handcrafted stone statues, name boards, and Tamil Nadu home decor from Mahabs Crafto.";
  const firstImage = product.images?.[0];
  const imageUrl = resolveImageUrl(
    typeof firstImage === "string" ? firstImage : firstImage?.url ?? product.imageUrl ?? "/file.svg"
  );

  return {
    title,
    description,
    alternates: {
      canonical: new URL(`${siteUrl}/products/${product._id}`),
    },
    openGraph: {
      title,
      description,
      url: new URL(`${siteUrl}/products/${product._id}`),
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
    },
    metadataBase: new URL(siteUrl),
    keywords: [product.category, product.name, "Mahabs Crafto", "stone statues", "name board"].filter(Boolean) as string[],
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  if (!isValidObjectId(resolvedParams.id)) {
    return (
      <main className="min-h-screen p-6 text-center text-gray-600">
        <h1 className="mb-3 text-2xl font-semibold text-gray-900">Product not found</h1>
        <p className="text-sm">The product link appears to be invalid or missing.</p>
      </main>
    );
  }

  const product = await fetchProduct(resolvedParams.id);
  if (!product) {
    return (
      <main className="min-h-screen p-6 text-center text-gray-600">
        <h1 className="mb-3 text-2xl font-semibold text-gray-900">Product not found</h1>
        <p className="text-sm">The product may no longer be available.</p>
      </main>
    );
  }

  const offerPrice = product.price ?? 0;
  const availability = product.countInStock && product.countInStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const imageUrls =
    product.images?.
      map((image) => resolveImageUrl(typeof image === "string" ? image : image.url ?? ""))
      .filter(Boolean) ?? [resolveImageUrl(product.imageUrl)];
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: imageUrls,
    description: product.description ?? "Handcrafted stone decor from Mahabs Crafto.",
    sku: product._id,
    brand: {
      "@type": "Brand",
      name: "Mahabs Crafto",
    },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${product._id}`,
      priceCurrency: "INR",
      price: offerPrice.toString(),
      availability,
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <ProductDetailClient productId={resolvedParams.id} />
    </>
  );
}
