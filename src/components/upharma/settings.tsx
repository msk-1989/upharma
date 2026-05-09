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
  CheckCircle2,
  Eye,
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
// NOTE: No useEffect needed here. SettingsPage waits for loading=false before
// rendering tabs, so get() already returns correct API values on first mount.
// useState initializer only runs once, so saves won't reset form values.

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

      {/* Invoice Sample Preview Card */}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2 text-sm"
            >
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

// ==================== USERS TAB ====================

const usersData = [
  { name: 'Dr. Rajesh Mehta', username: 'rajesh', role: 'Admin', status: true, lastLogin: '2025-01-22 09:30' },
  { name: 'Sneha Patil', username: 'sneha', role: 'Pharmacist', status: true, lastLogin: '2025-01-22 08:15' },
  { name: 'Amit Joshi', username: 'amit', role: 'Cashier', status: true, lastLogin: '2025-01-21 17:45' },
  { name: 'Kavita Sharma', username: 'kavita', role: 'Manager', status: true, lastLogin: '2025-01-22 10:00' },
  { name: 'Vikram Singh', username: 'vikram', role: 'Cashier', status: false, lastLogin: '2025-01-10 14:20' },
];

function UsersTab() {
  const [users, setUsers] = useState(usersData);

  const toggleStatus = (index: number) => {
    setUsers(users.map((u, i) => (i === index ? { ...u, status: !u.status } : u)));
  };

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
              <p className="text-sm text-gray-500">Manage users, roles, and access permissions</p>
            </div>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Username</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Role</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Last Login</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.username} className="border-b border-border/50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-emerald-700">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm text-gray-600">{user.username}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary" className={
                        user.role === 'Admin' ? 'bg-emerald-100 text-emerald-700 font-medium text-xs' : 'bg-gray-100 text-gray-600 text-xs'
                      }>{user.role}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Switch checked={user.status} onCheckedChange={() => toggleStatus(index)} className="data-[state=checked]:bg-emerald-500" />
                        <span className={`text-xs font-medium ${user.status ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {user.status ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm text-gray-500">{user.lastLogin}</td>
                    <td className="py-3">
                      <button className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors">
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-full">
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
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="invoice">
          <InvoiceTab get={get} saveSettings={saveSettings} saving={saving} getStoreInfo={getStoreInfo} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
