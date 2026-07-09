import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkshopBookingDialog } from "./workshop-booking-dialog";

afterEach(cleanup);

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

describe("WorkshopBookingDialog", () => {
  it("shows the selected workshop and all booking fields", () => {
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={() => undefined} />);

    expect(screen.getByRole("dialog").textContent).toContain("Private mini course");
    expect(screen.getByLabelText("Full name")).toBeTruthy();
    expect(screen.getByLabelText("Mobile number")).toBeTruthy();
    expect(screen.getByLabelText("Email (optional)")).toBeTruthy();
    expect(screen.getByLabelText("Workshop date")).toBeTruthy();
    expect(screen.getByLabelText("Number of participants")).toBeTruthy();
    expect(screen.getByLabelText("Additional notes (optional)")).toBeTruthy();
  });

  it("stacks booking fields on small screens", () => {
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={() => undefined} />);

    const fieldsGrid = screen.getByLabelText("Full name").parentElement?.parentElement;
    const emailFieldClasses =
      screen.getByLabelText("Email (optional)").parentElement?.className.split(" ") ?? [];
    const notesFieldClasses =
      screen.getByLabelText("Additional notes (optional)").parentElement?.className.split(" ") ??
      [];

    expect(fieldsGrid?.className).toContain("grid-cols-1");
    expect(fieldsGrid?.className).toContain("sm:grid-cols-2");
    expect(emailFieldClasses).not.toContain("col-span-2");
    expect(notesFieldClasses).not.toContain("col-span-2");
    expect(notesFieldClasses).toContain("sm:col-span-2");
  });

  it("preserves entered values and shows field errors after invalid submission", () => {
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={() => undefined} />);

    const mobile = screen.getByLabelText("Mobile number") as HTMLInputElement;
    fireEvent.change(mobile, { target: { value: "0501234567" } });
    fireEvent.click(screen.getByRole("button", { name: "Prepare demo booking" }));

    expect(mobile.value).toBe("0501234567");
    expect(screen.getByText("Enter your full name.")).toBeTruthy();
    expect(screen.getByText("Choose a workshop date.")).toBeTruthy();
    expect(screen.getByLabelText("Full name")).toBeTruthy();
    expect(screen.getByLabelText("Workshop date")).toBeTruthy();
  });

  it("shows an explicit demo-only confirmation after valid submission", () => {
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={() => undefined} />);

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Noor Al-Hashemi" },
    });
    fireEvent.change(screen.getByLabelText("Mobile number"), {
      target: { value: "0501234567" },
    });
    fireEvent.change(screen.getByLabelText("Workshop date"), {
      target: { value: futureDate() },
    });
    fireEvent.change(screen.getByLabelText("Number of participants"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prepare demo booking" }));

    expect(screen.getByRole("status").textContent).toContain(
      "This demo request has not been sent to the atelier.",
    );
  });

  it("reports a close request through the controlled dialog boundary", () => {
    const onOpenChange = vi.fn();
    render(<WorkshopBookingDialog workshop={workshop} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
