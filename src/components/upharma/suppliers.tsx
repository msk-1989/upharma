'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Plus,
  Pencil,
  Search,
  Eye,
  Phone,
  Mail,
  MapPin,
  Building2,
  IndianRupee,
  FileCheck,
  ShieldCheck,
  UserCheck,
  X,
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

interface SupplierPurchase {
  id: string;
  invoiceNo: string;
  date: string;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  drugLicense: string | null;
  balance: number;
  active: boolean;
  purchases: SupplierPurchase[];
}

type SupplierDetail = Supplier;

const emptyForm = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  gstNumber: '',
  drugLicense: '',
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

const purchaseStatusColors: Record<string, string> = {
  Received: 'bg-emerald-100 text-emerald-700',
  Partially_Received: 'bg-amber-100 text-amber-700',
  Ordered: 'bg-blue-100 text-blue-700',
  Pending: 'bg-gray-100 text-gray-600',
  Returned: 'bg-red-100 text-red-700',
  Cancelled: 'bg-gray-200 text-gray-500',
};

function formatPurchaseStatus(status: string) {
  return status.replace(/_/g, ' ');
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

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] =
    useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/suppliers?${params}`);
      const data = await res.json();
      if (data.success) setSuppliers(data.data);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await fetch(`/api/suppliers/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      fetchSuppliers();
    } catch (err) {
      console.error('Failed to save supplier:', err);
    }
    setSaving(false);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gstNumber: supplier.gstNumber || '',
      drugLicense: supplier.drugLicense || '',
    });
    setDialogOpen(true);
  };

  const handleViewDetail = async (supplier: Supplier) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedSupplier(null);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedSupplier(data.data);
      } else {
        setSelectedSupplier(supplier);
      }
    } catch (err) {
      console.error('Failed to fetch supplier details:', err);
      setSelectedSupplier(supplier);
    }
    setDetailLoading(false);
  };

  const handleToggleActive = async (supplier: Supplier) => {
    setTogglingId(supplier.id);
    try {
      await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !supplier.active }),
      });
      fetchSuppliers();
    } catch (err) {
      console.error('Failed to toggle supplier status:', err);
    }
    setTogglingId(null);
  };

  // Stats
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter((s) => s.active).length;
  const totalOutstanding = suppliers.reduce((sum, s) => sum + s.balance, 0);
  const gstRegistered = suppliers.filter((s) => s.gstNumber).length;

  const filteredSuppliers = suppliers.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.gstNumber && s.gstNumber.toLowerCase().includes(q)) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" /> Suppliers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your supplier records ({totalSuppliers} suppliers)
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
          <Plus className="w-4 h-4" /> Add Supplier
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Suppliers"
          value={String(totalSuppliers)}
          icon={Truck}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          label="Active Suppliers"
          value={String(activeSuppliers)}
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
          label="GST Registered"
          value={`${gstRegistered} of ${totalSuppliers}`}
          icon={ShieldCheck}
          color="text-purple-600"
          bg="bg-purple-50"
        />
      </div>

      {/* Search */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, phone, GST number..."
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
                    Supplier
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Contact Person
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Phone
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    GST No.
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Drug License
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Balance Due
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
                      <td
                        colSpan={9}
                        className="p-4 text-center text-gray-400 animate-pulse"
                      >
                        Loading suppliers...
                      </td>
                    </tr>
                  ))
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center">
                      <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">
                        No suppliers found
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {search
                          ? 'Try a different search term'
                          : 'Add your first supplier to get started'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className={`border-b border-border/50 hover:bg-gray-50/50 transition-colors ${
                        !supplier.active ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {supplier.name}
                          </p>
                          {supplier.address && (
                            <p className="text-xs text-gray-400 truncate max-w-[160px]">
                              {supplier.address}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-600">
                            {supplier.contactPerson || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {supplier.phone || '—'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600 truncate block max-w-[160px]">
                          {supplier.email || '—'}
                        </span>
                      </td>
                      <td className="p-3">
                        {supplier.gstNumber ? (
                          <Badge
                            variant="outline"
                            className="text-xs font-mono"
                          >
                            {supplier.gstNumber}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {supplier.drugLicense ? (
                          <Badge
                            variant="outline"
                            className="text-xs font-mono"
                          >
                            <FileCheck className="w-3 h-3 mr-1" />
                            {supplier.drugLicense}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`text-sm font-semibold ${
                            supplier.balance > 0
                              ? 'text-red-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(supplier.balance)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            supplier.active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {supplier.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleViewDetail(supplier)}
                            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(supplier)}
                            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                            title={
                              supplier.active ? 'Deactivate' : 'Activate'
                            }
                            disabled={togglingId === supplier.id}
                          >
                            <Switch
                              checked={supplier.active}
                              disabled={togglingId === supplier.id}
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
              {editing ? 'Edit Supplier' : 'Add New Supplier'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update supplier information below.'
                : 'Fill in the details to register a new supplier.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Supplier Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border-border/80"
                placeholder="e.g. Apollo Pharmacy Distributors"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Contact Person</Label>
                <Input
                  value={form.contactPerson}
                  onChange={(e) =>
                    setForm({ ...form, contactPerson: e.target.value })
                  }
                  className="border-border/80"
                  placeholder="e.g. Rajesh Mehta"
                />
              </div>
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
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="border-border/80"
                placeholder="e.g. orders@apollo-dist.com"
                type="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="border-border/80"
                placeholder="e.g. 15, Industrial Area, Phase 2, Hyderabad"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                  GST Number
                </Label>
                <Input
                  value={form.gstNumber}
                  onChange={(e) =>
                    setForm({ ...form, gstNumber: e.target.value.toUpperCase() })
                  }
                  className="border-border/80 font-mono text-sm"
                  placeholder="e.g. 36AABCU9603R1ZM"
                  maxLength={15}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-gray-400" />
                  Drug License No.
                </Label>
                <Input
                  value={form.drugLicense}
                  onChange={(e) =>
                    setForm({ ...form, drugLicense: e.target.value.toUpperCase() })
                  }
                  className="border-border/80 font-mono text-sm"
                  placeholder="e.g. TN-DL-2024-001234"
                  maxLength={20}
                />
              </div>
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
                ? 'Update Supplier'
                : 'Add Supplier'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="py-12 text-center text-gray-400 animate-pulse">
              Loading supplier details...
            </div>
          ) : selectedSupplier ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  {selectedSupplier.name}
                </DialogTitle>
                <DialogDescription>Supplier details and purchase history</DialogDescription>
              </DialogHeader>

              {/* Supplier Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50/80 rounded-lg border border-border/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="text-xs">Contact Person</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedSupplier.contactPerson || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-xs">Phone</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedSupplier.phone || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="text-xs">Email</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedSupplier.email || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-xs">Address</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedSupplier.address || '—'}
                  </p>
                </div>
              </div>

              {/* Compliance Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border border-border/60 bg-white">
                  <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">GST Number</span>
                  </div>
                  {selectedSupplier.gstNumber ? (
                    <p className="text-sm font-mono font-semibold text-gray-900">
                      {selectedSupplier.gstNumber}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Not registered</p>
                  )}
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-white">
                  <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Drug License</span>
                  </div>
                  {selectedSupplier.drugLicense ? (
                    <p className="text-sm font-mono font-semibold text-gray-900">
                      {selectedSupplier.drugLicense}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Not provided</p>
                  )}
                </div>
              </div>

              {/* Balance Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-lg border ${
                    selectedSupplier.balance > 0
                      ? 'bg-red-50 border-red-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <p
                    className={`text-xs font-medium ${
                      selectedSupplier.balance > 0
                        ? 'text-red-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    Outstanding Balance
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      selectedSupplier.balance > 0
                        ? 'text-red-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {formatCurrency(selectedSupplier.balance)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium">Status</p>
                  <Badge
                    variant="secondary"
                    className={`mt-1 ${
                      selectedSupplier.active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {selectedSupplier.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {/* Purchase History */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  Purchase History
                </h3>
                {selectedSupplier.purchases &&
                selectedSupplier.purchases.length > 0 ? (
                  <div className="overflow-x-auto border border-border/60 rounded-lg">
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
                          <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSupplier.purchases.map((purchase) => (
                          <tr
                            key={purchase.id}
                            className="border-b border-border/50 last:border-0 hover:bg-gray-50/50"
                          >
                            <td className="p-3 text-sm font-medium text-emerald-600">
                              {purchase.invoiceNo}
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {formatDate(purchase.date)}
                            </td>
                            <td className="p-3 text-sm text-gray-900 text-right font-medium">
                              {formatCurrency(purchase.grandTotal)}
                            </td>
                            <td className="p-3 text-sm text-emerald-600 text-right">
                              {formatCurrency(purchase.paidAmount)}
                            </td>
                            <td className="p-3 text-sm text-right font-semibold">
                              <span
                                className={
                                  purchase.balanceDue > 0
                                    ? 'text-red-600'
                                    : 'text-emerald-600'
                                }
                              >
                                {formatCurrency(purchase.balanceDue)}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  purchaseStatusColors[purchase.status] || ''
                                }`}
                              >
                                {formatPurchaseStatus(purchase.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-400 border border-dashed border-border/60 rounded-lg">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No purchase history</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-gray-400">
              Failed to load supplier details.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
