import type { ReactNode } from "react";
import { AdminFooter } from "@/components/admin-footer";
import { AdminNav } from "@/components/admin-nav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f1e8_0%,#f8fafc_30%,#ffffff_100%)] text-stone-900 sm:px-6">
      <div className="mx-auto px-4 py-4 max-w-7xl min-h-screen bg-white">
        <AdminNav />
        {children}
        <AdminFooter />
      </div>
    </main>
  );
}
