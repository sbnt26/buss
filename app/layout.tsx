import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BussApp',
  description: 'Create invoices via WhatsApp with web CRM',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}

