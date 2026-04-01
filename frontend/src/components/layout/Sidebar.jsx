'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import clsx from 'clsx';
import {
  LayoutDashboard, Ship, FileText, Bell, Users, Settings,
  ChevronLeft, ChevronRight, Anchor, Container, Truck,
  ClipboardCheck, BarChart3, ShieldCheck
} from 'lucide-react';

const NAV_BY_ROLE = {
  CUSTOMER: [
    { label: 'Dashboard', href: '/dashboard/customer', icon: LayoutDashboard },
    { label: 'My Shipments', href: '/shipments', icon: Ship },
    { label: 'New Request', href: '/shipments/new', icon: FileText },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ],
  LOGISTICS_MANAGER: [
    { label: 'Dashboard', href: '/dashboard/manager', icon: LayoutDashboard },
    { label: 'All Shipments', href: '/shipments', icon: Ship },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Documents', href: '/documents', icon: FileText },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ],
  DRIVER: [
    { label: 'Dashboard', href: '/dashboard/driver', icon: LayoutDashboard },
    { label: 'My Assignments', href: '/shipments', icon: Truck },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ],
  PORT_OFFICER: [
    { label: 'Dashboard', href: '/dashboard/port', icon: LayoutDashboard },
    { label: 'Shipments', href: '/shipments', icon: Ship },
    { label: 'Vessels', href: '/vessels', icon: Anchor },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ],
  CUSTOMS_OFFICER: [
    { label: 'Dashboard', href: '/dashboard/customs', icon: LayoutDashboard },
    { label: 'Priority', href: '/shipments', icon: ClipboardCheck },
    { label: 'Documents', href: '/documents', icon: FileText },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ],
  YARD_MANAGER: [
    { label: 'Dashboard', href: '/dashboard/yard', icon: LayoutDashboard },
    { label: 'Yard', href: '/yard', icon: Container },
    { label: 'Containers', href: '/containers', icon: Container },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ],
  ADMIN: [
    { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
    { label: 'All Shipments', href: '/shipments', icon: Ship },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'System', href: '/admin/system', icon: Settings },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ],
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();

  const links = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.CUSTOMER;

  return (
    <aside
      className={clsx(
        'h-screen bg-white border-r border-[#E2E8F0] flex flex-col transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={clsx('flex items-center h-16 border-b border-[#E2E8F0] px-4', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Ship className="w-5 h-5 text-white" />
        </div>
        {!collapsed && <span className="font-semibold text-[#0F172A] text-sm">Cognitive Twin</span>}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? link.label : undefined}
            >
              <link.icon className="w-5 h-5 shrink-0" />
              {!collapsed && link.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-3 border-t border-[#E2E8F0] text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
      >
        {collapsed ? <ChevronRight className="w-5 h-5 mx-auto" /> : <ChevronLeft className="w-5 h-5 mx-auto" />}
      </button>
    </aside>
  );
}
