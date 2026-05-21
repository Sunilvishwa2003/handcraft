type PriceOption = {
  label: string;
  priceMultiplier: number;
};

export type CustomizationSelection = {
  material?: string;
  size?: string;
  finish?: string;
  texture?: string;
  style?: string;
  engravingText?: string;
  customNotes?: string;
  complexity?: 'standard' | 'detailed' | 'museum';
};

export const defaultCustomizationOptions = {
  materials: [
    { label: 'Granite', priceMultiplier: 1.18, description: 'Dense, long-lasting, premium stone character.' },
    { label: 'Marble', priceMultiplier: 1.22, description: 'Soft luxury polish with ceremonial elegance.' },
    { label: 'Wood', priceMultiplier: 1, description: 'Warm handcrafted finish for living interiors.' },
    { label: 'Bronze', priceMultiplier: 1.28, description: 'Museum-like cast finish with heirloom depth.' },
    { label: 'Black stone', priceMultiplier: 1.24, description: 'Temple-inspired tone with rich carved contrast.' },
  ],
  sizes: [
    { label: '12 inches', priceMultiplier: 0.92, dimensions: '1 foot display size' },
    { label: '24 inches', priceMultiplier: 1.12, dimensions: '2 foot statement size' },
    { label: '36 inches', priceMultiplier: 1.34, dimensions: '3 foot ceremonial size' },
    { label: '48 inches', priceMultiplier: 1.6, dimensions: '4 foot premium installation size' },
  ],
  finishes: [
    { label: 'Natural matte', priceMultiplier: 1 },
    { label: 'Antique', priceMultiplier: 1.08 },
    { label: 'Polished', priceMultiplier: 1.12 },
    { label: 'Temple patina', priceMultiplier: 1.15 },
  ],
  textures: [
    { label: 'Smooth carved', priceMultiplier: 1 },
    { label: 'Hand-chisel grain', priceMultiplier: 1.1 },
    { label: 'Weathered artisan', priceMultiplier: 1.13 },
  ],
  styles: [
    { label: 'Classic devotional', priceMultiplier: 1.05 },
    { label: 'Contemporary luxury', priceMultiplier: 1.12 },
    { label: 'Heritage temple', priceMultiplier: 1.16 },
    { label: 'Minimal sculptural', priceMultiplier: 1.08 },
  ],
  engravingBaseFee: 900,
};

const complexityMultipliers = {
  standard: 1,
  detailed: 1.18,
  museum: 1.34,
};

const lookupMultiplier = (options: PriceOption[], selected?: string) => {
  if (!selected) {
    return 1;
  }

  const match = options.find((option) => option.label.toLowerCase() === selected.toLowerCase());
  return match?.priceMultiplier || 1;
};

export const calculateCustomizationPrice = (basePrice: number, selection: CustomizationSelection) => {
  const materialMultiplier = lookupMultiplier(defaultCustomizationOptions.materials, selection.material);
  const sizeMultiplier = lookupMultiplier(defaultCustomizationOptions.sizes, selection.size);
  const finishMultiplier = lookupMultiplier(defaultCustomizationOptions.finishes, selection.finish);
  const textureMultiplier = lookupMultiplier(defaultCustomizationOptions.textures, selection.texture);
  const styleMultiplier = lookupMultiplier(defaultCustomizationOptions.styles, selection.style);
  const complexityMultiplier = complexityMultipliers[selection.complexity || 'standard'] || 1;
  const engravingFee = selection.engravingText?.trim()
    ? defaultCustomizationOptions.engravingBaseFee + Math.min(selection.engravingText.trim().length, 60) * 14
    : 0;

  const priceBeforeEngraving =
    basePrice * materialMultiplier * sizeMultiplier * finishMultiplier * textureMultiplier * styleMultiplier * complexityMultiplier;

  const finalPrice = Math.round(priceBeforeEngraving + engravingFee);

  return {
    basePrice,
    finalPrice,
    engravingFee,
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
