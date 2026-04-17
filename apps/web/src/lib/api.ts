export async function getHealth() {
  const baseUrl = process.env.API_BASE_URL;

  const res = await fetch(`${baseUrl}/health`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }

  return res.json();
}
