import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUpLeft, ChevronLeft, ChevronRight } from "lucide-react";
import portrait from "@/assets/besan-portrait.png";
import { Reveal, SiteFooter, SiteNav } from "@/components/site-shell";
import { PublicSite } from "@/features/site-language/public-site";
import { useSiteLanguage } from "@/features/site-language/site-language";

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

const ARABIC_TESTIMONIALS = [
  { quote: "صممت بيسان قطعة بدت وكأنها صُنعت لي وحدي؛ القصّة والقماش وكل تفصيل يحمل بصمتها.", name: "عميلة خاصة" },
  { quote: "نظرتها للقوام والملمس استثنائية. حوّلت بيسان فكرة إلى خزانة أعيش بها حقًا؛ هادئة وخالدة.", name: "منسقة أزياء" },
  { quote: "مصممة نادرة تستمع بجمال ما تبدع. كانت كل جلسة قياس شخصية، والقطعة النهائية حِرفة خالصة.", name: "عميلة زفاف" },
];

const ARABIC_SERVICES = [
  { title: "تصميم حسب المقاس", body: "قطع مخصصة وفق قياساتك وأسلوبك الشخصي، من الرسم الأول حتى جلسة القياس الأخيرة." },
  { title: "فساتين الزفاف والسهرات", body: "قطع للزفاف والمناسبات بتفاصيل رقيقة وقصّات راقية وأقمشة مختارة بعناية." },
  { title: "مجموعات جاهزة للارتداء", body: "مجموعات موسمية هادئة وعملية، بقصّات مدروسة وأقمشة طبيعية تدوم." },
  { title: "تنسيق شخصي", body: "جلسات فردية لتحديد خزانة ملابسك وصقل إطلالتك وبناء مظهر يعبر عنك." },
  { title: "استشارة تصميم", body: "جلسات تعاونية للعلامات التجارية والعميلات الخاصات، من الفكرة حتى القماش والتشطيب." },
];

function Index() {
  return (
    <PublicSite>
      <div className="min-h-screen bg-background text-foreground">
        <SiteNav />
        <Hero />
        <Testimonials />
        <HowICanHelp />
        <SiteFooter />
      </div>
    </PublicSite>
  );
}

