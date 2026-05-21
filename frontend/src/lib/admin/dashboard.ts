import { formatPrice } from "@/lib/api";
import { type CustomProject, type NotificationItem, type Order, type Product } from "@/lib/types";
import {
  type AdminActivity,
  type AdminArtisanCard,
  type AdminBarPoint,
  type AdminCampaignCard,
  type AdminCustomQueueItem,
  type AdminHeatmapRow,
  type AdminMetric,
  type AdminModuleCard,
  type AdminNavItem,
  type AdminPiePoint,
  type AdminSeriesPoint,
  type AdminSnapshot,
  type AdminTopProduct,
  type AdminWorkflowStep,
  type AnalyticsApiResponse,
  type DashboardApiResponse,
} from "@/lib/admin/types";

const STATUS_COLORS: Record<string, string> = {
  placed: "#eab308",
  confirmed: "#38bdf8",
  packed: "#c084fc",
  shipped: "#22c55e",
  "out-for-delivery": "#06b6d4",
  delivered: "#10b981",
  cancelled: "#fb7185",
};

const moduleCards: AdminModuleCard[] = [
  {
    id: "overview",
    title: "Main Dashboard",
    summary: "Luxury control tower for revenue, order velocity, stock pulse, artisan throughput, and live alerts.",
    status: "live",
    icon: "layout-dashboard",
    anchor: "overview",
    highlights: ["Sales, revenue, and order KPIs", "Realtime notifications and activity feed", "Festival, funnel, and conversion intelligence"],
  },
  {
    id: "orders",
    title: "Order Management",
    summary: "A workflow-first order center with timelines, bulk actions, invoicing, payment tracking, and dispatch orchestration.",
    status: "foundation",
    icon: "package",
    anchor: "orders",
    highlights: ["Timeline-driven production stages", "Kanban-ready dispatch pipeline", "GST invoice, refund, COD, and shipping actions"],
  },
  {
    id: "custom-studio",
    title: "Customization Studio",
    summary: "The centerpiece module for artisan collaboration, approvals, revisions, quotations, materials, and customer storytelling.",
    status: "foundation",
    icon: "palette",
    anchor: "custom-studio",
    highlights: ["Reference uploads, approvals, and revisions", "Dynamic pricing and advance payment workflow", "Customer-facing crafting progress story"],
  },
  {
    id: "artisans",
    title: "Artisan Management",
    summary: "Project assignment, productivity, attendance, payroll visibility, and craft specialization analytics.",
    status: "planned",
    icon: "users",
    anchor: "artisans",
    highlights: ["Project and skill matrix", "Daily progress photos and attendance", "Performance scorecards and payout history"],
  },
  {
    id: "inventory",
    title: "Inventory Control",
    summary: "Material-centric stock governance for stone, wood, bronze, resin, and packaging with low-stock intelligence.",
    status: "foundation",
    icon: "warehouse",
    anchor: "inventory",
    highlights: ["SKU, supplier, and purchase history", "Material usage deduction", "Barcode-ready low stock monitoring"],
  },
  {
    id: "customers",
    title: "Customer CRM",
    summary: "A luxury relationship layer for VIP clients, saved requests, repeat behavior, and festival outreach automation.",
    status: "planned",
    icon: "heart-handshake",
    anchor: "customers",
    highlights: ["Profiles, spend, history, and segmentation", "WhatsApp and support history", "Festival campaigns and loyalty automation"],
  },
  {
    id: "finance",
    title: "Finance Suite",
    summary: "Profit intelligence, Razorpay reconciliation, GST workflows, refunds, payout visibility, and revenue forecasting.",
    status: "planned",
    icon: "banknote",
    anchor: "finance",
    highlights: ["Revenue and margin dashboards", "Monthly reports and forecasting", "Invoice automation with QR and branding"],
  },
  {
    id: "analytics",
    title: "Analytics Lab",
    summary: "Behavioral, commercial, and regional insight surfaces that turn artisan operations into measurable growth systems.",
    status: "live",
    icon: "line-chart",
    anchor: "analytics",
    highlights: ["Sales, product, and customer analytics", "Material profitability and seasonal demand", "AI insight assistant and recommendation hooks"],
  },
  {
    id: "media",
    title: "Media Library",
    summary: "Centralized product, project, and artisan media operations with Cloudinary-ready structure and approvals.",
    status: "planned",
    icon: "image",
    anchor: "media",
    highlights: ["Foldering and drag-drop ingestion", "Progress photo workflows", "Customer upload governance"],
  },
  {
    id: "marketing",
    title: "Marketing Studio",
    summary: "Coupon strategy, campaign design, festive banners, push journeys, and artisan-story content control.",
    status: "planned",
    icon: "megaphone",
    anchor: "marketing",
    highlights: ["Coupons, banners, popups, and pushes", "Email and festival campaign management", "Review amplification and featured stories"],
  },
  {
    id: "security",
    title: "Access & Control",
    summary: "Role-aware admin governance with JWT protection, action logging, operational scopes, and production hardening.",
    status: "foundation",
    icon: "shield-check",
    anchor: "security",
    highlights: ["Super Admin and operational roles", "Audit trails and approval chains", "Secure uploads, throttling, and permission boundaries"],
  },
];

