'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const usersData = [
  { name: 'Dr. Rajesh Mehta', username: 'rajesh', role: 'Admin', status: true, lastLogin: '2025-01-22 09:30' },
  { name: 'Sneha Patil', username: 'sneha', role: 'Pharmacist', status: true, lastLogin: '2025-01-22 08:15' },
  { name: 'Amit Joshi', username: 'amit', role: 'Cashier', status: true, lastLogin: '2025-01-21 17:45' },
  { name: 'Kavita Sharma', username: 'kavita', role: 'Manager', status: true, lastLogin: '2025-01-22 10:00' },
  { name: 'Vikram Singh', username: 'vikram', role: 'Cashier', status: false, lastLogin: '2025-01-10 14:20' },
];

function StoreTab() {
  const [storeName, setStoreName] = useState('Upharma Medical Store');
  const [address, setAddress] = useState('123, Main Street, Gandhi Nagar');
  const [pincode, setPincode] = useState('400001');
  const [gstNumber, setGstNumber] = useState('27AABCU9603R1ZM');
  const [phone, setPhone] = useState('9876543210');
  const [email, setEmail] = useState('info@upharma.com');
  const [drugLicense, setDrugLicense] = useState('DL/2024/MH/MUM/123456');

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
              <Label htmlFor="storeName" className="text-sm font-medium text-gray-700">Store Name</Label>
              <Input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address" className="text-sm font-medium text-gray-700">Address</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400 resize-none"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode" className="text-sm font-medium text-gray-700">Pincode</Label>
              <Input
                id="pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drugLicense" className="text-sm font-medium text-gray-700">Drug License No</Label>
              <Input
                id="drugLicense"
                value={drugLicense}
                onChange={(e) => setDrugLicense(e.target.value)}
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstNumber" className="text-sm font-medium text-gray-700">GST Number</Label>
              <Input
                id="gstNumber"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
              />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
                      <Badge
                        variant="secondary"
                        className={
                          user.role === 'Admin'
                            ? 'bg-emerald-100 text-emerald-700 font-medium text-xs'
                            : 'bg-gray-100 text-gray-600 text-xs'
                        }
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.status}
                          onCheckedChange={() => toggleStatus(index)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
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

function GSTTab() {
  const [gstin, setGstin] = useState('27AABCU9603R1ZM');
  const [gstEnabled, setGstEnabled] = useState(true);

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
            <Input
              id="gstin"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">CGST Rate (%)</Label>
              <Input defaultValue="9" className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">SGST Rate (%)</Label>
              <Input defaultValue="9" className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">IGST Rate (%)</Label>
              <Input defaultValue="18" className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PrintTab() {
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
              <Input defaultValue="A4" className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Print Copies</Label>
              <Input defaultValue="2" type="number" className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Invoice Header</Label>
            <Textarea
              defaultValue="Upharma Medical Store
123, Main Street, Gandhi Nagar
Phone: 9876543210 | Email: info@upharma.com"
              className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400 resize-none"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Invoice Footer</Label>
            <Textarea
              defaultValue="Thank you for visiting Upharma Medical Store!
Drug License No: DL/2024/MH/MUM/123456"
              className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400 resize-none"
              rows={3}
            />
          </div>
          <div className="flex justify-end">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoiceTab() {
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
              <Input defaultValue="INV-" className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Next Invoice Number</Label>
              <Input defaultValue="1043" type="number" className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Terms &amp; Conditions</Label>
            <Textarea
              defaultValue="1. Goods once sold will not be taken back.
2. All disputes are subject to local jurisdiction.
3. Please check the medicines before leaving the store.
4. Keep bills for warranty/guarantee claims."
              className="border-border/80 focus:border-emerald-400 focus:ring-emerald-400 resize-none"
              rows={5}
            />
          </div>
          <div className="flex justify-end">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsPage() {
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
        <TabsList className="bg-gray-100/80 p-1 h-auto">
          <TabsTrigger
            value="store"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-sm px-4 py-2"
          >
            <Store className="w-4 h-4 mr-1.5" />
            Store
          </TabsTrigger>
          <TabsTrigger
            value="gst"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-sm px-4 py-2"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            GST
          </TabsTrigger>
          <TabsTrigger
            value="print"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-sm px-4 py-2"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-sm px-4 py-2"
          >
            <Users className="w-4 h-4 mr-1.5" />
            Users
          </TabsTrigger>
          <TabsTrigger
            value="invoice"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-sm px-4 py-2"
          >
            <Receipt className="w-4 h-4 mr-1.5" />
            Invoice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store"><StoreTab /></TabsContent>
        <TabsContent value="gst"><GSTTab /></TabsContent>
        <TabsContent value="print"><PrintTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="invoice"><InvoiceTab /></TabsContent>
      </Tabs>
    </div>
  );
}
