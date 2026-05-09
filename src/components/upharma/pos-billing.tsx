'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  IndianRupee,
  CheckCircle2,
  Loader2,
  X,
  Package,
  Receipt,
  AlertCircle,
  User,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

// ==================== TYPES ====================

interface MedicineBatch {
  id: string;
  batchNo: string;
  expiryDate: string;
  stockQty: number;
  saleRate: number;
  mrp: number;
}

interface MedicineSearchResult {
  id: string;
  name: string;
  genericName: string;
  manufacturer: string;
  category: string;
  drugSchedule: string;
  baseUnit: string;
  unitsPerStrip: number;
  stripsPerBox: number;
  totalStock: number;
  gstPercent: number;
  saleRate: number;
  mrp: number;
  batches: MedicineBatch[];
}

interface CartItem {
  cartId: string;
  medicineId: string;
  medicineName: string;
  genericName: string;
  manufacturer: string;
  batchId: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  unitType: 'tablet' | 'strip' | 'box';
  saleRate: number; // per smallest unit
  mrp: number; // per smallest unit
  gstPercent: number;
  unitsPerStrip: number;
  stripsPerBox: number;
  baseUnit: string;
  availableStock: number; // in smallest units
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface RecentSale {
  id: string;
  invoiceNo: string;
  grandTotal: number;
  paymentMode: string;
  status: string;
  createdAt: string;
  customer?: { name: string } | null;
  items?: { medicineName?: string }[];
}

// ==================== HELPERS ====================

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getUnitMultiplier(unitType: string, unitsPerStrip: number, stripsPerBox: number): number {
  if (unitType === 'strip') return unitsPerStrip;
  if (unitType === 'box') return stripsPerBox * unitsPerStrip;
  return 1;
}

function getDisplayRate(unitType: string, saleRate: number, unitsPerStrip: number, stripsPerBox: number): number {
  return saleRate * getUnitMultiplier(unitType, unitsPerStrip, stripsPerBox);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function isExpiringSoon(dateStr: string): boolean {
  const expiry = new Date(dateStr);
  const now = new Date();
  const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  return expiry <= threeMonths;
}

// ==================== PAYMENT ICONS ====================

function PaymentIcon({ mode }: { mode: string }) {
  switch (mode) {
    case 'Cash':
      return <Banknote className="w-3.5 h-3.5" />;
    case 'Card':
      return <CreditCard className="w-3.5 h-3.5" />;
    case 'UPI':
      return <Smartphone className="w-3.5 h-3.5" />;
    case 'Credit':
      return <Building2 className="w-3.5 h-3.5" />;
    default:
      return <IndianRupee className="w-3.5 h-3.5" />;
  }
}

// ==================== MAIN COMPONENT ====================

export function POSBillingPage() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MedicineSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer & payment state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in');
  const [paymentMode, setPaymentMode] = useState<string>('Cash');

  // Sale state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastInvoiceNo, setLastInvoiceNo] = useState<string>('');
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);

  const { toast } = useToast();

