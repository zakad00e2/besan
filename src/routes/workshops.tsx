import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import workshopCorset from "@/assets/workshop-corset.jpg";
import workshopsHero from "@/assets/workshops-hero-wide.png";
import workshopMiniCourse from "@/assets/workshop-mini-course.jpg";
import workshopPatternFoundation from "@/assets/workshop-pattern-foundation.jpg";
import { Reveal, SiteFooter, SiteNav } from "@/components/site-shell";
import { PublicSite } from "@/features/site-language/public-site";
import { useSiteLanguage } from "@/features/site-language/site-language";
import { WorkshopBookingDialog } from "@/features/workshop-booking/workshop-booking-dialog";
import { workshopOptions, type WorkshopOption } from "@/features/workshop-booking/workshop-booking";
import type { SiteLocale } from "@/features/seo/site-config";
import { createSeoHead } from "@/features/seo/seo";

export const Route = createFileRoute("/workshops")({
  component: () => <WorkshopsPage locale="ar" />,
  head: () => createSeoHead("workshops", "ar"),
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

const [patternFoundation, miniCourse, corsetWorkshop] = workshopOptions;

type BookWorkshop = (workshop: WorkshopOption) => void;

export function WorkshopsPage({ locale }: { locale: SiteLocale }) {
  return <PublicSite locale={locale}><WorkshopsContent /></PublicSite>;
}

function WorkshopsContent() {
  const { locale } = useSiteLanguage();
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopOption | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main>
        <WorkshopsHero arabic={locale === "ar"} />
        <FirstWorkshop onBook={setSelectedWorkshop} />
        <MiniCourse onBook={setSelectedWorkshop} />
        <PrivateGathering onBook={setSelectedWorkshop} />
      </main>
      <SiteFooter />
      <WorkshopBookingDialog
        workshop={selectedWorkshop}
        onOpenChange={(open) => {
          if (!open) setSelectedWorkshop(null);
        }}
      />
    </div>
  );
}

function WorkshopsHero({ arabic }: { arabic: boolean }) {
  return (
    <section className="mx-auto max-w-[1400px] border-b border-foreground/70 px-6 pb-10 pt-16 md:px-10 md:pb-8 md:pt-24">
      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          <h1
            className={`max-w-4xl font-serif text-4xl tracking-tighter md:text-6xl ${
              arabic ? "leading-[1.15] pb-1" : "leading-[0.9]"
            }`}
          >
            {arabic ? "ورش الأتيليه" : <>ATELIER<br />WORKSHOPS</>}
          </h1>
        </Reveal>
        <Reveal delay={120} className="mt-3 flex flex-col justify-end md:mt-0">
          <div className={`max-w-xl text-sm leading-5 text-muted-foreground md:text-base md:leading-6 ${arabic ? "arabic-name-title" : ""}`}>
            <p>
              {arabic ? "ورش أتيليه متخصصة لتعلّم القياسات ورسم الباترون والخياطة العملية. صُمم كل مسار لتغادري بخبرة واضحة ومفيدة قابلة للتطوير." : "Focused atelier workshops for learning measurements, pattern drafting, and practical sewing. Each format is built so you leave with something clear, useful, and ready to keep developing."}
            </p>
          </div>
        </Reveal>
      </div>
      <Reveal delay={180}>
        <div className="group mt-4 h-[360px] overflow-hidden md:mt-1 md:h-[560px]">
          <img
            src={workshopsHero}
            alt={arabic ? "ورشة أزياء مع مانيكانات وطاولات قص وماكينات خياطة" : "Fashion workshop with dress forms, cutting tables, and sewing machines"}
            className="workshop-image h-full w-full object-cover"
          />
        </div>
      </Reveal>
    </section>
  );
}

function BookingButton({
  workshop,
  onBook,
  className = "",
}: {
  workshop: WorkshopOption;
  onBook: BookWorkshop;
  className?: string;
}) {
  const { locale } = useSiteLanguage();
  return (
    <button
      type="button"
      onClick={() => onBook(workshop)}
      className={`motion-press mt-6 w-full border border-foreground bg-transparent px-8 py-4 ${locale === "ar" ? "text-sm md:text-base arabic-name-title" : "text-xs"} tracking-[0.12em] text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto ${className}`}
    >
      {locale === "ar" ? "احجزي هذه الورشة" : "BOOK THIS WORKSHOP"}
    </button>
  );
}

function FirstWorkshop({ onBook }: { onBook: BookWorkshop }) {
  const { locale } = useSiteLanguage();
  const ar = locale === "ar";
  const prices = ar
    ? [
        { label: "الورشة الأساسية", value: "550 NIS" },
        { label: "اللقاء الثاني", value: "750 NIS" },
        { label: "باقة الورشتين", value: "1300 NIS" },
      ]
    : firstWorkshopPrices;
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
                className="workshop-image editorial-image absolute inset-0 h-full w-full object-cover"
              />
              <div className="editorial-overlay absolute inset-0 bg-foreground/55 group-hover:opacity-70" />
              <div className="relative flex min-h-[356px] flex-col justify-end md:min-h-[500px]">
                <p className="text-xs tracking-[0.22em] text-background/80">{ar ? "الورشة الأولى" : "WORKSHOP 01"}</p>
                <h2 className={`font-serif text-4xl leading-[0.8] tracking-tighter md:text-6xl ${ar ? "mt-4" : "mt-2"}`}>
                  {ar ? "أساسيات الباترون" : <>Pattern<br />foundation</>}
                </h2>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="flex h-full flex-col justify-between gap-10">
          <div>
            <Reveal>
              <article>
                <div className="lg:flex lg:items-center lg:justify-between lg:gap-8">
                  <h3
                    className={`${ar ? "text-3xl md:text-4xl arabic-ui-heading" : "font-serif text-4xl md:text-5xl"} leading-none tracking-tighter`}
                  >
                    {ar ? "الورشة الأولى" : "First workshop"}
                  </h3>
                  <BookingButton
                    workshop={patternFoundation}
                    onBook={onBook}
                    className="hidden shrink-0 lg:inline-flex lg:mt-0"
                  />
                </div>
                <ul className="mt-3 space-y-1 text-base leading-5 text-muted-foreground">
                  <li className="flex gap-4">
                    <span className="mt-2.5 h-px w-5 shrink-0 bg-foreground/60" />
                    <span>{ar ? "كيفية أخذ قياسات الجسم بدقة وبأسلوب واضح وعملي." : "How to take accurate body measurements in a clear, practical way."}</span>
                  </li>
                  <li className="flex gap-4">
                    <span className="mt-2.5 h-px w-5 shrink-0 bg-foreground/60" />
                    <span>
                      {ar ? "كيفية تشكيل القصة على المانيكان ونقلها إلى باترون ورقي." : "How to create a cut on the dress form and transfer it into a paper pattern."}
                    </span>
                  </li>
                </ul>
                <p className="mt-3 max-w-2xl text-base leading-5 text-muted-foreground">
                  {ar ? "في نهاية الورشة سيكون لديك باترون أساسي يمكنك الاحتفاظ به واستخدامه لاحقًا." : "By the end of the workshop, you will have a base pattern that you can keep and use later."}
                </p>
              </article>
            </Reveal>

            <Reveal delay={100}>
              <article className="mt-6">
                <h4
                  className={`leading-none tracking-tighter ${ar ? "text-xl md:text-2xl arabic-ui-heading" : "text-2xl md:text-3xl font-serif font-medium"}`}
                >
                  {ar ? "مهم" : "Important"}
                </h4>
                <div className="mt-3 space-y-2 text-base leading-6 text-muted-foreground">
                  <p>
                    {ar ? "توجد ورشة متابعة اختيارية ومكثفة. نكمل فيها من الباترون نفسه ونتعلم خياطة الكورسيه خطوة بخطوة." : "There is an optional follow-up workshop. It is intensive and focused: we continue from the same pattern and work through corset sewing step by step."}
                  </p>
                  <p>
                    {ar ? "الورشة الثانية ليست إلزامية؛ يمكنك الانضمام للأولى فقط، أو إضافة اللقاء الثاني لمشاهدة المسار العملي الكامل من الباترون إلى القطعة النهائية." : "The second workshop is not required. You can join only the first one, or add the second meeting if you want to see the full practical process from pattern to finished structure."}
                  </p>
                </div>
              </article>
            </Reveal>
          </div>

          <Reveal delay={160}>
            <div>
              {prices.map((price) => (
                <div
                  key={price.label}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-6 border-b border-foreground/30 py-2.5 last:border-b-0"
                >
                  <p className="text-base text-muted-foreground">{price.label}</p>
                  <p dir="ltr" className="font-serif text-3xl tracking-tight">{price.value}</p>
                </div>
              ))}
              <BookingButton workshop={patternFoundation} onBook={onBook} className="lg:hidden" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function MiniCourse({ onBook }: { onBook: BookWorkshop }) {
  const { locale } = useSiteLanguage();
  const ar = locale === "ar";
  const days = ar
    ? [
        { title: "اليوم الأول", body: "نتعلم رسم الباترون الأساسي على المانيكان مع شرح مركز يساعدك على فهم الأساس بوضوح، ثم تختارين القصة التي سنعمل عليها." },
        { title: "من اليوم الثاني إلى الرابع", body: "نكمل الباترون الذي أنشأناه وننتقل إلى العمل العملي بالقماش: القص والخياطة بالماكينة وتقنيات الكورسيه والتفاصيل النهائية." },
      ]
    : miniCourseDays;
  return (
    <section className="border-y border-foreground/70 bg-accent/25">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-6 py-20 md:grid-cols-[0.95fr_1.05fr] md:px-10 md:py-28">
        <Reveal>
          <div className="group relative min-h-[420px] overflow-hidden px-6 py-8 text-background md:min-h-[580px] md:px-8 md:py-10">
            <img
              src={workshopMiniCourse}
              alt=""
              aria-hidden="true"
              className="workshop-image editorial-image absolute inset-0 h-full w-full object-cover"
            />
            <div className="editorial-overlay absolute inset-0 bg-foreground/55 group-hover:opacity-70" />
            <div className="relative flex min-h-[356px] flex-col justify-end md:min-h-[500px]">
              <p className="text-xs tracking-[0.22em] text-background/80">{ar ? "الورشة الثانية" : "WORKSHOP 02"}</p>
              <h2 className="mt-2 font-serif text-4xl leading-[0.8] tracking-tighter md:text-6xl">
                {ar ? "بناء الباترون" : "Pattern Building"}
              </h2>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100} as="section" className="h-full">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="space-y-5">
              <div className="lg:flex lg:items-center lg:justify-between lg:gap-8">
                <h3
                  className={`${ar ? "text-3xl md:text-4xl arabic-ui-heading" : "font-serif text-4xl md:text-5xl"} leading-none tracking-tighter`}
                >
                  {ar ? "بناء الباترون" : "Pattern Building"}
                </h3>
                <BookingButton
                  workshop={miniCourse}
                  onBook={onBook}
                  className="hidden shrink-0 lg:inline-flex lg:mt-0"
                />
              </div>
              <p className="text-base leading-7 text-muted-foreground">
                {ar ? "هذه ورشة خاصة ومكثفة تمنحك الاستفادة الكاملة. نبني الأساس أولًا، ثم ننتقل إلى العمل العملي بالقماش والتفاصيل النهائية." : "This is a private, concentrated workshop designed to make sure you get the full benefit. We build the foundation first, then continue into practical fabric work and finishing details."}
              </p>
              <div className="space-y-6">
                {days.map((day) => (
                  <article key={day.title}>
                    <h3 className={`tracking-tighter ${ar ? "text-lg md:text-xl arabic-ui-heading" : "text-xl md:text-2xl font-serif font-medium"}`}>{day.title}</h3>
                    <p className="mt-3 text-base leading-7 text-muted-foreground">{day.body}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={ar ? "text-right" : ""}>
                <p className="text-sm text-muted-foreground">{ar ? "سعر الورشة" : "Pattern Building price"}</p>
                <p dir="ltr" className="mt-2 font-serif text-4xl">2700 NIS</p>
              </div>
              <div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {ar ? "تحصل المشاركات العائدات على خصم 10% من السعر الأساسي عند التسجيل مرة أخرى." : "Returning participants receive 10% off the base price when registering again."}
                </p>
              </div>
            </div>
            <BookingButton workshop={miniCourse} onBook={onBook} className="lg:hidden" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PrivateGathering({ onBook }: { onBook: BookWorkshop }) {
  const { locale } = useSiteLanguage();
  const ar = locale === "ar";
  const details = ar
    ? [
        { title: "تجربة الأتيليه", body: "ورشة مركزة ليوم واحد، نحو أربع ساعات، ضمن جلسة أتيليه جميلة ومشتركة." },
        { title: "خياطة كورسيه كامل", body: "نخيط كورسيه كاملًا من الصفر، لتغادر كل مشاركة بقطعتها التي صنعتها خلال الورشة." },
        { title: "مواد مجهزة", body: "القماش والباترونات والمواد مجهزة مسبقًا، مع مساحة لاحتفال صغير في الختام." },
      ]
    : corsetWorkshopDetails;
  return (
    <section id="booking" className="border-t border-foreground/70">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-6 py-20 md:grid-cols-[0.95fr_1.05fr] md:px-10 md:py-28">
        <Reveal>
          <div className="group relative min-h-[420px] overflow-hidden text-background md:min-h-[580px]">
            <img
              src={workshopCorset}
              alt={ar ? "مانيكانات كورسيه مصطفة في الأتيليه" : "Corset dress forms lined up in an atelier"}
              className="workshop-image editorial-image absolute inset-0 h-full w-full object-cover"
            />
            <div className="editorial-overlay absolute inset-0 bg-foreground/35 group-hover:opacity-40" />
            <div className="relative flex min-h-[420px] items-end p-6 md:min-h-[580px] md:p-8">
              <div className="w-full">
                <p className="text-xs tracking-[0.24em] text-background/80">{ar ? "ورشة ليوم واحد" : "ONE DAY WORKSHOP"}</p>
                <h2 className="mt-2 font-serif text-4xl leading-[0.8] tracking-tighter md:text-6xl">
                  {ar ? "ورشة كورسيه" : "corset workshop"}
                </h2>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100} as="section" className="h-full">
          <div className="flex h-full flex-col justify-between gap-10">
            <div>
              <div className="lg:flex lg:items-center lg:justify-between lg:gap-8">
                <h3
                  className={`${ar ? "text-3xl md:text-4xl arabic-ui-heading" : "font-serif text-4xl md:text-5xl"} leading-none tracking-tighter`}
                >
                  {ar ? "أتيليه الكورسيه" : "Corset Atelier"}
                </h3>
                <BookingButton
                  workshop={corsetWorkshop}
                  onBook={onBook}
                  className="hidden shrink-0 lg:inline-flex lg:mt-0"
                />
              </div>
              <p className="mt-5 max-w-2xl text-base leading-6 text-muted-foreground">
                {ar ? "ورشة خياطة كورسيه في أتيليه مركز، مبنية على التطبيق العملي من أول غرزة حتى المقاس النهائي." : "Corset sewing workshop in a focused atelier format, built around hands-on construction from the first stitch to the final fit."}
              </p>
              <div className="mt-6">
                {details.map((detail, index) => (
                  <article key={detail.title} className="py-3.5">
                    <div className="flex items-baseline gap-4">
                      <p className="shrink-0 text-xs tracking-[0.22em] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3
                        className={`leading-none tracking-tighter ${ar ? "text-xl arabic-ui-heading" : "text-2xl font-serif"}`}
                      >
                        {detail.title}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-muted-foreground">{detail.body}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className={ar ? "text-right" : ""}>
              <p className="text-sm text-muted-foreground">{ar ? "سعر ورشة الكورسيه" : "Corset workshop price"}</p>
              <p dir="ltr" className="mt-2 font-serif text-4xl">850 NIS</p>
              <BookingButton workshop={corsetWorkshop} onBook={onBook} className="lg:hidden" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
