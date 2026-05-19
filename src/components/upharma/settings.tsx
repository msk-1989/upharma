'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Users,
  Store,
  FileText,
  Printer,
  Receipt,
  Plus,
  Pencil,
  Save,
  Building2,
  Loader2,
  Eye,
  MonitorCheck,
  Trash2,
  X,
  KeyRound,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { InvoiceSamplePreview } from './invoice-sample-preview';

// ==================== TYPES ====================

interface StoreSettings {
  storeName: string;
  phone: string;
  address: string;
  email: string;
  pincode: string;
  drugLicense: string;
  fssaiNo: string;
  gstNumber: string;
  upiId: string;
}

interface CounterItem {
  id: string;
  name: string;
  location: string | null;
  printerName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalShifts: number;
  assignedUsersCount: number;
  activeShift: {
    id: string;
    openedBy: string;
    openingCash: number;
    createdAt: string;
    openedByUser: { id: string; name: string };
  } | null;
}

interface UserItem {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: string;
  active: boolean;
  defaultCounterId: string | null;
  defaultCounter: { id: string; name: string } | null;
  lastLogin: string | null;
  createdAt: string;
}

// ==================== DEFAULT VALUES ====================

const DEFAULT_STORE: StoreSettings = {
  storeName: 'Upharma Medical Store',
  phone: '',
  address: '',
  email: '',
  pincode: '',
  drugLicense: '',
  fssaiNo: '',
  gstNumber: '',
  upiId: '',
};

const DEFAULT_PRINT = {
  paperSize: 'A4',
  printCopies: '2',
  invoiceHeader: '',
  invoiceFooter: '',
};

const DEFAULT_INVOICE = {
  invoicePrefix: 'INV-',
  nextInvoiceNo: '1',
  termsConditions: '1. Goods once sold will not be taken back.\n2. All disputes are subject to local jurisdiction.\n3. Please check the medicines before leaving the store.\n4. Keep bills for warranty/guarantee claims.',
};

const DEFAULT_GST = {
  gstEnabled: 'true',
  gstin: '',
  cgstRate: '9',
  sgstRate: '9',
  igstRate: '18',
};

// ==================== SETTINGS HOOK ====================

function useSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (newSettings: Record<string, string>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings((prev) => ({ ...prev, ...newSettings }));
        toast({ title: 'Settings Saved', description: 'Your changes have been saved successfully.' });
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err) {
      toast({
        title: 'Save Failed',
        description: err instanceof Error ? err.message : 'Could not save settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const get = useCallback((key: string, fallback: string = '') => {
    return settings[key] ?? fallback;
  }, [settings]);

  return { get, saveSettings, saving, loading };
}

// ==================== SAVE BUTTON ====================

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end mt-6">
      <Button
        onClick={onClick}
        disabled={saving}
        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
}

// ==================== STORE TAB ====================

function StoreTab({ get, saveSettings, saving }: { get: (k: string, f?: string) => string; saveSettings: (s: Record<string, string>) => Promise<void>; saving: boolean }) {
  const [storeName, setStoreName] = useState(() => get('storeName', DEFAULT_STORE.storeName));
  const [phone, setPhone] = useState(() => get('phone', DEFAULT_STORE.phone));
  const [address, setAddress] = useState(() => get('address', DEFAULT_STORE.address));
  const [email, setEmail] = useState(() => get('email', DEFAULT_STORE.email));
  const [pincode, setPincode] = useState(() => get('pincode', DEFAULT_STORE.pincode));
  const [drugLicense, setDrugLicense] = useState(() => get('drugLicense', DEFAULT_STORE.drugLicense));
  const [fssaiNo, setFssaiNo] = useState(() => get('fssaiNo', DEFAULT_STORE.fssaiNo));
  const [gstNumber, setGstNumber] = useState(() => get('gstNumber', DEFAULT_STORE.gstNumber));
  const [upiId, setUpiId] = useState(() => get('upiId', DEFAULT_STORE.upiId));

  const handleSave = () => saveSettings({ storeName, phone, address, email, pincode, drugLicense, fssaiNo, gstNumber, upiId });

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Store Information</CardTitle>
              <p className="text-sm text-gray-500">Basic details about your pharmacy store</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="storeName" className="text-sm font-medium text-gray-700">Store Name *</Label>
              <Input id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Apex Medical Store"
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address" className="text-sm font-medium text-gray-700">Address</Label>
              <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123, Main Street, Gandhi Nagar"
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400 resize-none" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. info@mystore.com"
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode" className="text-sm font-medium text-gray-700">Pincode</Label>
              <Input id="pincode" value={pincode} onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. 400001"
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drugLicense" className="text-sm font-medium text-gray-700">Drug License No</Label>
              <Input id="drugLicense" value={drugLicense} onChange={(e) => setDrugLicense(e.target.value)}
                placeholder="e.g. DL/2024/MH/MUM/123456"
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fssaiNo" className="text-sm font-medium text-gray-700">FSSAI Number</Label>
              <Input id="fssaiNo" value={fssaiNo} onChange={(e) => setFssaiNo(e.target.value)}
                placeholder="e.g. 12345678901234"
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstNumber" className="text-sm font-medium text-gray-700">GST Number</Label>
              <Input id="gstNumber" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)}
                placeholder="e.g. 27AABCU9603R1ZM"
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upiId" className="text-sm font-medium text-gray-700">UPI ID</Label>
              <Input id="upiId" value={upiId} onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. pharmacy@upi"
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
          </div>
          <SaveButton onClick={handleSave} saving={saving} />
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== GST TAB ====================

