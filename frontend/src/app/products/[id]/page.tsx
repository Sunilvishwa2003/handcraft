import ProductDetailClient from "@/components/ProductDetailClient";
import { isValidObjectId } from "@/lib/api";

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

  return <ProductDetailClient productId={resolvedParams.id} />;
}
