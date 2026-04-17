import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura Sovereign — Industrial Intelligence",
  description: "Autonomous physics-validated predictive maintenance platform for the next era of manufacturing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#020617]">
        {children}
      </body>
    </html>
  );
}
