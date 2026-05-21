"use client";

import React from "react";
import { Info } from "lucide-react";
import { Product } from "@/lib/types";
import { getProductCategorySlug, getProductCategoryName } from "@/lib/catalog";

type Props = {
  product: Product;
  message?: string;
};

const DEFAULT_MESSAGE =
  "Note: Price varies based on size, stone type, design complexity, carving work, and finishing requirements. Contact us for an exact quotation.";

function containsStoneKeyword(val?: string) {
  if (!val) return false;
  const s = String(val).toLowerCase();
  return /stone|granite|marble|sandstone|soapstone|sculpture|carv|pillar|fountain/.test(s);
}

export default function StonePricingNotice({ product, message }: Props) {
  const explicitFlag = product.isCustomPricing === true;
  const productMsg = product.pricingNoticeMessage || message || DEFAULT_MESSAGE;

  const materialsFromCustomization = (product.customizationOptions?.materials || []).map((m) => String(m.label || '').toLowerCase());
  const specs = (product.specs || []).join(' ').toLowerCase();
  const tags = (product.tags || []).join(' ').toLowerCase();
  const materialField = String((product as Product & { material?: string }).material || '').toLowerCase();

  const categorySlug = getProductCategorySlug(product.category);
  const categoryName = getProductCategoryName(product.category).toLowerCase();

  const matchesMaterial =
    materialsFromCustomization.some((m: string) => /stone|granite|marble|sandstone|soapstone/.test(m)) ||
    containsStoneKeyword(materialField) ||
    containsStoneKeyword(specs) ||
    containsStoneKeyword(tags) ||
    containsStoneKeyword(product.name);
  const isStoneCategory =
    ["stone", "stone-name-board", "custom-stone"].includes(categorySlug) ||
    /stone/.test(categorySlug) ||
    /stone/.test(categoryName);

  const shouldShow = explicitFlag || matchesMaterial || isStoneCategory;

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
