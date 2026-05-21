"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useMemo, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { customProjectStageLabels } from "@/lib/customization";
import { formatPrice, resolveAssetUrl } from "@/lib/api";
import { Address, AddressInput, CustomProject, NotificationItem, Order, Product, UserProfile } from "@/lib/types";

type AsyncStateProps = {
  loading: boolean;
  error: string;
  onRetry: () => void;
};

type ProfileSectionProps = AsyncStateProps & {
  profile: UserProfile | null;
  saving: boolean;
  uploadingImage: boolean;
  onSave: (values: { name: string; phone: string }) => Promise<void>;
  onUploadImage: (file: File) => Promise<void>;
};

type OrdersSectionProps = AsyncStateProps & {
  orders: Order[] | null;
};

type WishlistSectionProps = AsyncStateProps & {
  wishlist: Product[] | null;
  onWishlistToggle: (productId: string, saved: boolean) => void;
};

type AddressesSectionProps = AsyncStateProps & {
  addresses: Address[] | null;
  submitting: boolean;
  onSaveAddress: (address: AddressInput, addressId?: string) => Promise<void>;
  onDeleteAddress: (addressId: string) => Promise<void>;
  onSetDefaultAddress: (addressId: string) => Promise<void>;
};

type CustomProjectsSectionProps = AsyncStateProps & {
  projects: CustomProject[] | null;
  actionBusy: boolean;
  onApproveProject: (projectId: string) => Promise<void>;
  onRequestProjectRevision: (projectId: string) => Promise<void>;
};

type NotificationsSectionProps = AsyncStateProps & {
  notifications: NotificationItem[] | null;
  actionBusy: boolean;
  onMarkRead: (notificationId: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
};

type SettingsSectionProps = {
  profile: UserProfile | null;
  onLogout: () => void;
};

const profileInitialState = {
  name: "",
  phone: "",
};

const addressInitialState: AddressInput = {
  fullName: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  isDefault: false,
};

const formatFriendlyDate = (value?: string) => {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
};

const formatFriendlyDateTime = (value?: string) => {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatStatus = (status: string) =>
  status
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatPaymentChannel = (value?: string) => {
  if (!value) {
    return "";
  }

  if (value === "upi") return "UPI";
  if (value === "netbanking") return "Net Banking";
  if (value === "card") return "Card";
  if (value === "wallet") return "Wallet";

  return formatStatus(value);
};

const getPaymentLabel = (order: Order) => {
  if (order.isPaid) {
    return order.paymentResult?.method ? `Paid via ${formatPaymentChannel(order.paymentResult.method)}` : "Paid";
  }

  if (order.paymentMethod === "cod") {
    return "Cash on delivery";
  }

  return order.paymentMethod === "razorpay" ? "Razorpay pending" : "Payment pending";
};

const getDeliveryLabel = (order: Order) => {
  if (order.status === "cancelled") {
    return "Cancelled";
  }

  if (order.isDelivered || order.status === "delivered") {
    return "Delivered";
  }

  if (["shipped", "out-for-delivery"].includes(order.status)) {
    return "In transit";
  }

  return "Processing";
};

const getOrderStageIndex = (status: string) => {
  if (status === "cancelled") {
    return 0;
  }

  if (status === "delivered") {
    return 3;
  }

  if (["shipped", "out-for-delivery"].includes(status)) {
    return 2;
  }

  if (status === "packed") {
    return 1;
  }

  return 0;
};

function SectionShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">{eyebrow}</p>
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900 shadow-sm">
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex rounded-2xl bg-white px-5 py-2.5 font-semibold text-rose-700 shadow-sm transition hover:-translate-y-0.5"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center shadow-sm sm:px-8">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function SectionSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-3xl bg-slate-100" />
      ))}
    </div>
  );
}

