"use client";

import { useI18n } from "@/components/i18n-provider";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function HomePageContent({ health }: { health: unknown }) {
  const { dict } = useI18n();

  return (
    <main className="p-8">
      <div className="flex items-center justify-between gap-4">
        <h1>{dict.home.title}</h1>
        <LocaleSwitcher />
      </div>

      <p>{dict.home.greeting}</p>

      <p>
        <a href="/admin">{dict.home.adminLink}</a>
      </p>

      <h2>{dict.home.backendStatus}</h2>
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
