"use client";
import React, { useEffect, useState } from "react";
import { getStoredUser } from "../../lib/api";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      // Not logged in — redirect to account page
      window.location.href = '/account';
      return;
    }

    if (!user.isAdmin) {
      // Not an admin — show message
      setAllowed(false);
      return;
    }

    setAllowed(true);
  }, []);

  if (allowed === null) return <div>Checking permissions…</div>;
  if (allowed === false) return <div style={{ color: 'red' }}>Access denied. Admins only.</div>;
  return <>{children}</>;
}
