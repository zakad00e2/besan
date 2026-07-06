import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Plus, Minus, Globe, ArrowDownLeft } from "lucide-react";
import portrait from "@/assets/besan-portrait.png";

export const Route = createFileRoute("/")({
  component: Index,
});

function Reveal({
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
  { label: "ABOUT", href: "#about" },
  { label: "SERVICES", href: "#services" },
  { label: "BLOG", href: "#blog" },
  { label: "CONTACT", href: "#contact" },
];

const TESTIMONIALS = [
  {
    quote:
      "Besan designed a piece that felt made for me — the cut, the fabric, every detail carried her signature. I've never felt more elegant in something I own.",
    name: "Private Client",
  },
  {
    quote:
      "Her eye for silhouette and texture is remarkable. Working with Besan turned an idea into a wardrobe I truly live in — timeless, quiet, unmistakable.",
    name: "Editorial Stylist",
  },
  {
    quote:
      "A rare designer who listens as beautifully as she creates. Every fitting felt personal, and the final piece was pure craftsmanship.",
    name: "Bridal Client",
  },
];

const SERVICES = [
  {
    title: "Made-to-Measure",
    body: "Custom garments tailored to your measurements and personal style — from first sketch to final fitting, crafted for the way you live.",
  },
  {
    title: "Bridal & Evening Wear",
    body: "Signature bridal and occasion pieces designed with delicate detailing, refined silhouettes, and fabrics chosen for a timeless presence.",
  },
  {
    title: "Ready-to-Wear Collections",
    body: "Seasonal capsule collections of quiet, versatile essentials — thoughtful cuts and natural fabrics made to layer and last.",
  },
  {
    title: "Personal Styling",
    body: "One-on-one styling sessions to define your wardrobe, refine your silhouette, and build a cohesive look that feels entirely yours.",
  },
  {
    title: "Design Consultation",
    body: "Collaborative sessions for brands and private clients — from concept and mood direction to pattern, fabric, and finishing choices.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Testimonials />
      <HowICanHelp />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="w-full border-b border-foreground/70">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3 md:px-10">
        <a href="#" className="whitespace-nowrap font-serif text-lg font-medium leading-tight tracking-normal md:text-xl">
          BESAN KHALAILY
        </a>
        <nav className="hidden items-center gap-10 md:flex">
          {NAV.map((item, i) => (
            <a
              key={item.label}
              href={item.href}
              className={`text-xs tracking-[0.05em] transition-opacity hover:opacity-60 ${
                i === 0 ? "underline underline-offset-4" : ""
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <a
          href="#contact"
          className="border border-foreground px-5 py-2 text-[10px] tracking-[0.05em] transition-colors hover:bg-foreground hover:text-background md:text-xs"
        >
          BOOK A CALL
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="about" className="grid w-full grid-cols-1 gap-0 px-0 md:h-screen md:grid-cols-2">
      <Reveal className="group relative aspect-[4/5] w-full overflow-hidden md:aspect-auto md:h-full">
        <img
          src={portrait}
          alt="Portrait of Besan Khalaily"
          width={1024}
          height={1280}
          className="h-full w-full object-cover grayscale transition-all duration-700 ease-out group-hover:grayscale-0 group-hover:scale-[1.02]"
        />
      </Reveal>
      <div className="flex flex-col justify-center px-8 py-16 md:px-16 md:py-24">
        <Reveal><p className="font-serif text-3xl italic md:text-4xl">I am</p></Reveal>
        <Reveal delay={80}>
          <h1 className="mt-3 font-serif text-5xl leading-[0.85] tracking-tighter md:text-7xl">
            BESAN
            <br />
            KHALAILY
          </h1>
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-4 max-w-md space-y-4 text-xs leading-relaxed text-muted-foreground md:text-[13px]">
            <p>
              I am an independent fashion designer creating quiet, considered pieces where craft meets modern
              femininity — tailored silhouettes, natural fabrics, and timeless details.
            </p>
            <p>
              Each collection is designed to feel personal — an intimate wardrobe made to move with you and
              last beyond seasons.
            </p>
          </div>
        </Reveal>
        <Reveal delay={320}>
          <div className="mt-10">
            <a
              href="#services"
              className="inline-block border border-foreground px-16 py-4 text-xs font-normal tracking-[0.1em] transition-colors hover:bg-foreground hover:text-background"
            >
              MY SERVICES
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Testimonials() {
  const [i, setI] = useState(0);
  const t = TESTIMONIALS[i];
  const prev = () => setI((v) => (v - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const next = () => setI((v) => (v + 1) % TESTIMONIALS.length);

  return (
    <section className="border-y border-foreground/70 bg-background py-24 md:py-32">
      <Reveal className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 md:px-10">
        <button
          onClick={prev}
          aria-label="Previous"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 md:h-12 md:w-12"
        >
          <ChevronLeft className="h-3.5 w-3.5 md:h-5 md:w-5" />
        </button>
        <div className="flex flex-1 flex-col justify-center text-center min-h-[280px] md:min-h-[240px]">
          <blockquote
            key={i}
            className="mx-auto max-w-3xl font-serif text-2xl not-italic leading-[1.1] tracking-tighter md:text-4xl [word-spacing:-0.05em] animate-fade-in"
          >
            {t.quote}
          </blockquote>
          <p key={`n-${i}`} className="mt-10 text-xs tracking-[0.2em] text-muted-foreground animate-fade-in">
            {t.name}
          </p>
        </div>
        <button
          onClick={next}
          aria-label="Next"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 md:h-12 md:w-12"
        >
          <ChevronRight className="h-3.5 w-3.5 md:h-5 md:w-5" />
        </button>
      </Reveal>
    </section>
  );
}

function HowICanHelp() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="services" className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
      <div className="grid grid-cols-1 gap-16 md:grid-cols-2 md:gap-24">
        <Reveal>
          <h2 className="font-serif text-5xl leading-[1] tracking-tighter md:text-6xl [word-spacing:-0.05em]">
            How <em className="not-italic">I Can Help</em>
          </h2>
          <a
            href="#contact"
            className="mt-6 inline-block border border-foreground px-14 py-4 text-xs tracking-[0.1em] transition-colors hover:bg-foreground hover:text-background"
          >
            BOOK A CALL
          </a>
        </Reveal>
        <div>
          {SERVICES.map((s, idx) => {
            const isOpen = open === idx;
            return (
              <Reveal key={s.title} delay={idx * 80}>
                <div className="border-t border-foreground/60 first:border-t-0 last:border-b">
                  <button
                    onClick={() => setOpen(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between py-3 text-left"
                  >
                    <span className="font-serif text-xl md:text-2xl">{s.title}</span>
                    {isOpen ? (
                      <Minus className="h-5 w-5 shrink-0" />
                    ) : (
                      <Plus className="h-5 w-5 shrink-0" />
                    )}
                  </button>
                  <div
                    className={`grid overflow-hidden transition-all duration-300 ${
                      isOpen ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr]"
                    }`}
                  >
                    <p className="min-h-0 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contact" className="bg-accent/40">
      <Reveal className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <a href="#" className="flex items-center gap-4 text-lg md:text-xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background">
              <ArrowDownLeft className="h-5 w-5" />
            </span>
            Read more
          </a>
          <div className="hidden h-px flex-1 bg-foreground/40 md:mx-10 md:block" />
          <a href="#" className="flex items-center gap-3 text-lg md:text-xl">
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
