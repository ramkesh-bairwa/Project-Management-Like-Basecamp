import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { ToastContainer } from '@/components/Toast';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ProjectHub - Project Management',
  description: 'Manage projects, teams, tasks and chats',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
