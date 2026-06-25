import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-emerald-100 text-emerald-700 border-emerald-200/50",
        secondary: "bg-slate-100 text-slate-600 border-slate-200/50",
        destructive: "bg-red-100 text-red-700 border-red-200/50",
        outline: "border-slate-200 text-slate-600 bg-white [a]:hover:bg-slate-50 [a]:hover:text-slate-700",
        ghost: "hover:bg-slate-100 hover:text-slate-700",
        link: "text-emerald-600 underline-offset-4 hover:underline",
        // Status variants
        success: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
        warning: "bg-amber-50 text-amber-700 border border-amber-200/50",
        error: "bg-red-50 text-red-700 border border-red-200/50",
        info: "bg-blue-50 text-blue-700 border border-blue-200/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
