import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#111] text-white hover:bg-[#222] shadow-sm",
        primary:
          "bg-primary text-black hover:bg-primary-dark shadow-sm shadow-primary/20",
        outline:
          "border border-border bg-white text-foreground hover:bg-gray-50",
        ghost:
          "text-muted hover:text-foreground hover:bg-gray-100",
        danger:
          "bg-danger text-white hover:bg-red-600 shadow-sm",
        success:
          "bg-success text-white hover:bg-green-600 shadow-sm",
        // Legacy variants (mapped to new ones for backwards compat)
        tactical: "bg-primary text-black hover:bg-primary-dark shadow-sm shadow-primary/20",
        vanguard: "bg-primary text-black hover:bg-primary-dark shadow-sm shadow-primary/20",
        destructive: "bg-danger text-white hover:bg-red-600 shadow-sm",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
