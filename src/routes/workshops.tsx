import { createFileRoute } from "@tanstack/react-router";
import { Clock, MessageCircle, Ruler, Scissors, Sparkles } from "lucide-react";
import { Reveal, SiteFooter, SiteNav } from "@/components/site-shell";

export const Route = createFileRoute("/workshops")({
  component: Workshops,
  head: () => ({
    meta: [
      { title: "Workshops - Besan Khalaily Atelier" },
      {
        name: "description",
        content:
          "Fashion atelier workshops by Besan Khalaily covering measurements, pattern drafting, corset construction, and private mini courses.",
      },
    ],
  }),
});

const firstWorkshopPrices = [
  { label: "Basic workshop", value: "550 NIS" },
  { label: "Second meeting", value: "750 NIS" },
  { label: "Two-day workshop package", value: "1300 NIS" },
];

const miniCourseDays = [
  {
    title: "Day one",
    body: "We learn how to draft the base pattern from the dress form, with a focused explanation that helps you understand the foundation clearly. I also prepare a sketch catalogue so you can choose the cut we will work on together.",
  },
  {
    title: "Days two to four",
    body: "We continue with the pattern we built and move into practical fabric work. Each day introduces new steps: cutting, machine sewing, corset construction techniques, and the details needed to reach a clean final result.",
  },
];

function Workshops() {
  return (
    <div dir="ltr" className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main>
        <WorkshopsHero />
        <FirstWorkshop />
        <MiniCourse />
        <PrivateGathering />
      </main>
      <SiteFooter />
    </div>
  );
}

function WorkshopsHero() {
  return (
    <section className="mx-auto grid max-w-[1400px] grid-cols-1 border-b border-foreground/70 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:px-10 md:py-24">
      <Reveal>
        <p className="font-serif text-3xl italic md:text-4xl">BESAN KHALAILY</p>
        <h1 className="mt-4 max-w-4xl font-serif text-6xl leading-[0.85] tracking-tighter md:text-8xl">
          ATELIER
          <br />
          WORKSHOPS
        </h1>
      </Reveal>
      <Reveal delay={120} className="mt-12 flex flex-col justify-end md:mt-0">
        <div className="max-w-xl text-sm leading-8 text-muted-foreground md:text-base">
          <p>
            Focused atelier workshops for learning measurements, pattern drafting, and practical
            sewing. Each format is built so you leave with something clear, useful, and ready to
            keep developing.
          </p>
          <a
            href="#booking"
            className="mt-8 inline-flex items-center gap-3 border border-foreground px-8 py-4 text-xs tracking-[0.1em] text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            <MessageCircle className="h-4 w-4" />
            Ask about a date
          </a>
        </div>
      </Reveal>
    </section>
  );
}

