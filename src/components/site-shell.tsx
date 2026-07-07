import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDownLeft, Globe } from "lucide-react";

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
      className={`transition-all duration-[900ms] ease-out will-change-transform motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

const NAV = [
  { label: "ABOUT", href: "/#about" },
  { label: "SERVICES", href: "/#services" },
  { label: "BLOG", href: "/#blog" },
  { label: "CONTACT", href: "/#contact" },
];

export function SiteNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <header className="w-full border-b border-foreground/70">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-5 px-6 py-3 md:px-10">
        <a
          href="/"
          className="whitespace-nowrap font-serif text-lg font-medium leading-tight tracking-normal md:text-xl"
        >
          BESAN KHALAILY
        </a>
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/workshops"
                ? pathname === "/workshops"
                : pathname === "/" && item.label === "ABOUT";
            return (
              <a
                key={item.label}
                href={item.href}
                className={`text-xs tracking-[0.05em] transition-opacity hover:opacity-60 ${
                  active ? "underline underline-offset-4" : ""
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <a
          href="/book-call"
          className={`shrink-0 border border-foreground px-5 py-2 text-[10px] tracking-[0.05em] transition-colors hover:bg-foreground hover:text-background md:text-xs ${
            pathname === "/book-call" ? "bg-foreground text-background" : ""
          }`}
        >
          BOOK A CALL
        </a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer id="contact" className="bg-accent/40">
      <Reveal className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <a href="/workshops" className="flex items-center gap-4 text-lg md:text-xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background">
              <ArrowDownLeft className="h-5 w-5" />
            </span>
            Read more
          </a>
          <div className="hidden h-px flex-1 bg-foreground/40 md:mx-10 md:block" />
          <a
            href="https://besankhalaily.com"
            className="flex items-center gap-3 text-lg md:text-xl"
          >
            <Globe className="h-5 w-5" />
            besankhalaily.com
          </a>
        </div>
        <p className="mt-16 text-center text-xs tracking-[0.2em] text-muted-foreground">
          © {new Date().getFullYear()} BESAN KHALAILY · ALL RIGHTS RESERVED
        </p>
      </Reveal>
    </footer>
  );
}
