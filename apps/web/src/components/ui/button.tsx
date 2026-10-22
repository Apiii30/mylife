import Link from "next/link";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-ink text-canvas hover:bg-ink/85 shadow-[0_1px_0_0_rgb(255_255_255/0.15)_inset,0_8px_24px_-8px_rgb(0_0_0/0.35)]",
  accent: "bg-accent text-white hover:brightness-110 shadow-[0_8px_24px_-8px_var(--accent)]",
  glass: "glass text-ink hover:bg-[var(--glass-bg-strong)]",
  ghost: "text-ink-2 hover:bg-ink/5 hover:text-ink",
  link: "text-accent hover:underline underline-offset-4 px-0!",
} as const;

const sizes = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-[17px]",
  icon: "size-10",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    "relative inline-flex select-none items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em] whitespace-nowrap",
    "transition-[transform,background-color,box-shadow,filter,color] duration-300 ease-out-expo active:scale-[0.96]",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = React.ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}
