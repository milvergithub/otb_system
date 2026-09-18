import Image from "next/image";
import { techFeatures } from "@/content/site";
import { Check, ArrowRight } from "lucide-react";

export function TechFeature() {
  return (
    <section id="tecnologia" className="bg-[#0a1628] py-12 sm:py-16">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div>
          <p className="text-xs font-semibold tracking-widest text-cyan-300 uppercase">
            {techFeatures.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            {techFeatures.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            {techFeatures.description}
          </p>

          <ul className="mt-6 space-y-3">
            {techFeatures.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-white/85">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Check className="size-3.5 text-cyan-300" />
                </span>
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={techFeatures.ctaPrimary.href}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0a1628] hover:bg-zinc-100"
            >
              {techFeatures.ctaPrimary.label}
              <ArrowRight className="size-4" />
            </a>
            <a
              href={techFeatures.ctaSecondary.href}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white hover:text-[#0a1628]"
            >
              {techFeatures.ctaSecondary.label}
            </a>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-white p-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-zinc-100">
            <Image src={techFeatures.image} alt="Tecnología OTB" fill className="object-cover" />
          </div>
          <div className="absolute bottom-6 left-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl">
            <p className="text-xs font-medium text-zinc-500">Lectura verificada</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">Foto + GPS · 12:34 PM</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-600">Enviada a facturación</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
