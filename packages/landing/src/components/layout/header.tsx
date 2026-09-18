"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, Droplets } from "lucide-react";
import { siteConfig } from "@/content/site";

const nav = [
  { label: "Servicios", href: "#servicios" },
  { label: "Tecnología", href: "#tecnologia" },
  { label: "Zonas", href: "#zonas" },
  { label: "Tarifas", href: "#tarifas" },
  { label: "Contacto", href: "#contacto" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a1628]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a1628]/80">
      <div className="mx-auto flex h-[64px] max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white text-[#0a1628]">
            <Droplets className="size-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-bold tracking-tight text-white">
              {siteConfig.name}
            </span>
            <span className="text-[10px] font-medium tracking-widest text-white/60 uppercase">
              {siteConfig.tagline}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={siteConfig.portalUrl}
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white hover:bg-white hover:text-[#0a1628] transition-colors"
          >
            Portal Socios
          </a>
          <a
            href="#contacto"
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#0a1628] hover:bg-zinc-100 transition-colors"
          >
            Contáctanos
          </a>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-white/20 text-white lg:hidden"
          aria-label="Abrir menú"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#0a1628] px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <a
                href={siteConfig.portalUrl}
                className="rounded-full border border-white/20 py-2.5 text-center text-sm font-medium text-white"
              >
                Portal Socios
              </a>
              <a
                href="#contacto"
                onClick={() => setOpen(false)}
                className="rounded-full bg-white py-2.5 text-center text-sm font-semibold text-[#0a1628]"
              >
                Contáctanos
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
