// Example: calling the FreshGuard API from your Next.js / React dashboard.
// Put your deployed API's URL in an env var, e.g. NEXT_PUBLIC_FRESHGUARD_API_URL.

const API_URL = process.env.NEXT_PUBLIC_FRESHGUARD_API_URL || "http://localhost:3000";

export async function getFreshGuardPrediction({
  vegetable,
  temperature,
  humidity,
  gasVoc,
  light,
  storageDays,
}) {
  const res = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vegetable,
      temperature,
      humidity,
      gas_voc: gasVoc,
      light,
      storage_days: storageDays,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "FreshGuard API error");
  }

  return res.json();
  // -> { vegetable, temperature, humidity, gas_voc, storage_days,
  //      remaining_days, quality, alert }
}

// Usage in a component:
//
// const data = await getFreshGuardPrediction({
//   vegetable: "Banana", temperature: 8, humidity: 75,
//   gasVoc: 450, light: 100, storageDays: 4,
// });
//
// <p>{data.remaining_days} days remaining — {data.alert}</p>
