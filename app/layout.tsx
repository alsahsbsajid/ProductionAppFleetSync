import type { Metadata } from 'next';
import ClientLayout from './client-layout';
import './globals.css';

// Apple San Francisco Pro font configuration
const sfPro = {
  className: 'font-sans',
  style: {
    fontFamily: 'var(--font-sans)',
  },
};

export const metadata: Metadata = {
  title: 'FleetSync - Fleet Management',
  description: 'Modern fleet management dashboard for rentals and operations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={`${sfPro.className} antialiased`} style={sfPro.style}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
