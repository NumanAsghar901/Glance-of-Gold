import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Hover effects use Tailwind's `hover:` variant, which only applies on devices
// that can hover, so touch screens never get a stuck hover state.
const buttonVariants = cva(
  [
    "group/button relative isolate inline-flex shrink-0 items-center justify-center gap-2",
    "overflow-hidden rounded-sm text-[0.9375rem] font-medium tracking-[0.01em] whitespace-nowrap",
    "select-none transition-[transform,background-color,color,border-color] duration-300 ease-(--ease-out)",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "[&_svg]:transition-transform [&_svg]:duration-300 [&_svg]:ease-(--ease-out)",
    "hover:[&_svg:last-child:not(:first-child)]:translate-x-[3px]",
  ],
  {
    variants: {
      variant: {
        // Gold fill; darkens and lifts on hover, label flips to white.
        primary:
          "bg-gold text-foreground hover:-translate-y-px hover:bg-gold-hover hover:text-white",
        // Hairline outline; a gold fill sweeps in from the left.
        outline: [
          "border border-gold bg-transparent text-foreground",
          "before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 before:bg-gold",
          "before:transition-transform before:duration-300 before:ease-(--ease-out)",
          "hover:before:scale-x-100 hover:border-gold-hover",
        ],
        // Solid dark button for contrast moments.
        dark: "bg-foreground text-background hover:-translate-y-px hover:bg-gold-hover",
        ghost: "text-foreground hover:bg-sand",
        // Underline draws in from the left.
        link: [
          "h-auto rounded-none px-0 text-foreground overflow-visible",
          "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-gold",
          "after:origin-left after:scale-x-0 after:transition-transform after:duration-300 after:ease-(--ease-out)",
          "hover:after:scale-x-100",
        ],
      },
      size: {
        sm: "h-10 px-5",
        md: "h-12 px-7",
        lg: "h-14 px-9 text-base",
        icon: "size-11 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = VariantProps<typeof buttonVariants> & {
  className?: string;
  children?: React.ReactNode;
} & (
    | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>)
    | ({ href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className">)
  );

function Button({ className, variant, size, children, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (props.href !== undefined) {
    return (
      <Link {...props} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" {...props} className={classes}>
      {children}
    </button>
  );
}

export { Button, buttonVariants };
