import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Voxali — Book Local Selfcare Services',
  description: 'Discover top-rated salons, barbers, medspas, wellness studios and beauty experts trusted by millions worldwide. Instant booking, no fees.',
  keywords: 'salon booking, hair salon, spa, beauty, barber, nail salon, worldwide, selfcare',
  openGraph: {
    title: 'Voxali — Book Local Selfcare Services',
    description: 'Discover top-rated beauty professionals near you. Trusted by millions worldwide.',
    url: 'https://voxali.net',
    siteName: 'Voxali',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
