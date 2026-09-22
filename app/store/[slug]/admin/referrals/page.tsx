import { AdminReferrals } from "@/components/AdminReferrals";
import { Sidebar } from "@/components/Sidebar";
import { getStoreBySlug } from "@/lib/stores";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function StoreReferralsAdminPage({ params }: PageProps) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) {
    notFound();
  }

  return (
    <div className="app-shell">
      <Sidebar storeName={store.name} storeSlug={store.slug} active="referrals" />
      <main className="main-content">
        <AdminReferrals
          storeId={store.id}
          storeName={store.name}
          storeSlug={store.slug}
        />
      </main>
    </div>
  );
}