export function ProfileSection({
  profile,
  loading,
  error,
  saving,
  uploadingImage,
  onRetry,
  onSave,
  onUploadImage,
}: ProfileSectionProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profileInitialState);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const joinedDate = useMemo(() => formatFriendlyDate(profile?.joinedDate), [profile?.joinedDate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (!form.name.trim() || form.name.trim().length < 2) {
      setMessage("Enter a valid full name.");
      return;
    }

    if (form.phone.trim() && !/^[0-9+\-() ]{7,20}$/.test(form.phone.trim())) {
      setMessage("Enter a valid phone number.");
      return;
    }

    try {
      await onSave({
        name: form.name.trim(),
        phone: form.phone.trim(),
      });
      setEditing(false);
    } catch {
      // Parent surfaces API message.
    }
  };

  return (
    <SectionShell
      eyebrow="My Profile"
      title="Your studio relationship at a glance"
      description="Keep your personal details, portrait, and contact information current so your handcrafted projects and deliveries stay beautifully organized."
    >
      {loading && !profile ? <SectionSkeleton lines={5} /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={onRetry} /> : null}
      {!loading && !error && profile ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(67,56,202,0.82),rgba(146,64,14,0.82))] p-6 text-white shadow-[0_30px_90px_rgba(2,6,23,0.26)]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-28 w-28 overflow-hidden rounded-[28px] border border-white/20 bg-white/10">
                {profile.profileImage ? (
                  <img src={resolveAssetUrl(profile.profileImage)} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-semibold">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm"
                >
                  {uploadingImage ? "..." : "Change"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    setMessage("");
                    try {
                      await onUploadImage(file);
                    } catch {
                      // Parent surfaces API message.
                    } finally {
                      event.target.value = "";
                    }
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm uppercase tracking-[0.28em] text-amber-200">Google connected</p>
                <h3 className="mt-2 truncate text-3xl font-semibold">{profile.name}</h3>
                <p className="mt-2 text-sm text-slate-100/90">{profile.email}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-white/12 px-3 py-1.5 text-sky-100">Joined {joinedDate}</span>
                  <span className="rounded-full bg-white/12 px-3 py-1.5 text-sky-100">{profile.phone || "Phone not added"}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <StatCard label="Orders" value={String(profile.counts.orders)} hint="Completed and active purchases" />
              <StatCard label="Projects" value={String(profile.counts.customProjects)} hint="Custom artisan requests saved" />
              <StatCard label="Alerts" value={String(profile.counts.notifications)} hint="Unread project and order updates" />
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/90 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Profile details</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Edit personal info</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (editing) {
                    setEditing(false);
                    setMessage("");
                    return;
                  }

                  setForm({
                    name: profile.name,
                    phone: profile.phone || "",
                  });
                  setEditing(true);
                  setMessage("");
                }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5"
              >
                {editing ? "Cancel" : "Edit profile"}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <DashboardField
                label="Full name"
                value={editing ? form.name : profile.name}
                disabled={!editing || saving}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
              />
              <DashboardField label="Email address" value={profile.email} disabled onChange={() => undefined} />
              <DashboardField
                label="Phone number"
                value={editing ? form.phone : profile.phone || ""}
                disabled={!editing || saving}
                onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
              />
              <DashboardField label="Joined on" value={joinedDate} disabled onChange={() => undefined} />

              {message ? <p className="text-sm text-rose-700">{message}</p> : null}
              {editing ? (
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving changes..." : "Save profile"}
                </button>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}
    </SectionShell>
  );
}

export function OrdersSection({ orders, loading, error, onRetry }: OrdersSectionProps) {
  const totalSpent = useMemo(
    () => (orders || []).reduce((sum, order) => sum + (order.status === "cancelled" ? 0 : order.totalPrice || 0), 0),
    [orders]
  );

  const inTransitCount = useMemo(
    () => (orders || []).filter((order) => ["packed", "shipped", "out-for-delivery"].includes(order.status) && order.status !== "cancelled").length,
    [orders]
  );

  return (
    <SectionShell
      eyebrow="My Orders"
      title="Track every purchase from one place"
      description="Recent orders, payment state, delivery progress, and quick access to full order details all stay organized here."
    >
      {loading && !orders ? <SectionSkeleton lines={4} /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={onRetry} /> : null}
      {!loading && !error && orders ? (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard label="Orders placed" value={String(orders.length)} hint="Across your current account" />
            <StatCard label="In transit" value={String(inTransitCount)} hint="Packed, shipped, or out for delivery" />
            <StatCard label="Total spent" value={formatPrice(totalSpent)} hint="Cancelled orders excluded" />
          </div>

          {orders.length ? (
            <div className="space-y-4">
              {orders.map((order) => {
                const stageIndex = getOrderStageIndex(order.status);

                return (
                  <article key={order._id} className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_40px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Order ID</p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-950">{order._id}</h3>
                        <p className="mt-2 text-sm text-slate-500">Placed on {formatFriendlyDateTime(order.createdAt)}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-sm font-semibold">
                        <span className="rounded-full bg-slate-950 px-3 py-1.5 text-white">{formatStatus(order.status)}</span>
                        <span className={`rounded-full px-3 py-1.5 ${order.isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                          {getPaymentLabel(order)}
                        </span>
                        <span className={`rounded-full px-3 py-1.5 ${order.isDelivered ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-800"}`}>
                          {getDeliveryLabel(order)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_280px]">
                      <div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {["Ordered", "Packed", "Shipped", "Delivered"].map((label, index) => {
                            const active = order.status !== "cancelled" && index <= stageIndex;
                            return (
                              <div
                                key={label}
                                className={`rounded-[22px] border px-4 py-3 ${active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}
                              >
                                <p className="text-xs font-semibold uppercase tracking-[0.2em]">{label}</p>
                                <p className="mt-2 text-sm">{active ? "Completed" : "Waiting"}</p>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-5 grid gap-3">
                          {order.orderItems.slice(0, 3).map((item) => (
                            <div key={`${order._id}-${item.product}`} className="flex items-center gap-3 rounded-[22px] bg-slate-50/90 p-3">
                              <div className="h-16 w-16 overflow-hidden rounded-[18px] border border-slate-200 bg-white p-2">
                                <img
                                  src={resolveAssetUrl(item.image)}
                                  alt={item.name}
                                  className="h-full w-full object-contain"
                                  onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = "/mahabs-logo.svg";
                                  }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-slate-900">{item.name}</p>
                                <p className="mt-1 text-sm text-slate-500">Qty {item.qty}</p>
                              </div>
                              <p className="text-sm font-semibold text-slate-900">{formatPrice(item.price * item.qty)}</p>
                            </div>
                          ))}
                          {order.orderItems.length > 3 ? <p className="text-sm text-slate-500">+ {order.orderItems.length - 3} more item(s) in this order</p> : null}
                        </div>
                      </div>

                      <aside className="rounded-3xl bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(226,232,240,0.8))] p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Order summary</p>
                        <div className="mt-4 space-y-3 text-sm text-slate-600">
                          <div className="flex items-center justify-between">
                            <span>Items</span>
                            <span>{order.orderItems.reduce((sum, item) => sum + item.qty, 0)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Payment</span>
                            <span>{getPaymentLabel(order)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Total</span>
                            <span className="font-semibold text-slate-950">{formatPrice(order.totalPrice)}</span>
                          </div>
                        </div>
                        <Link href={`/orders/${order._id}`} className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5">
                          View order details
                        </Link>
                      </aside>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No orders yet"
              description="Once you place an order, delivery progress and payment details will appear here automatically."
              action={<Link href="/products" className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5">Start shopping</Link>}
            />
          )}
        </div>
      ) : null}
    </SectionShell>
  );
}

export function WishlistSection({ wishlist, loading, error, onRetry, onWishlistToggle }: WishlistSectionProps) {
  return (
    <SectionShell eyebrow="Wishlist" title="Your saved favorites" description="Keep an eye on pieces you love, compare options later, and jump back into checkout when you are ready.">
      {loading && !wishlist ? <SectionSkeleton lines={4} /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={onRetry} /> : null}
      {!loading && !error && wishlist ? (
        wishlist.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {wishlist.map((product) => (
              <ProductCard key={product._id} product={product} onWishlistToggle={(saved) => onWishlistToggle(product._id, saved)} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Your wishlist is empty"
            description="Tap the heart icon on any product to save it here for later."
            action={<Link href="/products" className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5">Browse products</Link>}
          />
        )
      ) : null}
    </SectionShell>
  );
}

export function AddressesSection({
  addresses,
  loading,
  error,
  submitting,
  onRetry,
  onSaveAddress,
  onDeleteAddress,
  onSetDefaultAddress,
}: AddressesSectionProps) {
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressInput>(addressInitialState);
  const [message, setMessage] = useState("");

  const resetForm = () => {
    setForm(addressInitialState);
    setEditingAddressId(null);
    setShowForm(false);
    setMessage("");
  };

  const startAdd = () => {
    setForm(addressInitialState);
    setEditingAddressId(null);
    setShowForm(true);
    setMessage("");
  };

  const startEdit = (address: Address) => {
    setForm({
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setEditingAddressId(address._id);
    setShowForm(true);
    setMessage("");
  };

  const validateAddress = () => {
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      return "Enter a valid full name.";
    }

    if (!/^[0-9+\-() ]{7,20}$/.test(form.phone.trim())) {
      return "Enter a valid phone number.";
    }

    if (!form.street.trim() || form.street.trim().length < 5) {
      return "Street address should be at least 5 characters.";
    }

    if (!form.city.trim() || !form.state.trim() || !form.country.trim()) {
      return "City, state, and country are required.";
    }

    if (!/^[A-Za-z0-9 -]{4,12}$/.test(form.pincode.trim())) {
      return "Enter a valid pincode.";
    }

    return "";
  };

  const submitAddress = async (event: FormEvent) => {
    event.preventDefault();
    const validationMessage = validateAddress();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    try {
      await onSaveAddress(
        {
          ...form,
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          country: form.country.trim(),
        },
        editingAddressId || undefined
      );
      resetForm();
    } catch {
      // Parent surfaces API message.
    }
  };

  return (
    <SectionShell eyebrow="Saved Addresses" title="Manage delivery destinations" description="Save multiple addresses, switch your default destination, and keep checkout fast on mobile and desktop.">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">Use your saved addresses during checkout without typing them again.</p>
        <button type="button" onClick={showForm ? resetForm : startAdd} className="inline-flex w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5">
          {showForm ? "Close form" : "Add address"}
        </button>
      </div>

      {showForm ? (
        <form onSubmit={submitAddress} className="mb-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <DashboardField label="Full name" value={form.fullName} onChange={(value) => setForm((current) => ({ ...current, fullName: value }))} />
            <DashboardField label="Phone number" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
            <DashboardField label="Street" value={form.street} onChange={(value) => setForm((current) => ({ ...current, street: value }))} className="md:col-span-2" />
            <DashboardField label="City" value={form.city} onChange={(value) => setForm((current) => ({ ...current, city: value }))} />
            <DashboardField label="State" value={form.state} onChange={(value) => setForm((current) => ({ ...current, state: value }))} />
            <DashboardField label="Pincode" value={form.pincode} onChange={(value) => setForm((current) => ({ ...current, pincode: value }))} />
            <DashboardField label="Country" value={form.country} onChange={(value) => setForm((current) => ({ ...current, country: value }))} />
          </div>

          <label className="mt-4 flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            Set as default delivery address
          </label>

          {message ? <p className="mt-4 text-sm text-rose-700">{message}</p> : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" disabled={submitting} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? "Saving..." : editingAddressId ? "Update address" : "Save address"}
            </button>
            <button type="button" onClick={resetForm} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {loading && !addresses ? <SectionSkeleton lines={3} /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={onRetry} /> : null}
      {!loading && !error && addresses ? (
        addresses.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {addresses.map((address) => (
              <article key={address._id} className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_45px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{address.fullName}</h3>
                    <p className="mt-1 text-sm text-slate-500">{address.phone}</p>
                  </div>
                  {address.isDefault ? <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Default</span> : null}
                </div>

                <div className="mt-5 rounded-3xl bg-slate-50/90 p-4 text-sm leading-6 text-slate-700">
                  <p>{address.street}</p>
                  <p>{address.city}, {address.state} - {address.pincode}</p>
                  <p>{address.country}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={() => startEdit(address)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5">
                    Edit
                  </button>
                  {!address.isDefault ? (
                    <button type="button" onClick={() => onSetDefaultAddress(address._id)} className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 transition hover:-translate-y-0.5">
                      Set default
                    </button>
                  ) : null}
                  <button type="button" onClick={() => onDeleteAddress(address._id)} className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5">
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No saved addresses yet"
            description="Add your home, office, or gifting address to speed up future checkouts."
            action={<button type="button" onClick={startAdd} className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5">Add your first address</button>}
          />
        )
      ) : null}
    </SectionShell>
  );
}

export function CustomProjectsSection({
  projects,
  loading,
  error,
  actionBusy,
  onRetry,
  onApproveProject,
  onRequestProjectRevision,
}: CustomProjectsSectionProps) {
  return (
    <SectionShell
      eyebrow="Custom Projects"
      title="Your artisan project workspace"
      description="Review every bespoke request, track progress through the workshop, and approve or request revisions when your design reaches the review stage."
    >
      {loading && !projects ? <SectionSkeleton lines={4} /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={onRetry} /> : null}
      {!loading && !error && projects ? (
        projects.length ? (
          <div className="space-y-5">
            {projects.map((project) => (
              <article key={project._id} className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_22px_50px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Project ID</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">{project.product?.name || "Custom artisan request"}</h3>
                    <p className="mt-2 text-sm text-slate-500">Created {formatFriendlyDateTime(project.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm font-semibold">
                    <span className="rounded-full bg-slate-950 px-3 py-1.5 text-white">{customProjectStageLabels[project.stage] || formatStatus(project.stage)}</span>
                    <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800">{formatStatus(project.status)}</span>
                    <span className={`rounded-full px-3 py-1.5 ${project.customerApprovalStatus === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-800"}`}>
                      {formatStatus(project.customerApprovalStatus)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_290px]">
                  <div>
                    <div className="rounded-3xl bg-slate-50/90 p-4 text-sm leading-6 text-slate-700">
                      <p>{project.description}</p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <p>Material: {project.material}</p>
                        <p>Budget: {project.budget || "Flexible"}</p>
                        <p>Inquiry: {formatStatus(project.inquiryType)}</p>
                        <p>Dimensions: {project.dimensions || project.customization.size || "Custom sizing"}</p>
                        {project.customization.finish ? <p>Finish: {project.customization.finish}</p> : null}
                        {project.customization.engravingText ? <p>Engraving: {project.customization.engravingText}</p> : null}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {(project.timeline || []).slice(-3).reverse().map((entry) => (
                        <div key={`${project._id}-${entry.updatedAt}-${entry.stage}`} className="rounded-[22px] border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{customProjectStageLabels[entry.stage] || formatStatus(entry.stage)}</p>
                          <p className="mt-2 font-semibold text-slate-950">{entry.title}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{entry.message}</p>
                          <p className="mt-3 text-xs text-slate-400">{formatFriendlyDateTime(entry.updatedAt)}</p>
                        </div>
                      ))}
                    </div>

                    {project.referenceImages.length || project.sketches.length ? (
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {[...project.referenceImages, ...project.sketches].slice(0, 6).map((asset) => (
                          <div key={asset} className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
                            <img src={resolveAssetUrl(asset)} alt="Project reference" className="h-32 w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <aside className="rounded-3xl bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(30,41,59,0.94))] p-5 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">Project summary</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-200">
                      <div className="flex items-center justify-between">
                        <span>Estimated quote</span>
                        <span>{project.quotedPrice ? formatPrice(project.quotedPrice) : "Pending"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Timeline</span>
                        <span>{project.estimatedTimelineDays ? `${project.estimatedTimelineDays} days` : "Under review"}</span>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-col gap-3">
                      {project.stage === "final-approval" && project.customerApprovalStatus !== "approved" ? (
                        <>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => onApproveProject(project._id)}
                            className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
                          >
                            Approve design
                          </button>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => onRequestProjectRevision(project._id)}
                            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Request revision
                          </button>
                        </>
                      ) : null}
                      <Link href="/custom-order" className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white">
                        Start another project
                      </Link>
                    </div>
                  </aside>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No custom projects yet"
            description="Start a bespoke sculpture, engraving, or decor consultation and your artisan workspace will appear here."
            action={<Link href="/custom-order" className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5">Start custom project</Link>}
          />
        )
      ) : null}
    </SectionShell>
  );
}

export function NotificationsSection({
  notifications,
  loading,
  error,
  actionBusy,
  onRetry,
  onMarkRead,
  onMarkAllRead,
}: NotificationsSectionProps) {
  return (
    <SectionShell
      eyebrow="Notifications"
      title="Studio updates and alerts"
      description="Keep project milestones, order events, and curated announcements in one clear feed."
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">Unread items stay highlighted until you mark them as read.</p>
        <button
          type="button"
          disabled={actionBusy}
          onClick={onMarkAllRead}
          className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          Mark all as read
        </button>
      </div>

      {loading && !notifications ? <SectionSkeleton lines={5} /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={onRetry} /> : null}
      {!loading && !error && notifications ? (
        notifications.length ? (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <article
                key={notification._id}
                className={`rounded-[26px] border p-5 shadow-[0_18px_45px_rgba(15,23,42,0.04)] ${
                  notification.read ? "border-slate-200 bg-white" : "border-sky-200 bg-sky-50/70"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                        {notification.type}
                      </span>
                      {!notification.read ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Unread</span> : null}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">{notification.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{notification.message}</p>
                    <p className="mt-3 text-xs text-slate-400">{formatFriendlyDateTime(notification.createdAt)}</p>
                  </div>
                  {!notification.read ? (
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => onMarkRead(notification._id)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No notifications yet" description="Project, order, and curated marketplace updates will appear here automatically." />
        )
      ) : null}
    </SectionShell>
  );
}

export function SettingsSection({ profile, onLogout }: SettingsSectionProps) {
  return (
    <SectionShell
      eyebrow="Settings"
      title="Security and account preferences"
      description="Review how you sign in, keep your contact email handy, and securely end your session whenever you need to."
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/90 p-5">
          <h3 className="text-lg font-semibold text-slate-950">Account access</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <StatCard label="Sign-in method" value={profile?.authProvider === "google" ? "Google OAuth" : "Email & password"} hint="This matches your current account connection." />
            <StatCard label="Primary email" value={profile?.email || "Not available"} hint="Used for order updates and support." />
          </div>
          <div className="mt-5 rounded-3xl bg-white p-4 text-sm leading-6 text-slate-600">
            {profile?.authProvider === "google"
              ? "This account is connected to Google, so your profile image and verified email come from your Google identity."
              : "If you ever need a new password, you can generate a secure reset link from the account login page."}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={profile?.authProvider === "google" ? "/account" : "/account?mode=forgot"} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5">
              {profile?.authProvider === "google" ? "Open account page" : "Reset password"}
            </Link>
            <Link href="/products" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5">
              Continue shopping
            </Link>
          </div>
        </div>

        <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.98))] p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">Session</p>
          <h3 className="mt-3 text-2xl font-semibold">Sign out securely</h3>
          <p className="mt-3 text-sm leading-6 text-slate-200">Logging out clears your local session from this browser and sends you back to the storefront.</p>
          <button type="button" onClick={onLogout} className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5">
            Logout
          </button>
        </div>
      </div>
    </SectionShell>
  );
}

function DashboardField({
  label,
  value,
  onChange,
  disabled,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}
