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
      "From our first session, I felt the design was made for me; every detail reflected my personality.",
    name: "Private Client",
  },
  {
    quote:
      "The piece was comfortable and elegant at the same time. Every time I wear it, it still feels just as special.",
    name: "Editorial Stylist",
  },
  {
    quote:
      "Besan understood exactly what I had in mind, and the result was even more beautiful than I expected.",
    name: "Bridal Client",
  },
  {
    quote:
      "The design was simple in such an elegant way, and that was exactly what I had been looking for.",
    name: "Besan Client",
  },
];

const SERVICES = [
  {
    title: "Made-to-Measure",
    body: "Custom garments tailored to your measurements and personal style - from first sketch to final fitting, crafted for the way you live.",
  },
  {
    title: "Ready-to-Wear Collections",
    body: "Seasonal capsule collections of quiet, versatile essentials - thoughtful cuts and natural fabrics made to layer and last.",
  },
  {
    title: "Design Consultation",
    body: "Collaborative sessions for brands and private clients - from concept and mood direction to pattern, fabric, and finishing choices.",
  },
];

const ARABIC_CLIENT_TESTIMONIALS = [
  { quote: "\u0645\u0646 \u0623\u0648\u0644 \u062c\u0644\u0633\u0629 \u062d\u0633\u0651\u064a\u062a \u0625\u0646\u0647 \u0627\u0644\u062a\u0635\u0645\u064a\u0645 \u0645\u0639\u0645\u0648\u0644 \u0625\u0644\u064a\u060c \u0648\u0643\u0644 \u062a\u0641\u0635\u064a\u0644 \u0643\u0627\u0646 \u064a\u0639\u0643\u0633 \u0634\u062e\u0635\u064a\u062a\u064a", name: "\u0639\u0645\u064a\u0644\u0629 \u062e\u0627\u0635\u0629" },
  { quote: "\u0627\u0644\u0642\u0637\u0639\u0629 \u0643\u0627\u0646\u062a \u0645\u0631\u064a\u062d\u0629 \u0648\u0623\u0646\u064a\u0642\u0629 \u0628\u0646\u0641\u0633 \u0627\u0644\u0648\u0642\u062a\u060c \u0648\u0643\u0644 \u0645\u0631\u0629 \u0623\u0644\u0628\u0633\u0647\u0627 \u0628\u062d\u0633 \u0625\u0646\u0647\u0627 \u0645\u0627 \u0641\u0642\u062f\u062a \u0642\u064a\u0645\u062a\u0647\u0627", name: "\u0645\u0646\u0633\u0642\u0629 \u0623\u0632\u064a\u0627\u0621" },
  { quote: "\u0628\u064a\u0633\u0627\u0646 \u0641\u0647\u0645\u062a \u062a\u0645\u0627\u0645\u064b\u0627 \u0634\u0648 \u0643\u0646\u062a \u0628\u062a\u062e\u064a\u0644\u060c \u0648\u0627\u0644\u0646\u062a\u064a\u062c\u0629 \u0643\u0627\u0646\u062a \u0623\u062c\u0645\u0644 \u0645\u0645\u0627 \u062a\u0648\u0642\u0639\u062a", name: "\u0639\u0645\u064a\u0644\u0629 \u0632\u0641\u0627\u0641" },
  { quote: "\u0627\u0644\u062a\u0635\u0645\u064a\u0645 \u0643\u0627\u0646 \u0628\u0633\u064a\u0637\u064b\u0627 \u0628\u0637\u0631\u064a\u0642\u0629 \u0631\u0627\u0642\u064a\u0629\u060c \u0648\u0647\u0630\u0627 \u0628\u0627\u0644\u0636\u0628\u0637 \u0627\u0644\u0644\u064a \u0643\u0646\u062a \u0623\u0628\u062d\u062b \u0639\u0646\u0647", name: "\u0639\u0645\u064a\u0644\u0629 \u0628\u064a\u0633\u0627\u0646" },
];

const ARABIC_TESTIMONIALS = [
  { quote: "صممت بيسان قطعة بدت وكأنها صُنعت لي وحدي؛ القصّة والقماش وكل تفصيل يحمل بصمتها.", name: "عميلة خاصة" },
  { quote: "نظرتها للقوام والملمس استثنائية. حوّلت بيسان فكرة إلى خزانة أعيش بها حقًا؛ هادئة وخالدة.", name: "منسقة أزياء" },
  { quote: "مصممة نادرة تستمع بجمال ما تبدع. كانت كل جلسة قياس شخصية، والقطعة النهائية حِرفة خالصة.", name: "عميلة زفاف" },
];

const ARABIC_SERVICES = [
  { title: "تصميم خاص", body: "قطع مخصصة وفق قياساتك وأسلوبك الشخصي، من الرسم الأول حتى جلسة القياس الأخيرة." },
  { title: "مجموعات جاهزة للارتداء", body: "استأجري فستانًا جاهزًا بعناية، يجمع بين الأناقة، الجودة، والراحة ليمنحك إطلالة مميزة في كل مناسبة." },
  { title: "استشارة تصميم", body: "جلسة شخصية لاختيار كل ما يناسبك، من القصة والخامة إلى اللون والتفاصيل، بهدف الوصول إلى تصميم صُنع خصيصًا لك" },
];

const ORDERED_ARABIC_SERVICES = [
  ARABIC_SERVICES[1],
  ARABIC_SERVICES[2],
  ARABIC_SERVICES[0],
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
              <p>مصممة أزياء مستقلة أبتكر قطعًا هادئة ومدروسة تجمع بين الحرفة والأناقة المعاصرة. كل مجموعة مصممة لتشعرك بأنها خاصة بك، وترافقك بأسلوب يعكس شخصيتك</p>
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
  const testimonials = ar ? ARABIC_CLIENT_TESTIMONIALS : TESTIMONIALS;
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
  const services = ar ? ORDERED_ARABIC_SERVICES : SERVICES;
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
