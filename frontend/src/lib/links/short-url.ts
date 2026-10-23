const PRODUCTION_ORIGIN = "https://c7j.vercel.app";
const DEVELOPMENT_ORIGIN = "http://c7j.local:8000";

export function shortLinkOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_REDIRECT_ORIGIN?.trim();
  const origin =
    configured ||
    (process.env.NODE_ENV === "production"
      ? PRODUCTION_ORIGIN
      : DEVELOPMENT_ORIGIN);

  return origin.replace(/\/$/, "");
}

export function shortLinkUrl(shortCode: string): string {
  return `${shortLinkOrigin()}/${shortCode}`;
}
