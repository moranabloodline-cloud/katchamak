import type { Metadata } from "next";
import "./fonts.css";
import { LocalToaster } from "@/components/kachamak/LocalToaster";
import { AppearanceSettings } from "@/components/kachamak/AppearanceSettings";
import { ApplicationUpdates } from "@/components/kachamak/ApplicationUpdates";
import "./globals.css";


export const metadata: Metadata = {
  title: "Draftopus — Private Writing Workspace",
  description:
    "Private novel-writing workspace: Binder, Codex, Planning, Research, Templates and Prompts — saved privately to your account in the cloud.",
  icons: {
    icon: { url: "/draftopus-logo.png", type: "image/png", sizes: "256x256" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground"
      >
        {children}
        <ApplicationUpdates />
        <AppearanceSettings />
        <LocalToaster />
      </body>
    </html>
  );
}
