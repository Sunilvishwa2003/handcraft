"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AddressesSection,
  CustomProjectsSection,
  NotificationsSection,
  OrdersSection,
  ProfileSection,
  SettingsSection,
  WishlistSection,
} from "@/components/account/AccountDashboardSections";
import { apiFetch, getStoredUser, setStoredUser } from "@/lib/api";
import { AccountTab, Address, AddressInput, CustomProject, NotificationItem, Order, Product, UserProfile } from "@/lib/types";
import { useStoredUser } from "@/hooks/useStoredUser";
import { syncWishlistIds } from "@/hooks/useWishlist";

const accountTabs: Array<{
  id: AccountTab;
  label: string;
  description: string;
}> = [
  { id: "profile", label: "My Profile", description: "Personal info and atelier relationship" },
  { id: "orders", label: "My Orders", description: "Order history and live delivery status" },
  { id: "wishlist", label: "Wishlist", description: "Saved sculptures and decor favorites" },
  { id: "addresses", label: "Saved Addresses", description: "Delivery destinations and defaults" },
  { id: "custom-projects", label: "Custom Projects", description: "Bespoke requests, approvals, and workshop stages" },
  { id: "notifications", label: "Notifications", description: "Unread updates from projects, orders, and studio alerts" },
  { id: "settings", label: "Settings", description: "Security, session, and account preferences" },
];

type FeedbackState = {
  tone: "success" | "error";
  text: string;
} | null;

const resolveActiveTab = (value: string | null): AccountTab =>
  accountTabs.some((tab) => tab.id === value) ? (value as AccountTab) : "profile";

