---
Task ID: 2
Agent: Backend API Agent
Task: Build ALL backend API routes for Counter Shift + Staff Session system

Work Log:
- Read existing patterns: day-close/route.ts, day-guard.ts, dates.ts, db.ts, sales/route.ts, day-close/status/route.ts, day-close/history/route.ts
- Analyzed Prisma schema for Counter, CounterShift, StaffSession, CashWithdrawal models
- Created 13 files total (12 route files + 1 guard utility)

Files Created:
1. `/src/lib/shift-guard.ts` — requireActiveShift() guard with graceful degradation
2. `/src/app/api/counters/route.ts` — GET (all counters with active shift status), POST (create counter)
3. `/src/app/api/counters/[id]/route.ts` — PATCH (update), DELETE (soft-delete with active shift check)
4. `/src/app/api/counter-shifts/route.ts` — GET (active shift + live summary), POST (open shift + auto-create staff session)
5. `/src/app/api/counter-shifts/close/route.ts` — POST (close shift with full recalculation)
6. `/src/app/api/counter-shifts/active/route.ts` — GET (lightweight polling endpoint)
7. `/src/app/api/counter-shifts/history/route.ts` — GET (paginated history with filters)
8. `/src/app/api/staff-sessions/login/route.ts` — POST (clock in with validation)
9. `/src/app/api/staff-sessions/logout/route.ts` — POST (clock out with session totals)
10. `/src/app/api/staff-sessions/active/route.ts` — GET (active staff with live invoice counts)
11. `/src/app/api/cash-withdrawals/route.ts` — POST (record withdrawal with audit log)
12. `/src/app/api/cash-withdrawals/shift/[shiftId]/route.ts` — GET (withdrawals for shift)

Key Implementation Details:
- All routes follow exact existing patterns (NextRequest/NextResponse, force-dynamic, error handling)
- Monetary calculations use Float with Math.round(*100)/100 matching existing code
- Shift close recalculates all totals from DB (sales, returns, withdrawals)
- expectedCash = openingCash + totalCashSales - totalReturns - totalExpenses
- Cash difference = closingCash - expectedCash
- Shift close permission: Admin/Manager OR shift opener
- Only ONE active shift per counter enforced
- User cannot have overlapping active sessions
- All mutations create AuditLog entries
- shift-guard.ts follows day-guard.ts pattern: graceful degradation on DB error
- Next.js 16 params as Promise pattern used in dynamic routes
- Lint: 0 new errors (all 36 pre-existing)
- TypeScript: 0 compilation errors in new files
