import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import gsap from "gsap";
import { arSA, enUS } from "date-fns/locale";
import { ArrowLeft, Check } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/site-shell";
import { PublicSite } from "@/features/site-language/public-site";
import { useSiteLanguage } from "@/features/site-language/site-language";
import { Calendar } from "@/components/ui/calendar";
import { formatBookingDate, appointmentTypes } from "@/features/book-call/booking-domain";
import { submitBooking } from "@/features/book-call/booking.functions";
import { useBookingAvailability } from "@/features/book-call/use-booking-availability";
import { WhatsAppNumberField } from "@/features/whatsapp/whatsapp-number-field";
import {
  DEFAULT_WHATSAPP_COUNTRY,
  normalizeWhatsAppNumber,
} from "@/features/whatsapp/whatsapp-number";
import { getPublicPath, type SiteLocale } from "@/features/seo/site-config";
import { createSeoHead } from "@/features/seo/seo";

export const Route = createFileRoute("/book-call")({
  component: () => <BookCallPage locale="ar" />,
  head: () => createSeoHead("bookCall", "ar"),
});

const dateLabelFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const ATELIER_MAP_URL =
  "https://www.google.com/maps?q=32.866546630859375,35.29303741455078&z=17&hl=ar";
const ATELIER_MAP_EMBED_URL =
  "https://www.google.com/maps?q=32.866546630859375%2C35.29303741455078&z=17&hl=ar&output=embed";

export function BookCallPage({ locale }: { locale: SiteLocale }) {
  return (
    <PublicSite locale={locale}>
      <BookCallContent />
    </PublicSite>
  );
}