function FirstWorkshop() {
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[0.8fr_1.2fr] md:gap-20">
        <Reveal>
          <div className="sticky top-8">
            <p className="text-xs tracking-[0.22em] text-muted-foreground">WORKSHOP 01</p>
            <h2 className="mt-4 font-serif text-5xl leading-[0.95] tracking-tighter md:text-7xl">
              Pattern
              <br />
              foundation
            </h2>
            <div className="mt-10 grid max-w-sm grid-cols-2 border-y border-foreground/70 text-sm">
              <div className="border-r border-foreground/40 px-4 py-5">
                <Clock className="mb-4 h-5 w-5" />
                <p className="text-xs tracking-[0.12em] text-muted-foreground">DURATION</p>
                <p className="mt-2 font-serif text-2xl">2.5 hrs</p>
              </div>
              <div className="px-4 py-5">
                <Ruler className="mb-4 h-5 w-5" />
                <p className="text-xs tracking-[0.12em] text-muted-foreground">FORMAT</p>
                <p className="mt-2 font-serif text-2xl">Atelier</p>
              </div>
            </div>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <article className="border-t border-foreground/70 pt-8">
              <h3 className="font-serif text-4xl leading-none tracking-tighter md:text-5xl">
                First workshop
              </h3>
              <ul className="mt-8 space-y-5 text-base leading-8 text-muted-foreground">
                <li className="flex gap-4">
                  <span className="mt-3 h-px w-10 shrink-0 bg-foreground/60" />
                  <span>How to take accurate body measurements in a clear, practical way.</span>
                </li>
                <li className="flex gap-4">
                  <span className="mt-3 h-px w-10 shrink-0 bg-foreground/60" />
                  <span>
                    How to create a cut on the dress form and transfer it into a paper pattern.
                  </span>
                </li>
              </ul>
              <p className="mt-8 max-w-2xl text-base leading-8 text-muted-foreground">
                By the end of the workshop, you will have a base pattern that you can keep and use
                later.
              </p>
            </article>
          </Reveal>

          <Reveal delay={100}>
            <article className="mt-12 border-t border-foreground/50 pt-8">
              <h4 className="font-serif text-3xl leading-none tracking-tighter md:text-4xl">
                Important
              </h4>
              <div className="mt-6 space-y-5 text-base leading-8 text-muted-foreground">
                <p>
                  There is an optional follow-up workshop. It is intensive and focused: we continue
                  from the same pattern and work through corset sewing step by step.
                </p>
                <p>
                  The second workshop is not required. You can join only the first one, or add the
                  second meeting if you want to see the full practical process from pattern to
                  finished structure.
                </p>
              </div>
            </article>
          </Reveal>

          <Reveal delay={160}>
            <div className="mt-12 border-y border-foreground/70">
              {firstWorkshopPrices.map((price) => (
                <div
                  key={price.label}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-6 border-b border-foreground/30 py-5 last:border-b-0"
                >
                  <p className="text-base text-muted-foreground">{price.label}</p>
                  <p className="font-serif text-3xl tracking-tight">{price.value}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function MiniCourse() {
  return (
    <section className="border-y border-foreground/70 bg-accent/25">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-6 py-20 md:grid-cols-[0.95fr_1.05fr] md:px-10 md:py-28">
        <Reveal>
          <p className="text-xs tracking-[0.22em] text-muted-foreground">MINI COURSE</p>
          <h2 className="mt-4 font-serif text-5xl leading-[0.95] tracking-tighter md:text-7xl">
            Mini course
          </h2>
          <div className="mt-10 flex max-w-sm items-center justify-between border-y border-foreground/70 py-6">
            <div>
              <p className="text-xs tracking-[0.12em] text-muted-foreground">PRIVATE FORMAT</p>
              <p className="mt-2 font-serif text-2xl">4 days</p>
            </div>
            <Sparkles className="h-6 w-6" />
          </div>
        </Reveal>

        <Reveal delay={100} as="section">
          <div className="space-y-8">
            <p className="text-base leading-8 text-muted-foreground">
              This is a private, concentrated workshop designed to make sure you get the full
              benefit. We build the foundation first, then continue into practical fabric work and
              finishing details.
            </p>
            <div className="space-y-6">
              {miniCourseDays.map((day) => (
                <article key={day.title} className="border-t border-foreground/50 pt-6">
                  <h3 className="font-serif text-3xl tracking-tighter">{day.title}</h3>
                  <p className="mt-4 text-base leading-8 text-muted-foreground">{day.body}</p>
                </article>
              ))}
            </div>
            <div className="grid gap-4 border-y border-foreground/70 py-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Mini course price</p>
                <p className="mt-2 font-serif text-4xl">2700 NIS</p>
              </div>
              <div>
                <p className="text-sm leading-7 text-muted-foreground">
                  Returning participants receive 10% off the base price when registering again.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PrivateGathering() {
  return (
    <section id="booking" className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[0.85fr_1.15fr] md:gap-20">
        <Reveal>
          <Scissors className="h-8 w-8" />
          <h2 className="mt-6 font-serif text-5xl leading-[0.95] tracking-tighter md:text-7xl">
            One day
            <br />
            corset workshop
          </h2>
          <div className="mt-10 border-y border-foreground/70 py-6">
            <p className="text-xs tracking-[0.12em] text-muted-foreground">PRICE</p>
            <p className="mt-2 font-serif text-4xl">850 NIS</p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="text-base leading-8 text-muted-foreground">
            <h3 className="font-serif text-4xl leading-none tracking-tighter text-foreground md:text-5xl">
              Corset sewing workshop
            </h3>
            <div className="mt-8 space-y-5">
              <p>
                This workshop is not only about learning something new. It is also designed as a
                beautiful shared atelier experience. The format is one day, around 4 hours.
              </p>
              <p>
                During the workshop, we learn how to sew a full corset from zero. By the end of the
                day, each participant leaves with a corset made through the workshop process.
              </p>
              <p>
                I prepare everything: fabric, patterns, and all the materials we use during the
                workshop. At the end, we can also create a small celebration around the occasion.
              </p>
            </div>
            <a
              href="/#contact"
              className="mt-10 inline-flex items-center gap-3 border border-foreground px-8 py-4 text-xs tracking-[0.1em] text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              <MessageCircle className="h-4 w-4" />
              Contact me to arrange a date
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
