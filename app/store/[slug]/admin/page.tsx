import { AdminDashboard } from "@/components/AdminDashboard";
import { Sidebar } from "@/components/Sidebar";
import { getStoreBySlug } from "@/lib/stores";
import { notFound } from "next/navigation";

type StoreAdminPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function StoreAdminPage({ params }: StoreAdminPageProps) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) {
    notFound();
  }

  return (
    <div className="app-shell">
      <Sidebar storeName={store.name} storeSlug={store.slug} />
      <main className="main-content">
        <AdminDashboard
          storeId={store.id}
          storeName={store.name}
          storeSlug={store.slug}
        />
      </main>
    </div>
  );
}
