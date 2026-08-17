import { AdminDashboard } from "@/components/AdminDashboard";
import { Sidebar } from "@/components/Sidebar";
import { resolveRequestTenant } from "@/lib/request-tenant";
import { notFound } from "next/navigation";

export default async function AdminPage() {
  const tenant = await resolveRequestTenant();
  if (!tenant.store) {
    notFound();
  }

  return (
    <div className="app-shell">
      <Sidebar storeName={tenant.store.name} storeSlug={tenant.store.slug} />
      <main className="main-content">
        <AdminDashboard
          storeId={tenant.store.id}
          storeName={tenant.store.name}
          storeSlug={tenant.store.slug}
        />
      </main>
    </div>
  );
}
