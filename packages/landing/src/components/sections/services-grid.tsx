import Image from "next/image";
import Link from "next/link";
import { services } from "@/content/site";
import { ArrowUpRight } from "lucide-react";

export function ServicesGrid() {
  return (
    <section id="servicios" className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {services.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {services.description}
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.items.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white shadow">
                  <ArrowUpRight className="size-4 text-zinc-700" />
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-[15px] font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-5 text-zinc-600">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href="#contacto"
            className="inline-flex items-center gap-2 rounded-full bg-[#0a1628] px-6 py-3 text-sm font-semibold text-white hover:bg-[#132a4a]"
          >
            Consultar por mi servicio
          </a>
        </div>
      </div>
    </section>
  );
}
