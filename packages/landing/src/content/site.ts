export const siteConfig = {
  name: "OTB Don Bosco",
  tagline: "Sistema de Agua Comunitario",
  description:
    "Gestión transparente del agua para la comunidad. Control de socios, medidores, consumo y facturación al servicio de los vecinos.",
  contact: {
    phone: "+591 70000000",
    phoneHref: "tel:+59170000000",
    whatsapp: "59170000000",
    email: "contacto@otb-donbosco.bo",
    address: "Zona Don Bosco, Cochabamba, Bolivia",
    mapsUrl: "https://maps.google.com/?q=Cochabamba+Bolivia",
  },
  portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:5173/login",
};

export const heroContent = {
  badge: "OTB Don Bosco · Cochabamba",
  title: "Agua para toda la comunidad.",
  titleAccent: "Gestión transparente.",
  subtitle:
    "Hace más de 20 años administramos el servicio de agua potable con control comunitario, tarifas justas y tecnología al servicio de los vecinos. 100% gestión vecinal, sin intermediarios.",
  ctaPrimary: { label: "Contactar directiva", href: "#contacto" },
  ctaSecondary: { label: "Ver tarifas", href: "#tarifas" },
  image: {
    src: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80&auto=format&fit=crop",
    alt: "Comunidad OTB y servicio de agua",
  },
};

export const stats = [
  { value: "550+", label: "Familias asociadas" },
  { value: "520", label: "Medidores activos" },
  { value: "98%", label: "Cobertura de la zona" },
  { value: "100%", label: "Gestión comunitaria" },
];

export const trustedBy = {
  title: "Respaldado por la comunidad y autoridades locales",
  logos: [
    "FEJUVE Cochabamba",
    "Sub Alcaldía",
    "Control Social",
    "OTB Don Bosco",
    "Junta Vecinal",
    "Comité de Agua",
  ],
};

export const valueProps = {
  eyebrow: "Gestión 100% comunitaria",
  title: "Tu ventaja como vecino: control, transparencia y cercanía.",
  description:
    "A diferencia de servicios tercerizados, la OTB administra directamente cada medidor, cada lectura y cada boliviano recaudado.",
  items: [
    {
      title: "Control directo de medidores y lecturas",
      description:
        "Cada lectura se registra con foto y georeferencia. Elimina estimaciones y garantiza cobro justo.",
      image:
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80&auto=format&fit=crop",
    },
    {
      title: "Transparencia total en cada factura",
      description:
        "Facturación automática por rangos de consumo + tarifa base. Descuentos y recibos PDF auditables.",
      image:
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80&auto=format&fit=crop",
    },
    {
      title: "Resolución sin burocracia",
      description:
        "Trato directo con la directiva. Sin call centers: WhatsApp y atención presencial.",
      image:
        "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80&auto=format&fit=crop",
    },
    {
      title: "Recursos optimizados para tu zona",
      description:
        "Tarifas configuradas por tipo de medidor y rangos de consumo. Lo recaudado se reinvierte en la red.",
      image:
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80&auto=format&fit=crop",
    },
  ],
};

export const coverage = {
  title: "Cobertura total de la zona.",
  description:
    "Mientras otros servicios se dispersan, nosotros nos enfocamos en Don Bosco. Conocemos cada calle, cada medidor y cada familia. Esa cercanía es nuestra fortaleza y tu garantía de servicio continuo.",
  cta: { label: "Ver zonas en el mapa", href: "#zonas" },
  image:
    "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=80&auto=format&fit=crop",
  zones: ["Zona Norte", "Zona Central", "Zona Sud", "Ampliación Don Bosco"],
};

export const techFeatures = {
  eyebrow: "Nuestra plataforma te da el control",
  title: "Tecnología simple que pone el agua en tus manos",
  description:
    "Plataforma propia para lectura, facturación y pagos — con visibilidad que otros no pueden ofrecer.",
  ctaPrimary: { label: "Solicitar demo", href: "#contacto" },
  ctaSecondary: { label: "Ver cómo funciona", href: "#tecnologia" },
  bullets: [
    "Lectura con foto y validación automática",
    "Visibilidad completa del historial de consumo",
    "Foto y firma en cada registro",
    "Métricas por zona y medidor",
    "Integración WhatsApp para avisos",
  ],
  image:
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&q=80&auto=format&fit=crop",
};

