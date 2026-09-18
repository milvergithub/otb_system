import Image from "next/image";
import { partnership } from "@/content/site";

export function Partnership() {
  return (
    <section className="bg-zinc-50 py-12 sm:py-16">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div className="relative overflow-hidden rounded-[20px] border border-zinc-200 bg-white p-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-zinc-100">
            <Image src={partnership.image} alt="Comunidad OTB" fill className="object-cover" />
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
            {partnership.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {partnership.description}
          </p>

          <ul className="mt-6 space-y-5">
            {partnership.bullets.map((b) => (
              <li key={b.title} className="flex gap-3">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-[#0a1628]" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{b.title}</p>
                  <p className="mt-1 text-sm leading-5 text-zinc-600">{b.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
