'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, ROLE_DASHBOARD } from '@/lib/auth';
import { Ship, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      const dest = ROLE_DASHBOARD[user.role] || '/dashboard/customer';
      router.push(dest);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { label: 'Customer', email: 'sarah@toyworld.cn', password: 'demo123' },
    { label: 'Manager', email: 'lisa@pacificlog.sg', password: 'demo123' },
    { label: 'Driver', email: 'wang@pacificlog.sg', password: 'demo123' },
    { label: 'Port Officer', email: 'zhang@shanghai-port.cn', password: 'demo123' },
    { label: 'Customs', email: 'liu@customs.cn', password: 'demo123' },
    { label: 'Yard Mgr', email: 'chen@shanghai-port.cn', password: 'demo123' },
    { label: 'Admin', email: 'admin@cognitivetwin.io', password: 'admin123' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Ship className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Cognitive Twin</h1>
          <p className="text-sm text-[#64748B] mt-1">Intelligent Logistics Platform</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#0F172A]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@company.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#0F172A]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
            <p className="text-xs text-[#94A3B8] mb-3 text-center">Quick Demo Login</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                  className="text-xs px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
