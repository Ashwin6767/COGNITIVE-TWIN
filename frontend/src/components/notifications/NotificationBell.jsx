'use client';
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    api.get('/notifications/unread-count').then(d => setCount(d.count)).catch(() => {});
    const interval = setInterval(() => {
      api.get('/notifications/unread-count').then(d => setCount(d.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button className="relative p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]">
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