export default function AccountDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionUser = useStoredUser();
  const activeTab = resolveActiveTab(searchParams.get("tab"));
  const [isRouting, startTransition] = useTransition();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileUploadingImage, setProfileUploadingImage] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const [wishlist, setWishlist] = useState<Product[] | null>(null);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState("");

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressesError, setAddressesError] = useState("");

  const [projects, setProjects] = useState<CustomProject[] | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");

  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const [actionBusy, setActionBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const redirectTarget = `/account/dashboard${activeTab === "profile" ? "" : `?tab=${activeTab}`}`;

  const syncSessionFromProfile = useCallback((nextProfile: UserProfile) => {
    const currentUser = getStoredUser();
    if (!currentUser?.token) {
      return;
    }

    setStoredUser({
      ...currentUser,
      name: nextProfile.name,
      email: nextProfile.email,
      phone: nextProfile.phone,
      avatarUrl: nextProfile.avatarUrl || nextProfile.profileImage,
      profileImage: nextProfile.profileImage || nextProfile.avatarUrl,
      isAdmin: nextProfile.isAdmin,
    });
  }, []);

  const redirectToLogin = useCallback(() => {
    setStoredUser(null);
    router.replace(`/account?redirect=${encodeURIComponent(redirectTarget)}`);
  }, [redirectTarget, router]);

  const handleProtectedError = useCallback((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    if (/not authorized|token|unauthorized/i.test(message)) {
      redirectToLogin();
      return true;
    }

    return false;
  }, [redirectToLogin]);

  const syncProfileCounts = useCallback((partialCounts: Partial<UserProfile["counts"]>) => {
    setProfile((current) =>
      current
        ? {
            ...current,
            counts: {
              ...current.counts,
              ...partialCounts,
            },
          }
        : current
    );
  }, []);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError("");

    try {
      const nextProfile = await apiFetch<UserProfile>("/users/me");
      setProfile(nextProfile);
      syncSessionFromProfile(nextProfile);
    } catch (error) {
      if (!handleProtectedError(error, "Could not load your profile.")) {
        setProfileError(error instanceof Error ? error.message : "Could not load your profile.");
      }
    } finally {
      setProfileLoading(false);
    }
  }, [handleProtectedError, syncSessionFromProfile]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError("");

    try {
      const nextOrders = await apiFetch<Order[]>("/orders/my");
      setOrders(nextOrders);
      syncProfileCounts({ orders: nextOrders.length });
    } catch (error) {
      if (!handleProtectedError(error, "Could not load your orders.")) {
        setOrdersError(error instanceof Error ? error.message : "Could not load your orders.");
      }
    } finally {
      setOrdersLoading(false);
    }
  }, [handleProtectedError, syncProfileCounts]);

  const loadWishlist = useCallback(async () => {
    setWishlistLoading(true);
    setWishlistError("");

    try {
      const nextWishlist = await apiFetch<Product[]>("/wishlist");
      setWishlist(nextWishlist);
      syncWishlistIds(nextWishlist);
      syncProfileCounts({ wishlist: nextWishlist.length });
    } catch (error) {
      if (!handleProtectedError(error, "Could not load your wishlist.")) {
        setWishlistError(error instanceof Error ? error.message : "Could not load your wishlist.");
      }
    } finally {
      setWishlistLoading(false);
    }
  }, [handleProtectedError, syncProfileCounts]);

  const loadAddresses = useCallback(async () => {
    setAddressesLoading(true);
    setAddressesError("");

    try {
      const nextAddresses = await apiFetch<Address[]>("/users/me/addresses");
      setAddresses(nextAddresses);
      syncProfileCounts({ addresses: nextAddresses.length });
    } catch (error) {
      if (!handleProtectedError(error, "Could not load your addresses.")) {
        setAddressesError(error instanceof Error ? error.message : "Could not load your addresses.");
      }
    } finally {
      setAddressesLoading(false);
    }
  }, [handleProtectedError, syncProfileCounts]);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError("");

    try {
      const nextProjects = await apiFetch<CustomProject[]>("/custom-orders/my");
      setProjects(nextProjects || []);
      syncProfileCounts({ customProjects: (nextProjects || []).length });
    } catch (error: unknown) {
      if (!handleProtectedError(error, "Could not load your custom projects.")) {
        const isHttpError = (value: unknown): value is { status?: number } =>
          typeof value === "object" && value !== null && "status" in value;

        if (isHttpError(error) && error.status === 404) {
          setProjects([]);
        } else {
          setProjectsError(error instanceof Error ? error.message : "Could not load your custom projects.");
          setProjects([]);
        }
      }
    } finally {
      setProjectsLoading(false);
    }
  }, [handleProtectedError, syncProfileCounts]);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError("");

    try {
      const nextNotifications = await apiFetch<NotificationItem[]>("/notifications");
      setNotifications(nextNotifications);
      syncProfileCounts({ notifications: nextNotifications.filter((notification) => !notification.read).length });
    } catch (error) {
      if (!handleProtectedError(error, "Could not load your notifications.")) {
        setNotificationsError(error instanceof Error ? error.message : "Could not load your notifications.");
      }
    } finally {
      setNotificationsLoading(false);
    }
  }, [handleProtectedError, syncProfileCounts]);

  useEffect(() => {
    if (!sessionUser?.token) {
      router.replace(`/account?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }

    if (!profile) {
      const timeout = window.setTimeout(() => {
        void loadProfile();
      }, 0);

      return () => {
        window.clearTimeout(timeout);
      };
    }
  }, [loadProfile, profile, redirectTarget, router, sessionUser?._id, sessionUser?.token]);

  useEffect(() => {
    if (!sessionUser?.token) {
      return;
    }

    let timeout: number | null = null;

    if (activeTab === "orders" && !orders && !ordersLoading) {
      timeout = window.setTimeout(() => {
        void loadOrders();
      }, 0);
    }

    if (activeTab === "wishlist" && !wishlist && !wishlistLoading) {
      timeout = window.setTimeout(() => {
        void loadWishlist();
      }, 0);
    }

    if (activeTab === "addresses" && !addresses && !addressesLoading) {
      timeout = window.setTimeout(() => {
        void loadAddresses();
      }, 0);
    }

    if (activeTab === "custom-projects" && !projects && !projectsLoading) {
      timeout = window.setTimeout(() => {
        void loadProjects();
      }, 0);
    }

    if (activeTab === "notifications" && !notifications && !notificationsLoading) {
      timeout = window.setTimeout(() => {
        void loadNotifications();
      }, 0);
    }

    return () => {
      if (timeout !== null) {
        window.clearTimeout(timeout);
      }
    };
  }, [
    activeTab,
    addresses,
    addressesLoading,
    loadAddresses,
    loadNotifications,
    loadOrders,
    loadProjects,
    loadWishlist,
    notifications,
    notificationsLoading,
    orders,
    ordersLoading,
    projects,
    projectsLoading,
    sessionUser?.token,
    wishlist,
    wishlistLoading,
  ]);

  const handleTabChange = (tab: AccountTab) => {
    setFeedback(null);
    startTransition(() => {
      router.replace(tab === "profile" ? "/account/dashboard" : `/account/dashboard?tab=${tab}`);
    });
  };

  const handleProfileSave = async (values: { name: string; phone: string }) => {
    setProfileSaving(true);
    setFeedback(null);

    try {
      const nextProfile = await apiFetch<UserProfile>("/users/me", {
        method: "PUT",
        body: JSON.stringify(values),
      });

      setProfile(nextProfile);
      syncSessionFromProfile(nextProfile);
      setFeedback({ tone: "success", text: "Profile updated successfully." });
    } catch (error) {
      if (!handleProtectedError(error, "Could not update your profile.")) {
        setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Could not update your profile." });
      }
      throw error;
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileImageUpload = async (file: File) => {
    setProfileUploadingImage(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await apiFetch<{ profile: UserProfile }>("/users/me/profile-image", {
        method: "POST",
        body: formData,
      });
      setProfile(response.profile);
      syncSessionFromProfile(response.profile);
      setFeedback({ tone: "success", text: "Profile image updated." });
    } catch (error) {
      if (!handleProtectedError(error, "Could not update your profile image.")) {
        setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Could not update your profile image." });
      }
      throw error;
    } finally {
      setProfileUploadingImage(false);
    }
  };

  const handleAddressSave = async (address: AddressInput, addressId?: string) => {
    setAddressSubmitting(true);
    setFeedback(null);

    try {
      const nextAddresses = await apiFetch<Address[]>(addressId ? `/users/me/addresses/${addressId}` : "/users/me/addresses", {
        method: addressId ? "PUT" : "POST",
        body: JSON.stringify(address),
      });

      setAddresses(nextAddresses);
      syncProfileCounts({ addresses: nextAddresses.length });
      setFeedback({ tone: "success", text: addressId ? "Address updated." : "Address added successfully." });
    } catch (error) {
      if (!handleProtectedError(error, "Could not save your address.")) {
        setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Could not save your address." });
      }
      throw error;
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    setAddressSubmitting(true);
    setFeedback(null);

    try {
      const nextAddresses = await apiFetch<Address[]>(`/users/me/addresses/${addressId}`, {
        method: "DELETE",
      });

      setAddresses(nextAddresses);
      syncProfileCounts({ addresses: nextAddresses.length });
      setFeedback({ tone: "success", text: "Address removed." });
    } catch (error) {
      if (!handleProtectedError(error, "Could not delete your address.")) {
        setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Could not delete your address." });
      }
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    setAddressSubmitting(true);
    setFeedback(null);

    try {
      const nextAddresses = await apiFetch<Address[]>(`/users/me/addresses/${addressId}/default`, {
        method: "PATCH",
      });
      setAddresses(nextAddresses);
      setFeedback({ tone: "success", text: "Default address updated." });
    } catch (error) {
      if (!handleProtectedError(error, "Could not update the default address.")) {
        setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Could not update the default address." });
      }
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleWishlistToggle = (productId: string, saved: boolean) => {
    if (saved) {
      return;
    }

    setWishlist((current) => current?.filter((product) => product._id !== productId) || current);
    syncProfileCounts({ wishlist: Math.max(0, (profile?.counts.wishlist || 0) - 1) });
  };

  const handleApproveProject = async (projectId: string) => {
    setActionBusy(true);
    setFeedback(null);

    try {
      const updatedProject = await apiFetch<CustomProject>(`/custom-orders/${projectId}/approval`, {
        method: "PATCH",
        body: JSON.stringify({ approval: "approved" }),
      });

      setProjects((current) => current?.map((project) => (project._id === projectId ? updatedProject : project)) || current);
      setFeedback({ tone: "success", text: "Project approved successfully." });
    } catch (error) {
      if (!handleProtectedError(error, "Could not approve this project.")) {
        setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Could not approve this project." });
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleRequestProjectRevision = async (projectId: string) => {
    setActionBusy(true);
    setFeedback(null);

    try {
      const updatedProject = await apiFetch<CustomProject>(`/custom-orders/${projectId}/approval`, {
        method: "PATCH",
        body: JSON.stringify({ approval: "needs-revision", message: "Please refine this version before final approval." }),
      });

      setProjects((current) => current?.map((project) => (project._id === projectId ? updatedProject : project)) || current);
      setFeedback({ tone: "success", text: "Revision request sent." });
    } catch (error) {
      if (!handleProtectedError(error, "Could not request a revision.")) {
        setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Could not request a revision." });
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    setActionBusy(true);

    try {
      const updated = await apiFetch<NotificationItem>(`/notifications/${notificationId}/read`, {
        method: "PATCH",
      });

      setNotifications((current) => current?.map((notification) => (notification._id === notificationId ? updated : notification)) || current);
      syncProfileCounts({
        notifications: Math.max(0, (notifications || []).filter((notification) => !notification.read).length - 1),
      });
    } catch (error) {
      if (!handleProtectedError(error, "Could not mark this notification as read.")) {
        setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Could not mark this notification as read." });
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleMarkAllRead = async () => {
    setActionBusy(true);

    try {
      const updated = await apiFetch<NotificationItem[]>("/notifications/read-all", {
        method: "PATCH",
      });
      setNotifications(updated);
      syncProfileCounts({ notifications: 0 });
      setFeedback({ tone: "success", text: "All notifications marked as read." });
    } catch (error) {
      if (!handleProtectedError(error, "Could not mark all notifications as read.")) {
        setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Could not mark all notifications as read." });
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleLogout = () => {
    setStoredUser(null);
    router.push("/");
  };

  const currentNavigationProfile = profile || (sessionUser
    ? {
        _id: sessionUser._id,
        name: sessionUser.name,
        email: sessionUser.email,
        phone: sessionUser.phone || "",
        profileImage: sessionUser.profileImage || sessionUser.avatarUrl || "",
        avatarUrl: sessionUser.avatarUrl || sessionUser.profileImage || "",
        joinedDate: "",
        createdAt: "",
        authProvider: "google" as const,
        isAdmin: sessionUser.isAdmin,
        counts: {
          addresses: addresses?.length || 0,
          wishlist: wishlist?.length || 0,
          orders: orders?.length || 0,
          customProjects: projects?.length || 0,
          notifications: notifications?.filter((notification) => !notification.read).length || 0,
        },
      }
    : null);

  const navigationItems = accountTabs.map((tab) => ({
    ...tab,
    count:
      tab.id === "orders"
        ? orders?.length ?? profile?.counts.orders
        : tab.id === "wishlist"
          ? wishlist?.length ?? profile?.counts.wishlist
          : tab.id === "addresses"
            ? addresses?.length ?? profile?.counts.addresses
            : tab.id === "custom-projects"
              ? projects?.length ?? profile?.counts.customProjects
              : tab.id === "notifications"
                ? notifications?.filter((notification) => !notification.read).length ?? profile?.counts.notifications
                : undefined,
  }));

  const renderActiveSection = () => {
    switch (activeTab) {
      case "orders":
        return <OrdersSection orders={orders} loading={ordersLoading} error={ordersError} onRetry={loadOrders} />;
      case "wishlist":
        return <WishlistSection wishlist={wishlist} loading={wishlistLoading} error={wishlistError} onRetry={loadWishlist} onWishlistToggle={handleWishlistToggle} />;
      case "addresses":
        return (
          <AddressesSection
            addresses={addresses}
            loading={addressesLoading}
            error={addressesError}
            submitting={addressSubmitting}
            onRetry={loadAddresses}
            onSaveAddress={handleAddressSave}
            onDeleteAddress={handleDeleteAddress}
            onSetDefaultAddress={handleSetDefaultAddress}
          />
        );
      case "custom-projects":
        return (
          <CustomProjectsSection
            projects={projects}
            loading={projectsLoading}
            error={projectsError}
            actionBusy={actionBusy}
            onRetry={loadProjects}
            onApproveProject={handleApproveProject}
            onRequestProjectRevision={handleRequestProjectRevision}
          />
        );
      case "notifications":
        return (
          <NotificationsSection
            notifications={notifications}
            loading={notificationsLoading}
            error={notificationsError}
            actionBusy={actionBusy}
            onRetry={loadNotifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
          />
        );
      case "settings":
        return <SettingsSection profile={profile} onLogout={handleLogout} />;
      case "profile":
      default:
        return (
          <ProfileSection
            profile={profile}
            loading={profileLoading}
            error={profileError}
            saving={profileSaving}
            uploadingImage={profileUploadingImage}
            onRetry={loadProfile}
            onSave={handleProfileSave}
            onUploadImage={handleProfileImageUpload}
          />
        );
    }
  };

  if (!sessionUser?.token) {
    return <DashboardPageSkeleton />;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
        >
          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr] xl:items-center">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">Customer Dashboard</p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                {currentNavigationProfile ? `Welcome back, ${currentNavigationProfile.name.split(" ")[0]}.` : "Your account, organized beautifully."}
              </h1>
              <p className="mt-4 max-w-3xl text-slate-600 text-sm sm:text-base leading-relaxed">
                Manage your profile, track bespoke projects, follow deliveries, and stay close to the artisan studio experience on every screen.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryPill label="Orders" value={String(profile?.counts.orders ?? orders?.length ?? 0)} />
              <SummaryPill label="Projects" value={String(profile?.counts.customProjects ?? projects?.length ?? 0)} />
              <SummaryPill label="Wishlist" value={String(profile?.counts.wishlist ?? wishlist?.length ?? 0)} />
              <SummaryPill label="Alerts" value={String(profile?.counts.notifications ?? notifications?.filter((item) => !item.read).length ?? 0)} />
            </div>
          </div>
        </motion.section>

        {feedback ? (
          <div className={`mt-6 rounded-3xl border px-5 py-4 text-sm ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {feedback.text}
          </div>
        ) : null}

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="overflow-x-auto scrollbar-hide pb-3">
            <div className="flex gap-3 min-w-max snap-x snap-mandatory">
              {navigationItems.map((item) => {
                const active = item.id === activeTab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabChange(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={`snap-start min-w-45 sm:min-w-55 rounded-3xl px-4 py-4 text-left transition-all duration-300 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                      active
                        ? "bg-white border border-sky-300 text-slate-950 shadow-sm"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-sky-300"
                    }`}
                  >
                    <div className="font-semibold text-sm sm:text-base">{item.label}</div>
                    <p className="mt-2 text-xs sm:text-sm opacity-80 line-clamp-3 text-slate-600">{item.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr] xl:items-start">
          <aside className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-100">
                  {currentNavigationProfile?.profileImage ? (
                    <img
                      src={currentNavigationProfile.profileImage.startsWith("/uploads/") ? currentNavigationProfile.profileImage : currentNavigationProfile.profileImage}
                      alt={currentNavigationProfile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-slate-700">
                      {currentNavigationProfile?.name.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-slate-950">{currentNavigationProfile?.name || "Loading profile..."}</p>
                  <p className="truncate text-sm text-slate-500">{currentNavigationProfile?.email || "Please wait..."}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Member since</p>
                  <p className="mt-3 text-sm text-slate-700">{currentNavigationProfile?.joinedDate ? new Date(currentNavigationProfile.joinedDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Not available"}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Phone</p>
                  <p className="mt-3 text-sm text-slate-700">{currentNavigationProfile?.phone || "Not added"}</p>
                </div>
              </div>
            </motion.div>

            <motion.button
              type="button"
              onClick={handleLogout}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="inline-flex w-full items-center justify-center rounded-xl bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-rose-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              Logout
            </motion.button>
          </aside>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={isRouting ? "space-y-6 opacity-80 transition" : "space-y-6"}
          >
            {renderActiveSection()}
          </motion.div>
        </div>
      </div>
    </main>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[132px] rounded-3xl border border-slate-200 bg-white px-4 py-5 text-center text-slate-900 shadow-sm transition hover:border-sky-300 hover:shadow-md sm:min-w-[150px]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function DashboardPageSkeleton() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-56 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <div className="h-80 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-128 animate-pulse rounded-3xl bg-slate-200" />
        </div>
      </div>
    </main>
  );
}
