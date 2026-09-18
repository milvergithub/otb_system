"use client";
import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionProps = {
  items: { q: string; a: string }[];
};

export function Accordion({ items }: AccordionProps) {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="px-6">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between py-5 text-left"
            >
              <span className="pr-4 text-[15px] font-medium text-zinc-900">
                {item.q}
              </span>
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border transition",
                  isOpen
                    ? "bg-[#0a1628] text-white border-[#0a1628]"
                    : "border-zinc-200 text-zinc-500"
                )}
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </span>
            </button>
            {isOpen && (
              <p className="pb-5 text-sm leading-6 text-zinc-600">{item.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
