import { type CustomProject, type NotificationItem, type Order, type Product } from "@/lib/types";

export type DashboardApiResponse = {
  metrics: {
    orders: number;
    users: number;
    products: number;
    revenue: number;
  };
  lowStock: Product[];
  recentOrders: Order[];
};

export type AnalyticsApiResponse = {
  salesByDay: {
    _id: string;
    sales: number;
    orders: number;
  }[];
  topProducts: Product[];
  statusBreakdown: {
    _id: string;
    count: number;
  }[];
};

export type AdminMetric = {
  id: string;
  label: string;
  value: string;
  change: string;
  description: string;
  tone: "gold" | "stone" | "sky" | "emerald" | "rose" | "slate";
};

export type AdminNavItem = {
  id: string;
  label: string;
  description: string;
  icon: string;
  anchor: string;
};

export type AdminModuleCard = {
  id: string;
  title: string;
  summary: string;
  status: "live" | "foundation" | "planned";
  icon: string;
  anchor: string;
  highlights: string[];
};

export type AdminSeriesPoint = {
  label: string;
  sales: number;
  orders: number;
};

export type AdminPiePoint = {
  name: string;
  value: number;
  color: string;
};

export type AdminBarPoint = {
  name: string;
  value: number;
  color: string;
};

export type AdminHeatmapCell = {
  label: string;
  value: number;
  intensity: number;
};

export type AdminHeatmapRow = {
  label: string;
  cells: AdminHeatmapCell[];
};

export type AdminLowStockItem = {
  id: string;
  name: string;
  stock: number;
  threshold: number;
  category: string;
  sku: string;
};

export type AdminTopProduct = {
  id: string;
  name: string;
  category: string;
  revenue: string;
  orders: number;
  margin: string;
  progress: number;
};

export type AdminCustomQueueItem = {
  id: string;
  customer: string;
  material: string;
  stage: string;
  approval: string;
  eta: string;
  artisan: string;
};

export type AdminArtisanCard = {
  id: string;
  name: string;
  skill: string;
  activeProjects: number;
  completion: number;
  attendance: string;
  output: string;
  status: string;
};

export type AdminActivity = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  tone: "gold" | "stone" | "sky" | "emerald" | "rose" | "slate";
};

export type AdminCampaignCard = {
  id: string;
  name: string;
  revenue: string;
  reach: string;
  status: string;
  channel: string;
};

export type AdminWorkflowStep = {
  label: string;
  count: number;
};

export type AdminSnapshot = {
  metrics: AdminMetric[];
  navItems: AdminNavItem[];
  modules: AdminModuleCard[];
  revenueSeries: AdminSeriesPoint[];
  statusBreakdown: AdminPiePoint[];
  salesChannels: AdminBarPoint[];
  funnel: AdminBarPoint[];
  heatmap: AdminHeatmapRow[];
  lowStock: AdminLowStockItem[];
  topProducts: AdminTopProduct[];
  customQueue: AdminCustomQueueItem[];
  artisanBoard: AdminArtisanCard[];
  activities: AdminActivity[];
  campaigns: AdminCampaignCard[];
  orderWorkflow: AdminWorkflowStep[];
  customWorkflow: AdminWorkflowStep[];
  blueprintPillars: string[];
  raw: {
    dashboard?: DashboardApiResponse;
    analytics?: AnalyticsApiResponse;
    orders: Order[];
    customOrders: CustomProject[];
    notifications: NotificationItem[];
  };
};
