import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { TeamBuilderProvider } from '@/contexts/team-builder-context';
import { Navbar } from '@/components/navbar';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Squadify',
  description: 'Build your dream teams with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <TeamBuilderProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">{children}</main>
          </div>
          <Toaster />
        </TeamBuilderProvider>
      </body>
    </html>
  );
}