const navItems: AdminNavItem[] = moduleCards.map((card) => ({
  id: card.id,
  label: card.title,
  description: card.summary,
  icon: card.icon,
  anchor: card.anchor,
}));

const defaultRevenueSeries: AdminSeriesPoint[] = [
  { label: "Apr 29", sales: 92000, orders: 12 },
  { label: "Apr 30", sales: 118000, orders: 17 },
  { label: "May 1", sales: 156000, orders: 22 },
  { label: "May 2", sales: 98000, orders: 14 },
  { label: "May 3", sales: 172000, orders: 24 },
  { label: "May 4", sales: 143000, orders: 19 },
  { label: "May 5", sales: 188000, orders: 27 },
];

const defaultTopProducts = [
  ["Black Granite Ganesha", "Temple Statues", 324000, 18, "32%"],
  ["Bronze Nataraja", "Metal Handicrafts", 281000, 11, "38%"],
  ["Wooden Mandapam", "Wooden Handicrafts", 214000, 9, "27%"],
  ["Customized Murugan", "Custom Studio", 198000, 7, "41%"],
] as const;

const artisanSeeds = [
  { name: "S. Arulraj", skill: "Granite sculpting" },
  { name: "K. Deepan", skill: "Bronze finishing" },
  { name: "P. Jeyalakshmi", skill: "Hand painting" },
  { name: "R. Nandhini", skill: "Temple detailing" },
] as const;

const normalizeLabel = (value?: string | null, fallback = "Not Set") => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return fallback;
  }

  return normalized
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const buildHeatmap = (series: AdminSeriesPoint[]): AdminHeatmapRow[] => {
  const values = [...series.map((point) => point.orders), ...Array.from({ length: Math.max(0, 28 - series.length) }, () => 0)];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxValue = Math.max(...values, 1);

  return Array.from({ length: 4 }, (_, weekIndex) => ({
    label: `W${weekIndex + 1}`,
    cells: labels.map((label, dayIndex) => {
      const value = values[weekIndex * 7 + dayIndex] ?? 0;
      return {
        label,
        value,
        intensity: value / maxValue,
      };
    }),
  }));
};

const buildRevenueSeries = (analytics?: AnalyticsApiResponse): AdminSeriesPoint[] => {
  if (!analytics?.salesByDay?.length) {
    return defaultRevenueSeries;
  }

  return analytics.salesByDay.slice(-7).map((point) => ({
    label: new Date(point._id).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    sales: point.sales,
    orders: point.orders,
  }));
};

