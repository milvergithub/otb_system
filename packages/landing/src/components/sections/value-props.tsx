import Image from "next/image";
import { valueProps } from "@/content/site";
import { Check } from "lucide-react";

export function ValueProps() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-widest text-cyan-600 uppercase">
            {valueProps.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
            {valueProps.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {valueProps.description}
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.items.map((item) => (
            <div
              key={item.title}
              className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full bg-white shadow">
                  <Check className="size-4 text-emerald-600" />
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-sm font-semibold leading-5 text-zinc-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-5 text-zinc-600">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
