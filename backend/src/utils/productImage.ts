export const PRODUCT_IMAGE_PLACEHOLDER = '/mahabs-logo.svg';

type ProductImageValue = string | { url?: string | null } | null | undefined;

export type ProductImageCarrier = {
  image?: string | null;
  thumbnail?: string | null;
  imageUrl?: string | null;
  images?: ProductImageValue[] | null;
};

export const getProductImageUrl = (image?: ProductImageValue) => {
  if (!image) {
    return '';
  }

  if (typeof image === 'string') {
    return image.trim();
  }

  return typeof image.url === 'string' ? image.url.trim() : '';
};

export const getProductPrimaryImage = (
  product?: ProductImageCarrier | null,
  fallback = PRODUCT_IMAGE_PLACEHOLDER,
) => {
  if (!product) {
    return fallback;
  }

  const candidates: string[] = [
    typeof product.image === 'string' ? product.image.trim() : '',
    ...(Array.isArray(product.images) ? product.images.map((image) => getProductImageUrl(image)) : []),
    typeof product.thumbnail === 'string' ? product.thumbnail.trim() : '',
    typeof product.imageUrl === 'string' ? product.imageUrl.trim() : '',
  ];

  return candidates.find(Boolean) || fallback;
};

export const buildProductImageArray = (
  product?: ProductImageCarrier | null,
  fallback = PRODUCT_IMAGE_PLACEHOLDER,
) => {
  const primaryImage = getProductPrimaryImage(product, fallback);
  const extraImages = Array.isArray(product?.images)
    ? product.images.map((image) => getProductImageUrl(image)).filter(Boolean)
    : [];

  return Array.from(new Set([primaryImage, ...extraImages].filter(Boolean)));
};
