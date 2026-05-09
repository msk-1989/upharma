'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Pill, Plus, Pencil, Trash2, Search, Filter, Package, AlertTriangle, Shield, ShieldAlert, ShieldCheck, Ban, Info, FlaskConical, Syringe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Indian Drug Schedules (Drugs and Cosmetics Act)
const DRUG_SCHEDULES = [
  { value: 'OTC', label: 'OTC', description: 'Over the Counter - No prescription needed', color: 'bg-green-100 text-green-800 border-green-200', icon: ShieldCheck, textColor: 'text-green-700' },
  { value: 'G', label: 'Sch. G', description: 'Caution label required - Warning on label', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Info, textColor: 'text-blue-700' },
  { value: 'H', label: 'Sch. H', description: 'Prescription drug - Rx label mandatory', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Shield, textColor: 'text-amber-700' },
  { value: 'H1', label: 'Sch. H1', description: 'Strict prescription - Narcotic/Psychotropic, record-keeping mandatory', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: ShieldAlert, textColor: 'text-orange-700' },
  { value: 'X', label: 'Sch. X', description: 'Restricted narcotic/psychotropic - Very strict control', color: 'bg-red-100 text-red-800 border-red-200', icon: Ban, textColor: 'text-red-700' },
  { value: 'K', label: 'Sch. K', description: 'Exempt from certain provisions', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: ShieldCheck, textColor: 'text-gray-600' },
  { value: 'C', label: 'Sch. C', description: 'Biological & special products', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: FlaskConical, textColor: 'text-purple-700' },
  { value: 'C1', label: 'Sch. C1', description: 'Biological products - Special storage', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Syringe, textColor: 'text-purple-700' },
  { value: 'N', label: 'Sch. N', description: 'Minerals & mineral preparations', color: 'bg-teal-100 text-teal-800 border-teal-200', icon: Info, textColor: 'text-teal-700' },
  { value: 'P', label: 'Sch. P', description: 'Biological products - Vaccines, Sera', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Syringe, textColor: 'text-indigo-700' },
];

function getScheduleConfig(schedule: string) {
  return DRUG_SCHEDULES.find(s => s.value === schedule) || DRUG_SCHEDULES[0];
}

