import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartMigration } from "./components/CartMigration";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://skyzonebd.com'),
  title: {
    default: "SkyzoneBD - B2B & B2C Marketplace | Wholesale & Retail in Bangladesh",
    template: "%s | SkyzoneBD"
  },
  description: "Bangladesh's leading B2B and B2C marketplace. Connect with verified wholesalers, manufacturers, and retailers. Shop quality products at wholesale and retail prices. Fast delivery across Bangladesh.",
  keywords: "B2B marketplace Bangladesh, wholesale Bangladesh, B2C ecommerce, bulk buy, wholesale products, verified suppliers, manufacturer direct, retail products Bangladesh, online wholesale, business marketplace",
  authors: [{ name: "SkyzoneBD" }],
  creator: "SkyzoneBD",
  publisher: "SkyzoneBD",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_BD',
    url: 'https://skyzonebd.com',
    siteName: 'SkyzoneBD',
    title: 'SkyzoneBD - Your Trusted B2B & B2C Marketplace in Bangladesh',
    description: 'Connect with verified wholesalers and retailers. Shop quality products at competitive prices.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SkyzoneBD - B2B & B2C Marketplace',
    description: 'Bangladesh\'s trusted marketplace for wholesale and retail',
    creator: '@skyzonebd',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <CartMigration />
              {children}
              <ToastContainer
                position="top-right"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop={true}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                style={{
                  zIndex: 9999,
                }}
                toastStyle={{
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