function Hero() {
  const { locale } = useSiteLanguage();
  const ar = locale === "ar";
  return (
    <section id="about" className="grid w-full grid-cols-1 gap-0 px-0 md:h-screen md:grid-cols-2">
      <Reveal className="group relative aspect-[4/5] w-full overflow-hidden md:aspect-auto md:h-full">
        <img
          src={portrait}
          alt="Portrait of Besan Khalaily"
          width={1024}
          height={1280}
          className="editorial-image main-portrait-image h-full w-full object-cover"
        />
      </Reveal>
      <div className="flex flex-col justify-center px-8 py-16 md:px-16 md:py-24">
        <Reveal>
          {ar ? null : <p className="font-serif text-3xl italic md:text-4xl">I am</p>}
        </Reveal>
        <Reveal delay={80}>
          <h1 className={`mt-3 font-serif text-5xl leading-[0.85] tracking-tighter md:text-7xl ${ar ? "arabic-name-title" : ""}`}>
            {ar ? (
              <>بيسان خلايلة</>
            ) : (
              <>BESAN<br />KHALAILY</>
            )}
          </h1>
        </Reveal>
        <Reveal delay={200}>
          <div className={`mt-4 max-w-md text-muted-foreground ${ar ? "space-y-2 text-base leading-6 md:text-lg md:leading-7" : "space-y-4 text-xs leading-relaxed md:text-[13px]"}`}>
            {ar ? (
              <p>مصممة أزياء مستقلة أبتكر قطعًا هادئة ومدروسة تجمع بين الحِرفة والأنوثة المعاصرة. كل مجموعة مصممة لتشعرك بأنها خاصة بك، بخزانة حميمة ترافقك وتتجاوز المواسم.</p>
            ) : (
              <>
                <p>I am an independent fashion designer creating quiet, considered pieces where craft meets modern femininity - tailored silhouettes, natural fabrics, and timeless details.</p>
                <p>Each collection is designed to feel personal - an intimate wardrobe made to move with you and last beyond seasons.</p>
              </>
            )}
          </div>
        </Reveal>
        <Reveal delay={320}>
          <div className="mt-10">
            <a
              href="/workshops"
              className={`motion-press relative inline-flex w-48 items-center justify-start border border-foreground px-6 py-4 ${ar ? "text-sm md:text-base" : "text-xs"} font-normal tracking-[0.1em] transition-colors hover:bg-foreground hover:text-background ${ar ? "arabic-name-title" : ""}`}
            >
              {ar ? "ورش العمل" : "WORKSHOPS"}
              <ArrowUpLeft className={`absolute end-5 size-4 ${ar ? "" : "scale-x-[-1]"}`} aria-hidden="true" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Testimonials() {
  const { locale } = useSiteLanguage();
  const ar = locale === "ar";
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);
  const pendingIndex = useRef(0);
  const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const testimonials = ar ? ARABIC_TESTIMONIALS : TESTIMONIALS;
  const t = testimonials[i];

  useEffect(
    () => () => {
      if (swapTimer.current) clearTimeout(swapTimer.current);
    },
    [],
  );

  const move = (delta: number) => {
    pendingIndex.current =
      (pendingIndex.current + delta + testimonials.length) % testimonials.length;
    setVisible(false);
    if (swapTimer.current) clearTimeout(swapTimer.current);
    swapTimer.current = setTimeout(() => {
      setI(pendingIndex.current);
      requestAnimationFrame(() => setVisible(true));
    }, 90);
  };

  return (
    <section id="opinions" className="border-y border-foreground/70 bg-background py-12 md:py-32">
      <Reveal className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 md:px-10">
        <button
          onClick={() => move(-1)}
          aria-label={ar ? "الشهادة السابقة" : "Previous"}
          className="motion-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background md:h-12 md:w-12"
        >
          <ChevronLeft className={`h-3.5 w-3.5 md:h-5 md:w-5 ${ar ? "scale-x-[-1]" : ""}`} />
        </button>
        <div className="flex min-h-[200px] flex-1 flex-col justify-center text-center md:min-h-[240px]">
          <div
            data-testid="testimonial-copy"
            className={`transition-[opacity,translate] duration-[var(--motion-duration-state)] ease-[var(--motion-ease-out)] motion-reduce:translate-y-0 ${
              visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            }`}
          >
            <blockquote className="mx-auto max-w-3xl font-serif text-2xl leading-[1.1] tracking-tighter md:text-4xl [word-spacing:-0.05em]">
              {t.quote}
            </blockquote>
            <p className="mt-6 text-xs tracking-[0.2em] text-muted-foreground md:mt-10">{t.name}</p>
          </div>
        </div>
        <button
          onClick={() => move(1)}
          aria-label={ar ? "الشهادة التالية" : "Next"}
          className="motion-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background md:h-12 md:w-12"
        >
          <ChevronRight className={`h-3.5 w-3.5 md:h-5 md:w-5 ${ar ? "scale-x-[-1]" : ""}`} />
        </button>
      </Reveal>
    </section>
  );
}

export function HowICanHelp() {
  const { locale } = useSiteLanguage();
  const ar = locale === "ar";
  const services = ar ? ARABIC_SERVICES : SERVICES;
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="services" className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
      <div className="grid grid-cols-1 gap-16 md:grid-cols-2 md:gap-24">
        <Reveal>
          <h2 className={`font-serif text-5xl leading-[1] tracking-tighter md:text-6xl [word-spacing:-0.05em] ${ar ? "arabic-name-title" : ""}`}>
            {ar ? <>كيف <em className="not-italic">أساعدك</em></> : <>How <em className="not-italic">I Can Help</em></>}
          </h2>
          <a
            href="/book-call"
            className={`motion-press mt-6 inline-block border border-foreground px-14 py-4 tracking-[0.1em] transition-colors hover:bg-foreground hover:text-background ${ar ? "arabic-name-title text-base" : "text-xs"}`}
          >
            {ar ? "احجزي موعدًا" : "BOOK A CALL"}
          </a>
        </Reveal>
        <div>
          {services.map((service, idx) => {
            const isOpen = open === idx;
            return (
              <Reveal key={service.title} delay={idx * 80}>
                <div className="border-t border-foreground/60 first:border-t-0 last:border-b">
                  <button
                    onClick={() => setOpen(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between py-3 text-start"
                  >
                    <span className="font-serif text-xl md:text-2xl">{service.title}</span>
                    <span
                      data-testid={`service-indicator-${idx}`}
                      data-state={isOpen ? "open" : "closed"}
                      className="relative h-5 w-5 shrink-0"
                      aria-hidden="true"
                    >
                      <span className="absolute left-0 top-1/2 h-px w-5 -translate-y-1/2 bg-current" />
                      <span
                        className={`absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 bg-current transition-transform duration-[var(--motion-duration-state)] ease-[var(--motion-ease-out)] motion-reduce:transition-none ${
                          isOpen ? "scale-y-0" : "scale-y-100"
                        }`}
                      />
                    </span>
                  </button>
                  <div
                    data-testid={`service-panel-${idx}`}
                    className={`grid overflow-hidden transition-[grid-template-rows,padding-bottom] duration-[var(--motion-duration-reveal)] ease-[var(--motion-ease-move)] motion-reduce:transition-none ${
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
