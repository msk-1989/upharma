'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Search,
  Eye,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  IndianRupee,
  TrendingUp,
  X,
  Stethoscope,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  doctorName: string | null;
  balance: number;
  totalPurchases: number;
  active: boolean;
  sales: CustomerSale[];
  payments: CustomerPayment[];
}

interface CustomerSale {
  id: string;
  invoiceNo: string;
  date: string;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentMode: string;
}

interface CustomerPayment {
  id: string;
  amount: number;
  mode: string;
  reference: string | null;
  createdAt: string;
}

interface CustomerDetail extends Customer {
  ledger?: LedgerEntry[];
}

interface LedgerEntry {
  date: string;
  type: 'sale' | 'payment' | 'return';
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  doctorName: '',
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div
            className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}
          >
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerDetail | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await fetch(`/api/customers/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      fetchCustomers();
    } catch (err) {
      console.error('Failed to save customer:', err);
    }
    setSaving(false);
  };

  const handleEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      doctorName: customer.doctorName || '',
    });
    setDialogOpen(true);
  };

  const handleViewDetail = async (customer: Customer) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedCustomer(null);
    try {
      const res = await fetch(`/api/customers/${customer.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedCustomer(data.data);
      } else {
        setSelectedCustomer(customer as CustomerDetail);
      }
    } catch (err) {
      console.error('Failed to fetch customer details:', err);
      setSelectedCustomer(customer as CustomerDetail);
    }
    setDetailLoading(false);
  };

  const handleToggleActive = async (customer: Customer) => {
    setTogglingId(customer.id);
    try {
      await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !customer.active }),
      });
      fetchCustomers();
    } catch (err) {
      console.error('Failed to toggle customer status:', err);
    }
    setTogglingId(null);
  };

  // Stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.active).length;
  const totalOutstanding = customers.reduce((sum, c) => sum + c.balance, 0);
  const avgPurchase =
    totalCustomers > 0
      ? customers.reduce((sum, c) => sum + c.totalPurchases, 0) /
        totalCustomers
      : 0;

  const filteredCustomers = customers.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      (c.phone && c.phone.toLowerCase().includes(s)) ||
      (c.doctorName && c.doctorName.toLowerCase().includes(s))
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" /> Customers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your customer records ({totalCustomers} customers)
          </p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          onClick={() => {
            setEditing(null);
            setForm(emptyForm);
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4" /> Add Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Customers"
          value={String(totalCustomers)}
          icon={Users}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          label="Active Customers"
          value={String(activeCustomers)}
          icon={UserCheck}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          label="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          icon={IndianRupee}
          color="text-red-600"
          bg="bg-red-50"
        />
        <StatCard
          label="Avg. Purchase Value"
          value={formatCurrency(avgPurchase)}
          icon={TrendingUp}
          color="text-purple-600"
          bg="bg-purple-50"
        />
      </div>

      {/* Search */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, phone, doctor name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-border/80"
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setSearch('')}
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Customer
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Phone
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Doctor
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Balance Due
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Total Purchases
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="p-4 text-center text-gray-400 animate-pulse">
                        Loading customers...
                      </td>
                    </tr>
                  ))
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No customers found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {search
                          ? 'Try a different search term'
                          : 'Add your first customer to get started'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={`border-b border-border/50 hover:bg-gray-50/50 transition-colors ${
                        !customer.active ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {customer.name}
                          </p>
                          {customer.address && (
                            <p className="text-xs text-gray-400 truncate max-w-[180px]">
                              {customer.address}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {customer.phone || '—'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600 truncate block max-w-[180px]">
                          {customer.email || '—'}
                        </span>
                      </td>
                      <td className="p-3">
                        {customer.doctorName ? (
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <Stethoscope className="w-3 h-3 text-gray-400" />
                            {customer.doctorName}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`text-sm font-semibold ${
                            customer.balance > 0
                              ? 'text-red-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(customer.balance)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(customer.totalPurchases)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            customer.active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {customer.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleViewDetail(customer)}
                            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(customer)}
                            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                            title={
                              customer.active ? 'Deactivate' : 'Activate'
                            }
                            disabled={togglingId === customer.id}
                          >
                            <Switch
                              checked={customer.active}
                              disabled={togglingId === customer.id}
                              className="data-[state=checked]:bg-emerald-500 scale-75 pointer-events-none"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Customer' : 'Add New Customer'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update customer information below.'
                : 'Fill in the details to register a new customer.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border-border/80"
                placeholder="e.g. Ramesh Kumar"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="border-border/80"
                  placeholder="e.g. 9876543210"
                  type="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="border-border/80"
                  placeholder="e.g. ramesh@email.com"
                  type="email"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="border-border/80"
                placeholder="e.g. 42, MG Road, Chennai"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                Prescribing Doctor
              </Label>
              <Input
                value={form.doctorName}
                onChange={(e) =>
                  setForm({ ...form, doctorName: e.target.value })
                }
                className="border-border/80"
                placeholder="e.g. Dr. Suresh Babu"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
            >
              {saving
                ? 'Saving...'
                : editing
                ? 'Update Customer'
                : 'Add Customer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="py-12 text-center text-gray-400 animate-pulse">
              Loading customer details...
            </div>
          ) : selectedCustomer ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  {selectedCustomer.name}
                </DialogTitle>
                <DialogDescription>Customer details and history</DialogDescription>
              </DialogHeader>

              {/* Customer Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50/80 rounded-lg border border-border/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-xs">Phone</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedCustomer.phone || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="text-xs">Email</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedCustomer.email || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-xs">Address</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedCustomer.address || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span className="text-xs">Doctor</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedCustomer.doctorName || '—'}
                  </p>
                </div>
              </div>

              {/* Balance Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-xs text-emerald-600 font-medium">
                    Total Purchases
                  </p>
                  <p className="text-lg font-bold text-emerald-700">
                    {formatCurrency(selectedCustomer.totalPurchases)}
                  </p>
                </div>
                <div
                  className={`p-4 rounded-lg border ${
                    selectedCustomer.balance > 0
                      ? 'bg-red-50 border-red-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <p
                    className={`text-xs font-medium ${
                      selectedCustomer.balance > 0
                        ? 'text-red-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    Outstanding Balance
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      selectedCustomer.balance > 0
                        ? 'text-red-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {formatCurrency(selectedCustomer.balance)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium">Status</p>
                  <Badge
                    variant="secondary"
                    className={`mt-1 ${
                      selectedCustomer.active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {selectedCustomer.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {/* Tabs for Sales & Payments */}
              <Tabs defaultValue="sales" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="sales" className="flex-1">
                    Purchase History
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="flex-1">
                    Payments
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sales">
                  {selectedCustomer.sales &&
                  selectedCustomer.sales.length > 0 ? (
                    <div className="overflow-x-auto mt-4 border border-border/60 rounded-lg">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-gray-50/50">
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                              Invoice
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                              Date
                            </th>
                            <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                              Total
                            </th>
                            <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                              Paid
                            </th>
                            <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                              Balance
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                              Mode
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCustomer.sales.map((sale) => (
                            <tr
                              key={sale.id}
                              className="border-b border-border/50 last:border-0 hover:bg-gray-50/50"
                            >
                              <td className="p-3 text-sm font-medium text-emerald-600">
                                {sale.invoiceNo}
                              </td>
                              <td className="p-3 text-sm text-gray-600">
                                {formatDate(sale.date)}
                              </td>
                              <td className="p-3 text-sm text-gray-900 text-right font-medium">
                                {formatCurrency(sale.grandTotal)}
                              </td>
                              <td className="p-3 text-sm text-emerald-600 text-right">
                                {formatCurrency(sale.paidAmount)}
                              </td>
                              <td className="p-3 text-sm text-right font-semibold">
                                <span
                                  className={
                                    sale.balanceDue > 0
                                      ? 'text-red-600'
                                      : 'text-emerald-600'
                                  }
                                >
                                  {formatCurrency(sale.balanceDue)}
                                </span>
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {sale.paymentMode}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-400">
                      <p>No purchase history</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="payments">
                  {selectedCustomer.payments &&
                  selectedCustomer.payments.length > 0 ? (
                    <div className="overflow-x-auto mt-4 border border-border/60 rounded-lg">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-gray-50/50">
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                              Date
                            </th>
                            <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                              Amount
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                              Mode
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                              Reference
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCustomer.payments.map((payment) => (
                            <tr
                              key={payment.id}
                              className="border-b border-border/50 last:border-0 hover:bg-gray-50/50"
                            >
                              <td className="p-3 text-sm text-gray-600">
                                {formatDate(payment.createdAt)}
                              </td>
                              <td className="p-3 text-sm text-emerald-600 text-right font-semibold">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {payment.mode}
                                </Badge>
                              </td>
                              <td className="p-3 text-sm text-gray-500">
                                {payment.reference || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-400">
                      <p>No payment history</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="py-12 text-center text-gray-400">
              Failed to load customer details.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
