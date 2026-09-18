import Image from "next/image";
import { coverage } from "@/content/site";
import { MapPin, ArrowRight } from "lucide-react";

export function Coverage() {
  return (
    <section id="zonas" className="bg-zinc-50 py-12 sm:py-16">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
            {coverage.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {coverage.description}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {coverage.zones.map((z) => (
              <span
                key={z}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700"
              >
                <MapPin className="size-3.5 text-cyan-600" />
                {z}
              </span>
            ))}
          </div>

          <a
            href={coverage.cta.href}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0a1628] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#132a4a]"
          >
            {coverage.cta.label}
            <ArrowRight className="size-4" />
          </a>
        </div>

        <div className="relative overflow-hidden rounded-[20px] border border-zinc-200 bg-white p-2 shadow-sm">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-zinc-100">
            <Image
              src={coverage.image}
              alt="Mapa cobertura OTB Don Bosco"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-3 left-3 rounded-xl bg-white px-3 py-2 shadow">
              <p className="text-xs font-semibold text-zinc-900">OTB Don Bosco</p>
              <p className="text-xs text-zinc-500">Cochabamba · Cobertura total</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
