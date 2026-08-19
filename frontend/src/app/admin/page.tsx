"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { DragEvent as ReactDragEvent, FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { apiFetch, formatPrice, getApiUrl, getProductImageUrl, getStoredUser, PRODUCT_IMAGE_PLACEHOLDER, resolveAssetUrl, getSocketUrl } from "@/lib/api";
import ProjectAccuracyChart from "@/components/ProjectAccuracyChart";
import { Ad, CustomProject, CustomProjectStage, Order, Product } from "@/lib/types";

type Dashboard = {
  metrics: { orders: number; users: number; products: number; revenue: number };
  lowStock: Product[];
  recentOrders: Order[];
};

type AdminProduct = Omit<Product, "images"> & {
  images: string[];
};

type UploadAsset = {
  originalName: string;
  url: string;
  mimetype: string;
  size: number;
};

type Notice = {
  tone: "success" | "error" | "info";
  text: string;
};

type ImportSummary = {
  created: number;
  updated: number;
  skipped: number;
  errors: { index: number; name?: string; reason: string }[];
};

type DynamicPriceSuggestion = {
  currentPrice: number;
  suggestedPrice: number;
  demandMultiplier: number;
  scarcityMultiplier: number;
  reason: string;
};

type ProductFormState = {
  name: string;
  sku: string;
  brand: string;
  category: string;
  subcategory: string;
  description: string;
  price: string;
  originalPrice: string;
  useApproxPrice: boolean;
  approxPriceMin: string;
  approxPriceMax: string;
  countInStock: string;
  stockAlertThreshold: string;
  availability: Product["availability"];
  featured: boolean;
  model3dUrl: string;
  images: string[];
  specs: string;
  tags: string;
  semanticKeywords: string;
  isCustomPricing: boolean;
  pricingNoticeMessage: string;
};

type AdFormState = {
  title: string;
  description: string;
  imageUrl: string;
  desktopImage?: string;
  tabletImage?: string;
  mobileImage?: string;
  targetUrl: string;
  productId: string;
  active: boolean;
  sortOrder: string;
  placements: string[];
};

type AdminSection = "overview" | "catalog" | "projects" | "ads" | "orders";
type ProjectBoardFilter = "all" | "pending" | "approval" | "active" | "shipping";

type CategoryGroup = {
  category: string;
  count: number;
  products: Array<{ _id: string; name: string; subcategory?: string; price: number; images: Array<string | { url?: string; alt?: string }>; availability: string }>;
};

const categories = [
  { name: "Stone", slug: "stone" },
  { name: "Stone Name Board", slug: "stone-name-board" },
  { name: "Home Decor", slug: "home-decor" },
];
const brandSuggestions = ["Handcrafts", "Heritage Glow", "Clay Studio", "Woven Nest", "Temple Light", "MahabsCrafto"];
const brandLogos: Record<string, { initials: string; bg: string; fg: string }> = {
  Handcrafts: { initials: "HC", bg: "bg-amber-100", fg: "text-amber-900" },
  "Heritage Glow": { initials: "HG", bg: "bg-pink-100", fg: "text-pink-900" },
  "Clay Studio": { initials: "CS", bg: "bg-slate-100", fg: "text-slate-900" },
  "Woven Nest": { initials: "WN", bg: "bg-emerald-100", fg: "text-emerald-900" },
  "Temple Light": { initials: "TL", bg: "bg-sky-100", fg: "text-sky-900" },
  MahabsCrafto: { initials: "MC", bg: "bg-slate-900", fg: "text-white" },
};
const customProjectStages: CustomProjectStage[] = [
  "design-review",
  "material-selection",
  "carving-started",
  "detailing",
  "polishing",
  "final-approval",
  "shipping",
  "completed",
  "cancelled",
];

const bulkImportExample = JSON.stringify(
  [
    {
      name: "Handwoven Cane Basket",
      brand: "Handcrafts",
      category: "Home Decor",
      subcategory: "Storage",
      description: "A handwoven cane basket for storage, gifting, and shelf styling.",
      price: 1299,
      originalPrice: 1599,
      countInStock: 18,
      stockAlertThreshold: 5,
      availability: "in-stock",
      featured: true,
      images: ["https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=900&q=80"],
      specs: ["Natural cane weave", "Lightweight", "Shelf friendly"],
      tags: ["woven", "storage", "eco-friendly"],
      semanticKeywords: ["handmade basket", "home organizer", "woven decor"],
    },
  ],
  null,
  2,
);

const createEmptyProductForm = (): ProductFormState => ({
  name: "",
  sku: "",
  brand: "MahabsCrafto",
  category: "home-decor",
  subcategory: "",
  description: "",
  price: "999",
  originalPrice: "",
  useApproxPrice: false,
  approxPriceMin: "",
  approxPriceMax: "",
  countInStock: "10",
  stockAlertThreshold: "5",
  availability: "in-stock",
  featured: false,
  model3dUrl: "",
  images: [""],
  specs: "",
  tags: "",
  semanticKeywords: "",
  isCustomPricing: false,
  pricingNoticeMessage: "",
});

const createEmptyAdForm = (): AdFormState => ({
  title: "",
  description: "",
  imageUrl: "",
  desktopImage: "",
  tabletImage: "",
  mobileImage: "",
  targetUrl: "",
  productId: "",
  active: true,
  sortOrder: "0",
  placements: ["home"],
});

const toLineArray = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const toCsvArray = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const formatAdminLabel = (value?: string | null, fallback = "Not set") => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return fallback;
  }

  return normalized
    .split("-")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
};

const formatAdminDate = (value?: string) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN");
};

const sortByNewest = <T extends { createdAt?: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });

const getNormalizedAdminProductImages = (product?: Pick<Product, "images" | "image" | "thumbnail" | "imageUrl"> | null) => {
  const images = Array.isArray(product?.images) ? product.images.map((image) => getProductImageUrl(image)).filter(Boolean) : [];

  if (images.length) {
    return Array.from(new Set(images));
  }

  const legacyFallbacks = [product?.image, product?.thumbnail, product?.imageUrl]
    .map((image) => (typeof image === "string" ? resolveAssetUrl(image.trim()) : ""))
    .filter(Boolean);

  return Array.from(new Set(legacyFallbacks));
};

const normalizeAdminProduct = (product: Product): AdminProduct => ({
  ...product,
  images: getNormalizedAdminProductImages(product),
});

const formFromProduct = (product: Product): ProductFormState => {
  const images = getNormalizedAdminProductImages(product);

  return {
    name: product.name,
    sku: product.sku || "",
    brand: product.brand,
    category: typeof product.category === "string" ? product.category : product.category?.name || "",
    subcategory: product.subcategory || "",
    description: product.description,
    price: String(product.price || ""),
    originalPrice: product.originalPrice ? String(product.originalPrice) : "",
    useApproxPrice: Boolean(product.useApproxPrice),
    approxPriceMin: product.approxPriceMin ? String(product.approxPriceMin) : "",
    approxPriceMax: product.approxPriceMax ? String(product.approxPriceMax) : "",
    countInStock: String(product.countInStock || 0),
    stockAlertThreshold: String(product.stockAlertThreshold ?? 5),
    availability: product.availability,
    featured: Boolean(product.featured),
    model3dUrl: product.model3dUrl || "",
    images: images.length ? images : [""],
    specs: product.specs.join("\n"),
    tags: product.tags.join(", "),
    semanticKeywords: (product.semanticKeywords || []).join(", "),
    isCustomPricing: Boolean(product.isCustomPricing),
    pricingNoticeMessage: product.pricingNoticeMessage || "",
  };
};

const buildProductPayload = (form: ProductFormState) => {
  const price = form.useApproxPrice ? 0 : Number(form.price || 0);
  const originalPrice = Number(form.originalPrice || 0);
  const countInStock = Number(form.countInStock || 0);
  const stockAlertThreshold = Number(form.stockAlertThreshold || 0);

  return {
    name: form.name.trim(),
    sku: form.sku.trim(),
    brand: form.brand.trim(),
    category: form.category.trim(),
    subcategory: form.subcategory.trim() || undefined,
    description: form.description.trim(),
    price,
    originalPrice: originalPrice > 0 ? originalPrice : undefined,
    discountPercentage: originalPrice > price && originalPrice > 0 ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0,
    countInStock,
    stockAlertThreshold,
    availability: form.availability || (countInStock > 0 ? "in-stock" : "out-of-stock"),
    featured: form.featured,
    model3dUrl: form.model3dUrl.trim() || undefined,
    images: form.images.map((item) => item.trim()).filter(Boolean),
    specs: toLineArray(form.specs),
    tags: toCsvArray(form.tags),
    semanticKeywords: toCsvArray(form.semanticKeywords),
    useApproxPrice: Boolean(form.useApproxPrice),
    approxPriceMin: form.useApproxPrice ? Number(form.approxPriceMin || 0) : undefined,
    approxPriceMax: form.useApproxPrice ? Number(form.approxPriceMax || 0) : undefined,
    isCustomPricing: Boolean(form.isCustomPricing),
    pricingNoticeMessage: form.pricingNoticeMessage?.trim() || undefined,
  };
};

