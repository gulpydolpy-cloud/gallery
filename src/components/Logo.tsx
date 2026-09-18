import { Link } from "@tanstack/react-router";
import { Flower2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-4xl" : size === "sm" ? "text-lg" : "text-2xl";
  const icon = size === "lg" ? "size-9" : size === "sm" ? "size-5" : "size-7";
  return (
    <Link to="/" className={cn("flex items-center gap-2 select-none", className)}>
      <Flower2 className={cn(icon, "text-rose")} strokeWidth={2.2} />
      <span className={cn(text, "font-extrabold tracking-tight text-brand")}>Gallery</span>
    </Link>
  );
}
