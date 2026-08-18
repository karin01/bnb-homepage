import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { MembershipProvider } from "@/components/providers/MembershipProvider";
import { FloatingCta } from "@/components/layout/FloatingCta";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SITE } from "@/data/site";
import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} | 방송대 컴퓨터과학과 스터디`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${notoSansKr.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          <MembershipProvider>
            <div className="grid-bg min-h-screen">
              <SiteHeader />
              <main>{children}</main>
              <SiteFooter />
              <FloatingCta />
            </div>
          </MembershipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
