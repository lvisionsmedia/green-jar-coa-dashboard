import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Tell your friends | The Green Jar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "72px 80px",
          background:
            "linear-gradient(145deg, #e1fdea 0%, #f7fbf8 42%, #ffffff 100%)",
          color: "#101828",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              background: "#0b7443",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="52" height="52" viewBox="0 0 36 36">
              <path
                d="M11 7h14l2 4v17a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4V11l2-4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              />
              <path
                d="M14 7V4h8v3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M18 26c4-3 6-6 6-10-3 0-5 1-6 3-1-2-3-3-6-3 0 4 2 7 6 10Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#0b7443",
              }}
            >
              The Green Jar
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#5b616b",
              }}
            >
              In-store rewards · 21+
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            maxWidth: 900,
            color: "#101828",
          }}
        >
          Tell your friends
        </div>
        <div
          style={{
            marginTop: 22,
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.35,
            color: "#5b616b",
            maxWidth: 820,
          }}
        >
          Share your number. Get a free THC drink or a gram on us.
        </div>
      </div>
    ),
    { ...size },
  );
}
