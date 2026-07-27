import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-[#006633] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#006633] text-white shadow-xs hover:bg-[#005229]",
        secondary:
          "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200",
        destructive:
          "border-transparent bg-rose-600 text-white shadow-xs hover:bg-rose-700",
        outline: "text-slate-700 border-slate-200",
        nu: "border-[#007a3d]/20 bg-[#ebfef4] text-[#006633] shadow-2xs font-extrabold",
        amber: "border-transparent bg-amber-600 text-white shadow-xs hover:bg-amber-700",
        blue: "border-transparent bg-blue-700 text-white shadow-xs hover:bg-blue-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  className?: string;
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