function ScheduleBadge({ schedule }: { schedule: string }) {
  const config = getScheduleConfig(schedule);
  const IconComp = config.icon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${config.color} gap-1 font-medium text-xs py-0.5 px-2 border`}>
            <IconComp className="w-3 h-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getScheduleIcon(schedule: string) {
  const config = getScheduleConfig(schedule);
  const IconComp = config.icon;
  return <IconComp className={`w-3.5 h-3.5 ${config.textColor}`} />;
}

interface Medicine {
  id: string;
  name: string;
  genericName: string | null;
  manufacturer: string | null;
  category: string | null;
  drugSchedule: string | null;
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
  name: '', genericName: '', manufacturer: '', category: 'General', drugSchedule: 'OTC', hsnCode: '',
  gstPercent: 12, barcode: '', baseUnit: 'Tablet', unitsPerStrip: 10,
  stripsPerBox: 10, allowLooseSale: true, purchaseRate: 0, saleRate: 0, mrp: 0, reorderLevel: 20,
};

export function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSchedule, setFilterSchedule] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [form, setForm] = useState(emptyMedicine);
  const [saving, setSaving] = useState(false);

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterCategory) params.set('category', filterCategory);
    if (filterSchedule) params.set('schedule', filterSchedule);
    const res = await fetch(`/api/medicines?${params}`);
    const data = await res.json();
    if (data.success) setMedicines(data.data);
    setLoading(false);
  }, [search, filterCategory, filterSchedule]);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);

  const categories = [...new Set(medicines.map((m) => m.category).filter(Boolean))];
  const schedules = [...new Set(medicines.map((m) => m.drugSchedule).filter(Boolean))];

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
      category: med.category || 'General', drugSchedule: med.drugSchedule || 'OTC', hsnCode: med.hsnCode || '',
      gstPercent: med.gstPercent, barcode: med.barcode || '', baseUnit: med.baseUnit,
      unitsPerStrip: med.unitsPerStrip, stripsPerBox: med.stripsPerBox, allowLooseSale: med.allowLooseSale,
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

  // Schedule summary stats
  const scheduleCounts = DRUG_SCHEDULES.map(s => ({
    ...s,
    count: medicines.filter(m => m.drugSchedule === s.value).length,
  })).filter(s => s.count > 0);

  return (
    <div className="p-6 space-y-6 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Pill className="w-6 h-6 text-emerald-600" /> Medicines
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage your medicine catalog ({medicines.length} items)</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => { setEditing(null); setForm(emptyMedicine); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> Add Medicine
        </Button>
      </div>

      {/* Schedule Summary Badges */}
      {scheduleCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {scheduleCounts.map(s => (
            <div key={s.value} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${s.color} border`}>
              {getScheduleIcon(s.value)}
              <span>{s.label}</span>
              <span className="font-bold">{s.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search by name, generic, barcode, manufacturer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 border-border/80" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44 border-border/80"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSchedule} onValueChange={setFilterSchedule}>
          <SelectTrigger className="w-40 border-border/80"><SelectValue placeholder="Schedule" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schedules</SelectItem>
            {DRUG_SCHEDULES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                <span className="flex items-center gap-2">{s.label} <span className="text-gray-400 text-xs">- {s.description.split('-')[0]}</span></span>
              </SelectItem>
            ))}
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
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Schedule</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Category</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Stock</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Purchase</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Sale</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">MRP</th>
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
                          <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            {med.name}
                            {(med.drugSchedule === 'H1' || med.drugSchedule === 'X') && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold border border-red-200">
                                Rx
                              </span>
                            )}
                            {(med.drugSchedule === 'H') && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-bold border border-amber-200">
                                Rx
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">{med.genericName} | {med.manufacturer}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <ScheduleBadge schedule={med.drugSchedule || 'OTC'} />
                      </td>
                      <td className="p-3"><Badge variant="secondary" className="text-xs">{med.category}</Badge></td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {med.totalStock <= med.reorderLevel && med.totalStock > 0 && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
                          {med.totalStock === 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                          <span className={`text-sm font-medium ${med.totalStock === 0 ? 'text-red-600' : med.totalStock <= med.reorderLevel ? 'text-orange-600' : 'text-gray-900'}`}>
                            {med.totalStock} {med.baseUnit.toLowerCase()}s
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{med.stripsPerBox > 1 ? `${med.unitsPerStrip}/strip, ${med.stripsPerBox}/box` : ''}</p>
                      </td>
                      <td className="p-3 text-sm text-gray-600">₹{med.purchaseRate.toFixed(2)}</td>
                      <td className="p-3 text-sm font-medium text-gray-900">₹{med.saleRate.toFixed(2)}</td>
                      <td className="p-3 text-sm text-gray-600">₹{med.mrp.toFixed(2)}</td>
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

      {/* Schedule Legend */}
      <Card className="border-border/60 shadow-sm bg-gray-50/50">
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Drug Schedule Reference (Drugs & Cosmetics Act, India)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {DRUG_SCHEDULES.map(s => (
              <div key={s.value} className={`flex items-start gap-2 p-2 rounded-lg ${s.color} border`}>
                {getScheduleIcon(s.value)}
                <div>
                  <p className="text-xs font-semibold">{s.label}</p>
                  <p className="text-[10px] opacity-80 leading-tight">{s.description}</p>
                </div>
              </div>
            ))}
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

            {/* Drug Schedule Selector */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Drug Schedule *
                <span className="text-[10px] text-gray-400">(Drugs & Cosmetics Act)</span>
              </Label>
              <Select value={form.drugSchedule} onValueChange={(v) => setForm({ ...form, drugSchedule: v })}>
                <SelectTrigger className="border-border/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRUG_SCHEDULES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.label}</span>
                        <span className="text-gray-400 text-xs">- {s.description.substring(0, 40)}...</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.drugSchedule && (
                <p className="text-[11px] text-gray-500">
                  {getScheduleConfig(form.drugSchedule).description}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="border-border/80"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Analgesic', 'Antibiotic', 'Antacid', 'Antihistamine', 'Antidiabetic', 'Cardiac', 'Supplement', 'Topical', 'Electrolyte', 'General', 'Cough & Cold', 'Vitamins', 'Anti-inflammatory', 'Antifungal', 'Antiviral', 'Antihypertensive', 'Respiratory', 'Dermatology', 'Eye/Ear Drops', 'Injectables'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                  <SelectItem value="Tablet">Tablet</SelectItem><SelectItem value="Capsule">Capsule</SelectItem><SelectItem value="Bottle">Bottle</SelectItem><SelectItem value="Tube">Tube</SelectItem><SelectItem value="Sachet">Sachet</SelectItem><SelectItem value="Cream">Cream</SelectItem><SelectItem value="Vial">Vial</SelectItem><SelectItem value="Ampoule">Ampoule</SelectItem><SelectItem value="Pessary">Pessary</SelectItem><SelectItem value="Unit">Unit</SelectItem>
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
