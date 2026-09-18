import Link from "next/link";
import { Droplets, Phone, Mail, MapPin } from "lucide-react";
import { siteConfig, footerLinks } from "@/content/site";

export function Footer() {
  return (
    <footer id="contacto" className="bg-[#0a1628] text-white">
      <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white text-[#0a1628]">
                <Droplets className="size-5" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-[16px] font-bold tracking-tight text-white">
                  {siteConfig.name}
                </span>
                <span className="text-[11px] tracking-widest text-white/60 uppercase">
                  {siteConfig.tagline}
                </span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/60">
              {siteConfig.description}
            </p>
            <div className="mt-6 space-y-3 text-sm">
              <a
                href={siteConfig.contact.phoneHref}
                className="flex items-center gap-2 text-white/80 hover:text-white"
              >
                <Phone className="size-4 text-white/50" />
                {siteConfig.contact.phone}
              </a>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="flex items-center gap-2 text-white/80 hover:text-white"
              >
                <Mail className="size-4 text-white/50" />
                {siteConfig.contact.email}
              </a>
              <a
                href={siteConfig.contact.mapsUrl}
                target="_blank"
                className="flex items-center gap-2 text-white/80 hover:text-white"
              >
                <MapPin className="size-4 text-white/50" />
                {siteConfig.contact.address}
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Servicios</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.services.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-white/60 hover:text-white"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Tecnología</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.tech.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-white/60 hover:text-white"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Comunidad</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.comunidad.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-white/60 hover:text-white"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.</p>
          <p>Hecho con transparencia para la comunidad.</p>
        </div>
      </div>
    </footer>
  );
}
