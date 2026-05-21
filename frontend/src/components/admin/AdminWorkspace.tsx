"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Banknote,
  BellRing,
  Command,
  HeartHandshake,
  Image as ImageIcon,
  Layers3,
  LayoutDashboard,
  LineChart,
  Menu,
  Megaphone,
  MessageCircleMore,
  MoonStar,
  Package,
  Palette,
  PanelLeftClose,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  SunMedium,
  TriangleAlert,
  Users,
  Warehouse,
  Workflow,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { getSocketUrl } from "@/lib/api";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { ChannelBarChart, FunnelBarChart, HeatmapGrid, RevenueAreaChart, StatusPieChart } from "@/components/admin/AdminCharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { type AdminModuleCard, type AdminNavItem } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { useAdminUiStore } from "@/stores/admin-ui-store";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  package: Package,
  palette: Palette,
  users: Users,
  warehouse: Warehouse,
  "heart-handshake": HeartHandshake,
  banknote: Banknote,
  "line-chart": LineChart,
  image: ImageIcon,
  megaphone: Megaphone,
  "shield-check": ShieldCheck,
} as const;

const toneMap: Record<AdminModuleCard["status"], "emerald" | "sky" | "stone"> = {
  live: "emerald",
  foundation: "sky",
  planned: "stone",
};

