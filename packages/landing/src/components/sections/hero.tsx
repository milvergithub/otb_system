import Image from "next/image";
import { heroContent } from "@/content/site";
import { ArrowRight, Play } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0a1628]">
      {/* subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0a1628] to-[#0f2a5a] opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.06] via-transparent to-transparent" />

      <div className="relative mx-auto grid max-w-[1280px] gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8 lg:py-16">
        <div>
          <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/90 backdrop-blur">
            <span className="mr-2 size-2 rounded-full bg-emerald-400 animate-pulse" />
            {heroContent.badge}
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[52px]">
            {heroContent.title}
            <br />
            <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              {heroContent.titleAccent}
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-[15px] leading-6 text-white/70 sm:text-base">
            {heroContent.subtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={heroContent.ctaPrimary.href}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0a1628] hover:bg-zinc-100 transition-colors"
            >
              {heroContent.ctaPrimary.label}
              <ArrowRight className="size-4" />
            </a>
            <a
              href={heroContent.ctaSecondary.href}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white hover:bg-white hover:text-[#0a1628] transition-colors"
            >
              <Play className="size-4" />
              {heroContent.ctaSecondary.label}
            </a>
          </div>

          <p className="mt-4 text-xs text-white/50">
            Atención presencial + WhatsApp · Respuesta en el día
          </p>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white p-2 shadow-2xl">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-zinc-100">
              <Image
                src={heroContent.image.src}
                alt={heroContent.image.alt}
                fill
                className="object-cover"
                priority
              />
            </div>
            {/* floating card */}
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl sm:left-6 sm:right-auto sm:w-[320px]">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Facturación del mes
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-zinc-900">Bs 42.50</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Pagada
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full w-[85%] rounded-full bg-[#0a1628]" />
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">Consumo 12 m³ · Vence 15 de cada mes</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
