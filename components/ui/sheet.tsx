"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Sheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-slate-950/18 duration-150 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: DialogPrimitive.Popup.Props & {
  side?: "right" | "left" | "top" | "bottom"
}) {
  const sideClass =
    side === "left"
      ? "left-0 top-0 h-full w-full max-w-[420px] rounded-r-[1.8rem] border-r"
      : side === "top"
        ? "left-0 top-0 w-full rounded-b-[1.8rem] border-b"
        : side === "bottom"
          ? "bottom-0 left-0 w-full rounded-t-[1.8rem] border-t"
          : "right-0 top-0 h-full w-full max-w-[420px] rounded-l-[1.8rem] border-l"

  const motionClass =
    side === "left"
      ? "data-open:slide-in-from-left-4 data-closed:slide-out-to-left-4"
      : side === "top"
        ? "data-open:slide-in-from-top-4 data-closed:slide-out-to-top-4"
        : side === "bottom"
          ? "data-open:slide-in-from-bottom-4 data-closed:slide-out-to-bottom-4"
          : "data-open:slide-in-from-right-4 data-closed:slide-out-to-right-4"

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 bg-[color:var(--popover-elevated)] p-6 text-popover-foreground shadow-[var(--shadow-strong)] duration-150 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.99] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.99]",
          sideClass,
          motionClass,
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          data-slot="sheet-close"
          render={<Button variant="ghost" size="icon-sm" className="absolute right-4 top-4" />}
        >
          <XIcon />
          <span className="sr-only">关闭</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-2", className)} {...props} />
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("mt-6 flex flex-wrap gap-3", className)} {...props} />
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-heading text-lg font-medium tracking-[-0.02em]", className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm leading-6 text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
}
