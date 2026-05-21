"use client";

import React from "react";
import { Info } from "lucide-react";
import { Product } from "@/lib/types";
import { getProductCategorySlug } from "@/lib/catalog";

type Props = {
  product: Product;
  message?: string;
};

const DEFAULT_MESSAGE =
  "Note: Price varies based on size, stone type, design complexity, carving work, and finishing requirements. Contact us for an exact quotation.";

export default function StonePricingNotice({ product, message }: Props) {
  const productMsg = product.pricingNoticeMessage || message || DEFAULT_MESSAGE;
  const categorySlug = getProductCategorySlug(product.category);

  // Show pricing notice only for stone and stone-name-board categories
  const shouldShow = categorySlug === "stone" || categorySlug === "stone-name-board";

  if (!shouldShow) return null;

  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
      <Info className="h-5 w-5 flex-shrink-0 text-amber-700" />
      <div>
        <strong className="block">Note:</strong>
        <div className="mt-1">{productMsg}</div>
      </div>
    </div>
  );
}
