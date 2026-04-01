'use client';
import { useAuth } from '@/lib/auth';
import { NotificationProvider } from '@/lib/notifications';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AppShell({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <NotificationProvider>
      <div className="flex h-screen bg-[#F8FAFC]">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto px-8 py-6">
            {children}
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}
