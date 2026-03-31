'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Users, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const ROLE_COLORS = {
  ADMIN: 'danger',
  LOGISTICS_MANAGER: 'warning',
  CUSTOMER: 'info',
  DRIVER: 'default',
  PORT_OFFICER: 'success',
  CUSTOMS_OFFICER: 'warning',
  YARD_MANAGER: 'default',
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    api.get('/users/?page=1&limit=100')
      .then(data => setUsers(data.items || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.id?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roles = [...new Set(users.map(u => u.role).filter(Boolean))].sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0F172A]">Users</h1>
        <p className="text-sm text-[#64748B]">{users.length} registered users</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No users found" icon={Users} />
          ) : (
            <div className="space-y-2">
              {filtered.map(u => {
                const isExpanded = expandedUser === u.id;
                return (
                  <div key={u.id} className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-[#F8FAFC] transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold shrink-0">
                          {u.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">{u.name}</p>
                          <p className="text-xs text-[#64748B]">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={ROLE_COLORS[u.role] || 'default'}>{u.role?.replace(/_/g, ' ')}</Badge>
                        {u.is_active === false && <Badge variant="danger">Inactive</Badge>}
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-[#94A3B8]" /> : <ChevronRight className="w-4 h-4 text-[#94A3B8]" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-4">
                        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                          <div>
                            <dt className="text-xs text-[#94A3B8]">User ID</dt>
                            <dd className="text-[#0F172A] font-mono">{u.id}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-[#94A3B8]">Role</dt>
                            <dd className="text-[#0F172A]">{u.role?.replace(/_/g, ' ')}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-[#94A3B8]">Status</dt>
                            <dd className="text-[#0F172A]">{u.is_active !== false ? 'Active' : 'Inactive'}</dd>
                          </div>
                          {u.company_id && (
                            <div>
                              <dt className="text-xs text-[#94A3B8]">Company</dt>
                              <dd className="text-[#0F172A]">{u.company_id}</dd>
                            </div>
                          )}
                          {u.assigned_port_id && (
                            <div>
                              <dt className="text-xs text-[#94A3B8]">Assigned Port</dt>
                              <dd className="text-[#0F172A]">{u.assigned_port_id}</dd>
                            </div>
                          )}
                          <div>
                            <dt className="text-xs text-[#94A3B8]">Created</dt>
                            <dd className="text-[#0F172A]">{formatDateTime(u.created_at)}</dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
