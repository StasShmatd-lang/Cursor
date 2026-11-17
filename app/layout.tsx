import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../client/src/index.css";

export const metadata: Metadata = {
  title: "Оценка выступлений",
  description: "Голосование жюри на мероприятии",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
