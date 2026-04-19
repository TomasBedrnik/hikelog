"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminFooter } from "@/components/admin-footer";
import { AdminNav } from "@/components/admin-nav";
import { isBootstrapOnly } from "@/lib/auth";

export function AdminLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [bootstrapOnly, setBootstrapOnly] = useState<boolean | null>(null);

  useEffect(() => {
    setBootstrapOnly(isBootstrapOnly());
  }, [pathname]);

  useEffect(() => {
    if (bootstrapOnly && pathname !== "/admin/users") {
      router.replace("/admin/users");
    }
  }, [bootstrapOnly, pathname, router]);

  const showChildren = bootstrapOnly === false || pathname === "/admin/users";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f1e8_0%,#f8fafc_30%,#ffffff_100%)] text-stone-900 sm:px-6">
      <div className="mx-auto min-h-screen max-w-7xl bg-white px-4 py-4">
        <AdminNav />
        {showChildren ? children : null}
        <AdminFooter />
      </div>
    </main>
  );
}
