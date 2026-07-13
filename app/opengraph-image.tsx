import { ImageResponse } from "next/og";
import { ogHeadline } from "@/lib/site";

export const alt = "SNG Labs — Building what fan engagement becomes next.";
export const size = {
  width: 1200,
  height: 630,
};
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
          justifyContent: "space-between",
          backgroundColor: "#070809",
          backgroundImage:
            "radial-gradient(circle at 18% 20%, rgba(184,212,200,0.14), transparent 42%), radial-gradient(circle at 88% 18%, rgba(168,189,212,0.08), transparent 36%)",
          padding: "72px",
          color: "#f2f2f0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              border: "1px solid rgba(242,242,240,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "999px",
                backgroundColor: "#b8d4c8",
              }}
            />
          </div>
          <div
            style={{
              fontSize: "28px",
              letterSpacing: "0.28em",
              fontWeight: 700,
            }}
          >
            SNG LABS
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            maxWidth: "920px",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#b8d4c8",
            }}
          >
            Sports. Technology. Participation.
          </div>
          <div
            style={{
              fontSize: "64px",
              lineHeight: 1.05,
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            {ogHeadline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "20px",
            color: "#9a9a96",
          }}
        >
          <div>Minnesota innovation studio</div>
          <div style={{ color: "#b8d4c8" }}>snglabs.com</div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
