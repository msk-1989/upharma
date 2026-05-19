'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Info,
  PackageX,
  Clock,
  TrendingUp,
  CheckCheck,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/stores/app-store';

// ── Types ──────────────────────────────────────────────────────────────────────

type NotificationSeverity = 'info' | 'warning' | 'critical';
type NotificationType = 'low_stock' | 'expiring_soon' | 'expired' | 'sales_summary' | 'system';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  severity: NotificationSeverity;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (diffMs < 60_000) return 'Just now';
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  if (diffMs < 604_800_000) return `${Math.floor(diffMs / 86_400_000)}d ago`;
  return new Date(timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function getSeverityConfig(severity: NotificationSeverity) {
  switch (severity) {
    case 'critical':
      return {
        icon: AlertOctagon,
        bg: 'bg-red-50',
        iconColor: 'text-red-500',
        border: 'border-l-red-500',
        badge: 'bg-red-500',
        label: 'Critical',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        bg: 'bg-amber-50',
        iconColor: 'text-amber-500',
        border: 'border-l-amber-400',
        badge: 'bg-amber-500',
        label: 'Warning',
      };
    case 'info':
      return {
        icon: Info,
        bg: 'bg-blue-50',
        iconColor: 'text-blue-500',
        border: 'border-l-blue-400',
        badge: 'bg-blue-500',
        label: 'Info',
      };
  }
}

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'low_stock': return PackageX;
    case 'expiring_soon': return Clock;
    case 'expired': return AlertOctagon;
    case 'sales_summary': return TrendingUp;
    case 'system': return Info;
  }
}

function severityWeight(s: NotificationSeverity): number {
  return s === 'critical' ? 0 : s === 'warning' ? 1 : 2;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { setCurrentPage } = useAppStore();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Re-fetch when popover opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actionUrl) {
      // Navigate based on action URL
      const pageMatch = notification.actionUrl.match(/^\/(\w[\w-]*)/);
      if (pageMatch) {
        setCurrentPage(pageMatch[1] as any);
      }
    }
    setOpen(false);
  };

  // Count by severity for summary
  const criticalCount = notifications.filter((n) => n.severity === 'critical').length;
  const warningCount = notifications.filter((n) => n.severity === 'warning').length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-[18px] h-[18px] text-gray-500" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 rounded-xl shadow-xl border-gray-200 overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-[10px] font-semibold bg-red-100 text-red-700 hover:bg-red-100 rounded-full"
                >
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchNotifications()}
                className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-100 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-100 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Severity summary badges */}
          {notifications.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {criticalCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-600 rounded-full">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  {criticalCount} critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-600 rounded-full">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  {warningCount} warning
                </span>
              )}
              {criticalCount === 0 && warningCount === 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-600 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  All clear
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Notification List ── */}
        {loading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <RefreshCw className="w-6 h-6 text-gray-300 animate-spin mb-3" />
            <p className="text-sm text-gray-400">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <Bell className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">No notifications</p>
            <p className="text-xs text-gray-400 mt-1">You&apos;re all caught up!</p>
          </div>
        ) : (
          <ScrollArea className="h-[360px]">
            <div className="divide-y divide-gray-50">
              {notifications.map((notification) => {
                const severity = getSeverityConfig(notification.severity);
                const SevIcon = severity.icon;
                const TypeIcon = getTypeIcon(notification.type);

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50/80 transition-colors border-l-[3px] border-l-transparent hover:border-l-gray-300 group"
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg ${severity.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <TypeIcon className={`w-4 h-4 ${severity.iconColor}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-1">
                            {notification.title}
                          </p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5 shrink-0">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded ${severity.bg} ${severity.iconColor}`}>
                            {severity.label}
                          </span>
                          {notification.actionUrl && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              View
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* ── Footer ── */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2.5 bg-gray-50/50">
              <p className="text-[11px] text-gray-400 text-center">
                Auto-refreshes every 60 seconds
              </p>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
