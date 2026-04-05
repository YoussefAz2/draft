import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <Skeleton className="h-40 rounded-[2rem] bg-white/8" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-[1.5rem] bg-white/8" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Skeleton className="h-72 rounded-[1.5rem] bg-white/8" />
          <Skeleton className="h-72 rounded-[1.5rem] bg-white/8" />
        </div>
      </div>
    </main>
  )
}