function GSTTab({ get, saveSettings, saving }: { get: (k: string, f?: string) => string; saveSettings: (s: Record<string, string>) => Promise<void>; saving: boolean }) {
  const [gstEnabled, setGstEnabled] = useState(() => get('gstEnabled', DEFAULT_GST.gstEnabled) === 'true');
  const [gstin, setGstin] = useState(() => get('gstin', DEFAULT_GST.gstin));
  const [cgstRate, setCgstRate] = useState(() => get('cgstRate', DEFAULT_GST.cgstRate));
  const [sgstRate, setSgstRate] = useState(() => get('sgstRate', DEFAULT_GST.sgstRate));
  const [igstRate, setIgstRate] = useState(() => get('igstRate', DEFAULT_GST.igstRate));

  const handleSave = () => saveSettings({ gstEnabled: String(gstEnabled), gstin, cgstRate, sgstRate, igstRate });

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">GST Settings</CardTitle>
              <p className="text-sm text-gray-500">Configure GST/Tax settings for your pharmacy</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/60">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable GST</p>
              <p className="text-xs text-gray-500 mt-0.5">Apply GST on all invoices automatically</p>
            </div>
            <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} className="data-[state=checked]:bg-emerald-500" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gstin" className="text-sm font-medium text-gray-700">GSTIN Number</Label>
            <Input id="gstin" value={gstin} onChange={(e) => setGstin(e.target.value)}
              placeholder="e.g. 27AABCU9603R1ZM"
              className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">CGST Rate (%)</Label>
              <Input value={cgstRate} onChange={(e) => setCgstRate(e.target.value)}
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">SGST Rate (%)</Label>
              <Input value={sgstRate} onChange={(e) => setSgstRate(e.target.value)}
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">IGST Rate (%)</Label>
              <Input value={igstRate} onChange={(e) => setIgstRate(e.target.value)}
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
          </div>
          <SaveButton onClick={handleSave} saving={saving} />
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== PRINT TAB ====================