const buildDraftDescription = (form: ProductFormState) => {
  const name = form.name.trim() || "This handcrafted piece";
  const brand = form.brand.trim() || "our artisan studio";
  const category = form.category.trim() || "decor";
  const subcategory = form.subcategory.trim();
  const specs = toLineArray(form.specs);
  const tags = toCsvArray(form.tags);
  const stock = Number(form.countInStock || 0);

  const lines = [
    `${name} from ${brand} is a handcrafted ${subcategory ? `${subcategory.toLowerCase()} ` : ""}${category.toLowerCase()} piece designed to bring character, craftsmanship, and everyday utility into your space.`,
    specs.length
      ? `Key details include ${specs.slice(0, 3).join(", ").toLowerCase()}.`
      : "Its finish and silhouette are designed to suit gifting, display, and daily use.",
    tags.length
      ? `Ideal for shoppers looking for ${tags.slice(0, 3).join(", ").toLowerCase()}.`
      : "It works especially well for customers browsing for unique handmade accents.",
    stock > 0
      ? `Current stock is ready for dispatch, with ${stock} unit${stock === 1 ? "" : "s"} available right now.`
      : "This item can be listed as a preorder or restocked before launch.",
  ];

  return lines.join(" ");
};

const noticeStyles: Record<Notice["tone"], string> = {
  success: "bg-emerald-50 text-emerald-800",
  error: "bg-red-50 text-red-700",
  info: "bg-sky-50 text-sky-800",
};

