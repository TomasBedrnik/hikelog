import { getHealth } from "@/lib/api";

export default async function HomePage() {
  const health = await getHealth();

  return (
    //SOME COMMENT WHICH SHOULD NOT BE HERE
    <main className="p-8">
      <h1>HikeLog</h1>

      <p>Hello from the frontend 👋</p>

      <h2>Backend status</h2>
      <pre
        style={{
          padding: 12,
          background: "#f5f5f5",
          borderRadius: 8,
        }}
      >
        {JSON.stringify(health, null, 2)}
      </pre>
    </main>
  );
}
