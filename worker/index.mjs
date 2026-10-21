async function postCronEndpoint(path) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://web:3000";
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(`[worker] CRON_SECRET missing — refusing to call ${path}`);
    throw new Error("CRON_SECRET not set");
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[worker] ${path} → ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}
