import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { submitWorkshopBooking } from "./workshop-booking.functions";
import { WorkshopBookingDialog } from "./workshop-booking-dialog";
import {
  SITE_LOCALE_STORAGE_KEY,
  SiteLanguageProvider,
} from "@/features/site-language/site-language";

vi.mock("./workshop-booking.functions", () => ({
  submitWorkshopBooking: vi.fn(),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const workshop = {
  id: "mini-course",
  name: "Private mini course",
};

function futureDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "Noor Al-Hashemi" },
  });
  fireEvent.change(screen.getByLabelText("WhatsApp Number"), {
    target: { value: "0502345678" },
  });
  fireEvent.change(screen.getByLabelText("Workshop date"), {
    target: { value: futureDate() },
  });
  fireEvent.change(screen.getByLabelText("Number of participants"), {
    target: { value: "3" },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("WorkshopBookingDialog", () => {
  it("uses the Arabic font and correct field directions", () => {
    window.localStorage.setItem(SITE_LOCALE_STORAGE_KEY, "ar");
    render(
      <SiteLanguageProvider>
        <WorkshopBookingDialog workshop={workshop} onOpenChange={() => undefined} />
      </SiteLanguageProvider>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("dir")).toBe("rtl");
    expect(dialog.getAttribute("lang")).toBe("ar");
    expect(dialog.className).toContain("public-site-arabic");
    expect(screen.getByLabelText("الاسم الكامل").getAttribute("dir")).toBe("rtl");
    expect(screen.getByLabelText("رقم واتساب").getAttribute("dir")).toBe("ltr");
    expect(screen.getByLabelText("مقدمة رقم واتساب").getAttribute("dir")).toBe("ltr");
    expect(screen.getByLabelText("تاريخ الورشة").getAttribute("dir")).toBe("ltr");
    expect(screen.getByLabelText("عدد المشاركات").getAttribute("dir")).toBe("ltr");
    expect(screen.getByLabelText("ملاحظات إضافية (اختياري)").getAttribute("dir")).toBe("rtl");
  });

  it("shows the selected workshop without asking the customer for an email", () => {
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={() => undefined} />);

    expect(screen.getByRole("dialog").textContent).toContain("Private mini course");
    expect(screen.getByLabelText("Full name")).toBeTruthy();
    expect(screen.getByLabelText("WhatsApp Number")).toBeTruthy();
    expect(screen.queryByLabelText("Email (optional)")).toBeNull();
    expect(screen.getByLabelText("Workshop date")).toBeTruthy();
    expect(screen.getByLabelText("Number of participants")).toBeTruthy();
    expect(screen.getByLabelText("Additional notes (optional)")).toBeTruthy();
  });

  it("stacks booking fields on small screens", () => {
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={() => undefined} />);

    const fieldsGrid = screen.getByLabelText("Full name").parentElement?.parentElement;
    const notesFieldClasses =
      screen.getByLabelText("Additional notes (optional)").parentElement?.className.split(" ") ??
      [];

    expect(fieldsGrid?.className).toContain("grid-cols-1");
    expect(fieldsGrid?.className).toContain("sm:grid-cols-2");
    expect(notesFieldClasses).toContain("sm:col-span-2");
  });

  it("preserves entered values and shows field errors after invalid submission", () => {
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={() => undefined} />);

    const mobile = screen.getByLabelText("WhatsApp Number") as HTMLInputElement;
    fireEvent.change(mobile, { target: { value: "0502345678" } });
    fireEvent.click(screen.getByRole("button", { name: "Send booking request" }));

    expect(mobile.value).toBe("0502345678");
    expect(screen.getByText("Enter your full name.")).toBeTruthy();
    expect(screen.getByText("Choose a workshop date.")).toBeTruthy();
    expect(screen.getByLabelText("Full name")).toBeTruthy();
    expect(screen.getByLabelText("Workshop date")).toBeTruthy();
  });

  it("shows a real confirmation after persistence succeeds", async () => {
    vi.mocked(submitWorkshopBooking).mockResolvedValue({
      success: true,
      bookingId: "workshop-booking-1",
    });
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={() => undefined} />);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Send booking request" }));

    const status = await screen.findByRole("status");
    expect(status.textContent).toContain("Your workshop request was sent");
    const success = status.closest('[data-motion-state="workshop-success"]');
    expect(success).toBeTruthy();
    expect(success?.className).toContain("motion-state-enter");
    expect(submitWorkshopBooking).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workshopId: "mini-course",
        fullName: "Noor Al-Hashemi",
        participants: 3,
      }),
    });
  });

  it("disables the submit button while persistence is pending", () => {
    const pendingSubmission = deferred<{ success: true; bookingId: string }>();
    vi.mocked(submitWorkshopBooking).mockReturnValue(pendingSubmission.promise);
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={() => undefined} />);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Send booking request" }));

    expect((screen.getByRole("button", { name: "Sending…" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("recovers from a rejected persistence promise", async () => {
    const rejectedSubmission = deferred<{ success: true; bookingId: string }>();
    vi.mocked(submitWorkshopBooking).mockReturnValue(rejectedSubmission.promise);
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={() => undefined} />);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Send booking request" }));

    await act(async () => {
      rejectedSubmission.reject(new Error("offline"));
      await rejectedSubmission.promise.catch(() => undefined);
    });

    expect((await screen.findByRole("alert")).textContent).toContain(
      "We could not send your request. Please try again.",
    );
    expect(
      (screen.getByRole("button", { name: "Send booking request" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("ignores a pending submission that resolves after the dialog closes", async () => {
    const pendingSubmission = deferred<{ success: true; bookingId: string }>();
    vi.mocked(submitWorkshopBooking).mockReturnValue(pendingSubmission.promise);
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <WorkshopBookingDialog workshop={workshop} onOpenChange={onOpenChange} />,
    );

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Send booking request" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    rerender(<WorkshopBookingDialog workshop={null} onOpenChange={onOpenChange} />);

    await act(async () => {
      pendingSubmission.resolve({ success: true, bookingId: "workshop-booking-1" });
      await pendingSubmission.promise;
    });

    rerender(<WorkshopBookingDialog workshop={workshop} onOpenChange={onOpenChange} />);

    expect(screen.queryByRole("status")).toBeNull();
    expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe("");
    expect(
      (screen.getByRole("button", { name: "Send booking request" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("shows returned field errors after server validation fails", async () => {
    vi.mocked(submitWorkshopBooking).mockResolvedValue({
      success: false,
      reason: "validation",
      fieldErrors: { mobile: "Use a valid mobile number." },
    });
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={() => undefined} />);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Send booking request" }));

    expect(await screen.findByText("Use a valid mobile number.")).toBeTruthy();
    expect(screen.getByLabelText("WhatsApp Number").getAttribute("aria-invalid")).toBe("true");
  });

  it("preserves values and allows retry after storage failure", async () => {
    vi.mocked(submitWorkshopBooking)
      .mockResolvedValueOnce({ success: false, reason: "storage-error" })
      .mockResolvedValueOnce({ success: true, bookingId: "workshop-booking-1" });
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={() => undefined} />);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Send booking request" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "We could not send your request. Please try again.",
    );
    expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe("Noor Al-Hashemi");

    fireEvent.click(screen.getByRole("button", { name: "Send booking request" }));
    expect((await screen.findByRole("status")).textContent).toContain(
      "Your workshop request was sent",
    );
  });

  it("hides a storage error while a retry is pending", async () => {
    const retrySubmission = deferred<{ success: true; bookingId: string }>();
    vi.mocked(submitWorkshopBooking)
      .mockResolvedValueOnce({ success: false, reason: "storage-error" })
      .mockReturnValueOnce(retrySubmission.promise);
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={() => undefined} />);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Send booking request" }));
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Send booking request" }));

    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByRole("button", { name: "Sending…" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("reports a close request through the controlled dialog boundary", () => {
    const onOpenChange = vi.fn();
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
