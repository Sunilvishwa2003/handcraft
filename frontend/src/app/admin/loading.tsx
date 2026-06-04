import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="admin-shell min-h-screen px-4 py-6 text(--admin-foreground) sm:px-6 lg:px-8">
      <div className="mx-auto max-w-400 space-y-4">
        <Skeleton className="h-28 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-3xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
          <Skeleton className="h-90 rounded-3xl" />
          <Skeleton className="h-90 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
