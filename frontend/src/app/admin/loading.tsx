import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
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
      </div>
    </div>
  );
}