function PrintTab({ get, saveSettings, saving }: { get: (k: string, f?: string) => string; saveSettings: (s: Record<string, string>) => Promise<void>; saving: boolean }) {
  const [paperSize, setPaperSize] = useState(() => get('paperSize', DEFAULT_PRINT.paperSize));
  const [printCopies, setPrintCopies] = useState(() => get('printCopies', DEFAULT_PRINT.printCopies));
  const [invoiceHeader, setInvoiceHeader] = useState(() => get('invoiceHeader', DEFAULT_PRINT.invoiceHeader));
  const [invoiceFooter, setInvoiceFooter] = useState(() => get('invoiceFooter', DEFAULT_PRINT.invoiceFooter));

  const handleSave = () => saveSettings({ paperSize, printCopies, invoiceHeader, invoiceFooter });

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Printer className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Print Settings</CardTitle>
              <p className="text-sm text-gray-500">Configure invoice and receipt printing options</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Paper Size</Label>
              <Input value={paperSize} onChange={(e) => setPaperSize(e.target.value)}
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Print Copies</Label>
              <Input value={printCopies} onChange={(e) => setPrintCopies(e.target.value)} type="number"
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Invoice Header (custom text)</Label>
            <Textarea value={invoiceHeader} onChange={(e) => setInvoiceHeader(e.target.value)}
              placeholder="Optional: Additional header text for printed invoices"
              className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400 resize-none" rows={3} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Invoice Footer (custom text)</Label>
            <Textarea value={invoiceFooter} onChange={(e) => setInvoiceFooter(e.target.value)}
              placeholder="Optional: Additional footer text for printed invoices"
              className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400 resize-none" rows={3} />
          </div>
          <SaveButton onClick={handleSave} saving={saving} />
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== INVOICE TAB ====================

function InvoiceTab({ get, saveSettings, saving, getStoreInfo }: {
  get: (k: string, f?: string) => string;
  saveSettings: (s: Record<string, string>) => Promise<void>;
  saving: boolean;
  getStoreInfo: () => { storeName: string; phone: string; address: string; gstNumber: string; drugLicense: string; fssaiNo: string; upiId: string };
}) {
  const [invoicePrefix, setInvoicePrefix] = useState(() => get('invoicePrefix', DEFAULT_INVOICE.invoicePrefix));
  const [nextInvoiceNo, setNextInvoiceNo] = useState(() => get('nextInvoiceNo', DEFAULT_INVOICE.nextInvoiceNo));
  const [termsConditions, setTermsConditions] = useState(() => get('termsConditions', DEFAULT_INVOICE.termsConditions));
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = () => saveSettings({ invoicePrefix, nextInvoiceNo, termsConditions });
  const storeInfo = getStoreInfo();

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Invoice Settings</CardTitle>
              <p className="text-sm text-gray-500">Customize invoice template and numbering</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Invoice Prefix</Label>
              <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)}
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Next Invoice Number</Label>
              <Input value={nextInvoiceNo} onChange={(e) => setNextInvoiceNo(e.target.value)} type="number"
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Terms &amp; Conditions</Label>
            <Textarea value={termsConditions} onChange={(e) => setTermsConditions(e.target.value)}
              className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400 resize-none" rows={5} />
          </div>
          <SaveButton onClick={handleSave} saving={saving} />
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Invoice Preview</CardTitle>
                <p className="text-sm text-gray-500">See how your invoice looks when printed on A4 paper</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-2 text-sm">
              <Eye className="w-4 h-4" />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 overflow-x-auto">
              <div className="text-xs text-gray-400 mb-3 flex items-center gap-2">
                <Printer className="w-3.5 h-3.5" />
                A4 Paper — Top half: Customer Copy | Bottom half: Store Copy
              </div>
              <InvoiceSamplePreview storeInfo={storeInfo} invoicePrefix={invoicePrefix} terms={termsConditions} />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// ==================== COUNTERS TAB ====================

