'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, LogOut, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/app-store';
import { useToast } from '@/hooks/use-toast';

interface ActiveStaffMember {
  id: string;
  userId: string;
  userName: string;
  loginTime: string;
}

export function ActiveStaffBadge() {
  const { shiftStatus, user } = useAppStore();
  const { toast } = useToast();
  const [staff, setStaff] = useState<ActiveStaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchStaff = useCallback(async () => {
    if (shiftStatus !== 'Open') {
      setStaff([]);
      return;
    }
    try {
      const res = await fetch('/api/staff-sessions/active');
      const json = await res.json();
      if (json.success && json.sessions) {
        setStaff(json.sessions);
      } else {
        setStaff([]);
      }
    } catch {
      setStaff([]);
    }
  }, [shiftStatus]);

  useEffect(() => {
    fetchStaff();
    const interval = setInterval(fetchStaff, 30000);
    return () => clearInterval(interval);
  }, [fetchStaff]);

  const handleEndSession = async (sessionId: string, userName: string) => {
    setEndingId(sessionId);
    try {
      const res = await fetch('/api/staff-sessions/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId: user?.id }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchStaff();
        toast({ title: 'Session Ended', description: `${userName}'s session has been ended.` });
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to end session', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to end session', variant: 'destructive' });
    } finally {
      setEndingId(null);
    }
  };

  // Only show when shift is open and there are active staff
  if (shiftStatus !== 'Open' || staff.length === 0) {
    return null;
  }

  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        title={`${staff.length} staff member${staff.length > 1 ? 's' : ''} active`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Users className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs font-medium text-gray-600 max-w-[120px] truncate">
          {staff.map((s) => s.userName.split(' ')[0]).join(', ')}
        </span>
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white border border-border rounded-lg shadow-lg py-1">
            <div className="px-3 py-2 border-b border-border/60">
              <p className="text-xs font-semibold text-gray-700">Active Staff ({staff.length})</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-[10px]">{member.userName.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{member.userName}</p>
                      <p className="text-[10px] text-gray-400">Since {new Date(member.loginTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  {isAdminOrManager && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      disabled={endingId === member.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEndSession(member.id, member.userName);
                      }}
                    >
                      {endingId === member.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <LogOut className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
