'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, ROLE_DASHBOARD } from '@/lib/auth';
import { Ship, AlertCircle, Package, MapPin, BarChart3, Shield, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    { label: 'Customer', email: 'sarah@toyworld.cn', password: 'demo123', color: 'bg-emerald-500' },
    { label: 'Manager', email: 'lisa@pacificlog.sg', password: 'demo123', color: 'bg-blue-500' },
    { label: 'Driver', email: 'wang@pacificlog.sg', password: 'demo123', color: 'bg-orange-500' },
    { label: 'Port Officer', email: 'zhang@shanghai-port.cn', password: 'demo123', color: 'bg-purple-500' },
    { label: 'Customs', email: 'liu@customs.cn', password: 'demo123', color: 'bg-rose-500' },
    { label: 'Yard Mgr', email: 'chen@shanghai-port.cn', password: 'demo123', color: 'bg-cyan-500' },
    { label: 'Admin', email: 'admin@cognitivetwin.io', password: 'admin123', color: 'bg-slate-600' },
  ];

  const features = [
    { icon: Package, text: 'End-to-end shipment tracking' },
    { icon: MapPin, text: 'Real-time GPS visibility' },
    { icon: BarChart3, text: 'Analytics & forecasting' },
    { icon: Shield, text: 'Role-based access control' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Hero Panel */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0F172A 0%, #1E3A5F 50%, #0F4C81 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60A5FA, transparent)' }} />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #38BDF8, transparent)' }} />
        <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #93C5FD, transparent)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)' }}>
              <Ship className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Cognitive Twin</h1>
              <p className="text-xs text-blue-300">Intelligent Logistics</p>
            </div>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Logistics<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #60A5FA, #38BDF8)' }}>
                Intelligence
              </span><br />
              Redefined.
            </h2>
            <p className="mt-4 text-blue-200 text-sm leading-relaxed max-w-xs">
              A digital twin of your entire supply chain — from first mile to final delivery, every step tracked and optimised.
            </p>
          </div>

          <ul className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-blue-300" />
                </div>
                <span className="text-sm text-blue-100">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-blue-400">© 2026 Cognitive Twin · All rights reserved</p>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#F8FAFC]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Ship className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#0F172A]">Cognitive Twin</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-[#E2E8F0] p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-[#0F172A]">Welcome back</h2>
              <p className="text-sm text-[#64748B] mt-1">Sign in to your logistics dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#0F172A]">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-[#F8FAFC] focus:bg-white"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#0F172A]">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 pr-11 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-[#F8FAFC] focus:bg-white"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
                style={{ background: loading ? '#93C5FD' : 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="mt-7 pt-6 border-t border-[#E2E8F0]">
              <p className="text-xs font-medium text-[#94A3B8] mb-3 text-center uppercase tracking-wider">Quick Demo Access</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[#E2E8F0] text-[#475569] hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all font-medium"
                  >
                    <span className={`w-2 h-2 rounded-full ${acc.color}`} />
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
