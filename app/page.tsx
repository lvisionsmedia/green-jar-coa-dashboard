import { BrandMark } from "@/components/BrandMark";
import { PublicCoaList } from "@/components/PublicCoaList";

export default function HomePage() {
  return (
    <div className="public-home">
      <section className="public-page" aria-labelledby="public-page-title">
        <header className="public-header">
          <div className="public-brand">
            <BrandMark small />
            <span>The Green Jar</span>
          </div>
          <h1 id="public-page-title">Certificates of Analysis</h1>
          <p>
            Browse uploaded Certificates of Analysis and open the PDFs directly.
          </p>
        </header>
        <PublicCoaList />
      </section>
    </div>
  );
}
