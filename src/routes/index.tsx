import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import portrait from "@/assets/besan-portrait.png";
import { Reveal, SiteFooter, SiteNav } from "@/components/site-shell";

export const Route = createFileRoute("/")({
  component: Index,
});

const TESTIMONIALS = [
  {
    quote:
      "Besan designed a piece that felt made for me - the cut, the fabric, every detail carried her signature. I've never felt more elegant in something I own.",
    name: "Private Client",
  },
  {
    quote:
      "Her eye for silhouette and texture is remarkable. Working with Besan turned an idea into a wardrobe I truly live in - timeless, quiet, unmistakable.",
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
    body: "Custom garments tailored to your measurements and personal style - from first sketch to final fitting, crafted for the way you live.",
  },
  {
    title: "Bridal & Evening Wear",
    body: "Signature bridal and occasion pieces designed with delicate detailing, refined silhouettes, and fabrics chosen for a timeless presence.",
  },
  {
    title: "Ready-to-Wear Collections",
    body: "Seasonal capsule collections of quiet, versatile essentials - thoughtful cuts and natural fabrics made to layer and last.",
  },
  {
    title: "Personal Styling",
    body: "One-on-one styling sessions to define your wardrobe, refine your silhouette, and build a cohesive look that feels entirely yours.",
  },
  {
    title: "Design Consultation",
    body: "Collaborative sessions for brands and private clients - from concept and mood direction to pattern, fabric, and finishing choices.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <Hero />
      <Testimonials />
      <HowICanHelp />
      <SiteFooter />
    </div>
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
          className="h-full w-full object-cover grayscale transition-all duration-700 ease-out group-hover:scale-[1.02] group-hover:grayscale-0"
        />
      </Reveal>
      <div className="flex flex-col justify-center px-8 py-16 md:px-16 md:py-24">
        <Reveal>
          <p className="font-serif text-3xl italic md:text-4xl">I am</p>
        </Reveal>
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
              I am an independent fashion designer creating quiet, considered pieces where craft
              meets modern femininity - tailored silhouettes, natural fabrics, and timeless details.
            </p>
            <p>
              Each collection is designed to feel personal - an intimate wardrobe made to move with
              you and last beyond seasons.
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
        <div className="flex min-h-[280px] flex-1 flex-col justify-center text-center md:min-h-[240px]">
          <blockquote
            key={i}
            className="mx-auto max-w-3xl animate-fade-in font-serif text-2xl leading-[1.1] tracking-tighter md:text-4xl [word-spacing:-0.05em]"
          >
            {t.quote}
          </blockquote>
          <p
            key={`n-${i}`}
            className="mt-10 animate-fade-in text-xs tracking-[0.2em] text-muted-foreground"
          >
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
            href="/book-call"
            className="mt-6 inline-block border border-foreground px-14 py-4 text-xs tracking-[0.1em] transition-colors hover:bg-foreground hover:text-background"
          >
            BOOK A CALL
          </a>
        </Reveal>
        <div>
          {SERVICES.map((service, idx) => {
            const isOpen = open === idx;
            return (
              <Reveal key={service.title} delay={idx * 80}>
                <div className="border-t border-foreground/60 first:border-t-0 last:border-b">
                  <button
                    onClick={() => setOpen(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between py-3 text-left"
                  >
                    <span className="font-serif text-xl md:text-2xl">{service.title}</span>
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
                    <p className="min-h-0 text-sm leading-relaxed text-muted-foreground">
                      {service.body}
                    </p>
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