function scrollToAnchor(anchor: string) {
  document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function AdminWorkspace() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { data, error, isError, isLoading, isFetching, refetch, user, isAuthorized } = useAdminDashboard();
  const {
    sidebarCollapsed,
    mobileNavOpen,
    commandOpen,
    globalSearch,
    setGlobalSearch,
    toggleSidebar,
    setMobileNavOpen,
    setCommandOpen,
  } = useAdminUiStore();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }

      if (event.key === "/" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        setCommandOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandOpen]);

  useEffect(() => {
    if (!isError || !error) {
      return;
    }

    toast.error(error instanceof Error ? error.message : "Could not load the admin dashboard");
  }, [error, isError]);

  const hasLiveAdminData = Boolean(data?.raw.dashboard || data?.raw.orders.length || data?.raw.customOrders.length || data?.raw.notifications.length);

  useEffect(() => {
    if (!user?._id || !isAuthorized || !hasLiveAdminData) {
      return;
    }

    const socket = io(getSocketUrl(), { transports: ["websocket"] });

    socket.on("connect", () => {
      socket.emit("join:user", user._id);
    });

    socket.on("notification", (payload: { title?: string; message?: string }) => {
      toast.success(payload.title || "New admin notification", { description: payload.message });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    });

    socket.on("order:update", () => {
      toast.info("Live order update received");
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [hasLiveAdminData, isAuthorized, queryClient, user?._id]);

  const filteredSnapshot = useMemo(() => {
    if (!data) {
      return null;
    }

    const query = globalSearch.trim().toLowerCase();
    if (!query) {
      return data;
    }

    const moduleMatches = (module: AdminModuleCard) =>
      [module.title, module.summary, ...module.highlights].some((item) => item.toLowerCase().includes(query));

    const navMatches = (item: AdminNavItem) => [item.label, item.description].some((text) => text.toLowerCase().includes(query));

    return {
      ...data,
      modules: data.modules.filter(moduleMatches),
      navItems: data.navItems.filter(navMatches),
      lowStock: data.lowStock.filter((item) => [item.name, item.category, item.sku].some((text) => text.toLowerCase().includes(query))),
      topProducts: data.topProducts.filter((item) => [item.name, item.category].some((text) => text.toLowerCase().includes(query))),
      customQueue: data.customQueue.filter((item) => [item.customer, item.material, item.stage, item.artisan].some((text) => text.toLowerCase().includes(query))),
      artisanBoard: data.artisanBoard.filter((item) => [item.name, item.skill, item.status].some((text) => text.toLowerCase().includes(query))),
      activities: data.activities.filter((item) => [item.title, item.detail].some((text) => text.toLowerCase().includes(query))),
      campaigns: data.campaigns.filter((item) => [item.name, item.channel, item.status].some((text) => text.toLowerCase().includes(query))),
    };
  }, [data, globalSearch]);

  const activeSnapshot = filteredSnapshot || data;

  if (!isAuthorized) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center px-4 py-10 text-[var(--admin-foreground)]">
        <Card className="max-w-2xl p-8">
          <Badge tone="gold">Protected Atelier Console</Badge>
          <CardHeader className="mt-4 px-0">
            <CardTitle className="font-[var(--font-display)] text-4xl">Admin access is required</CardTitle>
            <CardDescription className="max-w-xl text-base">
              This premium operations layer is reserved for MahabsCrafto staff roles. Sign in with an admin account to open live order workflows, artisan coordination, finance, CRM, and custom project controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 px-0 pt-3 sm:grid-cols-3">
            {["Realtime order orchestration", "Customization studio approvals", "Finance, CRM, and role-based governance"].map((item) => (
              <div key={item} className="rounded-3xl border border-white/8 bg-white/6 p-4 text-sm text-[var(--admin-muted)]">
                {item}
              </div>
            ))}
            <div className="sm:col-span-3">
              <Link href="/account?redirect=/admin" className="inline-flex rounded-full bg-[linear-gradient(135deg,rgba(233,190,119,0.95),rgba(156,101,60,0.92))] px-5 py-3 text-sm font-semibold text-stone-950 shadow-[0_22px_42px_rgba(157,108,64,0.28)]">
                Sign in to admin
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !activeSnapshot) {
    return <AdminLoadingState />;
  }

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const liveAlerts = activeSnapshot.lowStock.length + activeSnapshot.activities.length;
  const customOpen = activeSnapshot.customQueue.length;

  return (
    <div className="admin-shell min-h-screen text-[var(--admin-foreground)]">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="admin-mesh absolute inset-0" />
      </div>

      <AdminCommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        navItems={activeSnapshot.navItems}
        theme={theme}
        onNavigate={scrollToAnchor}
        onRefresh={() => {
          void refetch();
          toast.success("Refreshing atelier data");
        }}
        onToggleSidebar={toggleSidebar}
        onToggleTheme={toggleTheme}
      />

      <div className="relative mx-auto flex min-h-screen max-w-[1700px] gap-4 px-3 py-4 sm:px-5 lg:px-6">
        <DesktopSidebar navItems={activeSnapshot.navItems} collapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />

        <AnimatePresence>
          {mobileNavOpen ? (
            <motion.div className="fixed inset-0 z-50 bg-black/55 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.aside
                className="admin-glass absolute left-0 top-0 h-full w-[82vw] max-w-sm border-r p-4"
                initial={{ x: -48, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -48, opacity: 0 }}
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-[var(--admin-gold)]">MahabsCrafto ERP</p>
                    <h2 className="mt-2 font-[var(--font-display)] text-2xl">Studio navigation</h2>
                  </div>
                  <button onClick={() => setMobileNavOpen(false)} className="rounded-full border border-white/10 p-2 text-[var(--admin-muted)]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <SidebarNav navItems={activeSnapshot.navItems} collapsed={false} onNavigate={(anchor) => { scrollToAnchor(anchor); setMobileNavOpen(false); }} />
              </motion.aside>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="relative z-10 flex-1">
          <header className="admin-glass sticky top-4 z-30 mb-5 rounded-[28px] border px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileNavOpen(true)} className="rounded-full border border-white/10 p-2 text-[var(--admin-muted)] md:hidden">
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--admin-gold)]">Luxury artisan operations</p>
                  <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl">Atelier Control Board</h1>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-[280px]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-muted)]" />
                  <Input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Search everywhere..." className="pl-11" />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="icon" onClick={() => setCommandOpen(true)} aria-label="Open command palette">
                    <Command className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="icon" onClick={() => void refetch()} aria-label="Refresh data">
                    <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                  </Button>
                  <Button variant="secondary" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
                    {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            {!hasLiveAdminData ? (
              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Live admin data is unavailable right now, so this page is showing the resilient fallback dashboard. Start the backend to load realtime metrics and notifications.
              </div>
            ) : null}
          </header>

          <main className="space-y-6 pb-28">
            <section id="overview" className="grid gap-4 xl:grid-cols-[1.5fr_0.95fr]">
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                <Card className="overflow-hidden">
                  <CardContent className="relative px-0 py-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,177,111,0.22),transparent_32%),radial-gradient(circle_at_78%_18%,rgba(76,149,199,0.18),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />
                    <div className="relative grid gap-8 p-6 lg:grid-cols-[1.2fr_0.8fr]">
                      <div>
                        <Badge tone="gold">Crafted for luxury artisan brands</Badge>
                        <h2 className="mt-4 max-w-3xl font-[var(--font-display)] text-4xl leading-tight sm:text-5xl">
                          MahabsCrafto Atelier OS blends Shopify speed, Etsy storytelling, ERP depth, and CRM precision.
                        </h2>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--admin-muted)] sm:text-base">
                          Built on your existing Next.js and Express stack, this foundation gives you a premium overview dashboard today and maps every requested module into a production-ready operating system for statues, décor, and bespoke artisan work.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                          <Button onClick={() => setCommandOpen(true)}>
                            <Command className="h-4 w-4" />
                            Open command palette
                          </Button>
                          <Button variant="outline" onClick={() => scrollToAnchor("custom-studio")}>
                            <Palette className="h-4 w-4" />
                            Jump to customization studio
                          </Button>
                        </div>
                        <div className="mt-6 flex flex-wrap gap-2">
                          {activeSnapshot.blueprintPillars.map((pillar) => (
                            <span key={pillar} className="rounded-full border border-white/8 bg-white/6 px-3 py-1 text-xs text-[var(--admin-muted)]">
                              {pillar}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <InfoStat icon={BellRing} label="Live alerts" value={String(liveAlerts)} subcopy="Stock, project, and operations notifications" />
                        <InfoStat icon={Palette} label="Open custom requests" value={String(customOpen)} subcopy="Projects awaiting approval, design, or dispatch" />
                        <InfoStat icon={Sparkles} label="Festival momentum" value="3.8x" subcopy="Projected uplift for temple and gifting campaigns" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}>
                <Card className="h-full">
                  <CardHeader>
                    <Badge tone="sky">Customer experience</Badge>
                    <CardTitle className="font-[var(--font-display)] text-3xl">Crafting Progress Story</CardTitle>
                    <CardDescription>Give buyers an emotional, visual timeline for premium commissions and temple pieces.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      "Your sculpture is currently being handcrafted.",
                      "Latest artisan note: Ornament detailing is complete and polishing begins next.",
                      "Next milestone: QC photos and dispatch confirmation to WhatsApp.",
                    ].map((line, index) => (
                      <div key={line} className="rounded-3xl border border-white/8 bg-white/6 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-[var(--admin-gold)]">Stage {index + 1}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--admin-foreground)]">{line}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeSnapshot.metrics.map((metric, index) => (
                <motion.div key={metric.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.04 }}>
                  <Card className="h-full">
                    <CardHeader className="gap-3">
                      <div className="flex items-center justify-between">
                        <Badge tone={metric.tone}>{metric.label}</Badge>
                        <ArrowUpRight className="h-4 w-4 text-[var(--admin-muted)]" />
                      </div>
                      <CardTitle className="text-3xl">{metric.value}</CardTitle>
                      <CardDescription>{metric.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2 text-sm font-medium text-[var(--admin-gold)]">{metric.change}</CardContent>
                  </Card>
                </motion.div>
              ))}
            </section>

            <section id="analytics" className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
              <Card>
                <CardHeader>
                  <Badge tone="gold">Revenue graph</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Sales velocity and monthly performance</CardTitle>
                  <CardDescription>Realtime sales collections across storefront and customization-driven artisan work.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RevenueAreaChart data={activeSnapshot.revenueSeries} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Badge tone="stone">Order mix</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Status breakdown</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <StatusPieChart data={activeSnapshot.statusBreakdown} />
                  <div className="space-y-3">
                    {activeSnapshot.statusBreakdown.map((item) => (
                      <div key={item.name} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-3 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <Badge tone="sky">Conversion analytics</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Acquisition funnel</CardTitle>
                  <CardDescription>From customization inquiry to delivered heirloom.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FunnelBarChart data={activeSnapshot.funnel} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Badge tone="emerald">Channel mix</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Sales channel pulse</CardTitle>
                  <CardDescription>Balance prepaid, COD, WhatsApp-assisted, and repeat customer orders.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChannelBarChart data={activeSnapshot.salesChannels} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Badge tone="gold">Heatmap</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Order heatmap</CardTitle>
                  <CardDescription>Recent order concentration across a four-week operating rhythm.</CardDescription>
                </CardHeader>
                <CardContent>
                  <HeatmapGrid rows={activeSnapshot.heatmap} />
                </CardContent>
              </Card>
            </section>

            <section id="orders" className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <Card>
                <CardHeader>
                  <Badge tone="sky">Order workflow</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">From order to temple-ready delivery</CardTitle>
                  <CardDescription>The artisan-aware workflow you requested, layered onto the current backend order and custom project data.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {activeSnapshot.orderWorkflow.map((step, index) => (
                      <motion.div
                        key={step.label}
                        className="rounded-3xl border border-white/8 bg-white/6 p-4"
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <p className="text-xs uppercase tracking-[0.22em] text-[var(--admin-gold)]">Step {index + 1}</p>
                        <p className="mt-3 text-base font-semibold">{step.label}</p>
                        <p className="mt-2 text-sm text-[var(--admin-muted)]">{step.count} active items</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card id="inventory">
                <CardHeader>
                  <Badge tone="rose">Low stock alerts</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Material watchlist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeSnapshot.lowStock.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-white/8 bg-white/6 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--admin-muted)]">
                            {item.category} • {item.sku}
                          </p>
                        </div>
                        <TriangleAlert className="h-5 w-5 text-rose-300" />
                      </div>
                      <p className="mt-3 text-sm text-[var(--admin-muted)]">
                        Stock {item.stock} / threshold {item.threshold}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section id="custom-studio" className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <Card>
                <CardHeader>
                  <Badge tone="gold">Customization management</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Custom project studio</CardTitle>
                  <CardDescription>Manage reference uploads, approvals, revisions, quotations, materials, and artisan updates in one premium workspace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeSnapshot.customQueue.map((item) => (
                    <div key={item.id} className="grid gap-3 rounded-3xl border border-white/8 bg-white/6 p-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{item.customer}</p>
                          <Badge tone="stone">{item.material}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-[var(--admin-muted)]">
                          {item.stage} • {item.approval}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--admin-gold)]">
                          Artisan {item.artisan} • ETA {item.eta}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Open board
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Badge tone="sky">Approval pipeline</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Bespoke workflow lanes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeSnapshot.customWorkflow.map((step) => (
                    <div key={step.label} className="flex items-center justify-between rounded-3xl border border-white/8 bg-white/6 px-4 py-3">
                      <span className="text-sm text-[var(--admin-foreground)]">{step.label}</span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[var(--admin-gold)]">{step.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section id="artisans" className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {activeSnapshot.artisanBoard.map((artisan) => (
                <Card key={artisan.id}>
                  <CardHeader>
                    <Badge tone="stone">{artisan.skill}</Badge>
                    <CardTitle>{artisan.name}</CardTitle>
                    <CardDescription>{artisan.status}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ProgressMetric label="Completion" value={`${artisan.completion}%`} width={artisan.completion} />
                    <ProgressMetric label="Attendance" value={artisan.attendance} width={Number(artisan.attendance.replace("%", ""))} />
                    <div className="rounded-3xl border border-white/8 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--admin-muted)]">Active projects</p>
                      <p className="mt-2 text-2xl font-semibold">{artisan.activeProjects}</p>
                      <p className="mt-2 text-sm text-[var(--admin-muted)]">{artisan.output}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section id="customers" className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <Card>
                <CardHeader>
                  <Badge tone="emerald">WhatsApp concierge</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Communication history</CardTitle>
                  <CardDescription>Templates, reminders, project updates, and support context ready for the WhatsApp Cloud API layer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    "Hello {{customer_name}}, your handcrafted Murugan statue is currently under polishing. Expected dispatch date: {{date}}.",
                    "Your custom temple frame pricing is ready. Tap to review materials, size, and engraving notes.",
                    "We’ve uploaded fresh crafting photos for approval before final finishing.",
                  ].map((template) => (
                    <div key={template} className="rounded-3xl border border-white/8 bg-white/6 p-4 text-sm leading-6 text-[var(--admin-foreground)]">
                      {template}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm">
                      <MessageCircleMore className="h-4 w-4" />
                      Quick replies
                    </Button>
                    <Button variant="outline" size="sm">
                      <Sparkles className="h-4 w-4" />
                      AI reply suggestions
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Badge tone="stone">Recent activities</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Live pulse</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeSnapshot.activities.map((activity) => (
                    <div key={activity.id} className="rounded-3xl border border-white/8 bg-white/6 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{activity.title}</p>
                          <p className="mt-2 text-sm leading-6 text-[var(--admin-muted)]">{activity.detail}</p>
                        </div>
                        <Badge tone={activity.tone}>{activity.timestamp}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section id="finance" className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <Card>
                <CardHeader>
                  <Badge tone="gold">Top products</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Profit-leading products</CardTitle>
                  <CardDescription>Blend bestseller visibility with artisan margin intelligence.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeSnapshot.topProducts.map((product) => (
                    <div key={product.id} className="rounded-3xl border border-white/8 bg-white/6 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--admin-muted)]">{product.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[var(--admin-gold)]">{product.revenue}</p>
                          <p className="text-xs text-[var(--admin-muted)]">
                            {product.orders} orders • {product.margin} margin
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white/8">
                        <div className="h-2 rounded-full bg-[linear-gradient(90deg,#d9b16f,#f8fafc)]" style={{ width: `${product.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card id="marketing">
                <CardHeader>
                  <Badge tone="rose">Marketing studio</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Campaign dashboard</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeSnapshot.campaigns.map((campaign) => (
                    <div key={campaign.id} className="rounded-3xl border border-white/8 bg-white/6 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{campaign.name}</p>
                          <p className="mt-2 text-sm text-[var(--admin-muted)]">{campaign.channel}</p>
                        </div>
                        <Badge tone={campaign.status === "Live" ? "emerald" : campaign.status === "Draft" ? "stone" : "sky"}>{campaign.status}</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                          <p className="text-[var(--admin-muted)]">Revenue</p>
                          <p className="mt-2 font-semibold">{campaign.revenue}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                          <p className="text-[var(--admin-muted)]">Reach</p>
                          <p className="mt-2 font-semibold">{campaign.reach}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section id="media" className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <Badge tone="sky">Media library</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Asset operating model</CardTitle>
                  <CardDescription>Product images, artisan progress photos, customer references, and videos organized for Cloudinary-backed growth.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                  {["Product images", "Customer uploads", "Artisan work stories", "CAD / 3D files", "Dispatch documents", "Campaign banners"].map((item) => (
                    <div key={item} className="rounded-3xl border border-white/8 bg-white/6 p-4 text-sm text-[var(--admin-muted)]">
                      {item}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card id="security">
                <CardHeader>
                  <Badge tone="stone">RBAC + security</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Access matrix</CardTitle>
                  <CardDescription>Role-gated access for super admins, operations managers, artisan leads, support, and marketing.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    "Super Admin • full platform, finance, role, and audit control",
                    "Order Manager • orders, invoices, shipping, refunds, and COD reconciliation",
                    "Artisan Manager • project assignment, progress photos, productivity, and attendance",
                    "Customer Support • CRM, WhatsApp threads, approvals, and review moderation",
                    "Marketing Manager • campaigns, coupons, banners, and seasonal analytics",
                  ].map((role) => (
                    <div key={role} className="rounded-3xl border border-white/8 bg-white/6 p-4 text-sm text-[var(--admin-foreground)]">
                      {role}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4" id="blueprint">
              <Card>
                <CardHeader>
                  <Badge tone="gold">Architecture deck</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">Module foundation map</CardTitle>
                  <CardDescription>Each card maps directly to the architecture document added in this repo, including schemas, routes, state, and scaling guidance.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {activeSnapshot.modules.map((module) => {
                    const Icon = iconMap[module.icon as keyof typeof iconMap] || Layers3;
                    return (
                      <motion.div key={module.id} whileHover={{ y: -6 }} transition={{ duration: 0.2 }} className="rounded-[28px] border border-white/8 bg-white/6 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="rounded-2xl bg-white/8 p-3 text-[var(--admin-gold)]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <Badge tone={toneMap[module.status]}>{module.status}</Badge>
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">{module.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--admin-muted)]">{module.summary}</p>
                        <div className="mt-4 space-y-2">
                          {module.highlights.map((highlight) => (
                            <div key={highlight} className="rounded-2xl bg-black/10 px-3 py-2 text-sm text-[var(--admin-foreground)]">
                              {highlight}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          </main>
        </div>
      </div>

      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3 md:hidden">
        <Button size="icon" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>
        <Button size="icon" variant="secondary" onClick={() => setCommandOpen(true)} aria-label="Open command palette">
          <Command className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function DesktopSidebar({
  navItems,
  collapsed,
  onToggleSidebar,
}: {
  navItems: AdminNavItem[];
  collapsed: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <aside className={cn("sticky top-4 hidden h-[calc(100vh-32px)] shrink-0 flex-col md:flex", collapsed ? "w-[90px]" : "w-[300px]")}>
      <div className="admin-glass flex h-full flex-col rounded-[32px] border p-4">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className={cn("overflow-hidden transition-all", collapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--admin-gold)]">MahabsCrafto ERP</p>
            <h2 className="mt-2 font-[var(--font-display)] text-2xl">Admin atelier</h2>
          </div>
          <button onClick={onToggleSidebar} className="rounded-full border border-white/10 p-2 text-[var(--admin-muted)]">
            <PanelLeftClose className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        <SidebarNav navItems={navItems} collapsed={collapsed} onNavigate={scrollToAnchor} />

        <div className="mt-auto rounded-[28px] border border-white/8 bg-white/6 p-4">
          <p className={cn("text-xs uppercase tracking-[0.22em] text-[var(--admin-muted)]", collapsed && "text-center")}>Realtime</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)]" />
            {!collapsed ? <p className="text-sm text-[var(--admin-foreground)]">Socket.io connected workflow foundation</p> : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarNav({
  navItems,
  collapsed,
  onNavigate,
}: {
  navItems: AdminNavItem[];
  collapsed: boolean;
  onNavigate: (anchor: string) => void;
}) {
  return (
    <nav className="space-y-2 overflow-y-auto pr-1 admin-scrollbar">
      {navItems.map((item) => {
        const Icon = iconMap[item.icon as keyof typeof iconMap] || Layers3;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.anchor)}
            className="group flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-white/8 hover:bg-white/6"
          >
            <div className="rounded-2xl bg-white/6 p-2.5 text-[var(--admin-gold)]">
              <Icon className="h-4 w-4" />
            </div>
            {!collapsed ? (
              <div>
                <p className="text-sm font-semibold text-[var(--admin-foreground)]">{item.label}</p>
                <p className="text-xs text-[var(--admin-muted)]">{item.description}</p>
              </div>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

function InfoStat({
  icon: Icon,
  label,
  value,
  subcopy,
}: {
  icon: typeof Workflow;
  label: string;
  value: string;
  subcopy: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-black/10 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--admin-muted)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold">{value}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--admin-muted)]">{subcopy}</p>
        </div>
        <div className="rounded-2xl bg-white/8 p-3 text-[var(--admin-gold)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ProgressMetric({ label, value, width }: { label: string; value: string; width: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-[var(--admin-muted)]">{label}</span>
        <span className="font-semibold text-[var(--admin-foreground)]">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/8">
        <div className="h-2 rounded-full bg-[linear-gradient(90deg,#d9b16f,#4c95c7)]" style={{ width: `${Math.max(12, width)}%` }} />
      </div>
    </div>
  );
}

function AdminLoadingState() {
  return (
    <div className="admin-shell min-h-screen px-4 py-6 text-[var(--admin-foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <Skeleton className="h-28 rounded-[28px]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-[28px]" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
          <Skeleton className="h-[360px] rounded-[28px]" />
          <Skeleton className="h-[360px] rounded-[28px]" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-[300px] rounded-[28px]" />
          <Skeleton className="h-[300px] rounded-[28px]" />
          <Skeleton className="h-[300px] rounded-[28px]" />
        </div>
      </div>
    </div>
  );
}
