import { CustomProjectInquiryType, CustomProjectStage, CustomizationSelection, Product, ProductCustomizationOptions } from "@/lib/types";

export const defaultCustomizationOptions: ProductCustomizationOptions = {
  materials: [
    { label: "Granite", priceMultiplier: 1.18, description: "Dense, long-lasting premium stone." },
    { label: "Marble", priceMultiplier: 1.22, description: "Soft luxury polish with ceremonial elegance." },
    { label: "Wood", priceMultiplier: 1, description: "Warm hand-carved tone for interiors." },
    { label: "Bronze", priceMultiplier: 1.28, description: "Heirloom metal finish with museum character." },
    { label: "Black stone", priceMultiplier: 1.24, description: "Temple-inspired contrast and devotional depth." },
  ],
  sizes: [
    { label: "12 inches", priceMultiplier: 0.92, dimensions: "1 foot display size" },
    { label: "24 inches", priceMultiplier: 1.12, dimensions: "2 foot statement size" },
    { label: "36 inches", priceMultiplier: 1.34, dimensions: "3 foot ceremonial size" },
    { label: "48 inches", priceMultiplier: 1.6, dimensions: "4 foot installation size" },
  ],
  finishes: [
    { label: "Natural matte", priceMultiplier: 1 },
    { label: "Antique", priceMultiplier: 1.08 },
    { label: "Polished", priceMultiplier: 1.12 },
    { label: "Temple patina", priceMultiplier: 1.15 },
  ],
  textures: [
    { label: "Smooth carved", priceMultiplier: 1 },
    { label: "Hand-chisel grain", priceMultiplier: 1.1 },
    { label: "Weathered artisan", priceMultiplier: 1.13 },
  ],
  styles: [
    { label: "Classic devotional", priceMultiplier: 1.05 },
    { label: "Contemporary luxury", priceMultiplier: 1.12 },
    { label: "Heritage temple", priceMultiplier: 1.16 },
    { label: "Minimal sculptural", priceMultiplier: 1.08 },
  ],
  engravingBaseFee: 900,
};

const complexityMultipliers = {
  standard: 1,
  detailed: 1.18,
  museum: 1.34,
};

export const inquiryTypeOptions: Array<{ value: CustomProjectInquiryType; label: string; description: string }> = [
  {
    value: "request-quotation",
    label: "Request quotation",
    description: "Get a pricing estimate for your current selection.",
  },
  {
    value: "custom-design-inquiry",
    label: "Custom design inquiry",
    description: "Discuss a bespoke piece, devotional sculpture, or engraving request.",
  },
  {
    value: "bulk-order-inquiry",
    label: "Bulk order inquiry",
    description: "Talk about gifting, architectural, or institutional volumes.",
  },
  {
    value: "material-consultation",
    label: "Material consultation",
    description: "Ask which stone, metal, or wood is right for the project.",
  },
  {
    value: "shipping-inquiry",
    label: "Shipping inquiry",
    description: "Understand packaging, lead times, and destination handling.",
  },
];

export const customProjectStageLabels: Record<CustomProjectStage, string> = {
  "design-review": "Design Review",
  "material-selection": "Material Selection",
  "carving-started": "Carving Started",
  "detailing": "Detailing",
  "polishing": "Polishing",
  "final-approval": "Final Approval",
  "shipping": "Shipping",
  "completed": "Completed",
  "cancelled": "Cancelled",
};

export const getProductCustomizationOptions = (product?: Product | null) =>
  product?.customizationOptions || defaultCustomizationOptions;

const lookupMultiplier = (options: { label: string; priceMultiplier: number }[], selected?: string) => {
  if (!selected) {
    return 1;
  }

  return options.find((option) => option.label === selected)?.priceMultiplier || 1;
};

export const getInitialCustomizationSelection = (product?: Product | null): CustomizationSelection => {
  const options = getProductCustomizationOptions(product);

  return {
    material: options.materials[0]?.label || "",
    size: options.sizes[1]?.label || options.sizes[0]?.label || "",
    finish: options.finishes[0]?.label || "",
    texture: options.textures[0]?.label || "",
    style: options.styles[0]?.label || "",
    engravingText: "",
    customNotes: "",
    complexity: "standard",
  };
};

export const calculateCustomizationPrice = (basePrice: number, selection: CustomizationSelection, options: ProductCustomizationOptions) => {
  const materialMultiplier = lookupMultiplier(options.materials, selection.material);
  const sizeMultiplier = lookupMultiplier(options.sizes, selection.size);
  const finishMultiplier = lookupMultiplier(options.finishes, selection.finish);
  const textureMultiplier = lookupMultiplier(options.textures, selection.texture);
  const styleMultiplier = lookupMultiplier(options.styles, selection.style);
  const complexityMultiplier = complexityMultipliers[selection.complexity || "standard"] || 1;
  const engravingFee = selection.engravingText?.trim()
    ? (options.engravingBaseFee || 0) + Math.min(selection.engravingText.trim().length, 60) * 14
    : 0;

  const subtotal =
    basePrice * materialMultiplier * sizeMultiplier * finishMultiplier * textureMultiplier * styleMultiplier * complexityMultiplier;
  const finalPrice = Math.round(subtotal + engravingFee);

  return {
    basePrice,
    finalPrice,
    engravingFee,
    subtotal: Math.round(subtotal),
    multipliers: {
      materialMultiplier,
      sizeMultiplier,
      finishMultiplier,
      textureMultiplier,
      styleMultiplier,
      complexityMultiplier,
    },
  };
};

export const buildWhatsAppHref = (phoneNumber: string, message: string) => {
  const encodedMessage = encodeURIComponent(message);
  const sanitizedNumber = phoneNumber.replace(/[^\d]/g, "");
  return `https://wa.me/${sanitizedNumber}?text=${encodedMessage}`;
};
