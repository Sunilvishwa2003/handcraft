"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStoredUser } from "@/hooks/useStoredUser";
import { isAdmin } from "@/lib/isAdmin";

function GuardMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{description}</p>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useStoredUser();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!user?.token) {
      const redirectTarget = pathname || "/admin";
      router.replace(`/account?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }

    if (!isAdmin(user.email)) {
      router.replace("/");
    }
  }, [hydrated, pathname, router, user?.email, user?.token]);

  if (!hydrated) {
    return <GuardMessage title="Checking access" description="Verifying your session before opening the admin workspace." />;
  }

  if (!user?.token) {
    return <GuardMessage title="Redirecting to login" description="Please sign in with an admin account to continue." />;
  }

  if (!isAdmin(user.email)) {
    return <GuardMessage title="Access denied" description="Only approved admin accounts can open this dashboard." />;
  }

  return <div className="min-h-screen">{children}</div>;
}
