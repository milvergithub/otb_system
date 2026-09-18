import Image from "next/image";
import { faqs } from "@/content/site";
import { Accordion } from "@/components/ui/accordion";

export function FAQ() {
  return (
    <section id="tarifas" className="bg-white py-12 sm:py-16">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
            Resolvemos tus dudas
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Todo lo que necesitas saber sobre afiliación, tarifas, consumo y pagos. Si no encuentras tu respuesta, escríbenos por WhatsApp.
          </p>

          <div className="mt-6 hidden overflow-hidden rounded-2xl border border-zinc-200 lg:block">
            <div className="relative aspect-[4/3] bg-zinc-100">
              <Image
                src="https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80&auto=format&fit=crop"
                alt="Preguntas frecuentes OTB"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <a
            href="#contacto"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0a1628] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#132a4a] lg:mt-6"
          >
            Consultar por WhatsApp
          </a>
        </div>

        <Accordion items={faqs} />
      </div>
    </section>
  );
}
