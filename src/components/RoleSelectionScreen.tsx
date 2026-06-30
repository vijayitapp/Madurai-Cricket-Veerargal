import React, { useState } from 'react';
import { User, Edit3, Shield, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { AppRole } from '../hooks/useAuthRole';

interface RoleSelectionScreenProps {
  onSelectRole: (role: AppRole) => void;
}

export default function RoleSelectionScreen({ onSelectRole }: RoleSelectionScreenProps) {
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate slight network delay for better UX
    setTimeout(() => {
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
      if (password === adminPassword) {
        onSelectRole('admin');
      } else {
        setError('Incorrect admin password.');
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-sleek-bg text-sleek-text flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-sleek-accent rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-sleek-accent/20 mb-6">
            <div className="w-8 h-8 bg-sleek-bg rotate-45"></div>
          </div>
          <h1 className="text-2xl font-black italic uppercase tracking-wider text-sleek-text">
            Welcome to <span className="text-sleek-accent">MCV</span>
          </h1>
          <p className="text-sm text-sleek-text-muted font-medium">Select your role to continue</p>
        </div>

        {/* Roles */}
        {!showAdminAuth ? (
          <div className="space-y-4">
            <button
              onClick={() => onSelectRole('player')}
              className="w-full bg-sleek-card border border-sleek-border hover:border-sleek-accent hover:shadow-sleek-accent/10 rounded-2xl p-4 flex items-center gap-4 transition-all cursor-pointer group text-left"
            >
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <User size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sleek-text">Player / Fan</h3>
                <p className="text-xs text-sleek-text-muted mt-0.5">View matches, stats, and leaderboards</p>
              </div>
              <ArrowRight size={20} className="text-sleek-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button
              onClick={() => onSelectRole('scorer')}
              className="w-full bg-sleek-card border border-sleek-border hover:border-sleek-accent hover:shadow-sleek-accent/10 rounded-2xl p-4 flex items-center gap-4 transition-all cursor-pointer group text-left"
            >
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Edit3 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sleek-text">Scorer</h3>
                <p className="text-xs text-sleek-text-muted mt-0.5">Score active matches and setup games</p>
              </div>
              <ArrowRight size={20} className="text-sleek-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button
              onClick={() => setShowAdminAuth(true)}
              className="w-full bg-sleek-card border border-sleek-border hover:border-sleek-accent hover:shadow-sleek-accent/10 rounded-2xl p-4 flex items-center gap-4 transition-all cursor-pointer group text-left"
            >
              <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sleek-text">Administrator</h3>
                <p className="text-xs text-sleek-text-muted mt-0.5">Manage tournament, delete matches, full access</p>
              </div>
              <Lock size={16} className="text-sleek-text-muted mr-1" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdminSubmit} className="bg-sleek-card border border-sleek-border rounded-2xl p-6 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 border-b border-sleek-border pb-4">
              <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sleek-text">Admin Access</h3>
                <p className="text-[10px] text-sleek-text-muted uppercase tracking-wider">Authentication Required</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-sleek-text-muted uppercase tracking-widest block mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-sleek-overlay border border-sleek-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sleek-accent text-sleek-text transition-all"
                  placeholder="Enter admin password"
                  autoFocus
                />
              </div>

              {error && (
                <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-3 rounded-xl">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAdminAuth(false)}
                className="flex-1 py-3 bg-sleek-overlay hover:bg-sleek-overlay-hover border border-sleek-border text-sleek-text text-sm font-bold rounded-xl transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !password}
                className="flex-1 py-3 bg-sleek-accent hover:bg-sleek-accent/90 text-black text-sm font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Login'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