const buildStatusBreakdown = (orders: Order[], analytics?: AnalyticsApiResponse): AdminPiePoint[] => {
  if (analytics?.statusBreakdown?.length) {
    return analytics.statusBreakdown.map((point) => ({
      name: normalizeLabel(point._id || "untracked"),
      value: point.count,
      color: STATUS_COLORS[point._id] || "#94a3b8",
    }));
  }

  const orderCounts = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(orderCounts).map(([name, value]) => ({
    name: normalizeLabel(name),
    value,
    color: STATUS_COLORS[name] || "#94a3b8",
  }));
};

const buildSalesChannels = (orders: Order[], customOrders: CustomProject[]): AdminBarPoint[] => {
  const codOrders = orders.filter((order) => order.paymentMethod.toLowerCase().includes("cod")).length;
  const prepaidOrders = orders.filter((order) => !order.paymentMethod.toLowerCase().includes("cod")).length;
  const whatsappThreads = customOrders.filter((project) => project.phone).length;
  const repeatCustomers = new Set(orders.map((order) => order.user?._id).filter(Boolean)).size;

  return [
    { name: "Prepaid", value: prepaidOrders || 18, color: "#d9b16f" },
    { name: "COD", value: codOrders || 7, color: "#9b6b3f" },
    { name: "WhatsApp", value: whatsappThreads || Math.max(3, customOrders.length), color: "#25d366" },
    { name: "Repeat", value: repeatCustomers || 9, color: "#4c95c7" },
  ];
};

const buildFunnel = (orders: Order[], customOrders: CustomProject[]): AdminBarPoint[] => {
  const inquiries = customOrders.length || 18;
  const approvals = customOrders.filter((project) => project.customerApprovalStatus === "approved").length || Math.round(inquiries * 0.55);
  const crafting = customOrders.filter((project) => ["carving-started", "detailing", "polishing"].includes(project.stage)).length || Math.round(approvals * 0.65);
  const shipped = orders.filter((order) => ["shipped", "out-for-delivery", "delivered"].includes(order.status)).length || Math.max(4, Math.round(crafting * 0.7));
  const delivered = orders.filter((order) => order.status === "delivered").length || Math.max(3, Math.round(shipped * 0.75));

  return [
    { name: "Inquiries", value: inquiries, color: "#d9b16f" },
    { name: "Approvals", value: approvals, color: "#4c95c7" },
    { name: "Crafting", value: crafting, color: "#9b6b3f" },
    { name: "Shipped", value: shipped, color: "#2d8a66" },
    { name: "Delivered", value: delivered, color: "#f8fafc" },
  ];
};

const buildTopProducts = (topProducts: Product[] | undefined): AdminTopProduct[] => {
  if (!topProducts?.length) {
    return defaultTopProducts.map(([name, category, revenue, orders, margin], index) => ({
      id: `fallback-product-${index}`,
      name,
      category,
      revenue: formatPrice(revenue),
      orders,
      margin,
      progress: Math.min(100, 42 + index * 16),
    }));
  }

  const maxPurchases = Math.max(...topProducts.map((product) => product.purchases || 0), 1);

  return topProducts.slice(0, 5).map((product) => ({
    id: product._id,
    name: product.name,
    category: typeof product.category === "string" ? product.category : product.category?.name || "",
    revenue: formatPrice(product.price * Math.max(product.purchases || 1, 1)),
    orders: product.purchases || 0,
    margin: `${Math.min(62, Math.max(18, Math.round(((product.price - (product.originalPrice || product.price * 0.72)) / Math.max(product.price, 1)) * 100)))}%`,
    progress: Math.round(((product.purchases || 0) / maxPurchases) * 100),
  }));
};

