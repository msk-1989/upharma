'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
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
  Star,
  AlertTriangle,
  Shield,
  Zap,
  Pause,
  RotateCcw,
  ChevronDown,
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
import { InvoicePrintDialog, InvoicePrintArea, loadStoreSettings, printInvoiceNewWindow } from './invoice-print';

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
  saleRate: number;
  mrp: number;
  gstPercent: number;
  unitsPerStrip: number;
  stripsPerBox: number;
  baseUnit: string;
  availableStock: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  loyaltyPoints: number;
  creditLimit: number;
  balance: number;
}

interface Doctor {
  id: string;
  name: string;
  qualification: string | null;
  specialty: string | null;
  phone: string | null;
  active: boolean;
}

interface Doctor {
  id: string;
  name: string;
  qualification: string | null;
  specialty: string | null;
  phone: string | null;
  active: boolean;
}

interface RecentSale {
  id: string;
  invoiceNo: string;
  grandTotal: number;
  paymentMode: string;
  status: string;
  createdAt: string;
  customerName?: string | null;
  customer?: { name: string } | null;
  items?: { medicineName?: string }[];
}

// ==================== HELPERS ====================

function formatINR(amount: number): string {
  if (amount == null || isNaN(amount)) return '₹0.00';
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
  const { user } = useAppStore();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MedicineSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const customerSelectRef = useRef<HTMLButtonElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const cashReceivedRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const completeSaleRef = useRef<() => void>(() => {});

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer & payment state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in');
  const [walkInCustomerName, setWalkInCustomerName] = useState<string>('');
  const [doctorName, setDoctorName] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const customerInputRef = useRef<HTMLInputElement>(null);

  // Doctor state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const doctorDropdownRef = useRef<HTMLDivElement>(null);

  // Loyalty & Credit state
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [creditWarning, setCreditWarning] = useState<string | null>(null);

  // Sale state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastInvoiceNo, setLastInvoiceNo] = useState<string>('');
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);

  // Cash received state
  const [cashReceived, setCashReceived] = useState<string>('');

  // Hold bill state
  const [heldBills, setHeldBills] = useState<Array<{
    cart: CartItem[];
    customerId: string;
    customerName: string;
    doctorName: string;
    heldAt: string;
  }>>([]);
  const [showHeldBills, setShowHeldBills] = useState(false);

  // Favorites state
  const [favorites, setFavorites] = useState<MedicineSearchResult[]>([]);

  // UI state
  const [showShortcuts, setShowShortcuts] = useState(true);

  // Print state
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);

  const { toast } = useToast();

  // ==================== DERIVED VALUES ====================

  const selectedCustomer = selectedCustomerId !== 'walk-in'
    ? customers.find((c) => c.id === selectedCustomerId)
    : null;

  // Customer search for inline add
  const customerResults = customerSearch.trim().length >= 1
    ? customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
    : customers;

  const handleQuickAddCustomer = async () => {
    if (!customerSearch.trim() || !quickCustomerPhone.trim()) return;
    setAddingCustomer(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerSearch.trim(),
          phone: quickCustomerPhone.trim(),
          loyaltyPoints: 0,
          creditLimit: 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const newCustomer = data.data;
        setCustomers((prev) => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedCustomerId(newCustomer.id);
        setCustomerSearch('');
        setQuickCustomerPhone('');
        setShowCustomerDropdown(false);
        setUseLoyaltyPoints(false);
        toast({
          title: 'Customer Added',
          description: `${newCustomer.name} has been added and selected.`,
        });
        searchInputRef.current?.focus();
      }
    } catch {
      toast({
        title: 'Failed to Add Customer',
        description: 'Could not create customer. Please try again.',
        variant: 'destructive',
      });
    }
    setAddingCustomer(false);
  };

  // ==================== LOAD CUSTOMERS ====================

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setCustomers(res.data);
      })
      .catch(console.error);
  }, []);

  // ==================== LOAD DOCTORS ====================

  useEffect(() => {
    fetch('/api/doctors')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setDoctors(res.data.filter((d: Doctor) => d.active));
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

  // ==================== LOAD HELD BILLS ====================

  useEffect(() => {
    try {
      const stored = localStorage.getItem('upharma_held_bills');
      if (stored) setHeldBills(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // ==================== LOAD FAVORITES (TOP SOLD) ====================

  useEffect(() => {
    fetch('/api/medicines?topSold=true')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setFavorites(res.data);
      })
      .catch(() => {});
  }, []);

  // ==================== AUTO-FOCUS SEARCH ON MOUNT ====================

  useEffect(() => {
    loadStoreSettings(); // Preload store settings for invoice printing
    const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

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
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (doctorDropdownRef.current && !doctorDropdownRef.current.contains(e.target as Node)) {
        setShowDoctorDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==================== BARCODE SCAN HANDLER ====================

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    try {
      const res = await fetch(`/api/medicines?search=${encodeURIComponent(barcode)}`);
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        const exactMatch = data.data.find(
          (m: MedicineSearchResult) => m.barcode === barcode || (m as any).alternateBarcodes?.includes(barcode)
        );
        if (exactMatch) {
          addToCart(exactMatch);
          toast({ title: `Added: ${exactMatch.name}`, description: '1 strip' });
          return;
        }
        // If only one result, assume it's the match
        if (data.data.length === 1) {
          addToCart(data.data[0]);
          toast({ title: `Added: ${data.data[0].name}`, description: '1 strip' });
          return;
        }
      }
      toast({
        title: 'Not Found',
        description: `No medicine for barcode ${barcode}`,
        variant: 'destructive',
      });
      searchInputRef.current?.focus();
    } catch {
      toast({ title: 'Scan Error', description: 'Failed to process barcode', variant: 'destructive' });
      searchInputRef.current?.focus();
    }
  }, []);

  // ==================== SEARCH KEY DOWN (BARCODE + ENTER) ====================

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;
      // Check if it looks like a barcode (all digits, 8-13 chars)
      if (/^\d{8,13}$/.test(q)) {
        handleBarcodeScan(q);
      } else if (showDropdown && searchResults.length > 0) {
        addToCart(searchResults[0]);
      }
    }
  }, [searchQuery, showDropdown, searchResults, handleBarcodeScan]);

  // ==================== HOLD / RECALL BILL ====================

  const holdBill = useCallback(() => {
    if (cart.length === 0) {
      toast({ title: 'Cart is Empty', description: 'Nothing to hold', variant: 'destructive' });
      return;
    }
    const held = [...heldBills, {
      cart: [...cart],
      customerId: selectedCustomerId,
      customerName: selectedCustomerId === 'walk-in' ? walkInCustomerName.trim() : (selectedCustomer?.name || ''),
      doctorName: doctorName.trim(),
      heldAt: new Date().toISOString(),
    }];
    const trimmed = held.slice(-5); // Keep last 5
    localStorage.setItem('upharma_held_bills', JSON.stringify(trimmed));
    setHeldBills(trimmed);
    clearCart();
    setSearchQuery('');
    setSearchResults([]);
    setCashReceived('');
    setUseLoyaltyPoints(false);
    setCreditWarning(null);
    toast({ title: 'Bill Held', description: `Press F3 or click Held Bills (${trimmed.length} held)` });
    searchInputRef.current?.focus();
  }, [cart, heldBills, selectedCustomerId, walkInCustomerName, selectedCustomer]);

  const recallBill = useCallback((index: number) => {
    const bill = heldBills[index];
    if (!bill) return;
    setCart(bill.cart);
    setSelectedCustomerId(bill.customerId);
    setWalkInCustomerName(bill.customerName || '');
    setDoctorName(bill.doctorName || '');
    setDoctorSearch(bill.doctorName || '');
    setCashReceived('');
    setUseLoyaltyPoints(false);
    setCreditWarning(null);
    // Remove from held bills
    const updated = heldBills.filter((_, i) => i !== index);
    setHeldBills(updated);
    localStorage.setItem('upharma_held_bills', JSON.stringify(updated));
    setShowHeldBills(false);
    toast({ title: 'Bill Recalled', description: `${bill.cart.length} items restored` });
    searchInputRef.current?.focus();
  }, [heldBills]);

  // ==================== ESC HANDLER ====================

  const handleEsc = useCallback(() => {
    const active = document.activeElement as HTMLElement;
    const tag = active?.tagName;
    if (tag === 'INPUT' && active === searchInputRef.current) {
      if (showDropdown) {
        setShowDropdown(false);
      } else {
        setSearchQuery('');
        setSearchResults([]);
      }
      return;
    }
    if (showDropdown) {
      setShowDropdown(false);
      searchInputRef.current?.focus();
      return;
    }
    // Remove last cart item if search is empty
    if (cart.length > 0 && !searchQuery) {
      const lastItem = cart[cart.length - 1];
      removeFromCart(lastItem.cartId);
      toast({ title: 'Removed', description: `${lastItem.medicineName} removed from cart` });
    }
  }, [showDropdown, searchQuery, cart]);

  // ==================== SCROLL TO PAYMENT ====================

  const scrollToPayment = useCallback(() => {
    paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (paymentMode === 'Cash') {
      setTimeout(() => cashReceivedRef.current?.focus(), 300);
    }
  }, [paymentMode]);

  // ==================== KEYBOARD SHORTCUTS ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;
      const tag = active?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'F2':
          e.preventDefault();
          customerSelectRef.current?.click();
          break;
        case 'F3':
          e.preventDefault();
          holdBill();
          break;
        case 'F4':
          e.preventDefault();
          scrollToPayment();
          break;
        case 'F6':
          e.preventDefault();
          discountInputRef.current?.focus();
          break;
        case 'F8':
          e.preventDefault();
          if (!isInput && cart.length > 0 && !isSubmitting) completeSaleRef.current();
          break;
        case 'Escape':
          e.preventDefault();
          handleEsc();
          break;
        case '+':
        case '=':
          if (!isInput && cart.length > 0) {
            e.preventDefault();
            const lastItem = cart[cart.length - 1];
            updateQuantity(lastItem.cartId, 1);
          }
          break;
        case '-':
        case '_':
          if (!isInput && cart.length > 0) {
            e.preventDefault();
            const lastItem = cart[cart.length - 1];
            updateQuantity(lastItem.cartId, -1);
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, holdBill, handleEsc, scrollToPayment, isSubmitting]);

  // ==================== ADD TO CART ====================

  const addToCart = (medicine: MedicineSearchResult) => {
    const batch = medicine.batches.length > 0 ? medicine.batches[0] : null;
    if (!batch || batch.stockQty <= 0) {
      toast({
        title: 'Out of Stock',
        description: `${medicine.name} has no available stock.`,
        variant: 'destructive',
      });
      return;
    }

    const existingIdx = cart.findIndex(
      (item) => item.medicineId === medicine.id && item.batchId === batch.id
    );

    if (existingIdx >= 0) {
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
  const preDiscountTotal = subtotal + totalGst;

  // Loyalty points calculations
  const maxPointsDiscount = preDiscountTotal * 0.1; // Max 10% of bill
  const availablePoints = selectedCustomer?.loyaltyPoints || 0;
  const pointsToUse = useLoyaltyPoints ? Math.min(availablePoints, maxPointsDiscount) : 0;
  const loyaltyDiscount = pointsToUse; // ₹1 per point
  const grandTotal = Math.round((preDiscountTotal - loyaltyDiscount) * 100) / 100;

  // ==================== CASH CHANGE CALCULATION ====================

  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const cashChange = cashReceivedNum - grandTotal;
  const isCashSufficient = cashReceivedNum >= grandTotal && grandTotal > 0;

  // ==================== CREDIT LIMIT CHECK ====================

  useEffect(() => {
    setCreditWarning(null);
    if (selectedCustomer && selectedCustomer.creditLimit > 0 && cart.length > 0) {
      const projectedBalance = selectedCustomer.balance + grandTotal;
      if (projectedBalance > selectedCustomer.creditLimit) {
        const excess = Math.round((projectedBalance - selectedCustomer.creditLimit) * 100) / 100;
        setCreditWarning(
          `This sale will exceed customer's credit limit by ${formatINR(excess)}`
        );
      }
    }
  }, [selectedCustomer, cart.length, grandTotal]);

  // ==================== PRINT INVOICE ====================

  const handlePrintInvoice = useCallback(async () => {
    if (!lastSaleData) return;
    setShowPrintDialog(false);
    try {
      await printInvoiceNewWindow(lastSaleData);
    } catch {
      // Fallback: if new window fails, try old method
      await loadStoreSettings();
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          setLastSaleData(null);
        }, 500);
      }, 100);
      return;
    }
    // Reset print data after a delay
    setTimeout(() => {
      setLastSaleData(null);
    }, 1000);
  }, [lastSaleData]);

  const handleSkipPrint = useCallback(() => {
    setShowPrintDialog(false);
    setLastSaleData(null);
  }, []);

  // ==================== COMPLETE SALE ====================

  const handleCompleteSale = async () => {
    completeSaleRef.current = handleCompleteSale;
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

      let customerName: string | undefined;
      if (selectedCustomerId === 'walk-in') {
        customerName = walkInCustomerName.trim() || undefined;
      } else {
        customerName = selectedCustomer?.name;
      }

      const body = {
        customerId: selectedCustomerId === 'walk-in' ? null : selectedCustomerId,
        customerName,
        paymentMode,
        items: saleItems,
        loyaltyPointsUsed: pointsToUse,
        userId: user?.id,
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

      // Show success toast
      let toastDescription = `Invoice ${data.data.invoiceNo} — ${formatINR(data.data.grandTotal)}`;
      if (data.loyaltyPointsEarned > 0) {
        toastDescription += ` | Earned ${data.loyaltyPointsEarned} loyalty points ⭐`;
      }

      toast({
        title: 'Sale Completed!',
        description: toastDescription,
      });

      // Show credit warning if returned
      if (data.warning) {
        toast({
          title: 'Credit Limit Warning',
          description: data.warning,
          variant: 'destructive',
        });
      }

      // Store sale data for print and show print dialog
      const saleData = {
        invoiceNo: data.data.invoiceNo,
        customerName: data.data.customerName || customerName || null,
        doctorName: doctorName.trim() || null,
        subtotal: data.data.subtotal,
        loyaltyPointsUsed: data.data.loyaltyPointsUsed || 0,
        loyaltyPointsEarned: data.loyaltyPointsEarned || 0,
        paymentMode: data.data.paymentMode || 'Cash',
        items: (data.data.items || []).map((item: any) => ({
          medicineName: item.medicineName,
          quantity: item.quantity,
          unitType: item.unitType,
          saleRate: item.saleRate,
          mrp: item.mrp,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate,
          total: item.total,
        })),
        createdAt: data.data.createdAt,
      };

      setLastSaleData(saleData);
      setShowPrintDialog(true);

      // Reload customers to refresh loyalty points & balance
      fetch('/api/customers')
        .then((r) => r.json())
        .then((res) => {
          if (res.success) setCustomers(res.data);
        })
        .catch(console.error);

      // Clear cart and reload recent sales
      clearCart();
      setSelectedCustomerId('walk-in');
      setWalkInCustomerName('');
      setDoctorName('');
      setDoctorSearch('');
      setPaymentMode('Cash');
      setUseLoyaltyPoints(false);
      setCreditWarning(null);
      setCashReceived('');
      loadRecentSales();
      // Auto-focus search for next invoice
      setTimeout(() => searchInputRef.current?.focus(), 100);
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

  const { shiftStatus, setCurrentPage } = useAppStore();

  const isShiftExempt = user?.role === 'Admin' || user?.role === 'Super Admin';
  const needsShift = !isShiftExempt && shiftStatus !== 'Open';

  // Block POS billing when shift not open (day auto-opens with shift)
  if (needsShift) {
    return (
      <div className="p-3 sm:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <Banknote className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Counter Shift Not Open</h2>
            <p className="text-sm text-gray-500 mt-1">Please start your day from the Counter Shift page to begin billing.</p>
          </div>
          <button
            onClick={() => setCurrentPage('counter-shift')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            Start Your Day
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">POS Billing</h1>
          <p className="text-sm text-gray-500 mt-1">Point of Sale — Create new invoices</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Held Bills Button */}
          <Button
            variant="outline"
            size="sm"
            className="relative h-8 text-xs text-gray-600 hover:text-gray-800"
            onClick={() => setShowHeldBills(!showHeldBills)}
            disabled={heldBills.length === 0}
          >
            <Pause className="w-3.5 h-3.5 mr-1" />
            Held
            {heldBills.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                {heldBills.length}
              </span>
            )}
          </Button>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 text-gray-400 rounded border border-gray-200">F3</kbd>
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
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  Search Medicine
                </Label>
                <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 text-gray-400 rounded border border-gray-200">F1</kbd>
              </div>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search medicines or scan barcode..."
                    className="pl-10 pr-10 h-11 text-sm"
                    onKeyDown={handleSearchKeyDown}
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

          {/* Held Bills Dropdown */}
          {showHeldBills && heldBills.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50 shadow-sm">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-orange-600" />
                    <CardTitle className="text-sm font-semibold text-orange-800">Held Bills</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowHeldBills(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {heldBills.map((bill, idx) => (
                    <button
                      key={idx}
                      className="w-full flex items-center justify-between p-2.5 bg-white rounded-lg border border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-colors text-left"
                      onClick={() => recallBill(idx)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {bill.customerName || 'Walk-in'} — {bill.cart.length} item{bill.cart.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Held at {formatDateTime(bill.heldAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-xs font-semibold text-emerald-600">
                          {formatINR(bill.cart.reduce((sum, item) => {
                            const qtySmallest = item.quantity * getUnitMultiplier(item.unitType, item.unitsPerStrip, item.stripsPerBox);
                            return sum + qtySmallest * item.saleRate * (1 + item.gstPercent / 100);
                          }, 0))}
                        </span>
                        <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fast Favorites Strip */}
          {favorites.length > 0 && (
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-gray-500">Fast Add — Top Sellers</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {favorites.map((med) => {
                    const batch = med.batches.length > 0 ? med.batches[0] : null;
                    const inStock = batch && batch.stockQty > 0;
                    return (
                      <button
                        key={med.id}
                        disabled={!inStock}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                          inStock
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 active:scale-95'
                            : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                        onClick={() => inStock && addToCart(med)}
                        title={inStock ? `Add ${med.name} (1 tablet)` : 'Out of stock'}
                      >
                        <span className="truncate max-w-[120px]">{med.name}</span>
                        {batch && (
                          <span className="text-[10px] opacity-70">{formatINR(batch.saleRate)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cart Table */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3 pt-4">
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

                            <td className="px-3 py-3 text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {formatINR(displayRate)}
                              </p>
                            </td>

                            <td className="px-6 py-3 text-right">
                              <p className="text-sm font-bold text-gray-900">
                                {formatINR(lineTotal + gst)}
                              </p>
                            </td>

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
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-base font-semibold text-gray-900">
                  Recent Invoices
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {recentSales.length === 0 ? (
                <div className="text-center py-6">
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
                          Date & Time
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
                              {sale.customerName || sale.customer?.name || 'Walk-in'}
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
                          <td className="px-6 py-2.5 text-right whitespace-nowrap">
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
          {/* Keyboard Shortcuts — Compact Collapsible Strip */}
          <div className="bg-gray-50 rounded-lg border border-gray-200/80 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100/60 transition-colors"
              onClick={() => setShowShortcuts(!showShortcuts)}
            >
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-gray-200 rounded text-gray-500">⌨</kbd>
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Keyboard Shortcuts</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showShortcuts ? 'rotate-180' : ''}`} />
            </button>
            {showShortcuts && (
              <div className="px-3 pb-3">
                <Separator className="mb-2.5" />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-gray-500">Search</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-500">F1</kbd>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-gray-500">Customer</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-500">F2</kbd>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-gray-500">Hold Bill</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-500">F3</kbd>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-gray-500">Payment</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-500">F4</kbd>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-gray-500">Complete</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-500">F8</kbd>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-gray-500">Qty +/-</span>
                    <div className="flex gap-0.5">
                      <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-500">+</kbd>
                      <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-500">-</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-gray-500">Remove</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-500">Esc</kbd>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                    <span className="text-[10px] text-gray-400">Orange = near-expiry</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Customer Selection */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-base font-semibold text-gray-900">
                  Customer
                  <kbd className="hidden lg:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 text-gray-400 rounded border border-gray-200 align-middle">F2</kbd>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Customer Search with Inline Add */}
              <div className="relative" ref={customerDropdownRef}>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    ref={customerInputRef}
                    type="text"
                    placeholder="Search or type customer name..."
                    className="pl-9 pr-10 h-9 text-sm"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setQuickCustomerPhone('');
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => {
                      if (selectedCustomerId !== 'walk-in') {
                        setCustomerSearch('');
                        setSelectedCustomerId('walk-in');
                      }
                      setShowCustomerDropdown(true);
                    }}
                  />
                  {selectedCustomerId !== 'walk-in' && (
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => {
                        setSelectedCustomerId('walk-in');
                        setCustomerSearch('');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Customer Search Dropdown */}
                {showCustomerDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    <button
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 text-sm text-gray-500"
                      onClick={() => {
                        setSelectedCustomerId('walk-in');
                        setCustomerSearch('');
                        setShowCustomerDropdown(false);
                        setUseLoyaltyPoints(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className={selectedCustomerId === 'walk-in' ? 'font-medium text-gray-900' : ''}>Walk-in Customer</span>
                      </div>
                    </button>
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        className={`w-full px-4 py-2.5 text-left hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-0 text-sm ${selectedCustomerId === c.id ? 'bg-emerald-50' : ''}`}
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerSearch(c.name);
                          setShowCustomerDropdown(false);
                          setUseLoyaltyPoints(false);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{c.name}</p>
                            {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                          </div>
                          <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0">
                            {c.loyaltyPoints} pts
                          </Badge>
                        </div>
                      </button>
                    ))}

                    {/* Inline Customer Add */}
                    {customerResults.length === 0 && customerSearch.trim().length >= 1 && (
                      <div className="p-3 border-t bg-emerald-50/50">
                        <p className="text-xs text-gray-500 mb-2">No customer found with name &ldquo;{customerSearch}&rdquo;</p>
                        <p className="text-xs font-medium text-emerald-700 mb-2">Quick add as new customer:</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Phone number"
                            className="flex-1 h-8 text-xs border-gray-200"
                            value={quickCustomerPhone}
                            onChange={(e) => setQuickCustomerPhone(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleQuickAddCustomer();
                            }}
                          />
                          <button
                            onClick={handleQuickAddCustomer}
                            disabled={addingCustomer || !quickCustomerPhone.trim()}
                            className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1"
                          >
                            {addingCustomer ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            Add & Select
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Walk-in Customer Name Input */}
              {selectedCustomerId === 'walk-in' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">
                    Customer Name <span className="text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="Enter walk-in customer name..."
                    className="h-9 text-sm"
                    value={walkInCustomerName}
                    onChange={(e) => setWalkInCustomerName(e.target.value)}
                  />
                </div>
              )}

              {/* Doctor Name Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">
                  Doctor Name <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <div className="relative" ref={doctorDropdownRef}>
                  <Input
                    type="text"
                    placeholder="Search or type doctor name..."
                    className="h-9 text-sm pr-8"
                    value={doctorSearch}
                    onChange={(e) => {
                      setDoctorSearch(e.target.value);
                      setShowDoctorDropdown(true);
                      setDoctorName(e.target.value);
                    }}
                    onFocus={() => setShowDoctorDropdown(true)}
                  />
                  {doctorName && (
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => {
                        setDoctorName('');
                        setDoctorSearch('');
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {showDoctorDropdown && (doctorSearch.trim().length === 0 || doctors.filter((d) => d.name.toLowerCase().includes(doctorSearch.toLowerCase())).length > 0) && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {doctors
                        .filter((d) => doctorSearch.trim().length === 0 || d.name.toLowerCase().includes(doctorSearch.toLowerCase()))
                        .map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            className={`w-full px-3 py-2 text-left hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-0 text-sm ${doctorName === d.name ? 'bg-emerald-50 font-medium text-emerald-700' : ''}`}
                            onClick={() => {
                              setDoctorName(d.name);
                              setDoctorSearch(d.name);
                              setShowDoctorDropdown(false);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-gray-900">Dr. {d.name}</span>
                                {d.specialty && (
                                  <span className="text-xs text-gray-400 ml-2">{d.specialty}</span>
                                )}
                              </div>
                              {d.phone && (
                                <span className="text-[11px] text-gray-400">{d.phone}</span>
                              )}
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Customer Info with Loyalty & Credit */}
              {selectedCustomer && (
                <div className="space-y-2">
                  <div className="bg-emerald-50 rounded-lg p-2.5 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{selectedCustomer.name}</p>
                      {selectedCustomer.phone && (
                        <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0 flex-shrink-0">
                      Linked
                    </Badge>
                  </div>

                  {/* Loyalty Points & Available Credit */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        <span className="text-[10px] font-medium text-amber-600">Loyalty Points</span>
                      </div>
                      <p className="text-sm font-bold text-amber-700 mt-0.5">
                        {selectedCustomer.loyaltyPoints}
                      </p>
                    </div>
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-2">
                      <div className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-teal-500" />
                        <span className="text-[10px] font-medium text-teal-600">Available Credit</span>
                      </div>
                      <p className="text-sm font-bold text-teal-700 mt-0.5">
                        {selectedCustomer.creditLimit > 0
                          ? formatINR(Math.max(0, selectedCustomer.creditLimit - selectedCustomer.balance))
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {selectedCustomer.creditLimit > 0 && selectedCustomer.balance > 0 && (
                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" />
                      Outstanding: {formatINR(selectedCustomer.balance)} / {formatINR(selectedCustomer.creditLimit)}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-gray-400">
                {selectedCustomerId === 'walk-in'
                  ? walkInCustomerName.trim()
                    ? `Bill will be in the name of: ${walkInCustomerName.trim()}`
                    : 'Enter name above to print customer name on bill'
                  : 'Selected customer will be linked to this invoice'}
              </p>
            </CardContent>
          </Card>

          {/* Loyalty Points Toggle */}
          {selectedCustomer && selectedCustomer.loyaltyPoints > 0 && cart.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                    <span className="text-sm font-medium text-amber-700">
                      Use Loyalty Points
                    </span>
                  </div>
                  <button
                    onClick={() => setUseLoyaltyPoints(!useLoyaltyPoints)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      useLoyaltyPoints ? 'bg-amber-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                        useLoyaltyPoints ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                {useLoyaltyPoints && (
                  <div className="text-xs text-amber-600 bg-amber-100 rounded-md p-2 space-y-0.5">
                    <p>Available points: <strong>{selectedCustomer.loyaltyPoints}</strong></p>
                    <p>Points to use: <strong>{pointsToUse}</strong> (max 10% of bill)</p>
                    <p>Discount: <strong>{formatINR(loyaltyDiscount)}</strong> (₹1 per point)</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Credit Warning */}
          {creditWarning && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Credit Limit Warning</p>
                <p className="text-xs text-red-600 mt-0.5">{creditWarning}</p>
              </div>
            </div>
          )}

          {/* Bill Summary */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3 pt-4">
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Subtotal</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatINR(subtotal)}
                    </span>
                  </div>

                  {loyaltyDiscount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-amber-600 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        Loyalty Discount
                      </span>
                      <span className="text-sm font-medium text-amber-600">
                        -{formatINR(loyaltyDiscount)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Items</span>
                    <span className="text-sm text-gray-700">
                      {cart.length} {cart.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between py-1">
                    <span className="text-lg font-bold text-gray-900">Grand Total</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {formatINR(grandTotal)}
                    </span>
                  </div>

                  {/* Loyalty points preview */}
                  {selectedCustomer && (
                    <div className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400" />
                      You will earn {Math.floor(grandTotal / 100)} loyalty points from this sale
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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

          {/* Payment Mode — Footer Position */}
          <Card className="border-border/60 shadow-sm" ref={paymentSectionRef}>
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-base font-semibold text-gray-900">
                  Payment Mode
                  <kbd className="hidden lg:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 text-gray-400 rounded border border-gray-200 align-middle">F4</kbd>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <RadioGroup value={paymentMode} onValueChange={(val) => {
                setPaymentMode(val);
                if (val === 'Cash') {
                  setTimeout(() => cashReceivedRef.current?.focus(), 100);
                }
                setCashReceived('');
              }} className="grid grid-cols-2 gap-3">
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

              {/* Cash Received Input */}
              {paymentMode === 'Cash' && cart.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" />
                    Cash Received
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      ref={cashReceivedRef}
                      type="number"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="pl-9 h-10 text-lg font-semibold"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {cashReceivedNum > 0 && (
                    <div className={`rounded-lg p-2.5 flex items-center justify-between ${
                      isCashSufficient
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <span className="text-xs font-medium text-gray-600">Change</span>
                      <div className="flex items-center gap-1.5">
                        {isCashSufficient ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-bold text-emerald-600">{formatINR(cashChange)}</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-bold text-red-600">Short: {formatINR(Math.abs(cashChange))}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Quick cash buttons */}
                  <div className="flex gap-1.5 flex-wrap">
                    {[50, 100, 200, 500, 1000, 2000].map((amt) => (
                      <button
                        key={amt}
                        className="px-2 py-1 text-[11px] font-medium bg-gray-100 text-gray-600 rounded hover:bg-emerald-100 hover:text-emerald-700 transition-colors border border-gray-200 hover:border-emerald-200"
                        onClick={() => setCashReceived(String(amt))}
                      >
                        ₹{amt}
                      </button>
                    ))}
                    <button
                      className="px-2 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors border border-emerald-200"
                      onClick={() => setCashReceived(String(grandTotal))}
                    >
                      Exact
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Complete Sale Button */}
          <Button
            className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                Complete Sale
                {cart.length > 0 && (
                  <span className="ml-1">— {formatINR(grandTotal)}</span>
                )}
                <kbd className="hidden lg:inline-flex ml-2 px-2 py-0.5 text-[10px] font-mono bg-white/20 border border-white/30 rounded text-white/80 items-center">F8</kbd>
              </>
            )}
          </Button>
        </div>
      </div>
      {/* Print Dialog */}
      <InvoicePrintDialog
        data={lastSaleData}
        show={showPrintDialog}
        onClose={handleSkipPrint}
        onPrint={handlePrintInvoice}
      />

      {/* Hidden Print Area (only rendered when printing) */}
      <InvoicePrintArea data={lastSaleData} />
    </div>
  );
}