function CountersTab() {
  const { toast } = useToast();
  const [counters, setCounters] = useState<CounterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingCounter, setEditingCounter] = useState<CounterItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formPrinter, setFormPrinter] = useState('');

  const fetchCounters = useCallback(async () => {
    try {
      const res = await fetch('/api/counters?all=true');
      const json = await res.json();
      if (json.success) {
        setCounters(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch counters:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCounters(); }, [fetchCounters]);

  const openCreateDialog = () => {
    setEditingCounter(null);
    setFormName('');
    setFormLocation('');
    setFormPrinter('');
    setShowDialog(true);
  };

  const openEditDialog = (counter: CounterItem) => {
    setEditingCounter(counter);
    setFormName(counter.name);
    setFormLocation(counter.location || '');
    setFormPrinter(counter.printerName || '');
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: 'Validation Error', description: 'Counter name is required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const url = editingCounter ? `/api/counters/${editingCounter.id}` : '/api/counters';
      const method = editingCounter ? 'PATCH' : 'POST';
      const body = editingCounter
        ? { name: formName, location: formLocation, printerName: formPrinter }
        : { name: formName, location: formLocation, printerName: formPrinter };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        toast({
          title: editingCounter ? 'Counter Updated' : 'Counter Created',
          description: `${formName} has been ${editingCounter ? 'updated' : 'created'} successfully.`,
        });
        setShowDialog(false);
        fetchCounters();
      } else {
        throw new Error(json.error || 'Failed to save counter');
      }
    } catch (err) {
      toast({
        title: 'Save Failed',
        description: err instanceof Error ? err.message : 'Could not save counter.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (counter: CounterItem) => {
    if (!confirm(`Deactivate "${counter.name}"? It has ${counter.assignedUsersCount} assigned user(s). Staff will lose their default counter assignment.`)) return;
    if (counter.activeShift) {
      toast({ title: 'Cannot Deactivate', description: 'Close the active shift on this counter first.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/counters/${counter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Inactive' }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: 'Counter Deactivated', description: `${counter.name} has been deactivated.` });
        fetchCounters();
      } else {
        throw new Error(json.error || 'Failed to deactivate');
      }
    } catch (err) {
      toast({
        title: 'Deactivate Failed',
        description: err instanceof Error ? err.message : 'Could not deactivate counter.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (counter: CounterItem) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/counters/${counter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Active' }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: 'Counter Activated', description: `${counter.name} is now active.` });
        fetchCounters();
      } else {
        throw new Error(json.error || 'Failed to activate');
      }
    } catch (err) {
      toast({
        title: 'Activate Failed',
        description: err instanceof Error ? err.message : 'Could not activate counter.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <MonitorCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Counter Management</CardTitle>
              <p className="text-sm text-gray-500">Create and manage billing counters</p>
            </div>
          </div>
          <Button onClick={openCreateDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Add Counter
          </Button>
        </CardHeader>
        <CardContent>
          {counters.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MonitorCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No counters created yet. Click &quot;Add Counter&quot; to create your first billing counter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Counter</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Location</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Printer</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Staff</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {counters.map((counter) => (
                    <tr key={counter.id} className="border-b border-border/50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            counter.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            C
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900">{counter.name}</span>
                            {counter.activeShift && (
                              <p className="text-xs text-emerald-600 mt-0.5">
                                Shift active by {counter.activeShift.openedByUser.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-600">{counter.location || '—'}</td>
                      <td className="py-3 pr-4 text-sm text-gray-600">{counter.printerName || '—'}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary" className="text-xs">
                          {counter.assignedUsersCount} user{counter.assignedUsersCount !== 1 ? 's' : ''}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={`text-xs font-medium ${
                          counter.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {counter.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditDialog(counter)}
                            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </button>
                          {counter.status === 'Active' ? (
                            <button
                              onClick={() => handleDeactivate(counter)}
                              disabled={saving}
                              className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-red-50 transition-colors"
                              title="Deactivate"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(counter)}
                              disabled={saving}
                              className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-emerald-50 transition-colors"
                              title="Activate"
                            >
                              <span className="text-xs font-medium text-emerald-600">Enable</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Counter Create/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCounter ? 'Edit Counter' : 'Add New Counter'}
              </h3>
              <button onClick={() => setShowDialog(false)} className="w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Counter Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Counter 1, Main Billing"
                  className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Location</Label>
                <Input
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Ground Floor, Near Entrance"
                  className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Printer Name</Label>
                <Input
                  value={formPrinter}
                  onChange={(e) => setFormPrinter(e.target.value)}
                  placeholder="e.g. EPSON TM-T82X"
                  className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="border-gray-300">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingCounter ? 'Update Counter' : 'Create Counter'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== USERS TAB ====================

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-emerald-100 text-emerald-700',
  Manager: 'bg-blue-100 text-blue-700',
  Cashier: 'bg-amber-100 text-amber-700',
  Pharmacist: 'bg-purple-100 text-purple-700',
};

function UsersTab() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [counters, setCounters] = useState<CounterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'password'>('create');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('Cashier');
  const [formPassword, setFormPassword] = useState('');
  const [formCounterId, setFormCounterId] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, countersRes] = await Promise.all([
        fetch('/api/auth/users'),
        fetch('/api/counters?all=true'),
      ]);
      const usersJson = await usersRes.json();
      const countersJson = await countersRes.json();
      if (usersJson.success) setUsers(usersJson.data || []);
      if (countersJson.success) setCounters((countersJson.data || []).filter((c: CounterItem) => c.status === 'Active'));
    } catch (err) {
      console.error('Failed to fetch users/counters:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateDialog = () => {
    setDialogMode('create');
    setSelectedUser(null);
    setFormName('');
    setFormUsername('');
    setFormEmail('');
    setFormRole('Cashier');
    setFormPassword('');
    setFormCounterId('');
    setShowDialog(true);
  };

  const openEditDialog = (user: UserItem) => {
    setDialogMode('edit');
    setSelectedUser(user);
    setFormName(user.name);
    setFormUsername(user.username);
    setFormEmail(user.email || '');
    setFormRole(user.role);
    setFormPassword('');
    setFormCounterId(user.defaultCounterId || '');
    setShowDialog(true);
  };

  const openPasswordDialog = (user: UserItem) => {
    setDialogMode('password');
    setSelectedUser(user);
    setFormPassword('');
    setShowDialog(true);
  };

  const handleSaveUser = async () => {
    if (dialogMode === 'create') {
      if (!formName.trim() || !formUsername.trim() || !formPassword.trim()) {
        toast({ title: 'Validation Error', description: 'Name, username, and password are required.', variant: 'destructive' });
        return;
      }
    }
    if (dialogMode === 'edit' && !formName.trim()) {
      toast({ title: 'Validation Error', description: 'Name is required.', variant: 'destructive' });
      return;
    }
    if (dialogMode === 'password' && !formPassword.trim()) {
      toast({ title: 'Validation Error', description: 'New password is required.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (dialogMode === 'create') {
        const res = await fetch('/api/auth/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            username: formUsername,
            email: formEmail || null,
            password: formPassword,
            role: formRole,
            defaultCounterId: formCounterId || null,
          }),
        });
        const json = await res.json();
        if (json.success) {
          toast({ title: 'User Created', description: `${formName} has been created successfully.` });
          setShowDialog(false);
          fetchData();
        } else {
          throw new Error(json.error || 'Failed to create user');
        }
      } else if (dialogMode === 'edit') {
        const res = await fetch(`/api/auth/users/${selectedUser!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            email: formEmail || null,
            role: formRole,
            defaultCounterId: formCounterId || null,
          }),
        });
        const json = await res.json();
        if (json.success) {
          toast({ title: 'User Updated', description: `${formName} has been updated.` });
          setShowDialog(false);
          fetchData();
        } else {
          throw new Error(json.error || 'Failed to update user');
        }
      } else if (dialogMode === 'password') {
        const res = await fetch(`/api/auth/users/${selectedUser!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: formPassword }),
        });
        const json = await res.json();
        if (json.success) {
          toast({ title: 'Password Reset', description: `Password for ${selectedUser!.name} has been updated.` });
          setShowDialog(false);
        } else {
          throw new Error(json.error || 'Failed to reset password');
        }
      }
    } catch (err) {
      toast({
        title: 'Save Failed',
        description: err instanceof Error ? err.message : 'Operation failed.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/auth/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: user.active ? 'User Deactivated' : 'User Activated',
          description: `${user.name} has been ${user.active ? 'deactivated' : 'activated'}.`,
        });
        fetchData();
      } else {
        throw new Error(json.error || 'Failed to toggle status');
      }
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: err instanceof Error ? err.message : 'Could not update user status.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getCounterName = (counterId: string | null) => {
    if (!counterId) return null;
    const counter = counters.find(c => c.id === counterId);
    return counter?.name || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">User Management</CardTitle>
              <p className="text-sm text-gray-500">Manage users, roles, and counter assignments</p>
            </div>
          </div>
          <Button onClick={openCreateDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <UserPlus className="w-4 h-4" />
            Add User
          </Button>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No users found. Click &quot;Add User&quot; to create a user account.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Name</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Username</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Role</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Counter</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                            user.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 3)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-600">{user.username}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary" className={`text-xs font-medium ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {user.defaultCounter ? (
                          <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700">
                            {user.defaultCounter.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">Not assigned</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.active}
                            onCheckedChange={() => handleToggleActive(user)}
                            disabled={saving}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                          <span className={`text-xs font-medium ${user.active ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {user.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditDialog(user)}
                            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors"
                            title="Edit user"
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => openPasswordDialog(user)}
                            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors"
                            title="Reset password"
                          >
                            <KeyRound className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Create/Edit/Password Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {dialogMode === 'create' && 'Add New User'}
                {dialogMode === 'edit' && `Edit ${selectedUser?.name}`}
                {dialogMode === 'password' && `Reset Password — ${selectedUser?.name}`}
              </h3>
              <button onClick={() => setShowDialog(false)} className="w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {dialogMode === 'password' ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">New Password *</Label>
                  <Input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400">User will need to use this password to log in.</p>
                </div>
              ) : (
                <>
                  {dialogMode === 'create' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Username *</Label>
                      <Input
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value)}
                        placeholder="e.g. john, sneha"
                        className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
                        autoFocus
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Full Name *</Label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Email</Label>
                    <Input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. john@mystore.com"
                      className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Role</Label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full h-10 rounded-md border border-border/80 bg-white px-3 text-sm focus:border-emerald-400 focus:ring-emerald-400 focus:outline-none"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="Cashier">Cashier</option>
                      <option value="Pharmacist">Pharmacist</option>
                    </select>
                  </div>
                  {counters.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Default Counter</Label>
                      <select
                        value={formCounterId}
                        onChange={(e) => setFormCounterId(e.target.value)}
                        className="w-full h-10 rounded-md border border-border/80 bg-white px-3 text-sm focus:border-emerald-400 focus:ring-emerald-400 focus:outline-none"
                      >
                        <option value="">— None —</option>
                        {counters.map(c => (
                          <option key={c.id} value={c.id}>{c.name}{c.location ? ` (${c.location})` : ''}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400">
                        {dialogMode === 'create'
                          ? 'Assigned counter will be pre-selected when this user opens a shift.'
                          : getCounterName(formCounterId || null)
                            ? `Currently: ${getCounterName(formCounterId || null)}`
                            : 'No counter assigned. The user can select any counter.'
                        }
                      </p>
                    </div>
                  )}
                  {dialogMode === 'create' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Password *</Label>
                      <Input
                        type="password"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Set initial password"
                        className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="border-gray-300">
                Cancel
              </Button>
              <Button
                onClick={handleSaveUser}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {dialogMode === 'create' && 'Create User'}
                {dialogMode === 'edit' && 'Save Changes'}
                {dialogMode === 'password' && 'Reset Password'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MAIN SETTINGS PAGE ====================

export function SettingsPage() {
  const { get, saveSettings, saving, loading } = useSettings();

  const getStoreInfo = useCallback(() => ({
    storeName: get('storeName', DEFAULT_STORE.storeName),
    phone: get('phone', DEFAULT_STORE.phone),
    address: get('address', DEFAULT_STORE.address),
    gstNumber: get('gstNumber', DEFAULT_STORE.gstNumber),
    drugLicense: get('drugLicense', DEFAULT_STORE.drugLicense),
    fssaiNo: get('fssaiNo', DEFAULT_STORE.fssaiNo),
    upiId: get('upiId', DEFAULT_STORE.upiId),
  }), [get]);

  if (loading) {
    return (
      <div className="p-3 sm:p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-400" />
          Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">Configure your pharmacy ERP settings</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="store" className="space-y-6">
        <TabsList className="bg-gray-100/80 p-1 h-auto flex-wrap">
          <TabsTrigger value="store" className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-xs sm:text-sm px-3 sm:px-4 py-2">
            <Store className="w-4 h-4 mr-1.5" />
            Store
          </TabsTrigger>
          <TabsTrigger value="gst" className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-xs sm:text-sm px-3 sm:px-4 py-2">
            <FileText className="w-4 h-4 mr-1.5" />
            GST
          </TabsTrigger>
          <TabsTrigger value="print" className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-xs sm:text-sm px-3 sm:px-4 py-2">
            <Printer className="w-4 h-4 mr-1.5" />
            Print
          </TabsTrigger>
          <TabsTrigger value="counters" className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-xs sm:text-sm px-3 sm:px-4 py-2">
            <MonitorCheck className="w-4 h-4 mr-1.5" />
            Counters
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-xs sm:text-sm px-3 sm:px-4 py-2">
            <Users className="w-4 h-4 mr-1.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="invoice" className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-xs sm:text-sm px-3 sm:px-4 py-2">
            <Receipt className="w-4 h-4 mr-1.5" />
            Invoice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store"><StoreTab get={get} saveSettings={saveSettings} saving={saving} /></TabsContent>
        <TabsContent value="gst"><GSTTab get={get} saveSettings={saveSettings} saving={saving} /></TabsContent>
        <TabsContent value="print"><PrintTab get={get} saveSettings={saveSettings} saving={saving} /></TabsContent>
        <TabsContent value="counters"><CountersTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="invoice">
          <InvoiceTab get={get} saveSettings={saveSettings} saving={saving} getStoreInfo={getStoreInfo} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
