import type { Metadata } from "next";
import "./fonts.css";
import { Toaster } from "sonner";
import { ApplicationUpdates } from "@/components/kachamak/ApplicationUpdates";
import "./globals.css";


export const metadata: Metadata = {
  title: "Kachamak — Private Writing Workspace",
  description:
    "Private novel-writing workspace: Binder, Codex, Planning, Research, Templates and Prompts — saved in your chosen local folders.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍲</text></svg>",
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
        <Toaster theme="dark" position="bottom-right" duration={3500} />
      </body>
    </html>
  );
}
