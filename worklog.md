---
Task ID: 1
Agent: Main Agent
Task: Build Sales Bill History page + Fix invoice print blank page

Work Log:
- Investigated current project structure: single-page Next.js app using Zustand store for routing
- Found no existing sales history page - only last 5 invoices in POS and reports
- Created `sales-history.tsx` component with full features:
  - Search by invoice number, customer name
  - Date range filter (presets: Today, 7 Days, 30 Days, 90 Days)
  - Payment mode filter (Cash, UPI, Card, Credit)
  - Summary stats cards (Total Bills, Revenue, Items Sold, mode breakdown)
  - Full table with: Invoice No, Date & Time, Customer, Items, Subtotal, GST, Grand Total, Payment, Status, Actions
  - Click row to view detailed modal with all items
  - Reprint button opens new window with A4 dual-copy invoice
  - Pagination (20 per page)
- Created `/api/sales/history` API endpoint with filtering (date range, payment mode, invoice search, customer search)
- Updated `app-store.ts` - added `'sales-bills'` to PageKey union type
- Updated `sidebar.tsx` - added Sales Bills nav item with Receipt icon, accessible to Admin/Manager/Cashier
- Updated `page.tsx` - added route case for `'sales-bills'`
- Updated `command-palette.tsx` - added Sales Bills to page definitions with keywords, fixed invoice action to navigate to sales-bills
- Fixed print blank page issue:
  - Root cause: `window.print()` + portal approach doesn't work in iframe/preview context
  - Solution: Added `printInvoiceNewWindow()` function to `invoice-print.tsx` that opens a new browser window with full invoice HTML and auto-triggers print
  - Updated `pos-billing.tsx` to use new window print with fallback
  - Sales history page also uses the shared print function
- Verified API returns correct data (3 test sales found)

Stage Summary:
- New files: `src/components/upharma/sales-history.tsx`, `src/app/api/sales/history/route.ts`
- Modified files: `app-store.ts`, `sidebar.tsx`, `page.tsx`, `command-palette.tsx`, `invoice-print.tsx`, `pos-billing.tsx`
- Sales Bills page accessible from sidebar, command palette (Ctrl+K → "sales bills")
- Print now uses reliable new-window approach instead of portal+window.print()
