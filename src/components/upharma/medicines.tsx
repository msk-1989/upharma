'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Pill, Plus, Pencil, Trash2, Search, Filter, Package, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Medicine {
  id: string;
  name: string;
  genericName: string | null;
  manufacturer: string | null;
  category: string | null;
  hsnCode: string | null;
  gstPercent: number;
  barcode: string | null;
  baseUnit: string;
  unitsPerStrip: number;
  stripsPerBox: number;
  allowLooseSale: boolean;
  purchaseRate: number;
  saleRate: number;
  mrp: number;
  reorderLevel: number;
  totalStock: number;
  nextExpiry: string | null;
  batches: { id: string; batchNo: string; expiryDate: string; stockQty: number; saleRate: number; purchaseRate: number }[];
}

const emptyMedicine = {
  name: '', genericName: '', manufacturer: '', category: 'General', hsnCode: '',
  gstPercent: 12, barcode: '', baseUnit: 'Tablet', unitsPerStrip: 10,
  stripsPerBox: 10, allowLooseSale: true, purchaseRate: 0, saleRate: 0, mrp: 0, reorderLevel: 20,
};

export function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [form, setForm] = useState(emptyMedicine);
  const [saving, setSaving] = useState(false);

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterCategory) params.set('category', filterCategory);
    const res = await fetch(`/api/medicines?${params}`);
    const data = await res.json();
    if (data.success) setMedicines(data.data);
    setLoading(false);
  }, [search, filterCategory]);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);

  const categories = [...new Set(medicines.map((m) => m.category).filter(Boolean))];

  const handleSave = async () => {
    setSaving(true);
    if (editing) {
      const { id, totalStock, nextExpiry, batches, ...data } = form as any;
      await fetch(`/api/medicines/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    } else {
      await fetch('/api/medicines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyMedicine);
    setSaving(false);
    fetchMedicines();
  };

  const handleEdit = (med: Medicine) => {
    setEditing(med);
    setForm({
      name: med.name, genericName: med.genericName || '', manufacturer: med.manufacturer || '',
      category: med.category || 'General', hsnCode: med.hsnCode || '', gstPercent: med.gstPercent,
      barcode: med.barcode || '', baseUnit: med.baseUnit, unitsPerStrip: med.unitsPerStrip,
      stripsPerBox: med.stripsPerBox, allowLooseSale: med.allowLooseSale,
      purchaseRate: med.purchaseRate, saleRate: med.saleRate, mrp: med.mrp, reorderLevel: med.reorderLevel,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this medicine?')) return;
    await fetch(`/api/medicines/${id}`, { method: 'DELETE' });
    fetchMedicines();
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const d = new Date(date);
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return d <= threeMonths;
  };

  return (
    <div className="p-6 space-y-6 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Pill className="w-6 h-6 text-emerald-600" /> Medicines</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your medicine catalog ({medicines.length} items)</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => { setEditing(null); setForm(emptyMedicine); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> Add Medicine
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search by name, generic, barcode, manufacturer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 border-border/80" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48 border-border/80"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Medicine</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Category</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Stock</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Purchase Rate</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Sale Rate</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">MRP</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">GST%</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Expiry</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => <tr key={i}><td colSpan={9} className="p-4 text-center text-gray-400 animate-pulse">Loading...</td></tr>)
                ) : medicines.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-gray-400">No medicines found</td></tr>
                ) : (
                  medicines.map((med) => (
                    <tr key={med.id} className="border-b border-border/50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{med.name}</p>
                          <p className="text-xs text-gray-500">{med.genericName} | {med.manufacturer}</p>
                        </div>
                      </td>
                      <td className="p-3"><Badge variant="secondary" className="text-xs">{med.category}</Badge></td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {med.totalStock <= med.reorderLevel && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
                          <span className={`text-sm font-medium ${med.totalStock <= med.reorderLevel ? 'text-orange-600' : 'text-gray-900'}`}>
                            {med.totalStock} {med.baseUnit.toLowerCase()}s
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{med.stripsPerBox > 1 ? `${med.unitsPerStrip}/strip, ${med.stripsPerBox}/box` : ''}</p>
                      </td>
                      <td className="p-3 text-sm text-gray-600">₹{med.purchaseRate.toFixed(2)}</td>
                      <td className="p-3 text-sm font-medium text-gray-900">₹{med.saleRate.toFixed(2)}</td>
                      <td className="p-3 text-sm text-gray-600">₹{med.mrp.toFixed(2)}</td>
                      <td className="p-3 text-sm text-gray-600">{med.gstPercent}%</td>
                      <td className="p-3">
                        {med.nextExpiry ? (
                          <span className={`text-xs ${isExpiringSoon(med.nextExpiry) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {new Date(med.nextExpiry).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                          </span>
                        ) : <span className="text-xs text-gray-400">N/A</span>}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(med)} className="p-1.5 rounded-md hover:bg-gray-100"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
                          <button onClick={() => handleDelete(med.id)} className="p-1.5 rounded-md hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Medicine' : 'Add New Medicine'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-sm font-medium">Medicine Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border-border/80" placeholder="e.g. Dolo 650" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Generic Name</Label>
              <Input value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} className="border-border/80" placeholder="e.g. Paracetamol" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Manufacturer</Label>
              <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="border-border/80" placeholder="e.g. Micro Labs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="border-border/80"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Analgesic', 'Antibiotic', 'Antacid', 'Antihistamine', 'Antidiabetic', 'Cardiac', 'Supplement', 'Topical', 'Electrolyte', 'General', 'Cough & Cold', 'Vitamins'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">HSN Code</Label>
              <Input value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} className="border-border/80" placeholder="e.g. 30049099" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">GST %</Label>
              <Select value={String(form.gstPercent)} onValueChange={(v) => setForm({ ...form, gstPercent: parseFloat(v) })}>
                <SelectTrigger className="border-border/80"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem><SelectItem value="5">5%</SelectItem><SelectItem value="12">12%</SelectItem><SelectItem value="18">18%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Barcode</Label>
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="border-border/80" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Base Unit</Label>
              <Select value={form.baseUnit} onValueChange={(v) => setForm({ ...form, baseUnit: v })}>
                <SelectTrigger className="border-border/80"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tablet">Tablet</SelectItem><SelectItem value="Capsule">Capsule</SelectItem><SelectItem value="Bottle">Bottle</SelectItem><SelectItem value="Tube">Tube</SelectItem><SelectItem value="Sachet">Sachet</SelectItem><SelectItem value="Cream">Cream</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Units Per Strip</Label>
              <Input type="number" value={form.unitsPerStrip} onChange={(e) => setForm({ ...form, unitsPerStrip: parseInt(e.target.value) || 1 })} className="border-border/80" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Strips Per Box</Label>
              <Input type="number" value={form.stripsPerBox} onChange={(e) => setForm({ ...form, stripsPerBox: parseInt(e.target.value) || 1 })} className="border-border/80" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Purchase Rate (per unit)</Label>
              <Input type="number" step="0.01" value={form.purchaseRate} onChange={(e) => setForm({ ...form, purchaseRate: parseFloat(e.target.value) || 0 })} className="border-border/80" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Sale Rate (per unit)</Label>
              <Input type="number" step="0.01" value={form.saleRate} onChange={(e) => setForm({ ...form, saleRate: parseFloat(e.target.value) || 0 })} className="border-border/80" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">MRP (per unit)</Label>
              <Input type="number" step="0.01" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: parseFloat(e.target.value) || 0 })} className="border-border/80" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Reorder Level</Label>
              <Input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: parseInt(e.target.value) || 0 })} className="border-border/80" />
            </div>
            <div className="flex items-center gap-3 col-span-2 pt-2">
              <Switch checked={form.allowLooseSale} onCheckedChange={(v) => setForm({ ...form, allowLooseSale: v })} className="data-[state=checked]:bg-emerald-500" />
              <Label className="text-sm">Allow Loose Sale (individual tablets)</Label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Saving...' : editing ? 'Update Medicine' : 'Add Medicine'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
