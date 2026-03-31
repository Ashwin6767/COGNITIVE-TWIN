'use client';
import { useAuth } from '@/lib/auth';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { LogOut, User } from 'lucide-react';

export function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-8 shrink-0">
      <div>
        <h2 className="text-sm font-medium text-[#0F172A]">
          Welcome back, {user?.name || 'User'}
        </h2>
        <p className="text-xs text-[#94A3B8]">{user?.role?.replace(/_/g, ' ')}</p>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <div className="flex items-center gap-2 ml-2 pl-4 border-l border-[#E2E8F0]">
          <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-[#0F172A] hidden sm:block">{user?.name}</span>
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
