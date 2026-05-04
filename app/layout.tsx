import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Providers } from '@/app/providers';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Gidiyom — Yapay Zeka Destekli Seyahat Planlayıcı',
  description: 'Nereye gittiğini söyle, gerisini biz halledelim. Saniyeler içinde kişiselleştirilmiş seyahat planı oluştur.',
  keywords: 'seyahat planlayıcı, tatil planı, yapay zeka, gezi planı, türkiye',
  openGraph: {
    title: 'Gidiyom — Hayalindeki tatili saniyeler içinde planla',
    description: 'Nereye gittiğini söyle, gerisini biz halledelim.',
    url: 'https://mapz-kappa.vercel.app',
    siteName: 'Gidiyom',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gidiyom — Yapay Zeka Destekli Seyahat Planlayıcı',
    description: 'Saniyeler içinde kişiselleştirilmiş seyahat planı oluştur.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
