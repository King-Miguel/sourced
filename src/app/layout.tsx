import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sourced",
  description: "Answers from your documents, with sources.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Icon font used for the small UI glyphs throughout the app
            (upload, status, citation icons). Loaded as a plain stylesheet
            since next/font only optimizes text fonts, not icon fonts. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font --
            This rule targets the Pages Router's pages/_document.js; in the
            App Router, a <link> in the root layout already loads once for
            the whole app, which is the behavior that rule is asking for. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-stone-50 text-slate-900">{children}</body>
    </html>
  );
}
