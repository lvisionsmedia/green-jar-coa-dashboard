import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Tell your friends | The Green Jar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logoBytes = await readFile(join(process.cwd(), "public/gj-logo.png"));
  const logoSrc = `data:image/png;base64,${logoBytes.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          padding: "40px 56px",
          background: "#050505",
          color: "#ffffff",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <img
          src={logoSrc}
          width={520}
          height={520}
          alt=""
          style={{
            width: 520,
            height: 520,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 16,
            maxWidth: 480,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#7dffb0",
            }}
          >
            The Green Jar
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.02,
              color: "#ffffff",
            }}
          >
            Tell your friends
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 500,
              lineHeight: 1.35,
              color: "#b7c0c8",
            }}
          >
            Share your number. Get a free THC drink or a gram on us.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
