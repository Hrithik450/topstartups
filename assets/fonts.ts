import localFont from "next/font/local";

/** Landing (Bricolage Grotesque) — one variable face covering 200–800. */
const landing = localFont({
  src: "./fonts/bricolage-grotesque-variable.woff2",
  weight: "200 800",
  variable: "--font-landing",
  display: "swap",
});

/** Landing shell — Bricolage Grotesque via `.landing` / `.landing-strong`. */
export const landingFontClassName = [landing.variable, "landing"].join(" ");