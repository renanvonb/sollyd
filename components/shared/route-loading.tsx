import { Skeleton } from "@/components/ui/skeleton"

export function RouteLoading() {
    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <div className="h-14 border-b border-border flex-none" />
            <div className="max-w-[1440px] mx-auto px-6 w-full flex-1 flex flex-col pt-4 md:pt-6 gap-5 md:gap-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48 rounded-md" />
                    <Skeleton className="h-10 w-36 rounded-md" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-64 rounded-2xl" />
            </div>
        </div>
    )
}
