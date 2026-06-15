import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

export function AuthScreenSkeleton() {
    return (
        <div className="flex h-[100dvh] w-full overflow-hidden">
            {/* Login Area - 60% */}
            <div className="flex flex-1 items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md space-y-6">
                    {/* Title */}
                    <div className="text-center space-y-2">
                        <Skeleton className="h-8 w-48 mx-auto" />
                        <Skeleton className="h-4 w-64 mx-auto" />
                    </div>

                    {/* Separator */}
                    <Separator className="my-6" />

                    {/* Form Inputs */}
                    <div className="space-y-4">
                        {/* Input 1 */}
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>

                        {/* Input 2 */}
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>

                        {/* Input 3 */}
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>

                        {/* Input 4 */}
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>
                    </div>

                    {/* Button */}
                    <Skeleton className="h-11 w-full rounded-lg" />

                    {/* Footer Link */}
                    <div className="text-center">
                        <Skeleton className="h-4 w-56 mx-auto" />
                    </div>
                </div>
            </div>

            {/* Brand Area - 40% */}
            <div className="hidden lg:flex lg:w-2/5 bg-zinc-50 p-4">
                <div className="w-full h-full bg-white rounded-[16px] relative overflow-hidden">
                    {/* Image Placeholder */}
                    <Skeleton className="absolute inset-0" />

                    {/* Logo Placeholder */}
                    <div className="absolute bottom-8 left-8">
                        <Skeleton className="h-8 w-32" />
                    </div>
                </div>
            </div>
        </div>
    )
}
