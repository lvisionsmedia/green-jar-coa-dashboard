import { LoginForm } from "@/components/LoginForm";
import { getStoreBySlug } from "@/lib/stores";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type StoreLoginPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function StoreLoginPage({ params }: StoreLoginPageProps) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) {
    notFound();
  }

  return (
    <div className="login-page">
      <Suspense fallback={<div className="login-card">Loading...</div>}>
        <LoginForm
          mode="store"
          storeSlug={store.slug}
          storeName={store.name}
        />
      </Suspense>
    </div>
  );
}