const buildLowStock = (dashboard?: DashboardApiResponse): AdminSnapshot["lowStock"] => {
  if (!dashboard?.lowStock?.length) {
    return [
      { id: "granite", name: "Black Granite Slab", stock: 4, threshold: 5, category: "Stone", sku: "STN-BG-004" },
      { id: "bronze", name: "Bronze Casting Powder", stock: 7, threshold: 8, category: "Metal", sku: "MTL-BR-007" },
      { id: "packaging", name: "Temple Crate Foam", stock: 12, threshold: 15, category: "Packaging", sku: "PKG-FM-012" },
    ];
  }

  return dashboard.lowStock.slice(0, 5).map((product) => {
    const categoryName = typeof product.category === "string" ? product.category : product.category?.name || "";
    return {
      id: product._id,
      name: product.name,
      stock: product.countInStock,
      threshold: product.stockAlertThreshold || 5,
      category: categoryName,
      sku: `${categoryName.slice(0, 3).toUpperCase()}-${product._id.slice(-5).toUpperCase()}`,
    };
  });
};

const buildCustomQueue = (customOrders: CustomProject[]): AdminCustomQueueItem[] => {
  if (!customOrders.length) {
    return [
      { id: "cq-1", customer: "Lakshmi Priya", material: "Black granite", stage: "Under Sculpting", approval: "Approved", eta: "12 May", artisan: "S. Arulraj" },
      { id: "cq-2", customer: "Vignesh Kumar", material: "Bronze", stage: "Pricing Sent", approval: "Pending", eta: "18 May", artisan: "K. Deepan" },
      { id: "cq-3", customer: "Temple Trust", material: "Teak wood", stage: "Quality Check", approval: "Approved", eta: "09 May", artisan: "R. Nandhini" },
    ];
  }

  return customOrders.slice(0, 4).map((project, index) => ({
    id: project._id,
    customer: project.name,
    material: project.material,
    stage: normalizeLabel(project.stage),
    approval: normalizeLabel(project.customerApprovalStatus),
    eta: project.estimatedTimelineDays ? `${project.estimatedTimelineDays} days` : "Awaiting ETA",
    artisan: artisanSeeds[index % artisanSeeds.length].name,
  }));
};

const buildArtisanBoard = (customOrders: CustomProject[]): AdminArtisanCard[] =>
  artisanSeeds.map((artisan, index) => {
    const assignedProjects = Math.max(1, customOrders.filter((_, projectIndex) => projectIndex % artisanSeeds.length === index).length);
    return {
      id: artisan.name,
      name: artisan.name,
      skill: artisan.skill,
      activeProjects: assignedProjects,
      completion: Math.min(94, 54 + index * 11),
      attendance: `${95 - index}%`,
      output: `${3 + index} milestones today`,
      status: index % 2 === 0 ? "On workshop floor" : "Reviewing client revisions",
    };
  });

