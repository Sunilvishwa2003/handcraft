export type ProductCategory = {
  _id?: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
};

export type Product = {
  _id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  brand: string;
  category: string | ProductCategory;
  subcategory?: string;
  image?: string;
  thumbnail?: string;
  imageUrl?: string;
  images: Array<string | { url?: string; alt?: string }>;
  model3dUrl?: string;
  rating: number;
  numReviews: number;
  countInStock: number;
  stockAlertThreshold?: number;
  availability: "in-stock" | "out-of-stock" | "preorder";
  specs: string[];
  tags: string[];
  semanticKeywords?: string[];
  vendorName?: string;
  vendorVerified?: boolean;
  bestSellerScore?: number;
  trendingScore?: number;
  purchases?: number;
  views?: number;
  featured?: boolean;
  customizationOptions?: ProductCustomizationOptions;
  isCustomizable?: boolean;
  showPrice?: boolean;
  isCustomPricing?: boolean;
  pricingNoticeMessage?: string;
  createdAt?: string;
};

export type CustomizationOption = {
  label: string;
  priceMultiplier: number;
  description?: string;
  dimensions?: string;
};

export type ProductCustomizationOptions = {
  materials: CustomizationOption[];
  sizes: CustomizationOption[];
  finishes: CustomizationOption[];
  textures: CustomizationOption[];
  styles: CustomizationOption[];
  engravingBaseFee?: number;
};

export type CustomizationSelection = {
  material?: string;
  size?: string;
  finish?: string;
  texture?: string;
  style?: string;
  engravingText?: string;
  customNotes?: string;
  complexity?: "standard" | "detailed" | "museum";
};

export type CustomProjectStage =
  | "design-review"
  | "material-selection"
  | "carving-started"
  | "detailing"
  | "polishing"
  | "final-approval"
  | "shipping"
  | "completed"
  | "cancelled";

export type CustomProjectInquiryType =
  | "request-quotation"
  | "custom-design-inquiry"
  | "bulk-order-inquiry"
  | "material-consultation"
  | "shipping-inquiry";

export type ShippingOption = 'standard' | 'express' | 'priority';

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'paid'
  | 'packed'
  | 'shipped'
  | 'out-for-delivery'
  | 'delivered'
  | 'cancelled';

export type Order = {
  _id: string;
  user?: {
    _id?: string;
    name?: string;
    email?: string;
  };
  orderItems: CartItem[];
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  shippingOption: ShippingOption;
  estimatedDelivery?: string;
  paymentMethod: string;
  paymentResult?: {
    id: string;
    status: string;
    update_time: string;
    email_address?: string;
    provider?: string;
    method?: string;
    order_id?: string;
    signature?: string;
  };
  taxPrice: number;
  shippingPrice: number;
  discountPrice: number;
  couponCode?: string;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  status: OrderStatus | string;
  trackingEvents: {
    status: string;
    message: string;
    location?: string;
    timestamp: string;
  }[];
  fraudRiskScore: number;
  fraudFlags: string[];
  createdAt: string;
  updatedAt?: string;
};

export type ProductListResponse = {
  products: Product[];
  page: number;
  pages: number;
  total: number;
  sort: string;
};

export type Ad = {
  _id: string;
  title?: string;
  description?: string;
  imageUrl: string;
  desktopImage?: string;
  tabletImage?: string;
  mobileImage?: string;
  targetUrl: string;
  placements?: string[];
  active: boolean;
  sortOrder?: number;
  productId?: string;
  createdAt?: string;
};

export type User = {
  _id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  avatarUrl?: string;
  profileImage?: string;
  phone?: string;
  token: string;
};

export type UserProfile = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  profileImage: string;
  avatarUrl: string;
  joinedDate: string;
  createdAt: string;
  authProvider: 'google' | 'credentials';
  isAdmin: boolean;
  counts: {
    addresses: number;
    wishlist: number;
    orders: number;
    customProjects: number;
    notifications: number;
  };
};

export type Address = {
  _id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AddressInput = Omit<Address, "_id" | "createdAt" | "updatedAt">;

export type AccountTab = 'profile' | 'orders' | 'wishlist' | 'addresses' | 'custom-projects' | 'notifications' | 'settings';

export type CartItem = {
  product: string;
  name: string;
  image: string;
  price: number;
  qty: number;
  countInStock: number;
};

export type Cart = {
  items: CartItem[];
  couponCode?: string;
  discountAmount: number;
  subtotal: number;
  total: number;
};

export type Review = {
  _id: string;
  name: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
};

export type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  type: "order" | "offer" | "system" | "chat" | "project" | "wishlist";
  read: boolean;
  data: Record<string, unknown>;
  createdAt: string;
};

export type CustomProject = {
  _id: string;
  user?: string;
  product?: {
    _id: string;
    name?: string;
  };
  name: string;
  email: string;
  phone?: string;
  material: string;
  description: string;
  dimensions?: string;
  budget?: string;
  projectType: "product-customization" | "design-request" | "consultation" | "bulk-order";
  inquiryType: CustomProjectInquiryType;
  stage: CustomProjectStage;
  status: "pending" | "reviewed" | "accepted" | "rejected";
  quotedPrice?: number;
  estimatedTimelineDays?: number;
  customerApprovalStatus: "pending" | "approved" | "needs-revision";
  customization: CustomizationSelection & {
    estimatedPrice?: number;
  };
  referenceImages: string[];
  sketches: string[];
  timeline: {
    stage: CustomProjectStage;
    title: string;
    message: string;
    updatedAt: string;
  }[];
  createdAt: string;
  updatedAt?: string;
};

export type WhatsAppInquiryPreview = {
  inquiryType: CustomProjectInquiryType;
  message: string;
  phoneNumber: string;
};
