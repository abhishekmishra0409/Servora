import { cn } from "@/lib/utils"

/** Warm shimmer placeholder. Respects reduced-motion by falling back to a static block. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-muted bg-[linear-gradient(90deg,transparent_0%,rgb(255_255_255/0.65)_50%,transparent_100%)] bg-[length:200%_100%] animate-shimmer motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