export default function AdminPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customProjects, setCustomProjects] = useState<CustomProject[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [productForm, setProductForm] = useState<ProductFormState>(createEmptyProductForm());
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [adForm, setAdForm] = useState<AdFormState>(createEmptyAdForm());
  const [productQuery, setProductQuery] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
  
  const closeOrderDetail = useCallback(() => {
    setSelectedOrderDetail(null);
  }, []);
  const [projectQuery, setProjectQuery] = useState("");
  const [uploadedAssets, setUploadedAssets] = useState<UploadAsset[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [smartPriceBusy, setSmartPriceBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importText, setImportText] = useState(bulkImportExample);
  const [importBusy, setImportBusy] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [projectBoardFilter, setProjectBoardFilter] = useState<ProjectBoardFilter>("all");

  const currentUser = getStoredUser();
  const isAdminUser = Boolean(currentUser?.isAdmin);

  const load = async () => {
    setErrorMessage(null);
    const user = getStoredUser();
    console.debug("[admin/page] load start", { isAdmin: user?.isAdmin, email: user?.email });
    if (!user?.isAdmin) {
      console.warn("[admin/page] User is not admin", { email: user?.email, isAdmin: user?.isAdmin });
      setNotice({ tone: "error", text: "Login with an admin account to manage products, orders, custom projects, and storefront assets." });
      setLoading(false);
      return;
    }

    setLoading(true);
    console.debug("[admin/page] Fetching admin data...");
    const startTime = Date.now();

    function safeArray<T>(value: unknown): T[] {
      return Array.isArray(value) ? (value as T[]) : [];
    }

    function safeObject<T extends object>(value: unknown): T | null {
      return value && typeof value === "object" ? (value as T) : null;
    }

    const fallbackDashboard: Dashboard = {
      metrics: {
        orders: 0,
        users: 0,
        products: 0,
        revenue: 0,
      },
      lowStock: [],
      recentOrders: [],
    };

    try {
      const [dashboardResult, productResult, orderResult, customProjectResult, adResult, groupedResult] = await Promise.allSettled([
        apiFetch("/admin/dashboard"),
        apiFetch("/admin/products"),
        apiFetch("/admin/orders"),
        apiFetch("/custom-orders"),
        apiFetch("/admin/ads"),
        apiFetch("/admin/products/grouped"),
      ]);

      console.debug("[admin/page] Fetch complete", {
        duration: Date.now() - startTime,
        dashboardStatus: dashboardResult.status,
        dashboardError: dashboardResult.status === "rejected" ? String(dashboardResult.reason) : undefined,
      });

      const productItems = safeArray<Product>(productResult.status === "fulfilled" ? productResult.value : undefined);
      const orderItemsPayload = safeObject<{ orders?: unknown; total?: number; page?: number; pages?: number; pageSize?: number }>(orderResult.status === "fulfilled" ? orderResult.value : undefined);
      const orderItems = safeArray<Order>(orderItemsPayload?.orders);
      const dashboardOrders = safeArray<Order>(safeObject<Dashboard>(dashboardResult.status === "fulfilled" ? dashboardResult.value : undefined)?.recentOrders);
      const customProjectItems = safeArray<CustomProject>(customProjectResult.status === "fulfilled" ? customProjectResult.value : undefined);
      const adItems = safeArray<Ad>(adResult.status === "fulfilled" ? adResult.value : undefined);
      const groupedPayload = safeObject<{ success: boolean; groups?: unknown }>(groupedResult.status === "fulfilled" ? groupedResult.value : undefined);
      const groupedProducts = safeArray<CategoryGroup>(groupedPayload?.groups);

      const productList = sortByNewest(productItems.map((product) => normalizeAdminProduct(product)));
      const orderList = sortByNewest(orderItems.length ? orderItems : dashboardOrders);
      const customProjectList = sortByNewest(customProjectItems);
      const adList = sortByNewest(adItems);

      console.debug("[admin/page] fetch results", {
        dashboard: dashboardResult.status === "fulfilled" ? dashboardResult.value : dashboardResult.reason || null,
        products: productItems.length,
        ordersPayload: orderItemsPayload ? { total: orderItemsPayload.total, pages: orderItemsPayload.pages, returned: orderItems.length } : null,
        orders: orderList.length,
        dashboardRecentOrders: dashboardOrders.length,
        customProjects: customProjectItems.length,
        ads: adItems.length,
        groupedProducts: groupedProducts.length,
      });

      const dashboardPayload =
        dashboardResult.status === "fulfilled" && safeObject<Dashboard>(dashboardResult.value)?.metrics
          ? safeObject<Dashboard>(dashboardResult.value)!
          : {
              ...fallbackDashboard,
              metrics: {
                orders: orderList.length,
                users: dashboardResult.status === "fulfilled" ? safeObject<Dashboard>(dashboardResult.value)?.metrics?.users ?? 0 : 0,
                products: productList.length,
                revenue: orderList.reduce((sum, order) => sum + (order.isPaid ? order.totalPrice : 0), 0),
              },
              lowStock: productList.filter((product) => product.countInStock <= (product.stockAlertThreshold ?? 5)).slice(0, 12),
              recentOrders: orderList.slice(0, 10),
            };

      setDashboard(dashboardPayload);
      setProducts(productList);
      setOrders(orderList);
      setCustomProjects(customProjectList);
      setAds(adList);
      setCategoryGroups(
        groupedProducts.filter((group) =>
          categories.some((category) => category.name === group.category || category.slug === group.category),
        ),
      );

      if (
        dashboardResult.status === "rejected" ||
        productResult.status === "rejected" ||
        orderResult.status === "rejected" ||
        customProjectResult.status === "rejected" ||
        adResult.status === "rejected"
      ) {
        setNotice({
          tone: "info",
          text: "Some admin modules could not be loaded completely, so the dashboard is using the data that is currently available.",
        });
        setErrorMessage("One or more admin API requests failed. See browser console for details.");
      }

      console.debug("[admin/page] load complete", {
        dashboardPayload,
        loading: false,
        dashboardResultStatus: dashboardResult.status,
        productResultStatus: productResult.status,
        orderResultStatus: orderResult.status,
        customProjectResultStatus: customProjectResult.status,
        adResultStatus: adResult.status,
      });
    } catch (error) {
      console.error("[admin/page] unexpected admin load failure:", error);
      setDashboard(fallbackDashboard);
      setProducts([]);
      setOrders([]);
      setCustomProjects([]);
      setAds([]);
      setCategoryGroups([]);
      setNotice({ tone: "error", text: "Admin data could not be loaded due to an unexpected error." });
      setErrorMessage(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch((error) => {
      console.error("[admin/page] Load failed with error:", error);
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not load admin dashboard" });
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const user = getStoredUser();
    if (!user?.isAdmin) {
      return;
    }

    const socket = io(getSocketUrl(), {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.debug("[admin/page] socket connected", { socketId: socket.id });
      socket.emit("join:user", user._id);
    });

    socket.on("connect_error", (error) => {
      console.error("[admin/page] socket connection error:", error);
    });

    socket.on("order:update", () => {
      console.debug("[admin/page] received order:update event, refreshing admin dashboard");
      load().catch((error) => console.error("[admin/page] live refresh failed:", error));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const refreshData = async () => {
    setRefreshing(true);

    try {
      await load();
      setNotice({ tone: "success", text: "Admin data refreshed from the live project." });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not refresh admin data");
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not refresh admin data" });
    } finally {
      setRefreshing(false);
    }
  };

  const dashboardView = useMemo<Dashboard>(() => {
    const lowStock = [...products]
      .filter((product) => product.countInStock <= (product.stockAlertThreshold ?? 5))
      .sort((left, right) => left.countInStock - right.countInStock)
      .slice(0, 12);

    const recentOrdersSource = orders.length ? orders : dashboard?.recentOrders ?? [];
    const ordersCount = dashboard?.metrics.orders ?? orders.length;
    const revenueAmount = dashboard?.metrics.revenue ?? orders.reduce((sum, order) => sum + (order.isPaid ? order.totalPrice : 0), 0);

    return {
      metrics: {
        orders: ordersCount,
        users: dashboard?.metrics.users ?? 0,
        products: products.length,
        revenue: revenueAmount,
      },
      lowStock,
      recentOrders: sortByNewest(recentOrdersSource).slice(0, 10),
    };
  }, [dashboard, orders, products]);

  const projectBuckets = useMemo(
    () => ({
      pending: customProjects.filter((project) => project.status === "pending").length,
      approval: customProjects.filter((project) => project.customerApprovalStatus === "pending").length,
      active: customProjects.filter((project) => !["completed", "cancelled"].includes(project.stage)).length,
      shipping: customProjects.filter((project) => ["shipping", "completed"].includes(project.stage)).length,
    }),
    [customProjects],
  );

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) {
      return sortByNewest(products);
    }

    return sortByNewest(
      products.filter((product) =>
        [product.name, product.brand, product.category, product.subcategory, ...(product.tags || [])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      ),
    );
  }, [products, productQuery]);

  const filteredOrders = useMemo(() => {
    const query = orderQuery.trim().toLowerCase();
    if (!query) {
      return sortByNewest(orders);
    }

    return sortByNewest(
      orders.filter((order) =>
        [
          order._id,
          order.user?.name,
          order.user?.email,
          order.status,
          order.paymentMethod,
          ...(Array.isArray(order.orderItems) ? order.orderItems.map((item) => item.name) : []),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      ),
    );
  }, [orders, orderQuery]);

  const filteredCustomProjects = useMemo(() => {
    const query = projectQuery.trim().toLowerCase();
    let visibleProjects = sortByNewest(customProjects);

    if (projectBoardFilter === "pending") {
      visibleProjects = visibleProjects.filter((project) => project.status === "pending");
    } else if (projectBoardFilter === "approval") {
      visibleProjects = visibleProjects.filter((project) => project.customerApprovalStatus === "pending");
    } else if (projectBoardFilter === "active") {
      visibleProjects = visibleProjects.filter((project) => !["completed", "cancelled"].includes(project.stage));
    } else if (projectBoardFilter === "shipping") {
      visibleProjects = visibleProjects.filter((project) => ["shipping", "completed"].includes(project.stage));
    }

    if (!query) {
      return visibleProjects;
    }

    return visibleProjects.filter((project) =>
      [
        project.name,
        project.email,
        project.phone,
        project.material,
        project.projectType,
        project.inquiryType,
        project.stage,
        project.status,
        project.product?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [customProjects, projectBoardFilter, projectQuery]);

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm(createEmptyProductForm());
  };

  const autoWriteDescription = () => {
    if (!productForm.name.trim()) {
      setNotice({ tone: "error", text: "Add the product name first so the description can be generated." });
      return;
    }

    setProductForm((current) => ({
      ...current,
      description: buildDraftDescription(current),
    }));
    setNotice({ tone: "info", text: "Draft description generated. Review and refine it before saving." });
  };

  const applySmartPrice = async () => {
    const currentPrice = Number(productForm.price || 0);
    if (currentPrice <= 0) {
      setNotice({ tone: "error", text: "Enter a valid price before using Smart Price." });
      return;
    }

    if (!editingProductId) {
      setNotice({ tone: "info", text: "Save the product first to use demand-based Smart Price recommendations." });
      return;
    }

    setSmartPriceBusy(true);

    try {
      const suggestion = await apiFetch<DynamicPriceSuggestion>(`/ai/dynamic-pricing/${editingProductId}`);
      setProductForm((current) => ({
        ...current,
        originalPrice: current.originalPrice || current.price,
        price: String(suggestion.suggestedPrice),
      }));
      setNotice({
        tone: "info",
        text: `Smart Price updated the selling price to ${formatPrice(suggestion.suggestedPrice)}. ${suggestion.reason}`,
      });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not calculate a smart price" });
    } finally {
      setSmartPriceBusy(false);
    }
  };

  const setImageAt = (index: number, value: string) => {
    setProductForm((current) => ({
      ...current,
      images: current.images.map((image, imageIndex) => (imageIndex === index ? value : image)),
    }));
  };

  const addImageField = () => {
    setProductForm((current) => ({ ...current, images: [...current.images, ""] }));
  };

  const removeImageField = (index: number) => {
    setProductForm((current) => ({
      ...current,
      images: current.images.length === 1 ? [""] : current.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const beginEdit = (product: Product) => {
    setActiveSection("catalog");
    setEditingProductId(product._id);
    setProductForm(formFromProduct(product));
    setNotice({ tone: "info", text: `Editing ${product.name}. Save to update it.` });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveProduct = async (event: FormEvent) => {
    event.preventDefault();
    const payload = buildProductPayload(productForm);

    if (!payload.name || !payload.description || !payload.category || !payload.brand) {
      setNotice({ tone: "error", text: "Name, brand, category, and description are required." });
      return;
    }

    if (!payload.images.length) {
      setNotice({ tone: "error", text: "Add at least one product image." });
      return;
    }

    if (!productForm.useApproxPrice) {
      const priceValue = Number(productForm.price || NaN);
      if (Number.isNaN(priceValue) || priceValue <= 0) {
        setNotice({ tone: "error", text: "Price must be greater than 0 when approximate pricing is disabled." });
        return;
      }
    }

    // Validation for approximate pricing
    if (productForm.useApproxPrice) {
      const min = Number(productForm.approxPriceMin || NaN);
      const max = Number(productForm.approxPriceMax || NaN);
      if (Number.isNaN(min) || Number.isNaN(max)) {
        setNotice({ tone: "error", text: "Approx min and max must be valid numbers." });
        return;
      }
      if (min <= 0 || max <= 0) {
        setNotice({ tone: "error", text: "Approximate prices must be greater than zero." });
        return;
      }
      if (max < min) {
        setNotice({ tone: "error", text: "Approx max must be greater than or equal to approx min." });
        return;
      }
    }

    setSavingProduct(true);

    try {
      const saved = await apiFetch<Product>(editingProductId ? `/products/${editingProductId}` : "/products", {
        method: editingProductId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      const normalizedSavedProduct = normalizeAdminProduct(saved);

      setProducts((items) =>
        editingProductId
          ? items.map((product) => (product._id === editingProductId ? normalizedSavedProduct : product))
          : [normalizedSavedProduct, ...items],
      );
      setNotice({ tone: "success", text: editingProductId ? "Product updated." : "Product created." });
      resetProductForm();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not save product" });
    } finally {
      setSavingProduct(false);
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}?`)) {
      return;
    }

    try {
      await apiFetch(`/products/${id}`, { method: "DELETE" });
      setProducts((items) => items.filter((product) => product._id !== id));
      setNotice({ tone: "success", text: `${name} deleted.` });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not delete product" });
    }
  };

  const beginEditAd = (ad: Ad) => {
    setActiveSection("ads");
    setEditingAdId(ad._id);
    setAdForm({
      title: ad.title || "",
      description: ad.description || "",
      imageUrl: ad.imageUrl,
      targetUrl: ad.targetUrl,
      productId: ad.productId || "",
      active: Boolean(ad.active),
      sortOrder: String(ad.sortOrder || 0),
      placements: ad.placements || ["home"],
    });
    setNotice({ tone: "info", text: `Editing ad ${ad.title || "creative banner"}. Save to update.` });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetAdForm = () => {
    setEditingAdId(null);
    setAdForm(createEmptyAdForm());
  };

  const placementOptions = [
  { value: "home", label: "Home Slider", description: "Main homepage carousel" },
  { value: "stone", label: "Stone Category", description: "Stone products page" },
  { value: "stone-name-board", label: "Stone Name Board", description: "Stone name board category page" },
  { value: "metal", label: "Metal Category", description: "Metal products page" },
  { value: "wood", label: "Wood Category", description: "Wood products page" },
  { value: "home-decor", label: "Home Decor Category", description: "Home decor products page" },
];

const togglePlacement = (placement: string) => {
  setAdForm((current) => ({
    ...current,
    placements: current.placements.includes(placement)
      ? current.placements.filter((p) => p !== placement)
      : [...current.placements, placement],
  }));
};

const saveAd = async (event: FormEvent) => {
    event.preventDefault();
    if (!(adForm.imageUrl.trim() || adForm.desktopImage || adForm.tabletImage || adForm.mobileImage) || !adForm.targetUrl.trim()) {
      setNotice({ tone: "error", text: "At least one image and a target URL are required for an ad." });
      return;
    }

    try {
      const saved = await apiFetch<Ad>(editingAdId ? `/admin/ads/${editingAdId}` : "/admin/ads", {
        method: editingAdId ? "PUT" : "POST",
        body: JSON.stringify({
          title: adForm.title,
          description: adForm.description,
          imageUrl: adForm.imageUrl || undefined,
          desktopImage: adForm.desktopImage || undefined,
          tabletImage: adForm.tabletImage || undefined,
          mobileImage: adForm.mobileImage || undefined,
          targetUrl: adForm.targetUrl,
          productId: adForm.productId || undefined,
          active: adForm.active,
          sortOrder: Number(adForm.sortOrder || 0),
          placements: adForm.placements,
        }),
      });

      setAds((items) => (editingAdId ? items.map((item) => (item._id === editingAdId ? saved : item)) : [saved, ...items]));
      setNotice({ tone: "success", text: editingAdId ? "Ad updated." : "Ad created." });
      resetAdForm();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not save ad" });
    }
  };

  const deleteAd = async (id: string) => {
    if (!window.confirm("Remove this advertisement?")) {
      return;
    }

    try {
      await apiFetch(`/admin/ads/${id}`, { method: "DELETE" });
      setAds((items) => items.filter((item) => item._id !== id));
      setNotice({ tone: "success", text: "Ad removed." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not remove ad" });
    }
  };

  const applyUploadedImageToAd = (asset: UploadAsset) => {
    setAdForm((current) => ({ ...current, imageUrl: asset.url }));
    setNotice({ tone: "info", text: `${asset.originalName} assigned as ad image.` });
  };

  const clearAdImageUrl = () => {
    setAdForm((current) => ({ ...current, imageUrl: "" }));
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updated = await apiFetch<Order>(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, message: `Admin updated status to ${status}` }),
      });
      setOrders((items) => items.map((order) => (order._id === id ? updated : order)));
      setNotice({ tone: "success", text: `Order ${id.slice(-6)} updated to ${formatAdminLabel(status)}.` });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not update order status" });
    }
  };

  const updateCustomProjectStage = async (projectId: string, stage: CustomProjectStage) => {
    setUpdatingProjectId(projectId);

    try {
      const updated = await apiFetch<CustomProject>(`/custom-orders/${projectId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({
          stage,
          message: `Admin moved the project to ${formatAdminLabel(stage)}.`,
        }),
      });
      setCustomProjects((items) => items.map((project) => (project._id === projectId ? updated : project)));
      setNotice({ tone: "success", text: `${updated.name}'s project moved to ${formatAdminLabel(stage)}.` });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not update custom project stage" });
    } finally {
      setUpdatingProjectId(null);
    }
  };

  const uploadFiles = async (files: File[]) => {
    const user = getStoredUser();
    if (!files.length || !user?.token) {
      return [];
    }

    setUploadBusy(true);
    const data = new FormData();
    files.forEach((file) => data.append("assets", file));

    try {
      const response = await fetch(`${getApiUrl()}/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
        body: data,
      });

      const payload = (await response.json()) as { files?: UploadAsset[]; message?: string };
      if (!response.ok) {
        setNotice({ tone: "error", text: payload.message || "Upload failed." });
        return [];
      }

      setUploadedAssets((current) => [...(payload.files || []), ...current]);
      setNotice({ tone: "success", text: "Assets uploaded. Use them directly in the active admin section." });
      return payload.files || [];
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not upload assets" });
      return [];
    } finally {
      setUploadBusy(false);
    }
  };

  const uploadAssets = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("assets") as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    await uploadFiles(files);
    input.value = "";
  };

  const onDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const onDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.currentTarget === event.target) {
      setDragActive(false);
    }
  };

  const onDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files || []);
    await uploadFiles(files);
  };

  const assignUploadedAsset = (asset: UploadAsset) => {
    const looks3d = asset.mimetype.includes("gltf") || asset.url.endsWith(".glb") || asset.url.endsWith(".gltf");

    if (looks3d) {
      setProductForm((current) => ({ ...current, model3dUrl: asset.url }));
      setNotice({ tone: "info", text: `${asset.originalName} assigned as the 3D model.` });
      return;
    }

    setProductForm((current) => {
      const normalizedImages = current.images.map((item) => item.trim()).filter(Boolean);
      const nextImages = normalizedImages.includes(asset.url) ? normalizedImages : [...normalizedImages, asset.url];
      return { ...current, images: nextImages.length ? nextImages : [asset.url] };
    });
    setNotice({ tone: "info", text: `${asset.originalName} added to product images.` });
  };

  const runBulkImport = async () => {
    setImportBusy(true);
    setImportSummary(null);

    try {
      const productsPayload = JSON.parse(importText) as unknown;
      if (!Array.isArray(productsPayload)) {
        throw new Error("Bulk import payload must be a JSON array of products.");
      }

      const summary = await apiFetch<ImportSummary & { message: string }>("/admin/products/import", {
        method: "POST",
        body: JSON.stringify({ products: productsPayload }),
      });

      setImportSummary(summary);
      setNotice({ tone: "success", text: summary.message });
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Bulk import failed" });
    } finally {
      setImportBusy(false);
    }
  };

  if (!isAdminUser && !loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-3 md:p-6">
        <section className="mx-auto max-w-xl rounded-md bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-950">Admin access required</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Use an admin account to create products, manage live custom projects, update delivery status, and control homepage promotions.
          </p>
          {notice ? <div className={`mt-4 rounded-md p-3 text-sm ${noticeStyles[notice.tone]}`}>{notice.text}</div> : null}
          <Link href="/account?redirect=/admin" className="mt-5 inline-block rounded-md bg-gray-900 px-4 py-3 font-semibold text-white">
            Login as admin
          </Link>
        </section>
      </main>
    );
  }

  if (loading || !dashboard) {
    console.debug("[admin/page] render guard", { loading, dashboard: !!dashboard, isAdminUser, user: currentUser?.email });
    return (
      <main className="min-h-screen bg-gray-100 p-3 md:p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-md bg-white shadow-sm" />
          ))}
          <div className="mt-6 rounded-md bg-white p-4 text-sm text-gray-600">
            <p><strong>Loading admin dashboard...</strong></p>
            <p className="mt-2">If this takes too long, please:</p>
            <ol className="mt-2 ml-4 list-decimal space-y-1 text-xs">
              <li>Open Developer Tools (F12)</li>
              <li>Go to Console tab</li>
              <li>Look for [admin/page] messages</li>
              <li>Share any errors you see</li>
            </ol>
            <p className="mt-3 text-xs text-gray-500">Admin status: {isAdminUser ? "✓ Verified" : "✗ Not verified"} | User: {currentUser?.email || "Not logged in"}</p>
          </div>
        </div>
      </main>
    );
  }

  const sectionButtons: { id: AdminSection; label: string; count: number }[] = [
    { id: "overview", label: "Overview", count: dashboardView.metrics.orders },
    { id: "catalog", label: "Catalog", count: products.length },
    { id: "projects", label: "Custom Projects", count: customProjects.length },
    { id: "ads", label: "Ads", count: ads.length },
    { id: "orders", label: "Orders", count: orders.length },
  ];

  return (
    <main className="min-h-screen bg-gray-100 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-md bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-slate-100 shadow-sm">
                <img src="/file.svg" alt="MahabsCrafto" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-950">Admin dashboard</h1>
                <p className="mt-2 max-w-3xl text-sm text-gray-600">
                  Keep the familiar workflow, but manage the live project through cleaner sections for products, custom projects, ads, and order fulfillment.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection("catalog");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Add product
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("projects")}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Open projects
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("orders")}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Open orders
                </button>
                <button
                  type="button"
                  onClick={() => void refreshData()}
                  disabled={refreshing}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {refreshing ? "Refreshing..." : "Refresh live data"}
                </button>
              </div>
              <div className="rounded-md border border-gray-200 p-3">
                <form onSubmit={uploadAssets} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input name="assets" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.glb,.gltf" className="text-xs" />
                  <button disabled={uploadBusy} className="rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                    {uploadBusy ? "Uploading..." : "Upload assets"}
                  </button>
                </form>
                <div
                  onDragEnter={onDragEnter}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`mt-3 rounded-md border border-dashed px-4 py-5 text-center text-sm ${
                    dragActive ? "border-sky-500 bg-sky-50 text-sky-900" : "border-gray-300 bg-gray-50 text-gray-600"
                  }`}
                >
                  Drop product images or GLB/GLTF files here
                </div>
              </div>
            </div>
          </div>

          {notice ? <div className={`mt-4 rounded-md p-3 text-sm ${noticeStyles[notice.tone]}`}>{notice.text}</div> : null}
          {errorMessage ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <strong>Admin load issue:</strong> {errorMessage}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {sectionButtons.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeSection === section.id ? "bg-gray-900 text-white" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {section.label}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeSection === section.id ? "bg-white/15 text-white" : "bg-gray-100 text-gray-600"}`}>
                  {section.count}
                </span>
              </button>
            ))}
          </div>
        </section>

        {activeSection === "overview" ? (
          <>
            <section className="rounded-md bg-white p-5 shadow-sm">
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                {[
                  ["Orders", dashboardView.metrics.orders],
                  ["Users", dashboardView.metrics.users],
                  ["Products", dashboardView.metrics.products],
                  ["Revenue", formatPrice(dashboardView.metrics.revenue)],
                  ["Custom projects", customProjects.length],
                  ["Pending delivery", orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-950">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <ProjectAccuracyChart orders={orders} />
              </div>
            </section>

            {dashboardView.lowStock.length ? (
              <section className="rounded-md bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-950">Stock alerts</h2>
                  <p className="text-sm text-red-600">{dashboardView.lowStock.length} products need attention</p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {dashboardView.lowStock.map((product) => (
                    <button key={product._id} onClick={() => beginEdit(product)} className="rounded-md border border-red-200 bg-red-50 p-4 text-left hover:bg-red-100">
                      <p className="font-semibold text-gray-950">{product.name}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        Stock {product.countInStock} · Alert at {product.stockAlertThreshold ?? 5}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-md bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-950">Recent orders</h2>
                  <button type="button" onClick={() => setActiveSection("orders")} className="text-sm font-semibold text-sky-700 hover:text-sky-900">
                    Open orders
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {dashboardView.recentOrders.length ? (
                    dashboardView.recentOrders.slice(0, 5).map((order) => (
                      <div key={order._id} className="rounded-md border border-gray-200 p-3 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                            <img
                              src={getProductImageUrl(order.orderItems?.[0]?.image || PRODUCT_IMAGE_PLACEHOLDER)}
                              alt={order.orderItems?.[0]?.name || "Order item"}
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = PRODUCT_IMAGE_PLACEHOLDER;
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-950">{order.orderId || order._id}</p>
                            <p className="text-sm text-gray-600">
                              {order.user?.name || "Customer"} · {order.user?.email || "No email"}
                            </p>
                            <p className="text-sm text-gray-600">
                              {order.orderItems?.[0]?.name || "Product"} · Qty {order.orderItems?.[0]?.qty ?? 0}
                            </p>
                            <p className="text-sm text-gray-600">
                              {order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.postalCode}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-950">{formatPrice(order.totalPrice)}</p>
                            <p className="text-xs text-gray-500">{formatAdminDate(order.createdAt)}</p>
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{order.isPaid ? "Paid" : "Unpaid"}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{order.isDelivered ? "Delivered" : "Pending delivery"}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{formatAdminLabel(order.status)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-500">No recent orders yet.</div>
                  )}
                </div>
              </div>

              <div className="rounded-md bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-950">Live custom projects</h2>
                  <button type="button" onClick={() => setActiveSection("projects")} className="text-sm font-semibold text-sky-700 hover:text-sky-900">
                    Open project board
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {customProjects.length ? (
                    customProjects.slice(0, 5).map((project) => (
                      <div key={project._id} className="rounded-md border border-gray-200 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-950">{project.name}</p>
                          <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">{formatAdminLabel(project.stage)}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {project.material} · {project.product?.name || formatAdminLabel(project.projectType)} · Approval {formatAdminLabel(project.customerApprovalStatus)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-500">No custom projects are active right now.</div>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : null}

        {activeSection === "catalog" ? (
          <section className="grid gap-4 lg:grid-cols-[420px_1fr]">
            {categoryGroups.length ? (
              <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-950">Product categories</h2>
                    <p className="mt-1 text-sm text-gray-600">See product counts and top sample items grouped by category.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                    {categoryGroups.length} categories
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {categoryGroups.slice(0, 6).map((group) => (
                    <div key={group.category} className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-gray-900">{group.category}</div>
                        <div className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
                          {group.count} products
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        {group.products.slice(0, 3).map((item) => (
                          <div key={item._id} className="truncate">
                            {item.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <form onSubmit={saveProduct} className="rounded-md bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-950">{editingProductId ? "Edit product" : "Add product"}</h2>
                  <p className="mt-1 text-sm text-gray-600">Use real catalog fields, uploads, and preview before saving.</p>
                </div>
                <button type="button" onClick={resetProductForm} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">
                  Reset
                </button>
              </div>

              {uploadedAssets.length ? (
                <div className="mt-4 rounded-md bg-gray-50 p-3">
                  <h3 className="text-sm font-semibold text-gray-900">Recent uploads</h3>
                  <div className="mt-3 grid gap-2">
                    {uploadedAssets.map((asset) => (
                      <div key={asset.url} className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">{asset.originalName}</p>
                          <p className="truncate text-xs text-gray-500">{asset.url}</p>
                        </div>
                        <button type="button" onClick={() => assignUploadedAsset(asset)} className="rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white">
                          Use
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3">
                <Field label="Product name" value={productForm.name} onChange={(value) => setProductForm((current) => ({ ...current, name: value }))} />
                <Field label="SKU" value={productForm.sku} onChange={(value) => setProductForm((current) => ({ ...current, sku: value.toUpperCase() }))} placeholder="GNSH-001" />

                <div className="grid gap-3 md:grid-cols-2">
                  <Label title="Brand">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${brandLogos[productForm.brand]?.bg ?? "bg-slate-100"} ${brandLogos[productForm.brand]?.fg ?? "text-slate-900"}`}>
                        <span className="text-sm font-bold">{brandLogos[productForm.brand]?.initials || productForm.brand?.slice(0, 2).toUpperCase() || "B"}</span>
                      </div>
                      <input
                        value={productForm.brand}
                        list="brand-options"
                        onChange={(event) => setProductForm((current) => ({ ...current, brand: event.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                        placeholder="Enter or select a brand"
                      />
                    </div>
                  </Label>
                  <Label title="Category">
                    <select
                      value={productForm.category}
                      onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                    >
                      <option value="" disabled>
                        Select a category
                      </option>
                      {categories.map((category) => (
                        <option key={category.slug} value={category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </Label>
                </div>

                <Field label="Subcategory" value={productForm.subcategory} onChange={(value) => setProductForm((current) => ({ ...current, subcategory: value }))} />

                <Label title="Description">
                  <div className="mb-1 flex justify-end">
                    <button type="button" onClick={autoWriteDescription} className="flex items-center gap-1 rounded bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-200">
                      AI Auto-Write
                    </button>
                  </div>
                  <textarea
                    value={productForm.description}
                    onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                    className="min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                    placeholder="Describe the material, craftsmanship, dimensions, and use case."
                  />
                </Label>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="block text-sm font-semibold text-gray-700">Price</span>
                      <button type="button" onClick={applySmartPrice} disabled={smartPriceBusy} className="text-[10px] font-bold uppercase text-sky-600 hover:text-sky-800 disabled:opacity-60">
                        {smartPriceBusy ? "Pricing..." : "Smart Price"}
                      </button>
                    </div>
                    <input
                      type="text"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                      value={productForm.price}
                      onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
                    />
                  </div>
                  <Field label="Original price" value={productForm.originalPrice} onChange={(value) => setProductForm((current) => ({ ...current, originalPrice: value }))} />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Stock" value={productForm.countInStock} onChange={(value) => setProductForm((current) => ({ ...current, countInStock: value }))} />
                  <Field label="Stock alert" value={productForm.stockAlertThreshold} onChange={(value) => setProductForm((current) => ({ ...current, stockAlertThreshold: value }))} />
                  <Label title="Availability">
                    <select
                      value={productForm.availability}
                      onChange={(event) => setProductForm((current) => ({ ...current, availability: event.target.value as Product["availability"] }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                    >
                      <option value="in-stock">In stock</option>
                      <option value="out-of-stock">Out of stock</option>
                      <option value="preorder">Preorder</option>
                    </select>
                  </Label>
                </div>

                <label className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-3 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={productForm.featured}
                    onChange={(event) => setProductForm((current) => ({ ...current, featured: event.target.checked }))}
                    className="h-4 w-4"
                  />
                  Feature this product on discovery surfaces
                </label>

                <Label title="Image URLs">
                  <div className="space-y-2">
                    {productForm.images.map((image, index) => (
                      <div key={`${index}-${image}`} className="flex gap-2">
                        <input
                          value={image}
                          onChange={(event) => setImageAt(index, event.target.value)}
                          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                          placeholder={index === 0 ? "Primary image URL" : "Additional image URL"}
                        />
                        <label className={`flex cursor-pointer items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 ${uploadBusy ? "opacity-60" : "hover:bg-gray-50"}`}>
                          {uploadBusy ? "..." : "Upload"}
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            className="hidden"
                            disabled={uploadBusy}
                            onChange={async (event) => {
                              const files = event.target.files ? Array.from(event.target.files) : [];
                              if (files.length) {
                                const uploaded = await uploadFiles(files);
                                if (uploaded.length > 0) {
                                  setImageAt(index, uploaded[0].url);
                                }
                              }
                              event.target.value = "";
                            }}
                          />
                        </label>
                        <button type="button" onClick={() => removeImageField(index)} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">
                          Remove
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addImageField} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">
                      Add image field
                    </button>
                  </div>
                </Label>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field label="3D model URL" value={productForm.model3dUrl} onChange={(value) => setProductForm((current) => ({ ...current, model3dUrl: value }))} />
                  </div>
                  <label className={`mb-1 flex h-9.5 cursor-pointer items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 ${uploadBusy ? "opacity-60" : "hover:bg-gray-50"}`}>
                    {uploadBusy ? "..." : "Upload"}
                    <input
                      type="file"
                      accept=".glb,.gltf"
                      className="hidden"
                      disabled={uploadBusy}
                      onChange={async (event) => {
                        const files = event.target.files ? Array.from(event.target.files) : [];
                        if (files.length) {
                          const uploaded = await uploadFiles(files);
                          if (uploaded.length > 0) {
                            setProductForm((current) => ({ ...current, model3dUrl: uploaded[0].url }));
                          }
                        }
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>

                <Label title="Specs">
                  <textarea
                    value={productForm.specs}
                    onChange={(event) => setProductForm((current) => ({ ...current, specs: event.target.value }))}
                    className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                    placeholder={`Handwoven bamboo\nDurable lacquer finish\nIdeal for gifting`}
                  />
                </Label>

                <Field label="Tags / Search keywords" value={productForm.tags} onChange={(value) => setProductForm((current) => ({ ...current, tags: value }))} placeholder="ganesh, vinayagar, ganapathi, pillaiyar" />
                <Field
                  label="Additional search keywords"
                  value={productForm.semanticKeywords}
                  onChange={(value) => setProductForm((current) => ({ ...current, semanticKeywords: value }))}
                  placeholder="lord ganesha, ganesh idol, ganesh frame, wall decor"
                />
                <div className="mt-2">
                  <label className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-3 text-sm font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={productForm.isCustomPricing}
                      onChange={(event) => setProductForm((current) => ({ ...current, isCustomPricing: event.target.checked }))}
                      className="h-4 w-4"
                    />
                    Mark as custom-priced (show pricing notice)
                  </label>

                  <label className="mt-3 flex items-center gap-2 rounded-md bg-gray-50 px-3 py-3 text-sm font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={productForm.useApproxPrice}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          useApproxPrice: event.target.checked,
                          price: event.target.checked ? '0' : current.price,
                        }))
                      }
                      className="h-4 w-4"
                    />
                    Use approximate price range (stone products)
                  </label>

                  {productForm.useApproxPrice ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={productForm.approxPriceMin}
                        onChange={(e) => setProductForm((c) => ({ ...c, approxPriceMin: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                        placeholder="Approx min"
                      />
                      <input
                        type="number"
                        value={productForm.approxPriceMax}
                        onChange={(e) => setProductForm((c) => ({ ...c, approxPriceMax: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                        placeholder="Approx max"
                      />
                    </div>
                  ) : null}

                  <Label title="Pricing notice (optional)">
                    <textarea
                      value={productForm.pricingNoticeMessage}
                      onChange={(event) => setProductForm((current) => ({ ...current, pricingNoticeMessage: event.target.value }))}
                      className="min-h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                      placeholder="Optional notice shown on product pages for custom-priced or stone items."
                    />
                  </Label>
                </div>
              </div>

              <div className="mt-5 rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">Preview</p>
                <div className="mt-3 grid grid-cols-[72px_1fr] gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-md bg-white">
                    <img
                      src={productForm.images?.[0] || PRODUCT_IMAGE_PLACEHOLDER}
                      alt={productForm.name || "Preview"}
                      className="h-16 w-16 rounded object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = PRODUCT_IMAGE_PLACEHOLDER;
                      }}
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${brandLogos[productForm.brand]?.bg ?? "bg-slate-100"} ${brandLogos[productForm.brand]?.fg ?? "text-slate-900"}`}>
                        <span className="text-xs font-bold">{brandLogos[productForm.brand]?.initials || productForm.brand?.slice(0, 2).toUpperCase() || "B"}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{productForm.brand || "Brand"}</p>
                    </div>
                    <p className="text-sm text-gray-500">{productForm.category || "Category"}</p>
                    <p className="mt-1 text-sm font-bold text-gray-950">{
                      productForm.useApproxPrice && productForm.approxPriceMin && productForm.approxPriceMax
                        ? `${formatPrice(Number(productForm.approxPriceMin))} - ${formatPrice(Number(productForm.approxPriceMax))} approx`
                        : formatPrice(Number(productForm.price || 0))
                    }</p>
                    <p className="text-xs text-gray-500">
                      Stock {productForm.countInStock || 0} · {productForm.availability}
                      {productForm.featured ? " · featured" : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button disabled={savingProduct} className="rounded-md bg-gray-900 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                  {savingProduct ? "Saving..." : editingProductId ? "Save changes" : "Create product"}
                </button>
                {editingProductId ? (
                  <button type="button" onClick={resetProductForm} className="rounded-md border border-gray-300 px-4 py-3 font-semibold text-gray-700">
                    Cancel edit
                  </button>
                ) : null}
              </div>

              <datalist id="brand-options">
                {brandSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </form>

            <div className="space-y-4">
              <div className="rounded-md bg-white p-5 shadow-sm">
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-950">Bulk import</h2>
                      <p className="mt-1 text-sm text-gray-600">Paste a JSON array to create new products or update existing ones by `_id` or `name + brand`.</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setImportText(bulkImportExample)} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">
                        Use example
                      </button>
                      <button type="button" onClick={runBulkImport} disabled={importBusy} className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        {importBusy ? "Importing..." : "Run import"}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={importText}
                    onChange={(event) => setImportText(event.target.value)}
                    className="mt-4 min-h-64 w-full rounded-md border border-gray-300 bg-white px-3 py-3 font-mono text-xs text-slate-950 outline-none focus:border-sky-500"
                  />
                  {importSummary ? (
                    <div className="mt-4 rounded-md bg-white p-4 text-sm">
                      <div className="flex flex-wrap gap-4">
                        <span className="font-semibold text-emerald-700">Created {importSummary.created}</span>
                        <span className="font-semibold text-cyan-700">Updated {importSummary.updated}</span>
                        <span className="font-semibold text-sky-700">Skipped {importSummary.skipped}</span>
                      </div>
                      {importSummary.errors.length ? (
                        <div className="mt-3 space-y-2 text-xs text-red-700">
                          {importSummary.errors.map((error) => (
                            <p key={`${error.index}-${error.name || "unknown"}`}>
                              Row {error.index + 1}
                              {error.name ? ` (${error.name})` : ""}: {error.reason}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-md bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-950">Products</h2>
                    <p className="mt-1 text-sm text-gray-600">Search, edit, or delete existing catalog entries.</p>
                  </div>
                  <input
                    value={productQuery}
                    onChange={(event) => setProductQuery(event.target.value)}
                    placeholder="Search products, brand, category, tag"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                  />
                </div>

                <div className="mt-4 max-h-215 overflow-auto">
                  {filteredProducts.map((product) => (
                    <div key={product._id} className="grid gap-3 border-b border-gray-200 py-4 md:grid-cols-[72px_1fr_auto] md:items-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-md bg-gray-50">
                        <img
                          src={product.images?.[0] || PRODUCT_IMAGE_PLACEHOLDER}
                          alt={product.name}
                          className="h-16 w-16 rounded object-cover"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = PRODUCT_IMAGE_PLACEHOLDER;
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-950">{product.name}</p>
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${product.countInStock <= (product.stockAlertThreshold ?? 5) ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                            Stock {product.countInStock}
                          </span>
                          {product.featured ? <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">Featured</span> : null}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          {product.brand} · {typeof product.category === "string" ? product.category : product.category?.name}
                          {product.subcategory ? ` · ${product.subcategory}` : ""}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{formatPrice(product.price)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => beginEdit(product)} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">
                          Edit
                        </button>
                        <button onClick={() => deleteProduct(product._id, product.name)} className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                  {!filteredProducts.length ? <div className="rounded-md bg-gray-50 p-6 text-sm text-gray-500">No products match that search.</div> : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeSection === "projects" ? (
          <section className="space-y-4">
            <section className="rounded-md bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-950">Custom projects</h2>
                  <p className="mt-1 text-sm text-gray-600">Live custom-order management connected to the current project workflow and admin stage update route.</p>
                </div>
                <input
                  value={projectQuery}
                  onChange={(event) => setProjectQuery(event.target.value)}
                  placeholder="Search customer, material, product, stage"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {[
                  ["All projects", customProjects.length, "all"],
                  ["Awaiting review", projectBuckets.pending, "pending"],
                  ["Needs approval", projectBuckets.approval, "approval"],
                  ["In progress", projectBuckets.active, "active"],
                ].map(([label, value, filter]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setProjectBoardFilter(filter as ProjectBoardFilter)}
                    className={`rounded-md border p-4 text-left transition ${
                      projectBoardFilter === filter ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <p className={`text-sm ${projectBoardFilter === filter ? "text-white/75" : "text-gray-500"}`}>{label}</p>
                    <p className="mt-2 text-2xl font-bold">{value}</p>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setProjectBoardFilter("shipping")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    projectBoardFilter === "shipping" ? "bg-sky-700 text-white" : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                  }`}
                >
                  Ready to ship {projectBuckets.shipping}
                </button>
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
                  Showing {filteredCustomProjects.length} live project{filteredCustomProjects.length === 1 ? "" : "s"}
                </span>
              </div>
            </section>

            <section className="rounded-md bg-white p-5 shadow-sm">
              <div className="space-y-4">
                {filteredCustomProjects.length ? (
                  filteredCustomProjects.map((project) => {
                    const timeline = Array.isArray(project.timeline) ? project.timeline : [];
                    const latestTimeline = timeline[timeline.length - 1];
                    const customization = project.customization || {};
                    const referenceImages = Array.isArray(project.referenceImages) ? project.referenceImages : [];
                    const sketches = Array.isArray(project.sketches) ? project.sketches : [];

                    return (
                      <div key={project._id} className="rounded-md border border-gray-200 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-gray-950">{project.name}</p>
                              <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">{formatAdminLabel(project.stage)}</span>
                              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${project.customerApprovalStatus === "approved" ? "bg-emerald-100 text-emerald-700" : project.customerApprovalStatus === "needs-revision" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}>
                                Approval {formatAdminLabel(project.customerApprovalStatus)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">
                              {project.material} · {project.product?.name || formatAdminLabel(project.projectType)} · {project.email}
                              {project.phone ? ` · ${project.phone}` : ""}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-gray-700">{project.description}</p>
                            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                              <span>Inquiry: {formatAdminLabel(project.inquiryType)}</span>
                              <span>Status: {formatAdminLabel(project.status)}</span>
                              <span>Quoted: {project.quotedPrice ? formatPrice(project.quotedPrice) : "Pending"}</span>
                              <span>ETA: {project.estimatedTimelineDays ? `${project.estimatedTimelineDays} days` : "Not set"}</span>
                            </div>
                          </div>

                          <div className="flex min-w-55 flex-col gap-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Update stage</label>
                            <select
                              value={project.stage}
                              disabled={updatingProjectId === project._id}
                              onChange={(event) => void updateCustomProjectStage(project._id, event.target.value as CustomProjectStage)}
                              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950"
                            >
                              {customProjectStages.map((stage) => (
                                <option key={stage} value={stage}>
                                  {formatAdminLabel(stage)}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500">
                              {updatingProjectId === project._id ? "Saving project stage..." : "Stage updates go through the existing backend project route."}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-md bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customization</p>
                            <p className="mt-2 text-sm text-gray-700">
                              Size {customization.size || "Not set"} · Finish {customization.finish || "Not set"} · Style {customization.style || "Not set"}
                            </p>
                            {customization.engravingText ? <p className="mt-2 text-sm text-gray-700">Engraving: {customization.engravingText}</p> : null}
                          </div>
                          <div className="rounded-md bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Latest timeline</p>
                            <p className="mt-2 text-sm font-semibold text-gray-900">{latestTimeline?.title || "Project received"}</p>
                            <p className="mt-1 text-sm text-gray-700">{latestTimeline?.message || "Timeline will appear as the project progresses."}</p>
                          </div>
                          <div className="rounded-md bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Assets</p>
                            <p className="mt-2 text-sm text-gray-700">
                              Reference images {referenceImages.length} · Sketches {sketches.length}
                            </p>
                            <p className="mt-1 text-sm text-gray-700">Created {formatAdminDate(project.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-md bg-gray-50 p-6 text-sm text-gray-500">No custom projects match that search.</div>
                )}
              </div>
            </section>
          </section>
        ) : null}

        {activeSection === "ads" ? (
          <section className="rounded-md bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-950">Homepage ads</h2>
                <p className="mt-1 text-sm text-gray-600">Create banner promotions with uploaded creative, link targets, and product associations.</p>
              </div>
              <button type="button" onClick={resetAdForm} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">
                New ad
              </button>
            </div>

            <form onSubmit={saveAd} className="mt-4 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ad title (optional)" value={adForm.title} onChange={(value) => setAdForm((current) => ({ ...current, title: value }))} />
                <Field label="Target URL" required value={adForm.targetUrl} onChange={(value) => setAdForm((current) => ({ ...current, targetUrl: value }))} placeholder="/products?category=Gifts" />
              </div>

              <Label title="Ad description (optional)">
                <textarea
                  value={adForm.description}
                  onChange={(event) => setAdForm((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                  placeholder="Describe the promotion or leave it empty for an image-only banner."
                />
              </Label>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label title="Image URL">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={adForm.imageUrl}
                        onChange={(event) => setAdForm((current) => ({ ...current, imageUrl: event.target.value }))}
                        placeholder="/uploads/ad-banner.jpg"
                        className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                      />
                      <div className="flex items-center gap-2">
                        <label className={`relative inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 ${uploadBusy ? "opacity-60" : "hover:bg-gray-50"}`}>
                          {uploadBusy ? "Uploading..." : "Upload"}
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            disabled={uploadBusy}
                            onChange={async (event) => {
                              const files = event.target.files ? Array.from(event.target.files) : [];
                              if (!files.length) {
                                return;
                              }
                              const uploaded = await uploadFiles(files);
                              if (uploaded.length > 0) {
                                setAdForm((current) => ({ ...current, imageUrl: uploaded[0].url }));
                              }
                              event.target.value = "";
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={clearAdImageUrl}
                          disabled={!adForm.imageUrl}
                          className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    {adForm.imageUrl ? (
                      <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                        <p className="truncate">Selected image: {adForm.imageUrl}</p>
                        <img src={resolveAssetUrl(adForm.imageUrl)} alt="Ad preview" className="mt-2 max-h-28 w-full rounded-md object-cover" />
                      </div>
                    ) : null}
                    <div className="mt-3 grid gap-3">
                      <Label title="Desktop image (optional)">
                        <div className="flex items-center gap-2">
                          <input
                            value={adForm.desktopImage}
                            onChange={(event) => setAdForm((current) => ({ ...current, desktopImage: event.target.value }))}
                            placeholder="/uploads/ad-banner-desktop.jpg"
                            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                          />
                          <label className={`relative inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 ${uploadBusy ? "opacity-60" : "hover:bg-gray-50"}`}>
                            {uploadBusy ? "Uploading..." : "Upload"}
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp"
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                              disabled={uploadBusy}
                              onChange={async (event) => {
                                const files = event.target.files ? Array.from(event.target.files) : [];
                                if (!files.length) return;
                                const uploaded = await uploadFiles(files);
                                if (uploaded.length > 0) setAdForm((current) => ({ ...current, desktopImage: uploaded[0].url }));
                                event.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                        {adForm.desktopImage ? (
                          <img src={resolveAssetUrl(adForm.desktopImage)} alt="Desktop preview" className="mt-2 max-h-28 w-full rounded-md object-cover" />
                        ) : null}
                      </Label>

                      <Label title="Tablet image (optional)">
                        <div className="flex items-center gap-2">
                          <input
                            value={adForm.tabletImage}
                            onChange={(event) => setAdForm((current) => ({ ...current, tabletImage: event.target.value }))}
                            placeholder="/uploads/ad-banner-tablet.jpg"
                            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                          />
                          <label className={`relative inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 ${uploadBusy ? "opacity-60" : "hover:bg-gray-50"}`}>
                            {uploadBusy ? "Uploading..." : "Upload"}
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp"
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                              disabled={uploadBusy}
                              onChange={async (event) => {
                                const files = event.target.files ? Array.from(event.target.files) : [];
                                if (!files.length) return;
                                const uploaded = await uploadFiles(files);
                                if (uploaded.length > 0) setAdForm((current) => ({ ...current, tabletImage: uploaded[0].url }));
                                event.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                        {adForm.tabletImage ? (
                          <img src={resolveAssetUrl(adForm.tabletImage)} alt="Tablet preview" className="mt-2 max-h-28 w-full rounded-md object-cover" />
                        ) : null}
                      </Label>

                      <Label title="Mobile image (optional)">
                        <div className="flex items-center gap-2">
                          <input
                            value={adForm.mobileImage}
                            onChange={(event) => setAdForm((current) => ({ ...current, mobileImage: event.target.value }))}
                            placeholder="/uploads/ad-banner-mobile.jpg"
                            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                          />
                          <label className={`relative inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 ${uploadBusy ? "opacity-60" : "hover:bg-gray-50"}`}>
                            {uploadBusy ? "Uploading..." : "Upload"}
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp"
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                              disabled={uploadBusy}
                              onChange={async (event) => {
                                const files = event.target.files ? Array.from(event.target.files) : [];
                                if (!files.length) return;
                                const uploaded = await uploadFiles(files);
                                if (uploaded.length > 0) setAdForm((current) => ({ ...current, mobileImage: uploaded[0].url }));
                                event.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                        {adForm.mobileImage ? (
                          <img src={resolveAssetUrl(adForm.mobileImage)} alt="Mobile preview" className="mt-2 max-h-28 w-full rounded-md object-cover" />
                        ) : null}
                      </Label>
                    </div>
                  </Label>
                </div>
                <Field label="Product ID (optional)" value={adForm.productId} onChange={(value) => setAdForm((current) => ({ ...current, productId: value }))} placeholder="Optional product ID" />
              </div>

              <div className="grid gap-3">
                <Label title="Slider Placements">
                  <p className="mb-2 text-xs text-gray-500">Select which sliders this ad should appear in</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {placementOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => togglePlacement(option.value)}
                        className={`rounded-lg border px-3 py-3 text-left transition ${
                          adForm.placements.includes(option.value)
                            ? "border-sky-500 bg-sky-50 shadow-[0_0_0_2px_rgba(14,165,233,0.2)]"
                            : "border-gray-200 bg-white hover:border-sky-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-4 w-4 rounded border ${adForm.placements.includes(option.value) ? "border-sky-500 bg-sky-500" : "border-gray-300"}`}>
                            {adForm.placements.includes(option.value) && (
                              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                            <p className="text-xs text-gray-500">{option.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </Label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Label title="Active">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={adForm.active}
                      onChange={(event) => setAdForm((current) => ({ ...current, active: event.target.checked }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-600">Show in slider</span>
                  </div>
                </Label>
                <Field label="Sort order" value={adForm.sortOrder} onChange={(value) => setAdForm((current) => ({ ...current, sortOrder: value }))} />
                <div className="flex items-end">
                  <button type="submit" className="rounded-md bg-gray-900 px-4 py-3 text-sm font-semibold text-white">
                    {editingAdId ? "Save ad" : "Create ad"}
                  </button>
                </div>
              </div>

              {uploadedAssets.length ? (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900">Use uploaded image</p>
                  <div className="mt-3 grid gap-2">
                    {uploadedAssets.map((asset) => (
                      <button
                        key={asset.url}
                        type="button"
                        onClick={() => applyUploadedImageToAd(asset)}
                        className="rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {asset.originalName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </form>

            <div className="mt-6 space-y-3">
              {ads.length ? (
                ads.map((ad) => (
                  <div key={ad._id} className="grid gap-3 rounded-md border border-gray-200 p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="font-semibold text-gray-950">{ad.title || "Untitled ad"}</p>
                      <p className="mt-1 text-sm text-gray-600">{ad.description || "No description provided."}</p>
                      <p className="mt-2 text-xs text-gray-500">Link: {ad.targetUrl}</p>
                      <p className="mt-1 text-xs text-gray-500">Status: {ad.active ? "Active" : "Paused"} · Order: {ad.sortOrder || 0}</p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => beginEditAd(ad)} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">
                        Edit
                      </button>
                      <button onClick={() => deleteAd(ad._id)} className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-500">No homepage ads configured yet. Use the form above to create one.</div>
              )}
            </div>
          </section>
        ) : null}

        {activeSection === "orders" ? (
          <section className="rounded-md bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-950">Orders</h2>
                <p className="mt-1 text-sm text-gray-600">Search live orders and update fulfillment status from the current admin workflow.</p>
              </div>
              <input
                value={orderQuery}
                onChange={(event) => setOrderQuery(event.target.value)}
                placeholder="Search order, customer, product, payment"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
              />
            </div>
            <div className="mt-4 grid gap-3">
              {filteredOrders.map((order) => (
                <button
                  key={order._id}
                  onClick={() => {
                    console.debug("[admin/page] opening order detail", { orderId: order._id, orderNumber: order.orderId });
                    setSelectedOrderDetail(order);
                  }}
                  className="grid gap-3 rounded-md border border-gray-200 p-3 md:grid-cols-[1fr_120px_120px_120px_120px] md:items-center hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-950">{order.orderId || order._id}</p>
                    <p className="text-xs text-gray-500 mt-1">ID: {order._id}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Customer: {order.user?.name || "N/A"} · {order.user?.email || "N/A"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Items: {order.orderItems?.length || 0} · Total: {formatPrice(order.totalPrice)}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-cyan-700">{order.status}</p>
                    <p className={`text-xs ${order.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                      {order.isPaid ? "✓ Paid" : "✗ Unpaid"}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold">{order.paymentMethod || "N/A"}</p>
                    <p className={`text-xs ${order.isDelivered ? 'text-green-600' : 'text-orange-600'}`}>
                      {order.isDelivered ? "✓ Delivered" : "⏳ Pending"}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold">Fraud: {order.fraudRiskScore}/100</p>
                    {order.fraudFlags && order.fraudFlags.length > 0 && (
                      <p className="text-xs text-red-600">Flags: {order.fraudFlags.join(", ")}</p>
                    )}
                  </div>
                  <select 
                    value={order.status} 
                    onClick={(e) => e.stopPropagation()}
                    onChange={(event) => {
                      console.debug("[admin/page] updating order status", { orderId: order._id, newStatus: event.target.value });
                      updateStatus(order._id, event.target.value);
                    }} 
                    className="rounded-md border border-gray-300 px-2 py-2 text-xs text-slate-950"
                  >
                    {["placed", "confirmed", "packed", "shipped", "out-for-delivery", "delivered", "cancelled"].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </button>
              ))}
              {!filteredOrders.length ? <div className="rounded-md bg-gray-50 p-6 text-sm text-gray-500">No orders match that search.</div> : null}
            </div>
          </section>
        ) : null}
      </div>

      {/* Order Detail Modal */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-950">Order Details</h2>
                <p className="text-sm text-gray-500 mt-1">Order #{selectedOrderDetail.orderId || selectedOrderDetail._id}</p>
              </div>
              <button
                onClick={closeOrderDetail}
                className="text-gray-400 hover:text-gray-600 text-2xl font-light"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-8">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-950 mb-4">Order Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Order ID</p>
                    <p className="text-sm font-semibold text-gray-950">{selectedOrderDetail.orderId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                    <p className="text-sm font-semibold text-cyan-700">{selectedOrderDetail.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Payment Status</p>
                    <p className={`text-sm font-semibold ${selectedOrderDetail.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedOrderDetail.isPaid ? "Paid" : "Unpaid"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Delivery Status</p>
                    <p className={`text-sm font-semibold ${selectedOrderDetail.isDelivered ? 'text-green-600' : 'text-orange-600'}`}>
                      {selectedOrderDetail.isDelivered ? "Delivered" : "Pending"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-950 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
                    <p className="text-sm text-gray-950 font-medium">{selectedOrderDetail.user?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                    <p className="text-sm text-gray-950 font-medium">{selectedOrderDetail.user?.email || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-950 mb-4">Order Items ({selectedOrderDetail.orderItems?.length || 0})</h3>
                <div className="space-y-3">
                  {selectedOrderDetail.orderItems?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-950">{item.name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.qty} × {formatPrice(item.price)}</p>
                        {item.useApproxPrice && (
                          <p className="text-xs text-orange-600">Price Range: {formatPrice(item.approxPriceMin || 0)} - {formatPrice(item.approxPriceMax || 0)}</p>
                        )}
                      </div>
                      <p className="font-semibold text-gray-950 whitespace-nowrap">{formatPrice(item.price * item.qty)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="border border-gray-200 pt-6 bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-950 mb-4">Pricing Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal (Items)</span>
                    <span className="font-medium">{formatPrice(selectedOrderDetail.totalPrice - selectedOrderDetail.taxPrice - selectedOrderDetail.shippingPrice + selectedOrderDetail.discountPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">{formatPrice(selectedOrderDetail.taxPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">{formatPrice(selectedOrderDetail.shippingPrice)}</span>
                  </div>
                  {selectedOrderDetail.discountPrice > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount {selectedOrderDetail.couponCode ? `(${selectedOrderDetail.couponCode})` : ""}</span>
                      <span className="font-medium">-{formatPrice(selectedOrderDetail.discountPrice)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-semibold text-gray-950">
                    <span>Total</span>
                    <span>{formatPrice(selectedOrderDetail.totalPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-950 mb-4">Shipping Address</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-950">
                  {selectedOrderDetail.shippingAddress ? (
                    <>
                      <p>{selectedOrderDetail.shippingAddress.address}</p>
                      <p>{selectedOrderDetail.shippingAddress.city}, {selectedOrderDetail.shippingAddress.postalCode}</p>
                      <p>{selectedOrderDetail.shippingAddress.country}</p>
                      {selectedOrderDetail.shippingAddress.phone && <p className="text-gray-600 mt-2">Phone: {selectedOrderDetail.shippingAddress.phone}</p>}
                    </>
                  ) : (
                    <p className="text-gray-500">No shipping address provided</p>
                  )}
                </div>
              </div>

              {/* Billing Address */}
              {selectedOrderDetail.billingAddress && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-semibold text-gray-950 mb-4">Billing Address</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-950">
                    <p>{selectedOrderDetail.billingAddress.address}</p>
                    <p>{selectedOrderDetail.billingAddress.city}, {selectedOrderDetail.billingAddress.postalCode}</p>
                    <p>{selectedOrderDetail.billingAddress.country}</p>
                  </div>
                </div>
              )}

              {/* Payment Information */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-950 mb-4">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Payment Method</p>
                    <p className="text-sm font-medium text-gray-950">{selectedOrderDetail.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Payment Status</p>
                    <p className={`text-sm font-medium ${selectedOrderDetail.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedOrderDetail.isPaid ? "Paid" : "Unpaid"}
                    </p>
                  </div>
                </div>
                {selectedOrderDetail.paymentResult && (
                  <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200 text-xs text-gray-600">
                    <p><strong>Provider:</strong> {selectedOrderDetail.paymentResult.provider}</p>
                    <p><strong>Status:</strong> {selectedOrderDetail.paymentResult.status}</p>
                    {selectedOrderDetail.paymentResult.order_id && <p><strong>Provider Order ID:</strong> {selectedOrderDetail.paymentResult.order_id}</p>}
                  </div>
                )}
              </div>

              {/* Shipping & Tracking */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-950 mb-4">Shipping & Tracking</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Shipping Option</p>
                    <p className="text-sm font-medium text-gray-950">{selectedOrderDetail.shippingOption || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Tracking Number</p>
                    <p className="text-sm font-medium text-gray-950">{selectedOrderDetail.trackingNumber || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Estimated Delivery</p>
                    <p className="text-sm font-medium text-gray-950">{selectedOrderDetail.estimatedDelivery || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Delivery Date</p>
                    <p className="text-sm font-medium text-gray-950">
                      {selectedOrderDetail.deliveredAt ? new Date(selectedOrderDetail.deliveredAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>
                {selectedOrderDetail.trackingEvents && selectedOrderDetail.trackingEvents.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Tracking Events</p>
                    <div className="space-y-2">
                      {selectedOrderDetail.trackingEvents.map((event, idx) => (
                        <div key={idx} className="flex gap-3 text-sm p-2 bg-gray-50 rounded border border-gray-200">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-950">{event.status}</p>
                            <p className="text-gray-600">{event.message}</p>
                            {event.location && <p className="text-gray-500 text-xs">📍 {event.location}</p>}
                          </div>
                          <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fraud Analysis */}
              {(selectedOrderDetail.fraudRiskScore > 0 || (selectedOrderDetail.fraudFlags && selectedOrderDetail.fraudFlags.length > 0)) && (
                <div className="border border-yellow-200 pt-6 bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-950 mb-4">Fraud Analysis</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fraud Risk Score</span>
                      <span className={`font-semibold ${selectedOrderDetail.fraudRiskScore > 50 ? 'text-red-600' : 'text-orange-600'}`}>
                        {selectedOrderDetail.fraudRiskScore}/100
                      </span>
                    </div>
                    {selectedOrderDetail.fraudFlags && selectedOrderDetail.fraudFlags.length > 0 && (
                      <div>
                        <p className="text-gray-600 mb-2">Flags:</p>
                        <div className="space-y-1">
                          {selectedOrderDetail.fraudFlags.map((flag, idx) => (
                            <p key={idx} className="text-red-600 text-xs">• {flag}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Notes */}
              {selectedOrderDetail.orderNotes && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-semibold text-gray-950 mb-4">Order Notes</h3>
                  <p className="text-sm text-gray-950 bg-gray-50 p-4 rounded border border-gray-200">{selectedOrderDetail.orderNotes}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="border-t border-gray-200 pt-6 text-xs text-gray-500">
                <p>Order created: {new Date(selectedOrderDetail.createdAt || "").toLocaleString()}</p>
                {selectedOrderDetail.updatedAt && <p>Last updated: {new Date(selectedOrderDetail.updatedAt).toLocaleString()}</p>}
                <p className="mt-2">MongoDB ID: {selectedOrderDetail._id}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end gap-3">
              <button
                onClick={closeOrderDetail}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-950 font-medium hover:bg-gray-50"
              >
                Close
              </button>
              <select 
                value={selectedOrderDetail.status} 
                onChange={(event) => {
                  console.debug("[admin/page] updating order status from detail", { orderId: selectedOrderDetail._id, newStatus: event.target.value });
                  updateStatus(selectedOrderDetail._id, event.target.value);
                  // Update local state
                  setSelectedOrderDetail({
                    ...selectedOrderDetail,
                    status: event.target.value as any,
                  });
                }} 
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-950"
              >
                {["placed", "confirmed", "packed", "shipped", "out-for-delivery", "delivered", "cancelled"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  list,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  list?: string;
  required?: boolean;
}) {
  return (
    <Label title={label}>
      <input
        value={value}
        list={list}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950 outline-none focus:border-sky-500"
      />
    </Label>
  );
}

function Label({ title, children }: { title: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {title}
      <div className="mt-1">{children}</div>
    </label>
  );
}