  // ==================== LOAD CUSTOMERS ====================

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setCustomers(res.data);
      })
      .catch(console.error);
  }, []);

  // ==================== LOAD RECENT SALES ====================

  const loadRecentSales = useCallback(() => {
    fetch('/api/sales')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setRecentSales(res.data.slice(0, 5));
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadRecentSales();
  }, [loadRecentSales]);

  // ==================== DEBOUNCED SEARCH ====================

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(() => {
      fetch(`/api/medicines?search=${encodeURIComponent(value.trim())}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success) {
            setSearchResults(res.data);
            setShowDropdown(res.data.length > 0);
          }
        })
        .catch(() => {
          setSearchResults([]);
        })
        .finally(() => setIsSearching(false));
    }, 300);
  };

  // ==================== OUTSIDE CLICK ====================

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==================== ADD TO CART ====================

  const addToCart = (medicine: MedicineSearchResult) => {
    // Pick the first batch (earliest expiry - FIFO)
    const batch = medicine.batches.length > 0 ? medicine.batches[0] : null;
    if (!batch || batch.stockQty <= 0) {
      toast({
        title: 'Out of Stock',
        description: `${medicine.name} has no available stock.`,
        variant: 'destructive',
      });
      return;
    }

    // Check if medicine already in cart with same batch
    const existingIdx = cart.findIndex(
      (item) => item.medicineId === medicine.id && item.batchId === batch.id
    );

    if (existingIdx >= 0) {
      // Increment quantity
      const item = cart[existingIdx];
      const newQty = item.quantity + 1;
      const newQtySmallest = newQty * getUnitMultiplier(item.unitType, item.unitsPerStrip, item.stripsPerBox);
      if (newQtySmallest > item.availableStock) {
        toast({
          title: 'Stock Limit',
          description: `Only ${item.availableStock} ${item.baseUnit.toLowerCase()}s available for ${medicine.name}.`,
          variant: 'destructive',
        });
        return;
      }
      const newCart = [...cart];
      newCart[existingIdx] = { ...item, quantity: newQty };
      setCart(newCart);
    } else {
      const cartItem: CartItem = {
        cartId: crypto.randomUUID(),
        medicineId: medicine.id,
        medicineName: medicine.name,
        genericName: medicine.genericName || '',
        manufacturer: medicine.manufacturer || '',
        batchId: batch.id,
        batchNo: batch.batchNo,
        expiryDate: batch.expiryDate,
        quantity: 1,
        unitType: 'tablet',
        saleRate: batch.saleRate || medicine.saleRate,
        mrp: batch.mrp || medicine.mrp,
        gstPercent: medicine.gstPercent,
        unitsPerStrip: medicine.unitsPerStrip,
        stripsPerBox: medicine.stripsPerBox,
        baseUnit: medicine.baseUnit,
        availableStock: batch.stockQty,
      };
      setCart((prev) => [...prev, cartItem]);
    }

    setShowDropdown(false);
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  // ==================== CART OPERATIONS ====================

  const updateQuantity = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartId !== cartId) return item;
        const newQty = item.quantity + delta;
        if (newQty < 1) return item;
        const newQtySmallest = newQty * getUnitMultiplier(item.unitType, item.unitsPerStrip, item.stripsPerBox);
        if (newQtySmallest > item.availableStock) {
          toast({
            title: 'Stock Limit',
            description: `Only ${item.availableStock} ${item.baseUnit.toLowerCase()}s available.`,
            variant: 'destructive',
          });
          return item;
        }
        return { ...item, quantity: newQty };
      })
    );
  };

  const updateUnitType = (cartId: string, unitType: 'tablet' | 'strip' | 'box') => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartId !== cartId) return item;
        const newQtySmallest = item.quantity * getUnitMultiplier(unitType, item.unitsPerStrip, item.stripsPerBox);
        if (newQtySmallest > item.availableStock) {
          toast({
            title: 'Stock Limit',
            description: `Cannot switch to ${unitType} — exceeds available stock.`,
            variant: 'destructive',
          });
          return item;
        }
        return { ...item, unitType };
      })
    );
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // ==================== CALCULATIONS ====================

  const calcItemLine = (item: CartItem) => {
    const qtySmallest = item.quantity * getUnitMultiplier(item.unitType, item.unitsPerStrip, item.stripsPerBox);
    const lineTotal = qtySmallest * item.saleRate;
    const gst = (lineTotal * item.gstPercent) / 100;
    const cgst = gst / 2;
    const sgst = gst / 2;
    return { qtySmallest, lineTotal, cgst, sgst, gst };
  };

  const subtotal = cart.reduce((sum, item) => sum + calcItemLine(item).lineTotal, 0);
  const totalCgst = cart.reduce((sum, item) => sum + calcItemLine(item).cgst, 0);
  const totalSgst = cart.reduce((sum, item) => sum + calcItemLine(item).sgst, 0);
  const totalGst = totalCgst + totalSgst;
  const grandTotal = subtotal + totalGst;

  // ==================== COMPLETE SALE ====================

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Cart is Empty',
        description: 'Please add medicines to the cart before completing the sale.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const saleItems = cart.map((item) => ({
        medicineId: item.medicineId,
        quantity: item.quantity,
        unitType: item.unitType,
      }));

      const body = {
        customerId: selectedCustomerId === 'walk-in' ? null : selectedCustomerId,
        paymentMode,
        items: saleItems,
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete sale');
      }

      setLastInvoiceNo(data.data.invoiceNo);
      toast({
        title: 'Sale Completed!',
        description: `Invoice ${data.data.invoiceNo} — ${formatINR(data.data.grandTotal)}`,
      });

      // Clear cart and reload recent sales
      clearCart();
      setLastInvoiceNo('');
      setSelectedCustomerId('walk-in');
      setPaymentMode('Cash');
      loadRecentSales();
    } catch (err) {
      toast({
        title: 'Sale Failed',
        description: err instanceof Error ? err.message : 'An error occurred while processing the sale.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== RENDER ====================

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">POS Billing</h1>
          <p className="text-sm text-gray-500 mt-1">Point of Sale — Create new invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 px-3 py-1">
            <ShoppingCart className="w-3.5 h-3.5 mr-1" />
            {cart.length} {cart.length === 1 ? 'item' : 'items'}
          </Badge>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT PANEL — Search & Cart (60%) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Medicine Search */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4">
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search medicines by name, generic name, manufacturer..."
                    className="pl-10 pr-10 h-11 text-sm"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowDropdown(true);
                    }}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
                  )}
                  {!isSearching && searchQuery && (
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setShowDropdown(false);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Search Dropdown */}
                {showDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                    {searchResults.map((med) => (
                      <button
                        key={med.id}
                        className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-0"
                        onClick={() => addToCart(med)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900 truncate">
                                {med.name}
                              </span>
                              {med.drugSchedule && med.drugSchedule !== 'OTC' && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-600 border-orange-300 flex-shrink-0">
                                  {med.drugSchedule}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                              {med.genericName && <span>{med.genericName}</span>}
                              {med.genericName && med.manufacturer && <span className="text-gray-300">|</span>}
                              {med.manufacturer && <span>{med.manufacturer}</span>}
                            </div>
                            {med.batches.length > 0 && (
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-gray-500">
                                  Batch: {med.batches[0].batchNo}
                                </span>
                                <span className="text-xs text-gray-400">
                                  Exp: {formatDate(med.batches[0].expiryDate)}
                                </span>
                                <span className="text-xs font-medium text-emerald-600">
                                  {formatINR(med.batches[0].saleRate)}/{med.baseUnit.toLowerCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 ${
                                med.totalStock === 0
                                  ? 'bg-red-100 text-red-700'
                                  : med.totalStock < 20
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              Stock: {med.totalStock}
                            </Badge>
                            <Plus className="w-4 h-4 text-emerald-500" />
                          </div>
                        </div>
                      </button>
                    ))}

                    {!isSearching && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        No medicines found for &ldquo;{searchQuery}&rdquo;
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cart Table */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  <CardTitle className="text-base font-semibold text-gray-900">
                    Cart Items
                  </CardTitle>
                </div>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-7"
                    onClick={clearCart}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500 font-medium">No items in cart</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Search for medicines above and click to add
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-6 pb-3">
                          Medicine
                        </th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3 pb-3">
                          Batch / Expiry
                        </th>
                        <th className="text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3 pb-3">
                          Unit
                        </th>
                        <th className="text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3 pb-3">
                          Qty
                        </th>
                        <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3 pb-3">
                          Rate
                        </th>
                        <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3 pb-3">
                          GST
                        </th>
                        <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-6 pb-3">
                          Total
                        </th>
                        <th className="px-3 pb-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item) => {
                        const { lineTotal, gst } = calcItemLine(item);
                        const displayRate = getDisplayRate(
                          item.unitType,
                          item.saleRate,
                          item.unitsPerStrip,
                          item.stripsPerBox
                        );
                        const expiring = isExpiringSoon(item.expiryDate);

                        return (
                          <tr
                            key={item.cartId}
                            className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                          >
                            {/* Medicine Name */}
                            <td className="px-6 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900 leading-tight">
                                  {item.medicineName}
                                </p>
                                {item.genericName && (
                                  <p className="text-[11px] text-gray-400 mt-0.5">
                                    {item.genericName}
                                    {item.manufacturer ? ` · ${item.manufacturer}` : ''}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Batch / Expiry */}
                            <td className="px-3 py-3">
                              <p className="text-xs font-mono text-gray-700">{item.batchNo}</p>
                              <p
                                className={`text-[11px] mt-0.5 ${
                                  expiring ? 'text-orange-600 font-medium' : 'text-gray-400'
                                }`}
                              >
                                {formatDate(item.expiryDate)}
                              </p>
                            </td>

                            {/* Unit Type */}
                            <td className="px-3 py-3 text-center">
                              <select
                                className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 cursor-pointer"
                                value={item.unitType}
                                onChange={(e) =>
                                  updateUnitType(
                                    item.cartId,
                                    e.target.value as 'tablet' | 'strip' | 'box'
                                  )
                                }
                              >
                                <option value="tablet">{item.baseUnit}</option>
                                <option value="strip">Strip ({item.unitsPerStrip})</option>
                                <option value="box">Box ({item.stripsPerBox * item.unitsPerStrip})</option>
                              </select>
                            </td>

                            {/* Quantity */}
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                  onClick={() => updateQuantity(item.cartId, -1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-10 text-center text-sm font-semibold text-gray-900">
                                  {item.quantity}
                                </span>
                                <button
                                  className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                                  onClick={() => updateQuantity(item.cartId, 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* Rate */}
                            <td className="px-3 py-3 text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {formatINR(displayRate)}
                              </p>
                            </td>

                            {/* GST */}
                            <td className="px-3 py-3 text-right">
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0"
                              >
                                {item.gstPercent}%
                              </Badge>
                            </td>

                            {/* Total */}
                            <td className="px-6 py-3 text-right">
                              <p className="text-sm font-bold text-gray-900">
                                {formatINR(lineTotal + gst)}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                +{formatINR(gst)} GST
                              </p>
                            </td>

                            {/* Remove */}
                            <td className="px-3 py-3">
                              <button
                                className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                onClick={() => removeFromCart(item.cartId)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-base font-semibold text-gray-900">
                  Recent Invoices
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {recentSales.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No recent invoices</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-6 pb-2">
                          Invoice
                        </th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3 pb-2">
                          Customer
                        </th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3 pb-2">
                          Items
                        </th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3 pb-2">
                          Payment
                        </th>
                        <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3 pb-2">
                          Total
                        </th>
                        <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-6 pb-2">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSales.map((sale) => (
                        <tr
                          key={sale.id}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                        >
                          <td className="px-6 py-2.5">
                            <span className="text-sm font-semibold text-emerald-600">
                              {sale.invoiceNo}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-sm text-gray-700">
                              {sale.customer?.name || 'Walk-in'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-sm text-gray-600">
                              {sale.items?.length || 0}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <PaymentIcon mode={sale.paymentMode} />
                              <span>{sale.paymentMode}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatINR(sale.grandTotal)}
                            </span>
                          </td>
                          <td className="px-6 py-2.5 text-right">
                            <span className="text-xs text-gray-500">
                              {formatDateTime(sale.createdAt)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL — Customer, Payment, Summary (40%) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Selection */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-base font-semibold text-gray-900">
                  Customer
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      Walk-in Customer
                    </div>
                  </SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[160px]">{c.name}</span>
                        {c.phone && (
                          <span className="text-gray-400 text-xs flex-shrink-0">
                            {c.phone}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-gray-400 mt-2">
                {selectedCustomerId === 'walk-in'
                  ? 'No customer linked to this sale'
                  : 'Selected customer will be linked to this invoice'}
              </p>
            </CardContent>
          </Card>

          {/* Payment Mode */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-base font-semibold text-gray-900">
                  Payment Mode
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentMode} onValueChange={setPaymentMode} className="grid grid-cols-2 gap-3">
                {[
                  { value: 'Cash', icon: Banknote, label: 'Cash', color: 'text-green-600' },
                  { value: 'Card', icon: CreditCard, label: 'Card', color: 'text-blue-600' },
                  { value: 'UPI', icon: Smartphone, label: 'UPI', color: 'text-purple-600' },
                  { value: 'Credit', icon: Building2, label: 'Credit', color: 'text-orange-600' },
                ].map((pm) => (
                  <Label
                    key={pm.value}
                    htmlFor={`pay-${pm.value}`}
                    className={`flex items-center gap-2.5 px-3 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                      paymentMode === pm.value
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <RadioGroupItem value={pm.value} id={`pay-${pm.value}`} />
                    <pm.icon className={`w-4 h-4 ${paymentMode === pm.value ? 'text-emerald-600' : pm.color}`} />
                    <span
                      className={`text-sm font-medium ${
                        paymentMode === pm.value ? 'text-emerald-700' : 'text-gray-700'
                      }`}
                    >
                      {pm.label}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Bill Summary */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-base font-semibold text-gray-900">
                  Bill Summary
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400">Add items to see bill summary</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Subtotal */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Subtotal</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatINR(subtotal)}
                    </span>
                  </div>

                  {/* GST Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">CGST</span>
                      <span className="text-xs font-medium text-gray-700">
                        {formatINR(totalCgst)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">SGST</span>
                      <span className="text-xs font-medium text-gray-700">
                        {formatINR(totalSgst)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Total GST</span>
                      <span className="text-xs font-semibold text-gray-700">
                        {formatINR(totalGst)}
                      </span>
                    </div>
                  </div>

                  {/* Item Count */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Items</span>
                    <span className="text-sm text-gray-700">
                      {cart.length} {cart.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  <Separator />

                  {/* Grand Total */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-lg font-bold text-gray-900">Grand Total</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {formatINR(grandTotal)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Complete Sale Button */}
          <Button
            className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={cart.length === 0 || isSubmitting}
            onClick={handleCompleteSale}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Complete Sale — {cart.length > 0 ? formatINR(grandTotal) : '₹0.00'}
              </>
            )}
          </Button>

          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Items</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{cart.length}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-[11px] text-emerald-600 uppercase tracking-wider font-medium">
                Total
              </p>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">
                {cart.length > 0 ? formatINR(grandTotal) : '₹0.00'}
              </p>
            </div>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Quick Tips
              </span>
            </div>
            <ul className="space-y-1 text-xs text-gray-500">
              <li className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">
                  Tab
                </kbd>
                Focus search bar
              </li>
              <li className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">
                  Esc
                </kbd>
                Clear search
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                <span>Orange expiry dates indicate near-expiry medicines</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
