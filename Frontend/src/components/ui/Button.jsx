import React from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import * as Radix from "@radix-ui/react-slot"; // for asChild support

export function Button({
  children,
  asChild = false,
  to = undefined,
  variant = "default",
  size = "md",
  className = "",
  ...props
}) {
  const Comp = asChild ? Radix.Slot : to ? Link : "button";

  const base =
    "inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "bg-transparent hover:bg-gray-100 text-blue-600",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-100",
    black: "bg-black text-white hover:bg-gray-800",
  };

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const btnClass = cn(base, variants[variant], sizes[size], className);

  const compProps = {
    className: btnClass,
    ...props,
  };

  if (to && !asChild) {
    compProps.to = to;
  }

  return <Comp {...compProps}>{children}</Comp>;
}
