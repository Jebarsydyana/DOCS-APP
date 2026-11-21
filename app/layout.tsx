import type { Metadata } from "next";
import "./globals.css";
import { appName } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: appName, template: `%s · ${appName}` },
  description: "A lightweight document editor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
