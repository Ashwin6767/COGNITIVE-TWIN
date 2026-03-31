import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata = {
  title: 'Cognitive Twin — Logistics Platform',
  description: 'Graph-based intelligent logistics management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
