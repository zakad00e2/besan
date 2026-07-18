import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Sheet, SheetContent, SheetTitle } from "./sheet";

afterEach(cleanup);

describe("portaled motion surfaces", () => {
  it("marks dialog content for the global reduced-motion fallback", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Dialog</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("data-motion-surface")).toBe("dialog");
    expect(dialog.className).toContain("duration-[var(--motion-duration-surface)]");
  });

  it("uses the approved sheet timing and curve", () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Menu</SheetTitle>
        </SheetContent>
      </Sheet>,
    );

    const sheet = screen.getByRole("dialog");
    expect(sheet.getAttribute("data-motion-surface")).toBe("sheet");
    expect(sheet.className).toContain("duration-[var(--motion-duration-surface)]");
    expect(sheet.className).toContain("ease-[var(--motion-ease-sheet)]");
    expect(sheet.className).not.toContain("duration-500");
  });
});
