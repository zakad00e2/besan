import { createFileRoute } from "@tanstack/react-router";
import workshopCorset from "@/assets/workshop-corset.jpg";
import workshopsHero from "@/assets/workshops-hero-wide.png";
import workshopMiniCourse from "@/assets/workshop-mini-course.jpg";
import workshopPatternFoundation from "@/assets/workshop-pattern-foundation.jpg";
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

const corsetWorkshopDetails = [
  {
    title: "Atelier experience",
    body: "A focused one-day format, around 4 hours, built as a beautiful shared atelier session.",
  },
  {
    title: "Full corset sewing",
    body: "We sew a full corset from zero, so each participant leaves with a corset made through the workshop process.",
  },
  {
    title: "Prepared materials",
    body: "Fabric, patterns, and materials are prepared in advance, with room for a small celebration at the end.",
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
    <section className="mx-auto max-w-[1400px] border-b border-foreground/70 px-6 pb-10 pt-16 md:px-10 md:pb-8 md:pt-24">
      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          <h1 className="max-w-4xl font-serif text-5xl leading-[0.9] tracking-tighter md:text-7xl">
            ATELIER
            <br />
            WORKSHOPS
          </h1>
        </Reveal>
        <Reveal delay={120} className="mt-6 flex flex-col justify-end md:mt-0">
          <div className="max-w-xl text-sm leading-5 text-muted-foreground md:text-base md:leading-6">
            <p>
              Focused atelier workshops for learning measurements, pattern drafting, and practical
              sewing. Each format is built so you leave with something clear, useful, and ready to
              keep developing.
            </p>
          </div>
        </Reveal>
      </div>
      <Reveal delay={180}>
        <div className="mt-4 h-[360px] overflow-hidden md:mt-6 md:h-[560px]">
          <img
            src={workshopsHero}
            alt="Two people working at an industrial sewing machine in a bright atelier"
            className="h-full w-full object-cover grayscale"
          />
        </div>
      </Reveal>
    </section>
  );
}

