import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
                  className,
                  orientation = "horizontal",
                  ...props
              }: TabsPrimitive.Root.Props) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            data-orientation={orientation}
            className={cn(
                "group/tabs flex gap-2 data-horizontal:flex-col",
                className
            )}
            {...props}
        />
    )
}

const tabsListVariants = cva(
    [
        "group/tabs-list inline-flex w-fit items-center justify-center",
        "rounded-full p-1",
        "bg-background",
        "border-2 border-border",
        "text-muted-foreground",
        "group-data-horizontal/tabs:h-10",
        "group-data-vertical/tabs:h-fit",
        "group-data-vertical/tabs:flex-col",
    ].join(" "),
    {
        variants: {
            variant: {
                default: "",
                line: "rounded-none border-0 shadow-none bg-transparent",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

function TabsList({
                      className,
                      variant = "default",
                      ...props
                  }: TabsPrimitive.List.Props &
    VariantProps<typeof tabsListVariants>) {
    return (
        <TabsPrimitive.List
            data-slot="tabs-list"
            data-variant={variant}
            className={cn(tabsListVariants({ variant }), className)}
            {...props}
        />
    )
}

function TabsTrigger({
                         className,
                         ...props
                     }: TabsPrimitive.Tab.Props) {
    return (
        <TabsPrimitive.Tab
            data-slot="tabs-trigger"
            className={cn(
                [
                    "relative inline-flex h-8 flex-1 items-center justify-center",
                    "rounded-full px-4",
                    "text-sm font-medium whitespace-nowrap",
                    "text-foreground",
                    "transition-all duration-200",
                    "focus-visible:outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring/50",
                    "disabled:pointer-events-none disabled:opacity-50",

                    // Active
                    "data-active:bg-primary",
                    "data-active:text-primary-foreground",

                    // Remove underline
                    "after:hidden",

                    // Icons
                    "[&_svg]:pointer-events-none",
                    "[&_svg]:shrink-0",
                    "[&_svg:not([class*='size-'])]:size-4",

                    // Vertical
                    "group-data-vertical/tabs:w-full",
                    "group-data-vertical/tabs:justify-start",
                ].join(" "),
                className
            )}
            {...props}
        />
    )
}

function TabsContent({
                         className,
                         ...props
                     }: TabsPrimitive.Panel.Props) {
    return (
        <TabsPrimitive.Panel
            data-slot="tabs-content"
            className={cn("flex-1 text-sm outline-none", className)}
            {...props}
        />
    )
}

export {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    tabsListVariants,
}