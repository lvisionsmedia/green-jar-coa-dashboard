import type { Metadata } from "next";
import { ReferPageClient } from "@/components/ReferPageClient";

export const metadata: Metadata = {
  title: "Tell your friends | The Green Jar",
  description:
    "Tell your friends and get a free THC drink or a gram on us at The Green Jar.",
  openGraph: {
    title: "Tell your friends",
    description:
      "Share your number. Get a free THC drink or a gram on us at The Green Jar.",
    siteName: "The Green Jar",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tell your friends",
    description:
      "Share your number. Get a free THC drink or a gram on us at The Green Jar.",
  },
};

type ReferPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ReferPage({ searchParams }: ReferPageProps) {
  const params = await searchParams;
  const ref = first(params.ref);
  const share = first(params.share) === "1";

  return (
    <ReferPageClient
      initialRef={ref}
      shareMode={share}
      prefillName={first(params.name)}
      prefillEmail={first(params.email)}
      prefillPhone={first(params.phone)}
    />
  );
}