function FirstWorkshop() {
  return (
    <section className="mx-auto max-w-[1400px] px-6 pb-20 pt-10 md:px-10 md:pb-28 md:pt-14">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[0.95fr_1.05fr] md:gap-20">
        <Reveal>
          <div className="sticky top-8">
            <div className="group relative min-h-[420px] overflow-hidden px-6 py-8 text-background md:min-h-[580px] md:px-8 md:py-10">
              <img
                src={workshopPatternFoundation}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-foreground/55" />
              <div className="relative flex min-h-[356px] flex-col justify-end md:min-h-[500px]">
                <p className="text-xs tracking-[0.22em] text-background/80">WORKSHOP 01</p>
                <h2 className="mt-2 font-serif text-5xl leading-[0.8] tracking-tighter md:text-7xl">
                  Pattern
                  <br />
                  foundation
                </h2>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="flex h-full flex-col justify-between gap-10">
          <div>
            <Reveal>
              <article>
                <h3 className="font-serif text-4xl leading-none tracking-tighter md:text-5xl">
                  First workshop
                </h3>
                <ul className="mt-3 space-y-1 text-base leading-5 text-muted-foreground">
                  <li className="flex gap-4">
                    <span className="mt-2.5 h-px w-5 shrink-0 bg-foreground/60" />
                    <span>How to take accurate body measurements in a clear, practical way.</span>
                  </li>
                  <li className="flex gap-4">
                    <span className="mt-2.5 h-px w-5 shrink-0 bg-foreground/60" />
                    <span>
                      How to create a cut on the dress form and transfer it into a paper pattern.
                    </span>
                  </li>
                </ul>
                <p className="mt-3 max-w-2xl text-base leading-5 text-muted-foreground">
                  By the end of the workshop, you will have a base pattern that you can keep and use
                  later.
                </p>
              </article>
            </Reveal>

            <Reveal delay={100}>
              <article className="mt-6">
                <h4 className="font-serif text-3xl leading-none tracking-tighter md:text-4xl">
                  Important
                </h4>
                <div className="mt-3 space-y-2 text-base leading-6 text-muted-foreground">
                  <p>
                    There is an optional follow-up workshop. It is intensive and focused: we
                    continue from the same pattern and work through corset sewing step by step.
                  </p>
                  <p>
                    The second workshop is not required. You can join only the first one, or add the
                    second meeting if you want to see the full practical process from pattern to
                    finished structure.
                  </p>
                </div>
              </article>
            </Reveal>
          </div>

          <Reveal delay={160}>
            <div>
              {firstWorkshopPrices.map((price) => (
                <div
                  key={price.label}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-6 border-b border-foreground/30 py-2.5 last:border-b-0"
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
          <div className="group relative min-h-[420px] overflow-hidden px-6 py-8 text-background md:min-h-[580px] md:px-8 md:py-10">
            <img
              src={workshopMiniCourse}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-foreground/55" />
            <div className="relative flex min-h-[356px] flex-col justify-end md:min-h-[500px]">
              <p className="text-xs tracking-[0.22em] text-background/80">MINI COURSE</p>
              <h2 className="mt-2 font-serif text-5xl leading-[0.8] tracking-tighter md:text-7xl">
                Mini course
              </h2>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100} as="section" className="h-full">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-5">
              <h3 className="font-serif text-4xl leading-none tracking-tighter md:text-5xl">
                Private mini course
              </h3>
              <p className="text-base leading-7 text-muted-foreground">
                This is a private, concentrated workshop designed to make sure you get the full
                benefit. We build the foundation first, then continue into practical fabric work and
                finishing details.
              </p>
              <div className="space-y-6">
                {miniCourseDays.map((day) => (
                  <article key={day.title}>
                    <h3 className="font-serif text-3xl tracking-tighter">{day.title}</h3>
                    <p className="mt-3 text-base leading-7 text-muted-foreground">{day.body}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Mini course price</p>
                <p className="mt-2 font-serif text-4xl">2700 NIS</p>
              </div>
              <div>
                <p className="text-sm leading-6 text-muted-foreground">
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
    <section id="booking" className="border-t border-foreground/70">
      <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end lg:gap-14">
          <Reveal>
            <div className="lg:pb-10">
              <p className="text-xs tracking-[0.24em] text-muted-foreground">
                ONE DAY WORKSHOP
              </p>
              <h2 className="mt-4 max-w-xl font-serif text-5xl leading-[0.82] tracking-tighter md:text-7xl">
                One day
                <br />
                corset workshop
              </h2>
              <p className="mt-6 max-w-md text-base leading-6 text-muted-foreground">
                Corset sewing workshop in a focused atelier format, built around hands-on
                construction from the first stitch to the final fit.
              </p>
              <div className="mt-6">
                {corsetWorkshopDetails.map((detail, index) => (
                  <article key={detail.title} className="py-3.5">
                    <div className="flex items-baseline gap-4">
                      <p className="shrink-0 text-xs tracking-[0.22em] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="font-serif text-2xl leading-none tracking-tighter">
                        {detail.title}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-muted-foreground">{detail.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="group relative min-h-[420px] overflow-hidden text-background md:min-h-[620px]">
              <img
                src={workshopCorset}
                alt="Corset dress forms lined up in an atelier"
                className="absolute inset-0 h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-foreground/35 transition duration-500 group-hover:bg-foreground/15" />
              <div className="relative flex min-h-[420px] items-end p-6 md:min-h-[620px] md:p-8">
                <div className="grid w-full grid-cols-3 gap-4 border-t border-background/60 pt-5">
                  <p className="text-xs tracking-[0.2em] text-background/85">PATTERN</p>
                  <p className="text-xs tracking-[0.2em] text-background/85">FABRIC</p>
                  <p className="text-xs tracking-[0.2em] text-background/85">FINISH</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
