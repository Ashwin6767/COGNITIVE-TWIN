'use client';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/lib/notifications';

export function NotificationBell() {
  const { unreadCount } = useNotifications();

  return (
    <Link
      href="/notifications"
      className="relative p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
