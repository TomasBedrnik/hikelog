import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";

const sections = [
  {
    href: "/admin/users",
    title: "Users",
    description: "Review which Google accounts can access the administration area.",
  },
  {
    href: "/admin/trips",
    title: "Trips",
    description: "Create and edit trip records, planning fields, and BlockNote content.",
  },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f1e8_0%,#f8fafc_30%,#ffffff_100%)] p-6 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <AdminNav />

        <div className="mt-8 rounded-[32px] border border-stone-300/80 bg-white p-6 shadow-sm">
          <h1 className="text-4xl font-semibold tracking-tight">Administration</h1>
          <p className="mt-3 max-w-2xl text-sm text-stone-600">
            Choose a section to manage application access or edit trip content.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {sections.map((section) => (
              <Link
                key={section.href}
                className="rounded-[28px] border border-stone-300 bg-stone-50 p-6 transition hover:border-emerald-600 hover:bg-emerald-50"
                href={section.href}
              >
                <div className="text-xl font-semibold">{section.title}</div>
                <p className="mt-2 text-sm text-stone-600">{section.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
