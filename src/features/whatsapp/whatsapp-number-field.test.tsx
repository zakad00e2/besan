import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WhatsAppNumberField } from "./whatsapp-number-field";

afterEach(cleanup);

function renderField(overrides = {}) {
  const props = {
    id: "customer-whatsapp",
    locale: "en" as const,
    country: "IL" as const,
    value: "",
    disabled: false,
    error: undefined,
    onCountryChange: vi.fn(),
    onValueChange: vi.fn(),
    ...overrides,
  };
  render(<WhatsAppNumberField {...props} />);
  return props;
}

it("renders the WhatsApp label with Israel's flag and calling code selected", () => {
  renderField();
  expect(screen.getByLabelText("WhatsApp Number")).toBeTruthy();
  expect((screen.getByLabelText("WhatsApp country code") as HTMLSelectElement).value).toBe("IL");
  expect(screen.getByRole("option", { name: /🇮🇱 \+972/ })).toBeTruthy();
});

it("reports country and number changes", () => {
  const props = renderField();
  fireEvent.change(screen.getByLabelText("WhatsApp country code"), { target: { value: "AE" } });
  fireEvent.change(screen.getByLabelText("WhatsApp Number"), { target: { value: "202-555-0123" } });
  expect(props.onCountryChange).toHaveBeenCalledWith("AE");
  expect(props.onValueChange).toHaveBeenCalledWith("202-555-0123");
});
