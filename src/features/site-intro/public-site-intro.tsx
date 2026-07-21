import { useEffect, useState } from "react";
import besanLogo from "@/assets/besan-logo.png";

export const PUBLIC_SITE_INTRO_SESSION_KEY = "besan.public-intro.seen";

const WORDMARK = "BESAN KHALAILY";
const NORMAL_HIDE_DELAY = 1_800;
const NORMAL_REMOVE_DELAY = 2_000;
const REDUCED_HIDE_DELAY = 50;
const REDUCED_REMOVE_DELAY = 150;

type IntroPhase = "shown" | "hiding" | "done";

function hasSeenIntro() {
  try {
    return sessionStorage.getItem(PUBLIC_SITE_INTRO_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberIntro() {
  try {
    sessionStorage.setItem(PUBLIC_SITE_INTRO_SESSION_KEY, "1");
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function PublicSiteIntro() {
  const [phase, setPhase] = useState<IntroPhase>("done");

  useEffect(() => {
    if (hasSeenIntro()) {
      return;
    }

    rememberIntro();
    document.documentElement.classList.add("public-site-intro-active");
    setPhase("shown");

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const hideDelay = reducedMotion ? REDUCED_HIDE_DELAY : NORMAL_HIDE_DELAY;
    const removeDelay = reducedMotion ? REDUCED_REMOVE_DELAY : NORMAL_REMOVE_DELAY;
    const hideTimer = window.setTimeout(() => setPhase("hiding"), hideDelay);
    const removeTimer = window.setTimeout(() => {
      document.documentElement.classList.remove("public-site-intro-active");
      setPhase("done");
    }, removeDelay);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
      document.documentElement.classList.remove("public-site-intro-active");
    };
  }, []);

  if (phase === "done") return null;

  let letterIndex = 0;

  return (
    <div
      data-testid="public-site-intro"
      className={`public-site-intro t-stagger ${phase === "shown" ? "is-shown" : ""} ${phase === "hiding" ? "is-hiding" : ""}`}
    >
      <div className="public-site-intro__lockup" dir="ltr">
        <img
          src={besanLogo}
          alt="Besan Khalaily monogram"
          className="public-site-intro__logo t-stagger-line"
        />
        <p className="public-site-intro__wordmark" aria-label={WORDMARK}>
          {Array.from(WORDMARK).map((character, index) => {
            if (character === " ") {
              return (
                <span
                  key={`space-${index}`}
                  className="public-site-intro__space"
                  aria-hidden="true"
                />
              );
            }

            const delay = 300 + letterIndex * 45;
            letterIndex += 1;
            return (
              <span
                key={`${character}-${index}`}
                className="public-site-intro__letter"
                aria-hidden="true"
              >
                <span
                  data-testid="intro-letter"
                  className="t-stagger-line"
                  style={{ transitionDelay: `${delay}ms` }}
                >
                  {character}
                </span>
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
}
