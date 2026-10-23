export const config = { runtime: "edge" };

const SHORT_CODE = /^[A-Za-z0-9_-]{4,20}$/;

export default async function handler(request) {
  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (!SHORT_CODE.test(code)) {
    return new Response("Not found", { status: 404 });
  }

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const upstream = await fetch(
    `https://kootahak.vercel.app/api/go/${encodeURIComponent(code)}`,
    {
      redirect: "manual",
      headers: {
        "user-agent": request.headers.get("user-agent") ?? "unknown",
        referer: request.headers.get("referer") ?? "",
        "x-kootahak-client-ip": clientIp,
      },
    },
  );

  const location = upstream.headers.get("location");
  if (location) {
    return new Response(null, {
      status: upstream.status === 301 ? 301 : 302,
      headers: {
        location,
        "cache-control": "no-store",
      },
    });
  }

  return new Response(null, { status: upstream.status === 404 ? 404 : 502 });
}
