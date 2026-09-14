import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';
import ChatWidget from '@/components/chat-widget';
import { AuthProvider } from '@/context/auth-provider';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PerfectFit',
  description: 'Redefining Tailoring with Artificial Intelligence',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background`}>
        <ThemeProvider
            defaultTheme="dark"
            storageKey="ui-theme"
        >
            <AuthProvider>{children}</AuthProvider>
            <Toaster />
            <ChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
