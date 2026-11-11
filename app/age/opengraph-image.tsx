import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "21+ Age Checker | The Green Jar";
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
          gap: 48,
          padding: "48px 64px",
          background: "linear-gradient(135deg, #06140c 0%, #0d2418 55%, #167238 140%)",
          color: "#ffffff",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <img
          src={logoSrc}
          width={420}
          height={420}
          alt=""
          style={{
            width: 420,
            height: 420,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 18,
            maxWidth: 560,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#78c51c",
            }}
          >
            The Green Jar
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 0.98,
              color: "#ffffff",
            }}
          >
            21+ Age Checker
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              lineHeight: 1.3,
              color: "#c8f169",
            }}
          >
            Door check-in · birth date stays on this device
          </div>
          <div
            style={{
              marginTop: 8,
              display: "flex",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 18px",
                borderRadius: 12,
                background: "#167238",
                color: "#ffffff",
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              21+ OK
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 18px",
                borderRadius: 12,
                background: "#b42318",
                color: "#ffffff",
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              UNDER 21
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
