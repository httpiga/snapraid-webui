import { Skeleton } from "@/components/ui/skeleton"

interface PageLoadingProps {
  message: string
}

export function PageLoading({ message }: PageLoadingProps) {
  return (
    <div
      className="flex flex-col items-center justify-center h-64 gap-4 px-4"
      role="status"
      aria-label={message}
    >
      <div className="flex flex-col gap-2 w-full max-w-sm">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}
