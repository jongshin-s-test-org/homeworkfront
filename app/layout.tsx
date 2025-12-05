import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: '게시판',
  description: '게시판 애플리케이션',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}