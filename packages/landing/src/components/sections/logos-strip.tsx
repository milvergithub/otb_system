import { trustedBy } from "@/content/site";

export function LogosStrip() {
  return (
    <section className="bg-zinc-50 py-8">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold tracking-widest text-zinc-400 uppercase">
          {trustedBy.title}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {trustedBy.logos.map((logo) => (
            <div
              key={logo}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-xs font-semibold tracking-wide text-zinc-600"
            >
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
