import Image from "next/image";
import { finalCta } from "@/content/site";

export function FinalCTA() {
  return (
    <section className="bg-[#0a1628]">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-14">
        <div>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            {finalCta.title}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
            {finalCta.description}
          </p>
          <a
            href={finalCta.cta.href}
            target="_blank"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0a1628] hover:bg-zinc-100"
          >
            {finalCta.cta.label}
          </a>
          <p className="mt-3 text-xs text-white/50">Respuesta directa de la directiva · Lun - Sáb</p>
        </div>

        <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-white p-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] bg-zinc-100">
            <Image src={finalCta.image} alt="OTB Don Bosco comunidad" fill className="object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}
