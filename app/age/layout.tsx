import type { Metadata, Viewport } from "next";
import { AgePwaRegister } from "@/components/AgePwaRegister";
import "./age.css";

export const metadata: Metadata = {
  title: "21+ Age Checker | The Green Jar",
  description:
    "Door check-in age checker for The Green Jar. Birth dates stay on this device.",
  applicationName: "Green Jar 21+",
  manifest: "/age/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Green Jar 21+",
  },
  icons: {
    icon: [{ url: "/age/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/age/icons/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#06140c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function AgeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="age-shell">
      <AgePwaRegister />
      {children}
    </div>
  );
}
