---
Task ID: 2
Agent: Frontend Agent
Task: Build ALL frontend components for Counter Shift + Staff Session system

Work Log:
- Read worklog.md, day-close.tsx, app-store.ts, page.tsx, sidebar.tsx, header.tsx, dates.ts to understand existing patterns
- Updated Zustand store (app-store.ts) with counter shift state: shiftStatus, activeShiftId, activeCounterId, activeCounterName, setShiftStatus, setShiftInfo, fetchShiftStatus
- Added 'counter-shift' to PageKey union type
- Created /src/components/upharma/counter-shift.tsx — full CounterShiftPage component with:
  - A. Counter Status Banner (top of page, green/yellow/gray styling)
  - B. Shift Opening Dialog (counter select, opening cash, notes)
  - C. Live Summary Cards (4 cards: Total Sales, Total Returns, Total Invoices, Total Withdrawals)
  - D. Payment Mode Breakdown (4 small cards: Cash, Card, UPI, Credit)
  - E. Cash Reconciliation Section (Opening Cash + Cash Sales - Cash Returns - Withdrawals = Expected)
  - F. Shift Closing Dialog (summary, closing cash, difference auto-calc, mandatory reason for difference)
  - G. Active Staff Panel (table with staff name, role, login time, invoices, sales, end session button)
  - H. Cash Withdrawal Section (record dialog + withdrawals table)
  - I. Shift History Table (with pagination, click to view details dialog)
  - J. Print Shift Report (blob URL approach matching day-close.tsx pattern)
  - Auto-refresh every 30 seconds
  - Loading skeleton states
  - Admin/Manager role gating for open/close actions
- Created /src/components/upharma/active-staff-badge.tsx — header widget with:
  - Green dot indicator with ping animation
  - Staff name badges showing first names
  - Dropdown with staff details and End Session action
  - Auto-refresh every 30 seconds
  - Only renders when shift is Open and staff are active
- Updated page.tsx:
  - Added CounterShiftPage import
  - Added 'counter-shift' case to PageContent switch
  - Added 'counter-shift' to day-not-open redirect exemption
- Updated sidebar.tsx:
  - Added MonitorCheck icon import
  - Added 'counter-shift' nav item with MonitorCheck icon
  - Added 'counter-shift' to roleAccess (Admin, Manager)
  - Added 'counter-shift' to dayExemptPages
- Updated header.tsx:
  - Added ActiveStaffBadge import
  - Added 'counter-shift' to pageLabels
  - Added ActiveStaffBadge component in the header between time display and keyboard shortcuts

Stage Summary:
- 7 files modified/created
- 0 new lint errors introduced (all pre-existing errors: require-imports in .js files, set-state-in-effect)
- All components follow exact same patterns as day-close.tsx (colors, spacing, fonts, card styles)
- Exported as named export CounterShiftPage (not default)
- Used 'use client' directive throughout
- Used shadcn/ui components (Card, Button, Dialog, Badge, Input, Select, Textarea, Separator)
- Used formatCurrency, formatTime, formatDate helpers locally (matching day-close.tsx)
- Used formatDateIST from @/lib/dates for print reports
- Mobile responsive with sm: breakpoints
- API endpoints used: /api/counter-shifts, /api/counter-shifts/active, /api/counter-shifts/close, /api/counter-shifts/history, /api/staff-sessions/active, /api/staff-sessions/logout, /api/cash-withdrawals, /api/counters
