import { cloneElement, useState, type FormEvent, type ReactElement } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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

  function updateValue(field: keyof WorkshopBookingFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = parseWorkshopBooking(workshop, values);

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setSubmitted(true);
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setValues(initialValues);
      setErrors({});
      setSubmitted(false);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={workshop !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto rounded-none border-foreground/70 p-0">
        {submitted ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center sm:px-10">
            <Check className="h-8 w-8" aria-hidden="true" />
            <p className="mt-5 text-xs tracking-[0.2em] text-muted-foreground">DEMO CONFIRMATION</p>
            <DialogTitle className="mt-3 font-serif text-4xl font-normal tracking-tighter">
              Booking prepared
            </DialogTitle>
            <p role="status" className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
              Your {workshop?.name} details are valid. This demo request has not been sent to the
              atelier.
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
            <DialogHeader className="border-b border-foreground/30 px-6 pb-6 pt-8 text-left sm:px-10">
              <p className="text-xs tracking-[0.2em] text-muted-foreground">WORKSHOP BOOKING</p>
              <DialogTitle className="font-serif text-4xl font-normal tracking-tighter">
                {workshop?.name}
              </DialogTitle>
              <DialogDescription className="leading-6">
                Choose a future date and leave your details. This form is currently a demonstration
                and does not send a request.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 px-6 py-7 sm:grid-cols-2 sm:px-10">
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
              <Field label="Email (optional)" error={errors.email}>
                <input
                  value={values.email}
                  onChange={(event) => updateValue("email", event.target.value)}
                  type="email"
                  autoComplete="email"
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
              <Field
                label="Additional notes (optional)"
                error={errors.notes}
                className="sm:col-span-2"
              >
                <textarea
                  value={values.notes}
                  onChange={(event) => updateValue("notes", event.target.value)}
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>

            <div className="flex justify-end border-t border-foreground/30 px-6 py-5 sm:px-10">
              <button
                type="submit"
                className="w-full border border-foreground bg-foreground px-8 py-4 text-xs tracking-[0.12em] text-background transition-opacity hover:opacity-85 sm:w-auto"
              >
                Prepare demo booking
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

const inputClass =
  "mt-2 w-full border border-foreground/40 bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-foreground";

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
    <label className={`block text-sm ${className}`}>
      <span className="text-xs tracking-[0.1em] text-muted-foreground">{label}</span>
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
    </label>
  );
}
