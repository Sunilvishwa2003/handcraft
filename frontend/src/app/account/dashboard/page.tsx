import { Suspense } from "react";
import AccountDashboard from "@/components/account/AccountDashboard";

export default function AccountDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingFallback />}>
      <AccountDashboard />
    </Suspense>
  );
}

function DashboardLoadingFallback() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="h-56 animate-pulse rounded-[36px] bg-slate-200" />
        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]">
          <div className="h-80 animate-pulse rounded-[32px] bg-slate-200" />
          <div className="h-[32rem] animate-pulse rounded-[32px] bg-slate-200" />
        </div>
      </div>
    </main>
  );
}
