import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn("group/item-group flex w-full flex-col gap-2", className)}
      {...props}
    />
  );
}

const itemVariants = cva(
  "group/item flex items-center border border-transparent text-sm rounded-xl transition-colors [a]:hover:bg-accent/50 [a]:transition-colors duration-100 flex-wrap outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border-border",
        muted: "bg-muted/50 border-border/50",
      },
      size: {
        default: "gap-3 px-4 py-3",
        sm: "gap-2.5 px-3 py-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Item({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof itemVariants>) {
  return (
    <div
      data-slot="item"
      data-variant={variant}
      data-size={size}
      className={cn(itemVariants({ variant, size }), className)}
      {...props}
    />
  );
}

function ItemMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: "default" | "icon" | "image" }) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(
        "flex shrink-0 items-center justify-center gap-2",
        variant === "icon" && "bg-muted size-8 rounded-lg border [&_svg:not([class*='size-'])]:size-4",
        variant === "image" && "size-10 overflow-hidden rounded-lg [&_img]:size-full [&_img]:object-cover",
        className
      )}
      {...props}
    />
  );
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-content"
      className={cn("flex flex-1 flex-col gap-0.5 min-w-0", className)}
      {...props}
    />
  );
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-title"
      className={cn("flex w-fit items-center gap-2 text-sm leading-snug font-medium", className)}
      {...props}
    />
  );
}

function ItemDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-description"
      className={cn("text-muted-foreground line-clamp-2 text-sm leading-normal font-normal text-balance", className)}
      {...props}
    />
  );
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-actions" className={cn("flex items-center gap-2", className)} {...props} />;
}

function ItemSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator data-slot="item-separator" orientation="horizontal" className={cn("my-0", className)} {...props} />;
}

export {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemGroup,
  ItemSeparator,
};
