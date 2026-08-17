import { BrandMark } from "@/components/BrandMark";
import { PublicCoaList } from "@/components/PublicCoaList";
import { getStoreBySlug } from "@/lib/stores";
import { notFound } from "next/navigation";

type StorePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function StorePublicPage({ params }: StorePageProps) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) {
    notFound();
  }

  return (
    <div className="public-home">
      <section className="public-page" aria-labelledby="public-page-title">
        <header className="public-header">
          <div className="public-brand">
            <BrandMark small />
            <span>{store.name}</span>
          </div>
          <h1 id="public-page-title">Certificates of Analysis</h1>
          <p>
            Browse uploaded Certificates of Analysis and open the PDFs
            directly.
          </p>
        </header>
        <PublicCoaList storeSlug={store.slug} />
      </section>
    </div>
  );
}
