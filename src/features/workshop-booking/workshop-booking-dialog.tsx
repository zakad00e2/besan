import { cloneElement, useState, type FormEvent, type ReactElement } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getTomorrowDateMinimum,
  parseWorkshopBooking,
  type WorkshopBookingErrors,
  type WorkshopBookingFormValues,
  type WorkshopOption,
} from "./workshop-booking";
import { submitWorkshopBooking } from "./workshop-booking.functions";

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
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<WorkshopBookingErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  function updateValue(field: keyof WorkshopBookingFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseWorkshopBooking(workshop, values);

    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const result = await submitWorkshopBooking({ data: parsed.data });

    if (result.success) {
      setSubmitted(true);
    } else if (result.reason === "validation") {
      setErrors(result.fieldErrors);
    } else {
      setSubmissionError("We could not send your request. Please try again.");
    }
    setSubmitting(false);
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
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
      <DialogContent className="max-h-[calc(100vh-0.5rem)] max-w-2xl overflow-hidden rounded-none border-foreground/70 p-0">
        {submitted ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center sm:px-10">
            <Check className="h-8 w-8" aria-hidden="true" />
            <p className="mt-5 text-xs tracking-[0.2em] text-muted-foreground">REQUEST SENT</p>
            <DialogTitle className="mt-3 font-serif text-4xl font-normal tracking-tighter">
              Thank you
            </DialogTitle>
            <p role="status" className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
              Your workshop request was sent to the atelier. We will be in touch soon to confirm
              the details.
            </p>
            <DialogClose asChild>
              <button
                type="button"
                className="mt-8 border border-foreground bg-foreground px-10 py-4 text-xs tracking-[0.12em] text-background transition-opacity hover:opacity-85"
              >
                CLOSE
              </button>
            </DialogClose>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <DialogHeader className="gap-0 px-6 pb-1 pt-4 text-left sm:px-8">
              <p className="text-xs leading-none tracking-[0.2em] text-muted-foreground">
                WORKSHOP BOOKING
              </p>
              <DialogTitle className="-mt-0.5 font-serif text-3xl font-normal leading-none tracking-tighter">
                {workshop?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-2 px-4 pb-3 pt-1 sm:grid-cols-2 sm:px-8 sm:pb-4 sm:pt-1">
              <Field label="Full name" error={errors.fullName}>
                <input
                  value={values.fullName}
                  onChange={(event) => updateValue("fullName", event.target.value)}
                  autoComplete="name"
                  className={inputClass}
                />
              </Field>
              <Field label="Mobile number" error={errors.mobile}>
                <input
                  value={values.mobile}
                  onChange={(event) => updateValue("mobile", event.target.value)}
                  type="tel"
                  autoComplete="tel"
                  className={inputClass}
                />
              </Field>
              <Field label="Workshop date" error={errors.date}>
                <input
                  value={values.date}
                  onChange={(event) => updateValue("date", event.target.value)}
                  type="date"
                  min={getTomorrowDateMinimum()}
                  className={inputClass}
                />
              </Field>
              <Field label="Number of participants" error={errors.participants}>
                <input
                  value={values.participants}
                  onChange={(event) => updateValue("participants", event.target.value)}
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  className={inputClass}
                />
              </Field>
              <Field label="Email (optional)" error={errors.email} className="sm:col-span-1">
                <input
                  value={values.email}
                  onChange={(event) => updateValue("email", event.target.value)}
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                />
              </Field>
              <Field
                label="Additional notes (optional)"
                error={errors.notes}
                className="sm:col-span-2"
              >
                <textarea
                  value={values.notes}
                  onChange={(event) => updateValue("notes", event.target.value)}
                  rows={2}
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
                className="w-full border border-foreground bg-foreground px-8 py-4 text-xs tracking-[0.12em] text-background transition-opacity hover:opacity-85 sm:w-auto"
              >
                {submitting ? "Sending…" : "Send booking request"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

const inputClass =
  "mt-1 w-full border border-foreground/40 bg-transparent px-4 py-2 text-sm outline-none transition-colors focus:border-foreground";

type AccessibleFieldProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

function Field({
  label,
  error,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactElement<AccessibleFieldProps>;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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
