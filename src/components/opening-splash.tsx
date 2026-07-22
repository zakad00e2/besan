import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import monogram from "@/assets/besan-logo.png";

const BRAND_NAME = "BESAN KHALAILY";
const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type SplashState = "active" | "exiting" | "hidden";

export function OpeningSplash() {
  const [state, setState] = useState<SplashState>("active");

  useClientLayoutEffect(() => {
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const exitAt = reducedMotion ? 250 : 2500;
    const removeAt = reducedMotion ? 430 : 2800;

    root.style.overflow = "hidden";
    const exitTimer = window.setTimeout(() => setState("exiting"), exitAt);
    const removeTimer = window.setTimeout(() => {
      root.style.overflow = previousOverflow;
      setState("hidden");
    }, removeAt);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
      root.style.overflow = previousOverflow;
    };
  }, []);

  if (state === "hidden") return null;

  return (
    <div
      data-testid="opening-splash"
      data-state={state}
      aria-hidden="true"
      className="opening-splash"
    >
      <div className="opening-splash__lockup">
        <img
          src={monogram}
          alt=""
          width={382}
          height={263}
          className="opening-splash__monogram"
        />
        <p className="opening-splash__wordmark">
          <span className="sr-only">{BRAND_NAME}</span>
          <span aria-hidden="true">
            {Array.from(BRAND_NAME).map((character, index) => (
              <span
                key={`${character}-${index}`}
                className="opening-splash__letter"
                style={{ "--opening-letter-index": index } as CSSProperties}
              >
                {character === " " ? "\u00a0" : character}
              </span>
            ))}
          </span>
        </p>
      </div>
    </div>
  );
}
