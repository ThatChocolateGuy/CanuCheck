import { Skeleton } from "@/components/ui/skeleton"

export function GridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array(6).fill(0).map((_, i) => (
        <Skeleton key={i} className="h-[300px] rounded-xl" />
      ))}
    </div>
  )
}