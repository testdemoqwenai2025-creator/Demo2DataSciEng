import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Northwind Data Platform · Trusted, governed analytics at scale",
  description:
    "A synthetic reference implementation of a scalable, governed data platform spanning Snowflake, Databricks, dbt, Tableau, Fivetran, Hightouch, Airflow and Unity Catalogue — built around single-source-of-truth datasets.",
  keywords: [
    "Snowflake",
    "Databricks",
    "dbt",
    "Delta Lake",
    "Medallion",
    "Tableau",
    "Fivetran",
    "Hightouch",
    "Airflow",
    "Dagster",
    "Unity Catalogue",
    "Data Governance",
    "CI/CD",
    "Lakehouse",
    "PySpark",
  ],
  authors: [{ name: "Northwind Data Platform" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Northwind Data Platform",
    description:
      "Synthetic reference architecture for a scalable, governed, single-source-of-truth data platform.",
    url: "https://chat.z.ai",
    siteName: "Northwind",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