export const services = {
  title: "Pensado para cada necesidad de la comunidad",
  description:
    "Desde el agua potable hasta la organización de actividades vecinales, todo en un mismo sistema.",
  items: [
    {
      title: "Agua potable",
      desc: "Medición mensual, facturación justa por rangos y control de calidad.",
      image:
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&q=80&auto=format&fit=crop",
      href: "#",
    },
    {
      title: "Acciones de agua",
      desc: "Gestión de acciones, pagos en cuotas y comprobantes digitales.",
      image:
        "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=80&auto=format&fit=crop",
      href: "#",
    },
    {
      title: "Actividades y multas",
      desc: "Control de asistencia a asambleas y trabajos comunitarios con multas automatizadas.",
      image:
        "https://images.unsplash.com/photo-1511635001-e5a2487f9c00?w=600&q=80&auto=format&fit=crop",
      href: "#",
    },
    {
      title: "Tarifas justas",
      desc: "Tarifa base + rangos por m³. Transparente y configurable por gestión.",
      image:
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80&auto=format&fit=crop",
      href: "#tarifas",
    },
    {
      title: "Notificaciones",
      desc: "Avisos por WhatsApp: factura generada, vencimiento y bienvenida.",
      image:
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80&auto=format&fit=crop",
      href: "#",
    },
    {
      title: "Reportes",
      desc: "Ingresos por fuente, saldos pendientes y exportación CSV para auditoría.",
      image:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80&auto=format&fit=crop",
      href: "#",
    },
  ],
};

export const partnership = {
  title: "Más que un servicio, tu OTB",
  description:
    "Somos tus vecinos. La directiva es electa en asamblea y rinde cuentas. Trabajas con caras conocidas que conocen tu calle y tu medidor.",
  bullets: [
    {
      title: "Caras conocidas",
      desc: "Directiva electa y estable. Atención personalizada sin rotación de personal.",
    },
    {
      title: "Siempre accesibles",
      desc: "Atención presencial y WhatsApp directo. Sin menús automáticos ni esperas.",
    },
    {
      title: "Estabilidad comprobada",
      desc: "Años de gestión continua, balances públicos y mantenimiento preventivo de la red.",
    },
  ],
  image:
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=80&auto=format&fit=crop",
};

export const faqs = [
  {
    q: "¿Cómo me afilio como socio de la OTB?",
    a: "Presenta tu CI, llena la ficha de socio y solicita tu medidor. La directiva te asigna código y zona. El costo de la acción de agua puede pagarse en cuotas.",
  },
  {
    q: "¿Qué incluye la tarifa de agua?",
    a: "Una tarifa base fija mensual + cobro por rangos de consumo (m³). Cada gestión se publica en asamblea. Puedes ver tu historial en el portal de socios.",
  },
  {
    q: "¿Cómo se registra mi consumo?",
    a: "Cada mes un operador registra la lectura con foto del medidor. El sistema calcula el consumo por diferencia y genera tu factura automáticamente.",
  },
  {
    q: "¿Cuándo vencen las facturas y cómo pago?",
    a: "El vencimiento es el día configurado cada mes (por defecto día 15). Pagas en oficina OTB en efectivo/transferencia y recibes recibo PDF. Pronto habilitaremos QR.",
  },
  {
    q: "¿Qué pasa si no pago a tiempo?",
    a: "La factura queda pendiente y luego vencida. El sistema notifica por WhatsApp. Tras varios periodos, se programa corte previo aviso en asamblea.",
  },
  {
    q: "¿Puedo ver mi historial y descargar recibos?",
    a: "Sí, en el portal de socios con tu CI. Ves consumo, facturas, pagos y descargas recibos en PDF generados automáticamente.",
  },
  {
    q: "¿Cómo funcionan las actividades y multas?",
    a: "La OTB convoca actividades (asambleas, trabajos). Se controla asistencia al inicio y final. La inasistencia genera multa según el tipo configurado; puedes pagarla junto a tu factura.",
  },
  {
    q: "¿Tienen notificaciones por WhatsApp?",
    a: "Sí. Recibes mensaje al registrarte, al instalar tu medidor y cuando se genera tu factura de consumo.",
  },
];

export const finalCta = {
  title: "Construyamos juntos el servicio que mereces",
  description:
    "Habla con la directiva sobre tu medidor, acción de agua o afiliación. Te armamos un plan a tu medida.",
  cta: { label: "Contactar por WhatsApp", href: `https://wa.me/${siteConfig.contact.whatsapp}?text=Hola%20OTB%20Don%20Bosco,%20quiero%20información` },
  image:
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=80&auto=format&fit=crop",
};

export const footerLinks = {
  services: [
    { label: "Agua potable", href: "#servicios" },
    { label: "Acciones de agua", href: "#servicios" },
    { label: "Actividades", href: "#servicios" },
    { label: "Tarifas", href: "#tarifas" },
  ],
  tech: [
    { label: "Lectura con foto", href: "#tecnologia" },
    { label: "Facturación", href: "#tecnologia" },
    { label: "WhatsApp", href: "#tecnologia" },
  ],
  comunidad: [
    { label: "Historia", href: "#nosotros" },
    { label: "Zonas", href: "#zonas" },
    { label: "Contacto", href: "#contacto" },
    { label: "Portal Socios", href: siteConfig.portalUrl },
  ],
};
