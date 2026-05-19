'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, User, Eye, EyeOff, Pill, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string | null;
}

function isServerDown(errMsg: string): boolean {
  const lower = errMsg.toLowerCase();
  return lower.includes('sandbox') || lower.includes('inactive') ||
         lower.includes('502') || lower.includes('bad gateway') ||
         lower.includes('connection') || lower.includes('fetch') ||
         lower.includes('network') || lower.includes('failed to fetch');
}

export function LoginScreen({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverDown, setServerDown] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetrying, setAutoRetrying] = useState(false);
  const retryTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);

  // Clean up retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimer.current) clearInterval(retryTimer.current);
    };
  }, []);

  const checkServerAndRetry = useCallback((savedUsername: string, savedPassword: string) => {
    if (retryTimer.current) clearInterval(retryTimer.current);
    setAutoRetrying(true);
    setServerDown(true);
    retryCountRef.current = 0;

    retryTimer.current = setInterval(async () => {
      retryCountRef.current++;
      setRetryCount(retryCountRef.current);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: savedUsername, password: savedPassword }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (retryTimer.current) clearInterval(retryTimer.current);
            setAutoRetrying(false);
            setServerDown(false);
            onLogin(data.data);
            return;
          }
        }
        // Server responded but login failed for other reasons - stop retrying
        if (retryTimer.current) clearInterval(retryTimer.current);
        setAutoRetrying(false);
        setServerDown(false);
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Login failed');
      } catch {
        // Still down, keep retrying (up to 30 times = ~90 seconds)
        if (retryCountRef.current >= 30) {
          if (retryTimer.current) clearInterval(retryTimer.current);
          setAutoRetrying(false);
          setError('Server is taking too long to start. Please try again.');
        }
      }
    }, 3000);
  }, [onLogin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setError('');
    setLoading(true);
    setServerDown(false);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        // Check if response is HTML (502 page from proxy)
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          throw new Error('Server unavailable (502)');
        }
      }

      const data = await res.json();
      if (data.success) {
        onLogin(data.data);
      } else {
        const errMsg = data.error || 'Login failed';
        setError(errMsg);
        // If server appears down, start auto-retry
        if (isServerDown(errMsg)) {
          checkServerAndRetry(username, password);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection error';
      setError('Server is starting... Will retry automatically.');
      checkServerAndRetry(username, password);
    }
    setLoading(false);
  };

  const manualRetry = () => {
    if (retryTimer.current) clearInterval(retryTimer.current);
    setAutoRetrying(false);
    setServerDown(false);
    setError('');
    // Trigger form submit
    const form = document.querySelector('form');
    if (form) form.requestSubmit();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
              <Pill className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Upharma ERP</h1>
            <p className="text-sm text-gray-500 mt-1">Pharmacy Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && !serverDown && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
                {error}
              </div>
            )}

            {serverDown && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-1">
                  {autoRetrying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {autoRetrying ? 'Waiting for server...' : 'Server unavailable'}
                </div>
                <p className="text-amber-600 text-xs">
                  {autoRetrying
                    ? `Auto-retrying... (attempt ${retryCount}/30). Please wait.`
                    : 'The server is not responding. Click Retry or send any message to restart.'}
                </p>
                {!autoRetrying && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={manualRetry}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry Login
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 border-border/80"
                  placeholder="Enter username"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 border-border/80"
                  placeholder="Enter password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 font-medium" disabled={loading || !username || !password}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 space-y-1.5">
            <p className="text-[11px] text-center text-gray-400 font-medium">Developed by Khizeroddin Shaikh</p>
            <p className="text-[10px] text-center text-gray-400">
              <a href="tel:+919890372241" className="hover:text-emerald-600 transition-colors">Call/WhatsApp: +91 98903 72241</a>
            </p>
            <p className="text-[10px] text-center text-gray-500 font-medium">MultiNex Multi Solutions LLP</p>
            <p className="text-[9px] text-center text-gray-300">All Rights Reserved</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
