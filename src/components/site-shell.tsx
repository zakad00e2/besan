import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Globe, Instagram, Mail } from "lucide-react";
import { siteContactLinks } from "@/features/site-language/site-contact";
import { useSiteLanguage } from "@/features/site-language/site-language";
import { getAlternateLocalePath, getPublicPath } from "@/features/seo/site-config";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function SiteSocialLinks() {
  const { messages } = useSiteLanguage();
  const links = [
    {
      href: siteContactLinks.instagram,
      label: messages.footer.instagram,
      icon: Instagram,
      external: true,
    },
    {
      href: siteContactLinks.whatsapp,
      label: messages.footer.whatsapp,
      icon: WhatsAppIcon,
      external: true,
    },
    { href: siteContactLinks.email, label: messages.footer.email, icon: Mail, external: false },
  ] as const;

  return (
    <div className="flex items-center gap-3">
      {links.map(({ href, label, icon: Icon, external }) => (
        <a
          key={href}
          href={href}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          aria-label={label}
          className="motion-press flex h-10 w-10 items-center justify-center rounded-full border border-foreground/70 text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          <Icon className="h-[18px] w-[18px]" />
        </a>
      ))}
    </div>
  );
}

export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "section" | "header" | "footer";
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,translate] duration-[var(--motion-duration-editorial)] ease-[var(--motion-ease-out)] motion-reduce:transition-opacity ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

export function SiteNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const { direction, locale, messages } = useSiteLanguage();
  const homePath = getPublicPath("home", locale);
  const nav = [
    { label: messages.nav.about, href: `${homePath}#about` },
    { label: messages.nav.opinions, href: `${homePath}#opinions` },
    { label: messages.nav.services, href: `${homePath}#services` },
  ];

  return (
    <header data-testid="site-nav" dir={direction} className="w-full border-b border-foreground/70">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[1fr_auto] items-center gap-5 px-6 py-3 md:px-10 lg:grid-cols-[1fr_auto_1fr]">
        <a
          href={homePath}
          className={`whitespace-nowrap font-serif font-medium leading-tight tracking-normal lg:col-start-1 ${locale === "ar" ? "text-xl md:text-2xl" : "text-lg md:text-xl"}`}
        >
          {locale === "ar" ? "بيسان خلايلة" : "BESAN KHALAILY"}
        </a>
        <nav className="hidden items-center justify-self-center gap-7 lg:col-start-2 lg:flex">
          {nav.map((item) => {
            const active = pathname === homePath && item.href === `${homePath}#about`;
            return (
              <a
                key={item.label}
                href={item.href}
                className={`tracking-[0.05em] transition-opacity hover:opacity-60 ${locale === "ar" ? "text-sm font-light" : "text-xs"} ${
                  active ? "underline underline-offset-4" : ""
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="col-start-2 flex shrink-0 items-center justify-self-end gap-2 lg:col-start-3">
          <a
            href={getAlternateLocalePath(pathname, locale === "en" ? "ar" : "en")}
            aria-label={messages.nav.switchLanguage}
            className={`motion-press inline-flex size-[33px] items-center justify-center border border-foreground/50 leading-none transition-colors hover:bg-foreground hover:text-background ${locale === "en" ? "language-switch-arabic text-sm" : "text-xs"}`}
          >
            {messages.nav.language}
          </a>
          <a
            href={getPublicPath("bookCall", locale)}
            className={`motion-press border border-foreground px-5 py-2 text-[10px] tracking-[0.05em] transition-colors hover:bg-foreground hover:text-background md:text-xs ${locale === "ar" ? "arabic-name-title" : ""} ${pathname === getPublicPath("bookCall", locale) ? "bg-foreground text-background" : ""}`}
          >
            {messages.nav.book}
          </a>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { direction } = useSiteLanguage();
  return (
    <footer id="contact" dir={direction} className="bg-accent/40">
      <Reveal className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <SiteSocialLinks />
          <div className="hidden h-px flex-1 bg-foreground/40 md:mx-10 md:block" />
          <a
            href="https://besankhalaily.com"
            className="flex items-center gap-3 text-lg md:text-xl"
          >
            <Globe className="h-5 w-5 rtl:order-last" />
            <span dir="ltr" className="rtl:order-first">
              besankhalaily.com
            </span>
          </a>
        </div>
        <p className="mt-16 text-center text-xs tracking-[0.2em] text-muted-foreground">
          © {new Date().getFullYear()} BESAN KHALAILY · ALL RIGHTS RESERVED
        </p>
      </Reveal>
    </footer>
  );
}