function BookCallContent() {
  const { locale, direction } = useSiteLanguage();
  const ar = locale === "ar";
  const pageRef = useRef<HTMLDivElement>(null);
  const availability = useBookingAvailability();
  const [appointmentType, setAppointmentType] = useState(appointmentTypes[0]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [displayedMonth, setDisplayedMonth] = useState(() => new Date());
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [mobileCountry, setMobileCountry] = useState(DEFAULT_WHATSAPP_COUNTRY);
  const [mobile, setMobile] = useState("");

  const selectedDateKey = selectedDate ? formatBookingDate(selectedDate) : "";
  const selectedDateLabel = selectedDate
    ? new Intl.DateTimeFormat(ar ? "ar-SA-u-ca-gregory" : "en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(selectedDate)
    : "";
  const availableTimes = availability.slots.map((slot) => slot.startsAt);

  useEffect(() => {
    void availability.loadMonth(new Date());
  }, [availability.loadMonth]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from("[data-book-copy]", {
        autoAlpha: 0,
        y: 24,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.08,
        delay: 0.1,
      });

      gsap.from("[data-book-panel]", {
        autoAlpha: 0,
        y: 20,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.08,
        delay: 0.25,
      });

      gsap.from("[data-book-line]", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.6,
        ease: "power2.out",
        delay: 0.35,
      });
    }, root);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);
    const fullName = String(data.get("fullName") || "").trim();

    if (!selectedDate || !selectedTime || !fullName || !mobile) {
      setSubmitted(false);
      setError(
        ar
          ? "يرجى اختيار اليوم والوقت وإدخال الاسم الكامل ورقم الجوال."
          : "Please complete your day, time, full name, and mobile number.",
      );
      return;
    }

    const normalizedMobile = normalizeWhatsAppNumber(mobileCountry, mobile);
    if (!normalizedMobile.success) {
      setFieldErrors((current) => ({
        ...current,
        mobile: ar ? "أدخلي رقم واتساب صحيحًا." : "Enter a valid WhatsApp number.",
      }));
      return;
    }

    setSubmitting(true);
    setError("");
    setFieldErrors({});
    setSubmitted(false);
    try {
      const result = await submitBooking({
        data: {
          appointmentType,
          appointmentDate: formatBookingDate(selectedDate),
          appointmentTime: selectedTime,
          fullName,
          mobile: normalizedMobile.number,
          notes: String(data.get("notes") || ""),
        },
      });
      if (result.success) {
        setSubmitted(true);
      } else if (result.reason === "validation") {
        setFieldErrors(result.fieldErrors);
        setError(ar ? "يرجى مراجعة التفاصيل المميزة." : "Please review the highlighted details.");
      } else if (result.reason === "slot-unavailable") {
        setSelectedTime("");
        await availability.loadDate(formatBookingDate(selectedDate));
        setError(
          ar
            ? "هذا الوقت لم يعد متاحًا. يرجى اختيار وقت آخر."
            : "That time is no longer available. Please choose another time.",
        );
      } else {
        setError(
          ar
            ? "تعذر حفظ الحجز. يرجى المحاولة مرة أخرى."
            : "We could not save your booking. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div ref={pageRef} className="min-h-screen bg-background text-foreground">
        <SiteNav />
        <main>
          <section className="mx-auto max-w-[960px] border-b border-foreground/70 px-6 py-16 md:px-10 md:py-24">
            <div className="border border-foreground/40 p-6 sm:p-10">
              <span
                className="t-success-check inline-flex border border-foreground p-3"
                data-state="in"
                aria-hidden="true"
              >
                <Check className="h-5 w-5" />
              </span>
              <p className="mt-7 font-serif text-4xl tracking-tighter md:text-5xl">
                {ar ? "تم تأكيد حجزك" : "Your booking is confirmed"}
              </p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {ar ? "موعدك: " : "Your appointment: "}
                <span dir="ltr" className="text-foreground">
                  {selectedDateLabel} · {selectedTime}
                </span>
              </p>
              <p className="mt-10 text-xs tracking-[0.12em] text-muted-foreground">
                {ar ? "اضغطي على الخريطة لفتح الموقع" : "Tap the map to open the location"}
              </p>
              <div className="relative mt-4 aspect-[4/3] overflow-hidden border border-foreground/40 sm:aspect-[16/9]">
                <iframe
                  title="Atelier location"
                  src={ATELIER_MAP_EMBED_URL}
                  className="h-full w-full border-0"
                  loading="lazy"
                />
                <a
                  href={ATELIER_MAP_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={
                    ar ? "فتح موقع المشغل في خرائط جوجل" : "Open atelier location in Google Maps"
                  }
                  className="absolute inset-0 z-10"
                >
                  <span className="sr-only">{ar ? "فتح الموقع" : "Open location"}</span>
                </a>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div ref={pageRef} className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main>
        <section className="mx-auto grid max-w-[1400px] grid-cols-1 border-b border-foreground/70 px-6 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-10 md:py-24">
          <div className="flex flex-col gap-14 lg:sticky lg:top-8 lg:self-start">
            <div>
              <p data-book-copy className="font-serif text-2xl italic md:text-3xl">
                {ar ? null : "Atelier booking"}
              </p>
              <h1
                data-book-copy
                className={`mt-4 max-w-3xl font-serif tracking-tighter ${ar ? "arabic-name-title leading-[1.05] text-5xl md:text-6xl" : "leading-[0.85] text-6xl md:text-8xl"}`}
              >
                {ar ? (
                  <>
                    احجزي
                    <br />
                    موعدك
                  </>
                ) : (
                  <>
                    Book Your
                    <br />
                    Appointment
                  </>
                )}
              </h1>
              <p data-book-copy className="mt-8 max-w-lg text-base leading-8 text-muted-foreground">
                {ar
                  ? "اختاري نوع الموعد واليوم والوقت المناسب لك."
                  : "Choose the appointment type, day, and time that suits you."}
              </p>
            </div>
          </div>

          <div className="mt-14 md:mt-0">
            <form onSubmit={handleSubmit} className="pt-8 md:pt-0">
              <fieldset data-book-panel>
                <legend className="font-serif text-3xl leading-none tracking-tighter">
                  {ar ? "نوع الموعد" : "Appointment Type"}
                </legend>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {appointmentTypes.map((type) => {
                    const selected = appointmentType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAppointmentType(type)}
                        className={`motion-press flex items-center justify-between border px-4 py-4 text-start text-sm transition-[color,background-color,border-color,transform] duration-[var(--motion-duration-color)] ease-[var(--motion-ease-out)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                          selected
                            ? "border-foreground bg-foreground text-background"
                            : "border-foreground/40 hover:border-foreground hover:bg-accent/35"
                        }`}
                      >
                        <span>
                          {ar
                            ? {
                                "Custom Design": "تصميم خاص",
                                Consultation: "استشارة",
                                "Dresses for Rent": "فساتين للإيجار",
                              }[type]
                            : type}
                        </span>
                        {selected ? <Check className="h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div data-book-panel className="mt-10 pt-10">
                <div data-book-line className="-mt-10 mb-10 h-px w-full bg-foreground/70" />
                <fieldset className="min-w-0">
                  <legend className="font-serif text-3xl leading-none tracking-tighter">
                    {ar ? "اختاري اليوم" : "Choose the Day"}
                  </legend>
                  <div className="mt-6 border border-foreground/40 p-3 sm:p-5 lg:grid lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
                    <div className="min-w-0">
                      <Calendar
                        dir={direction}
                        locale={ar ? arSA : enUS}
                        mode="single"
                        month={displayedMonth}
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (submitting) return;
                          setSelectedDate(date);
                          setSelectedTime("");
                          setSubmitted(false);
                          if (date) void availability.loadDate(formatBookingDate(date));
                        }}
                        onMonthChange={(month) => {
                          if (submitting) return;
                          setDisplayedMonth(month);
                          setSelectedDate(undefined);
                          setSelectedTime("");
                          void availability.loadMonth(month);
                        }}
                        disabled={(date) =>
                          submitting || !availability.openDates.includes(formatBookingDate(date))
                        }
                        showOutsideDays={false}
                        className="mx-auto w-full p-0 [--cell-size:2.25rem] sm:[--cell-size:3rem] lg:max-w-[23rem] lg:[--cell-size:2.5rem]"
                        classNames={{
                          root: "w-full",
                          months: "w-full",
                          month: "w-full gap-5",
                          caption_label: "font-serif text-2xl font-normal",
                          nav: "top-0",
                          button_previous:
                            "border border-foreground/30 hover:border-foreground hover:bg-accent/35",
                          button_next:
                            "border border-foreground/30 hover:border-foreground hover:bg-accent/35",
                          month_grid: "w-full table-fixed border-collapse",
                          weekday: `flex h-9 items-center justify-center text-xs tracking-[0.08em] text-muted-foreground ${ar ? "font-light" : ""}`,
                          week: "mt-3 grid w-full grid-cols-7 gap-1",
                          weekdays: "grid w-full grid-cols-7 gap-1",
                          day: "w-full",
                        }}
                      />
                      <p className="mt-4 border-t border-foreground/20 pt-4 text-sm leading-7 text-muted-foreground">
                        {ar
                          ? "اختاري أي تاريخ لعرض الأوقات المتاحة."
                          : "Choose any highlighted date to see its current times."}
                        {selectedDateLabel ? (
                          <span className="block text-foreground">
                            {ar ? "المختار: " : "Selected: "}
                            <span dir="ltr">{selectedDateLabel}</span>
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <div className="hidden min-w-0 border-t border-foreground/20 pt-5 lg:block lg:self-stretch lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 rtl:lg:border-l-0 rtl:lg:border-r rtl:lg:pl-0 rtl:lg:pr-6">
                      <h3
                        className={`text-2xl leading-none tracking-tighter ${ar ? "arabic-ui-heading" : "font-serif"}`}
                      >
                        {ar ? "الأوقات المتاحة" : "Available Times"}
                      </h3>
                      {availability.error ? (
                        <div role="alert" className="mt-6 space-y-3 text-sm text-destructive">
                          <p>{availability.error}</p>
                          <button
                            type="button"
                            className="underline"
                            onClick={() => {
                              if (selectedDateKey) void availability.loadDate(selectedDateKey);
                              else void availability.loadMonth(new Date());
                            }}
                          >
                            {ar ? "حاولي مرة أخرى" : "Try again"}
                          </button>
                        </div>
                      ) : availability.slotsLoading ? (
                        <p className="mt-6 text-sm text-muted-foreground">
                          {ar ? "جارٍ تحميل الأوقات المتاحة…" : "Loading available times…"}
                        </p>
                      ) : selectedDate && availableTimes.length === 0 ? (
                        <p className="mt-6 text-sm text-muted-foreground">
                          {ar
                            ? "لا توجد أوقات متبقية في هذا التاريخ."
                            : "No times remain on this date."}
                        </p>
                      ) : selectedDate ? (
                        <div
                          data-motion-state="availability"
                          className="motion-state-enter mt-6 grid grid-cols-1 gap-3 xl:grid-cols-2"
                        >
                          {availableTimes.map((time) => {
                            const selected = selectedTime === time;
                            return (
                              <button
                                key={time}
                                type="button"
                                onClick={() => {
                                  setSelectedTime(time);
                                  setSubmitted(false);
                                }}
                                className={`motion-press border px-4 py-4 text-xl font-normal tabular-nums transition-[color,background-color,border-color,transform] duration-[var(--motion-duration-color)] ease-[var(--motion-ease-out)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                                  selected
                                    ? "border-foreground bg-foreground text-background"
                                    : "border-foreground/40 hover:border-foreground hover:bg-accent/35"
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-6 px-1 py-2 text-sm leading-7 text-muted-foreground">
                          {ar
                            ? "يرجى اختيار يوم أولًا لعرض الأوقات المتاحة."
                            : "Please choose a day first to view available times."}
                        </p>
                      )}
                    </div>
                  </div>
                </fieldset>

                <fieldset className="mt-8 min-w-0 lg:hidden">
                  <legend
                    className={`text-2xl leading-none tracking-tighter ${ar ? "arabic-ui-heading" : "font-serif"}`}
                  >
                    {ar ? "الأوقات المتاحة" : "Available Times"}
                  </legend>
                  <div className="mt-6 border border-foreground/40 p-3 sm:p-5">
                    {availability.error ? (
                      <div role="alert" className="mt-6 space-y-3 text-sm text-destructive">
                        <p>{availability.error}</p>
                        <button
                          type="button"
                          className="underline"
                          onClick={() => {
                            if (selectedDateKey) void availability.loadDate(selectedDateKey);
                            else void availability.loadMonth(new Date());
                          }}
                        >
                          {ar ? "حاولي مرة أخرى" : "Try again"}
                        </button>
                      </div>
                    ) : availability.slotsLoading ? (
                      <p className="mt-6 text-sm text-muted-foreground">
                        {ar ? "جارٍ تحميل الأوقات المتاحة…" : "Loading available times…"}
                      </p>
                    ) : selectedDate && availableTimes.length === 0 ? (
                      <p className="mt-6 text-sm text-muted-foreground">
                        {ar
                          ? "لا توجد أوقات متبقية في هذا التاريخ."
                          : "No times remain on this date."}
                      </p>
                    ) : selectedDate ? (
                      <div
                        data-motion-state="availability"
                        className="motion-state-enter grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-2"
                      >
                        {availableTimes.map((time) => {
                          const selected = selectedTime === time;
                          return (
                            <button
                              key={time}
                              type="button"
                              onClick={() => {
                                setSelectedTime(time);
                                setSubmitted(false);
                              }}
                              className={`motion-press border px-4 py-4 text-xl font-normal tabular-nums transition-[color,background-color,border-color,transform] duration-[var(--motion-duration-color)] ease-[var(--motion-ease-out)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                                selected
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-foreground/40 hover:border-foreground hover:bg-accent/35"
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="px-1 py-2 text-sm leading-7 text-muted-foreground">
                        {ar
                          ? "يرجى اختيار يوم أولًا لعرض الأوقات المتاحة."
                          : "Please choose a day first to view available times."}
                      </p>
                    )}
                  </div>
                </fieldset>
              </div>

              <section data-book-panel className="mt-12 border-t border-foreground/70 pt-8">
                <h2 className="font-serif text-3xl leading-none tracking-tighter">
                  {ar ? "بياناتك" : "Your Details"}
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-xs tracking-[0.12em] text-muted-foreground">
                      {ar ? "الاسم الكامل" : "Full Name"}
                    </span>
                    <input
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder={ar ? "مثال: نور الهاشمي" : "Example: Noor Al-Hashemi"}
                      className="mt-3 w-full border border-foreground/40 bg-transparent px-4 py-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground"
                    />
                  </label>
                  <WhatsAppNumberField
                    id="appointment-whatsapp"
                    locale={locale}
                    country={mobileCountry}
                    value={mobile}
                    disabled={submitting || submitted}
                    error={fieldErrors.mobile}
                    onCountryChange={(country) => {
                      setMobileCountry(country);
                      setFieldErrors((current) => ({ ...current, mobile: undefined }));
                    }}
                    onValueChange={(value) => {
                      setMobile(value);
                      setFieldErrors((current) => ({ ...current, mobile: undefined }));
                    }}
                  />
                </div>
                <label className="mt-5 block text-sm">
                  <span className="text-xs tracking-[0.12em] text-muted-foreground">
                    {ar ? "ملاحظات إضافية" : "Additional Notes"}
                  </span>
                  <textarea
                    name="notes"
                    rows={5}
                    placeholder={
                      ar
                        ? "أي تفاصيل تودين مشاركتها معنا…"
                        : "Any details you would like to share with us..."
                    }
                    className="mt-3 w-full resize-none border border-foreground/40 bg-transparent px-4 py-4 text-sm leading-7 outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground"
                  />
                </label>
              </section>

              {error ? (
                <p
                  role="alert"
                  className="mt-6 border border-destructive/40 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}

              {submitted ? (
                <p
                  role="status"
                  className="mt-6 border border-foreground/40 bg-accent/30 px-4 py-4 text-sm leading-7"
                >
                  {ar ? (
                    "شكرًا لك. تم حفظ طلبك."
                  ) : (
                    <>
                      Thank you. Your {appointmentType.toLowerCase()} request for{" "}
                      {selectedDateLabel} at {selectedTime} has been saved.
                    </>
                  )}
                </p>
              ) : null}

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <a
                  href={getPublicPath("home", locale)}
                  className="motion-press inline-flex items-center justify-center gap-3 border border-foreground/40 px-8 py-4 text-xs tracking-[0.1em] transition-colors hover:border-foreground hover:bg-accent/35"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {ar ? "رجوع" : "Back"}
                </a>
                <button
                  type="submit"
                  disabled={submitting || submitted}
                  className="motion-press inline-flex items-center justify-center gap-3 border border-foreground bg-foreground px-8 py-4 text-xs tracking-[0.1em] text-background transition-opacity hover:opacity-85"
                >
                  {submitted ? (
                    <span className="t-success-check" data-state="in" aria-hidden="true">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : null}
                  {submitting
                    ? ar
                      ? "جارٍ حفظ الحجز…"
                      : "Saving booking…"
                    : ar
                      ? "تأكيد الحجز"
                      : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
