import { stats } from "@/content/site";

export function StatsBar() {
  return (
    <section className="border-y border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 divide-y divide-zinc-200 sm:divide-y-0 sm:divide-x lg:grid-cols-4 px-4 sm:px-6 lg:px-8">
        {stats.map((s) => (
          <div key={s.label} className="px-6 py-7 text-center sm:py-8">
            <p className="text-3xl font-bold tracking-tight text-[#0a1628] sm:text-4xl">
              {s.value}
            </p>
            <p className="mt-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
