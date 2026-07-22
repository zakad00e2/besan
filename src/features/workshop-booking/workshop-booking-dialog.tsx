import { cloneElement, useRef, useState, type FormEvent, type ReactElement } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  customerSelectsWorkshopDate,
  getTomorrowDateMinimum,
  parseWorkshopBooking,
  type WorkshopBookingErrors,
  type WorkshopBookingFormValues,
  type WorkshopOption,
} from "./workshop-booking";
import { submitWorkshopBooking } from "./workshop-booking.functions";
import { useSiteLanguage } from "@/features/site-language/site-language";
import { WhatsAppNumberField } from "@/features/whatsapp/whatsapp-number-field";
import {
  DEFAULT_WHATSAPP_COUNTRY,
  normalizeWhatsAppNumber,
} from "@/features/whatsapp/whatsapp-number";

type WorkshopBookingDialogProps = {
  workshop: WorkshopOption | null;
  onOpenChange: (open: boolean) => void;
};

const initialValues: WorkshopBookingFormValues = {
  fullName: "",
  mobile: "",
  email: "",
  date: "",
  participants: "1",
  notes: "",
};

export function WorkshopBookingDialog({ workshop, onOpenChange }: WorkshopBookingDialogProps) {
  const { direction, locale } = useSiteLanguage();
  const ar = locale === "ar";
  const workshopName = ar
    ? ({
        "pattern-foundation": "أساسيات الباترون",
        "mini-course": "كورس بناء الكورسيه",
        "corset-workshop": "ورشة هدية",
      }[workshop?.id ?? ""] ?? workshop?.name)
    : workshop?.name;
  const customerChoosesDate = customerSelectsWorkshopDate(workshop?.id ?? "");
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<WorkshopBookingErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [mobileCountry, setMobileCountry] = useState(DEFAULT_WHATSAPP_COUNTRY);
  const submissionSessionRef = useRef(0);

  function updateValue(field: keyof WorkshopBookingFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedMobile = normalizeWhatsAppNumber(mobileCountry, values.mobile);
    if (!normalizedMobile.success) {
      setErrors((current) => ({
        ...current,
        mobile: ar ? "أدخلي رقم واتساب صحيحًا." : "Enter a valid WhatsApp number.",
      }));
      return;
    }
    const parsed = parseWorkshopBooking(workshop, { ...values, mobile: normalizedMobile.number });

    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }

    setErrors({});
    setSubmissionError(null);
    const submissionSession = submissionSessionRef.current;
    setSubmitting(true);
    try {
      const result = await submitWorkshopBooking({ data: parsed.data });
      if (submissionSession !== submissionSessionRef.current) return;

      if (result.success) {
        setSubmitted(true);
      } else if (result.reason === "validation") {
        setErrors(result.fieldErrors);
      } else {
        setSubmissionError(ar ? "تعذر إرسال طلبك. يرجى المحاولة مرة أخرى." : "We could not send your request. Please try again.");
      }
    } catch {
      if (submissionSession === submissionSessionRef.current) {
        setSubmissionError(ar ? "تعذر إرسال طلبك. يرجى المحاولة مرة أخرى." : "We could not send your request. Please try again.");
      }
    } finally {
      if (submissionSession === submissionSessionRef.current) {
        setSubmitting(false);
      }
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      submissionSessionRef.current += 1;
      setValues(initialValues);
      setErrors({});
      setSubmitted(false);
      setSubmitting(false);
      setSubmissionError(null);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={workshop !== null} onOpenChange={handleOpenChange}>
      <DialogContent
        dir={direction}
        lang={locale}
        className={`max-h-[calc(100vh-0.5rem)] max-w-2xl overflow-hidden rounded-none border-foreground/70 p-0 ${
          ar ? "public-site-arabic [&_label]:tracking-normal" : ""
        }`}
      >
        {submitted ? (
          <div
            data-motion-state="workshop-success"
            className="motion-state-enter flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center sm:px-10"
          >
            <Check className="h-8 w-8" aria-hidden="true" />
            <p className={`mt-5 text-xs text-muted-foreground ${ar ? "tracking-normal" : "tracking-[0.2em]"}`}>{ar ? "تم إرسال الطلب" : "REQUEST SENT"}</p>
            <DialogTitle className={`mt-3 text-4xl font-normal ${ar ? "arabic-ui-heading tracking-normal" : "font-serif tracking-tighter"}`}>
              {ar ? "شكرًا لك" : "Thank you"}
            </DialogTitle>
            <p role="status" className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
              {ar ? "تم إرسال طلب الورشة إلى الأتيليه. سنتواصل معك قريبًا لتأكيد التفاصيل." : "Your workshop request was sent to the atelier. We will be in touch soon to confirm the details."}
            </p>
            <DialogClose asChild>
              <button
                type="button"
                className={`motion-press mt-8 border border-foreground bg-foreground px-10 py-4 text-xs text-background transition-opacity hover:opacity-85 ${ar ? "tracking-normal" : "tracking-[0.12em]"}`}
              >
                {ar ? "إغلاق" : "CLOSE"}
              </button>
            </DialogClose>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate dir={direction}>
            <DialogHeader
              className={`gap-0 border-b border-foreground/30 px-6 pb-3 pt-4 sm:px-8 ${
                ar ? "items-start text-right" : "items-start text-left"
              }`}
            >
              <p className={`text-xs leading-none text-muted-foreground ${ar ? "tracking-normal" : "tracking-[0.2em]"}`}>
                {ar ? "حجز ورشة" : "WORKSHOP BOOKING"}
              </p>
              <DialogTitle className={`-mt-0.5 text-3xl font-normal leading-none ${ar ? "arabic-ui-heading tracking-normal" : "font-serif tracking-tighter"}`}>
                {workshopName}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-2 px-4 pb-3 pt-3 sm:grid-cols-2 sm:px-8 sm:pb-4 sm:pt-4">
              <Field id="workshop-full-name" label={ar ? "الاسم الكامل" : "Full name"} error={errors.fullName}>
                <input
                  value={values.fullName}
                  onChange={(event) => updateValue("fullName", event.target.value)}
                  autoComplete="name"
                  dir={direction}
                  className={inputClass}
                />
              </Field>
              <WhatsAppNumberField
                id="workshop-whatsapp"
                locale={locale}
                country={mobileCountry}
                value={values.mobile}
                disabled={submitting}
                compact
                error={errors.mobile}
                onCountryChange={(country) => {
                  setMobileCountry(country);
                  setErrors((current) => ({ ...current, mobile: undefined }));
                }}
                onValueChange={(value) => updateValue("mobile", value)}
              />
              {customerChoosesDate ? (
              <Field id="workshop-date" label={ar ? "تاريخ الورشة" : "Workshop date"} error={errors.date}>
                <input
                  value={values.date}
                  onChange={(event) => updateValue("date", event.target.value)}
                  type="date"
                  min={getTomorrowDateMinimum()}
                  dir="ltr"
                  className={inputClass}
                />
              </Field>
              ) : null}
              <Field id="workshop-participants" label={ar ? "عدد المشاركات" : "Number of participants"} error={errors.participants}>
                <input
                  value={values.participants}
                  onChange={(event) => updateValue("participants", event.target.value)}
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  dir="ltr"
                  className={inputClass}
                />
              </Field>
              <Field
                id="workshop-notes"
                label={ar ? "ملاحظات إضافية (اختياري)" : "Additional notes (optional)"}
                error={errors.notes}
                className="sm:col-span-2"
              >
                <textarea
                  value={values.notes}
                  onChange={(event) => updateValue("notes", event.target.value)}
                  rows={2}
                  dir={direction}
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>

            {submissionError ? (
              <p role="alert" className="px-6 pb-3 text-sm text-destructive sm:px-8">
                {submissionError}
              </p>
            ) : null}

            <div className="flex justify-end border-t border-foreground/30 px-6 py-3 sm:px-8">
              <button
                type="submit"
                disabled={submitting}
                className={`motion-press w-full border border-foreground bg-foreground px-8 py-4 text-xs text-background transition-opacity hover:opacity-85 sm:w-auto ${ar ? "tracking-normal" : "tracking-[0.12em]"}`}
              >
                {submitting ? (ar ? "جارٍ الإرسال…" : "Sending…") : (ar ? "إرسال طلب الحجز" : "Send booking request")}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

const inputClass =
  "mt-1 w-full border border-foreground/40 bg-transparent px-4 py-2 text-start text-sm outline-none transition-colors focus:border-foreground";

type AccessibleFieldProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

function Field({
  id,
  label,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: ReactElement<AccessibleFieldProps>;
}) {
  const errorId = `${id}-error`;

  return (
    <div className={`block text-sm ${className}`}>
      <label htmlFor={id} className="text-xs tracking-[0.1em] text-muted-foreground">
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-describedby": error ? errorId : undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {error ? (
        <span id={errorId} className="mt-2 block text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
