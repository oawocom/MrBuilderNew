import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["400","500","600","700"] });

export const metadata: Metadata = {
  title: "MrBuilder - America's First Pergola Platform | Professional Installation & Repair",
  description:
    "Connect with expert pergola contractors for installation, maintenance, and repair services. America's first platform exclusively focused on pergola systems. Get matched with verified professionals in your area.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${montserrat.variable} min-h-screen bg-white font-sans text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
