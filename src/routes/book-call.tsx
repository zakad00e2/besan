import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import gsap from "gsap";
import { ArrowLeft, Check, MessageCircle } from "lucide-react";
import { Reveal, SiteFooter, SiteNav } from "@/components/site-shell";
import { Calendar } from "@/components/ui/calendar";
import {
  formatBookingDate,
  appointmentTypes,
  timesByDay,
} from "@/features/book-call/booking-domain";
import { submitBooking } from "@/features/book-call/booking.functions";

export const Route = createFileRoute("/book-call")({
  component: BookCall,
  head: () => ({
    meta: [
      { title: "Book Your Appointment - Besan Khalaily Atelier" },
      {
        name: "description",
        content:
          "Book an atelier appointment with Besan Khalaily for a new design, fittings, alterations, or pickup.",
      },
    ],
  }),
});

const appointmentDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"] as const;
type AppointmentDay = (typeof appointmentDays)[number];

const dayNameFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const dateLabelFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getAppointmentDay(date: Date) {
  const dayName = dayNameFormatter.format(date);
  return appointmentDays.includes(dayName as AppointmentDay)
    ? (dayName as AppointmentDay)
    : undefined;
}

export function BookCall() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [appointmentType, setAppointmentType] = useState(appointmentTypes[0]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const today = startOfToday();
  const selectedDay = selectedDate ? getAppointmentDay(selectedDate) : undefined;
  const selectedDateLabel = selectedDate ? dateLabelFormatter.format(selectedDate) : "";
  const availableTimes = selectedDay ? timesByDay[selectedDay] : [];

  useEffect(() => {
    const root = pageRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from("[data-book-copy]", {
        autoAlpha: 0,
        y: 24,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.1,
      });

      gsap.from("[data-book-panel]", {
        autoAlpha: 0,
        y: 20,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.08,
        delay: 0.25,
      });

      gsap.from("[data-book-line]", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.7,
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
    const mobile = String(data.get("mobile") || "").trim();

    if (!selectedDate || !selectedDay || !selectedTime || !fullName || !mobile) {
      setSubmitted(false);
      setError("Please complete your day, time, full name, and mobile number.");
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
          mobile,
          notes: String(data.get("notes") || ""),
        },
      });
      if (result.success) {
        setSubmitted(true);
      } else if (result.reason === "validation") {
        setFieldErrors(result.fieldErrors);
        setError("Please review the highlighted details.");
      } else {
        setError(
          result.reason === "slot-unavailable"
            ? "That time was just booked. Please choose another time."
            : "We could not save your booking. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={pageRef} dir="ltr" className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main>
        <section className="mx-auto grid max-w-[1400px] grid-cols-1 border-b border-foreground/70 px-6 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-10 md:py-24">
          <Reveal className="flex flex-col gap-14 lg:sticky lg:top-8 lg:self-start">
            <div>
              <p data-book-copy className="font-serif text-2xl italic md:text-3xl">
                Atelier booking
              </p>
              <h1
                data-book-copy
                className="mt-4 max-w-3xl font-serif text-6xl leading-[0.85] tracking-tighter md:text-8xl"
              >
                Book Your
                <br />
                Appointment
              </h1>
              <p data-book-copy className="mt-8 max-w-lg text-base leading-8 text-muted-foreground">
                Choose the appointment type, day, and time that suits you.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120} className="mt-14 md:mt-0">
            <form onSubmit={handleSubmit} className="pt-8 md:pt-0">
              <fieldset data-book-panel>
                <legend className="font-serif text-3xl leading-none tracking-tighter">
                  Appointment Type
                </legend>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {appointmentTypes.map((type) => {
                    const selected = appointmentType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAppointmentType(type)}
                        className={`flex items-center justify-between border px-4 py-4 text-left text-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px ${
                          selected
                            ? "border-foreground bg-foreground text-background"
                            : "border-foreground/40 hover:border-foreground hover:bg-accent/35"
                        }`}
                      >
                        <span>{type}</span>
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
                    Choose the Day
                  </legend>
                  <div className="mt-6 border border-foreground/40 p-3 sm:p-5 lg:grid lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
                    <div className="min-w-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setSelectedTime("");
                          setSubmitted(false);
                        }}
                        disabled={(date) => date < today || !getAppointmentDay(date)}
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
                          weekday:
                            "flex h-9 items-center justify-center text-xs tracking-[0.08em] text-muted-foreground",
                          week: "mt-3 grid w-full grid-cols-7 gap-1",
                          weekdays: "grid w-full grid-cols-7 gap-1",
                          day: "w-full",
                        }}
                      />
                      <p className="mt-4 border-t border-foreground/20 pt-4 text-sm leading-7 text-muted-foreground">
                        Available days are Monday to Thursday and Saturday.
                        {selectedDateLabel ? (
                          <span className="block text-foreground">
                            Selected: {selectedDateLabel}
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <div className="hidden min-w-0 border-t border-foreground/20 pt-5 lg:block lg:self-stretch lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                      <h3 className="font-serif text-2xl leading-none tracking-tighter">
                        Available Times
                      </h3>
                      {selectedDay ? (
                        <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-2">
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
                                className={`border px-4 py-4 text-xl font-normal tabular-nums transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px ${
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
                          Please choose a day first to view available times.
                        </p>
                      )}
                    </div>
                  </div>
                </fieldset>

                <fieldset className="mt-8 min-w-0 lg:hidden">
                  <legend className="font-serif text-2xl leading-none tracking-tighter">
                    Available Times
                  </legend>
                  <div className="mt-6 border border-foreground/40 p-3 sm:p-5">
                    {selectedDay ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-2">
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
                              className={`border px-4 py-4 text-xl font-normal tabular-nums transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px ${
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
                        Please choose a day first to view available times.
                      </p>
                    )}
                  </div>
                </fieldset>
              </div>

              <section data-book-panel className="mt-12 border-t border-foreground/70 pt-8">
                <h2 className="font-serif text-3xl leading-none tracking-tighter">Your Details</h2>
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-xs tracking-[0.12em] text-muted-foreground">
                      Full Name
                    </span>
                    <input
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder="Example: Noor Al-Hashemi"
                      className="mt-3 w-full border border-foreground/40 bg-transparent px-4 py-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs tracking-[0.12em] text-muted-foreground">
                      Mobile Number
                    </span>
                    <input
                      name="mobile"
                      type="tel"
                      autoComplete="tel"
                      placeholder="05xxxxxxxx"
                      className="mt-3 w-full border border-foreground/40 bg-transparent px-4 py-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground"
                    />
                  </label>
                </div>
                <label className="mt-5 block text-sm">
                  <span className="text-xs tracking-[0.12em] text-muted-foreground">
                    Additional Notes
                  </span>
                  <textarea
                    name="notes"
                    rows={5}
                    placeholder="Any details you would like to share with us..."
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
                  Thank you. Your {appointmentType.toLowerCase()} request for {selectedDateLabel} at{" "}
                  {selectedTime} has been saved.
                </p>
              ) : null}

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <a
                  href="/"
                  className="inline-flex items-center justify-center gap-3 border border-foreground/40 px-8 py-4 text-xs tracking-[0.1em] transition-colors hover:border-foreground hover:bg-accent/35"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </a>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-3 border border-foreground bg-foreground px-8 py-4 text-xs tracking-[0.1em] text-background transition-opacity hover:opacity-85 active:translate-y-px"
                >
                  <MessageCircle className="h-4 w-4" />
                  {submitting ? "Saving booking…" : "Confirm Booking"}
                </button>
              </div>
            </form>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
