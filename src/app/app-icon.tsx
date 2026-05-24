import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512
};

export const contentType = "image/png";

async function loadLogoDataUrl() {
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logo = await readFile(logoPath);
  return `data:image/png;base64,${logo.toString("base64")}`;
}

export default async function AppIcon() {
  const logoSrc = await loadLogoDataUrl();

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#f6f6f6",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%"
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: "#111111",
          borderRadius: 120,
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          display: "flex",
          height: 408,
          justifyContent: "center",
          padding: 44,
          width: 408
        }}
      >
        <img alt="LiveNoPay" height="272" src={logoSrc} width="408" />
      </div>
    </div>,
    size
  );
}