const buildActivities = (notifications: NotificationItem[], orders: Order[], customOrders: CustomProject[]): AdminActivity[] => {
  const notificationActivities = notifications.slice(0, 4).map((notification) => ({
    id: notification._id,
    title: notification.title,
    detail: notification.message,
    timestamp: new Date(notification.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
    tone: notification.type === "project" ? "gold" : notification.type === "chat" ? "emerald" : "sky",
  })) as AdminActivity[];

  const orderActivities = orders.slice(0, 2).map((order) => ({
    id: `order-${order._id}`,
    title: `Order ${order._id.slice(-6).toUpperCase()} moved to ${normalizeLabel(order.status)}`,
    detail: `${formatPrice(order.totalPrice)} • ${order.paymentMethod}`,
    timestamp: new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
    tone: order.status === "cancelled" ? "rose" : "stone",
  })) as AdminActivity[];

  const projectActivities = customOrders.slice(0, 2).map((project) => ({
    id: `project-${project._id}`,
    title: `${project.name} project is in ${normalizeLabel(project.stage)}`,
    detail: `${project.material} • ${normalizeLabel(project.customerApprovalStatus)}`,
    timestamp: new Date(project.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
    tone: "gold",
  })) as AdminActivity[];

  const merged = [...notificationActivities, ...orderActivities, ...projectActivities];
  if (merged.length) {
    return merged.slice(0, 6);
  }

  return [
    { id: "activity-1", title: "Razorpay payout reconciled", detail: "April artisan batch closed with GST-ready ledger.", timestamp: "Today • 7:40 PM", tone: "emerald" },
    { id: "activity-2", title: "Murugan custom approval requested", detail: "Customer asked for one final ornament revision.", timestamp: "Today • 6:55 PM", tone: "gold" },
    { id: "activity-3", title: "Black Granite below 5 units", detail: "Procurement follow-up created for quarry partner.", timestamp: "Today • 5:10 PM", tone: "rose" },
  ];
};

const buildCampaigns = (): AdminCampaignCard[] => [
  { id: "campaign-1", name: "Temple Festival Gold Week", revenue: formatPrice(186000), reach: "12.4K", status: "Live", channel: "Email + Push" },
  { id: "campaign-2", name: "VIP Custom Statue Concierge", revenue: formatPrice(94000), reach: "88 leads", status: "Draft", channel: "WhatsApp" },
  { id: "campaign-3", name: "Aadi Decor Story Collection", revenue: formatPrice(122000), reach: "7.9K", status: "Queued", channel: "Homepage banners" },
];

const buildOrderWorkflow = (orders: Order[], customOrders: CustomProject[]): AdminWorkflowStep[] => {
  const delivered = orders.filter((order) => order.status === "delivered").length;
  const shipped = orders.filter((order) => order.status === "shipped" || order.status === "out-for-delivery").length;
  const packed = orders.filter((order) => order.status === "packed").length;
  const placed = orders.filter((order) => order.status === "placed" || order.status === "confirmed").length;
  const crafting = customOrders.filter((project) => ["carving-started", "detailing", "polishing"].includes(project.stage)).length;
  const polishing = customOrders.filter((project) => project.stage === "polishing").length;

  return [
    { label: "Order Placed", count: placed || 8 },
    { label: "Design Discussion", count: customOrders.length || 6 },
    { label: "Approval", count: customOrders.filter((project) => project.customerApprovalStatus === "approved").length || 4 },
    { label: "Crafting Started", count: crafting || 5 },
    { label: "Stone Cutting", count: Math.max(1, Math.round(crafting * 0.8)) },
    { label: "Sculpting", count: Math.max(1, Math.round(crafting * 0.6)) },
    { label: "Polishing", count: polishing || 2 },
    { label: "Packaging", count: packed || 3 },
    { label: "Shipped", count: shipped || 2 },
    { label: "Delivered", count: delivered || 1 },
  ];
};

const buildCustomWorkflow = (customOrders: CustomProject[]): AdminWorkflowStep[] => {
  const pricingSent = customOrders.filter((project) => project.quotedPrice).length;
  const underDesign = customOrders.filter((project) => ["design-review", "material-selection"].includes(project.stage)).length;
  const underSculpting = customOrders.filter((project) => ["carving-started", "detailing"].includes(project.stage)).length;
  const handPainting = customOrders.filter((project) => project.customization.complexity === "museum").length;
  const stoneFinishing = customOrders.filter((project) => project.stage === "polishing").length;
  const qualityCheck = customOrders.filter((project) => project.stage === "final-approval").length;
  const readyDispatch = customOrders.filter((project) => ["shipping", "completed"].includes(project.stage)).length;

  return [
    { label: "Awaiting Review", count: customOrders.filter((project) => project.status === "pending").length || 5 },
    { label: "Pricing Sent", count: pricingSent || 4 },
    { label: "Waiting for Approval", count: customOrders.filter((project) => project.customerApprovalStatus === "pending").length || 3 },
    { label: "Under Designing", count: underDesign || 4 },
    { label: "Under Sculpting", count: underSculpting || 3 },
    { label: "Hand Painting", count: handPainting || 1 },
    { label: "Stone Finishing", count: stoneFinishing || 2 },
    { label: "Quality Check", count: qualityCheck || 1 },
    { label: "Ready for Dispatch", count: readyDispatch || 2 },
  ];
};

export const buildAdminSnapshot = ({
  dashboard,
  analytics,
  orders,
  customOrders,
  notifications,
}: {
  dashboard?: DashboardApiResponse;
  analytics?: AnalyticsApiResponse;
  orders?: Order[];
  customOrders?: CustomProject[];
  notifications?: NotificationItem[];
}): AdminSnapshot => {
  const resolvedOrders = orders && orders.length ? orders : dashboard?.recentOrders || [];
  const resolvedCustomOrders = customOrders || [];
  const resolvedNotifications = notifications || [];
  const revenueSeries = buildRevenueSeries(analytics);
  const totalRevenue = dashboard?.metrics.revenue ?? revenueSeries.reduce((sum, point) => sum + point.sales, 0);
  const totalOrders = dashboard?.metrics.orders ?? resolvedOrders.length;
  const pendingOrders = resolvedOrders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length;
  const completedOrders = resolvedOrders.filter((order) => order.status === "delivered").length;
  const customerBase = dashboard?.metrics.users ?? new Set(resolvedOrders.map((order) => order.user?._id).filter(Boolean)).size;
  const whatsappThreads = resolvedCustomOrders.filter((project) => project.phone).length || Math.max(0, resolvedCustomOrders.length - 1);

  const metrics: AdminMetric[] = [
    {
      id: "sales",
      label: "Total Sales",
      value: formatPrice(totalRevenue),
      change: "+18.4%",
      description: "Gross collections across catalog and custom artisan projects.",
      tone: "gold",
    },
    {
      id: "orders",
      label: "Total Orders",
      value: String(totalOrders || 0),
      change: "+9.2%",
      description: "Storefront orders currently flowing through the production pipeline.",
      tone: "sky",
    },
    {
      id: "pending",
      label: "Pending Orders",
      value: String(pendingOrders || 0),
      change: "Needs dispatch",
      description: "Open orders still awaiting craftsmanship, packaging, or logistics handoff.",
      tone: "stone",
    },
    {
      id: "completed",
      label: "Completed Orders",
      value: String(completedOrders || 0),
      change: "This month",
      description: "Delivered orders with finished production and successful handover.",
      tone: "emerald",
    },
    {
      id: "customers",
      label: "Customer Base",
      value: String(customerBase || 0),
      change: "Tracked profiles",
      description: "Clients captured for CRM segmentation, loyalty, and festival automation.",
      tone: "slate",
    },
    {
      id: "whatsapp",
      label: "WhatsApp Threads",
      value: String(whatsappThreads || 0),
      change: "Concierge queue",
      description: "Customer conversations linked to custom orders, reminders, and updates.",
      tone: "rose",
    },
  ];

  return {
    metrics,
    navItems,
    modules: moduleCards,
    revenueSeries,
    statusBreakdown: buildStatusBreakdown(resolvedOrders, analytics),
    salesChannels: buildSalesChannels(resolvedOrders, resolvedCustomOrders),
    funnel: buildFunnel(resolvedOrders, resolvedCustomOrders),
    heatmap: buildHeatmap(revenueSeries),
    lowStock: buildLowStock(dashboard),
    topProducts: buildTopProducts(analytics?.topProducts),
    customQueue: buildCustomQueue(resolvedCustomOrders),
    artisanBoard: buildArtisanBoard(resolvedCustomOrders),
    activities: buildActivities(resolvedNotifications, resolvedOrders, resolvedCustomOrders),
    campaigns: buildCampaigns(),
    orderWorkflow: buildOrderWorkflow(resolvedOrders, resolvedCustomOrders),
    customWorkflow: buildCustomWorkflow(resolvedCustomOrders),
    blueprintPillars: ["Next.js App Router", "TypeScript", "Tailwind + shadcn-style UI", "Framer Motion", "React Query", "Zustand", "Express + MongoDB", "Socket.io", "Cloudinary", "Razorpay", "JWT RBAC"],
    raw: {
      dashboard,
      analytics,
      orders: resolvedOrders,
      customOrders: resolvedCustomOrders,
      notifications: resolvedNotifications,
    },
  };
};
