import { ImageResponse } from "next/og";

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
          display: "flex",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #f7f5ef 0%, #ece8df 52%, #ddd7cd 100%)",
          color: "#111111",
          padding: "64px",
          fontFamily: "Arial, sans-serif",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "72%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#5f5a52",
            }}
          >
            Berlin Electronic Music Record Shop
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                fontSize: 86,
                fontWeight: 700,
                lineHeight: 0.95,
                letterSpacing: "-0.05em",
              }}
            >
              Federico Shop
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 34,
                color: "#4d4a45",
                lineHeight: 1.3,
                maxWidth: "900px",
              }}
            >
              Techno, EBM, darkwave, post-punk, vinyl, cassette and CD from Berlin.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 18,
              fontSize: 26,
              color: "#5f5a52",
            }}
          >
            <div style={{ display: "flex" }}>Graded stock</div>
            <div style={{ display: "flex" }}>Collector shipping</div>
            <div style={{ display: "flex" }}>Local pickup</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "190px",
            height: "190px",
            borderRadius: "999px",
            border: "4px solid #111111",
            fontSize: 42,
            fontWeight: 700,
          }}
        >
          FS
        </div>
      </div>
    ),
    size,
  );
}
