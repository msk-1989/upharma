'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope,
  Plus,
  Pencil,
  Search,
  Eye,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  GraduationCap,
  BadgeCheck,
  FileText,
  Users,
  TrendingUp,
  Award,
  X,
  Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';

interface DoctorList {
  id: string;
  name: string;
  qualification: string | null;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  registrationNo: string | null;
  active: boolean;
  _count: { sales: number; prescriptions: number };
}

interface RecentSale {
  id: string;
  invoiceNo: string;
  date: string;
  grandTotal: number;
  customerName: string | null;
  status: string;
}

interface TopMedicine {
  name: string;
  count: number;
}

interface DoctorDetail extends DoctorList {
  totalSalesCount: number;
  totalSalesValue: number;
  avgSaleValue: number;
  thisMonthPrescriptions: number;
  recentSales: RecentSale[];
  topMedicines: TopMedicine[];
}

function formatCurrency(amount: number) {
  if (amount == null || isNaN(amount)) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const emptyForm = {
  name: '',
  qualification: '',
  specialty: '',
  phone: '',
  email: '',
  address: '',
  registrationNo: '',
  active: true,
};

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
          <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<DoctorList | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorDetail | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/doctors?${params}`);
      const data = await res.json();
      if (data.success) setDoctors(data.data);
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await fetch(`/api/doctors/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      fetchDoctors();
    } catch (err) {
      console.error('Failed to save doctor:', err);
    }
    setSaving(false);
  };

  const handleEdit = (doctor: DoctorList) => {
    setEditing(doctor);
    setForm({
      name: doctor.name,
      qualification: doctor.qualification || '',
      specialty: doctor.specialty || '',
      phone: doctor.phone || '',
      email: doctor.email || '',
      address: doctor.address || '',
      registrationNo: doctor.registrationNo || '',
      active: doctor.active,
    });
    setDialogOpen(true);
  };

  const handleViewDetail = async (doctor: DoctorList) => {
    setViewOpen(true);
    setViewLoading(true);
    setSelectedDoctor(null);
    try {
      const res = await fetch(`/api/doctors/${doctor.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedDoctor(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch doctor details:', err);
    }
    setViewLoading(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/doctors/${deletingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchDoctors();
        setViewOpen(false);
        setSelectedDoctor(null);
      }
    } catch (err) {
      console.error('Failed to deactivate doctor:', err);
    }
    setDeleteOpen(false);
    setDeletingId(null);
  };

  // Stats
  const totalDoctors = doctors.length;
  const activeDoctors = doctors.filter((d) => d.active).length;
  const thisMonthPrescriptions = doctors.reduce(
    (sum, d) => sum + d._count.prescriptions,
    0
  );

  // Find top doctor by sales count
  const topDoctor = doctors.reduce(
    (top, d) => (d._count.sales > (top?._count.sales || 0) ? d : top),
    null as DoctorList | null
  );

  const filteredDoctors = doctors.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.specialty && d.specialty.toLowerCase().includes(q)) ||
      (d.phone && d.phone.toLowerCase().includes(q)) ||
      (d.qualification && d.qualification.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-emerald-600" /> Doctor Master
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage doctor records and prescription analytics ({totalDoctors} doctors)
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
          <Plus className="w-4 h-4" /> Add Doctor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Doctors"
          value={String(totalDoctors)}
          icon={Stethoscope}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          label="Active Doctors"
          value={String(activeDoctors)}
          icon={Users}
          color="text-teal-600"
          bg="bg-teal-50"
        />
        <StatCard
          label="Prescriptions"
          value={thisMonthPrescriptions.toLocaleString('en-IN')}
          icon={FileText}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          label="Top Doctor"
          value={topDoctor ? topDoctor.name : 'N/A'}
          icon={Award}
          color="text-amber-600"
          bg="bg-amber-50"
        />
      </div>

      {/* Search */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, specialty, phone, qualification..."
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

      {/* Doctors Table */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Doctor
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Qualification
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Specialty
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Phone
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Reg. No.
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Prescriptions
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Sales Value
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
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-gray-400 animate-pulse">
                      Loading doctors...
                    </td>
                  </tr>
                ) : filteredDoctors.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center">
                      <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No doctors found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {search
                          ? 'Try a different search term'
                          : 'Add your first doctor to get started'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map((doctor) => (
                    <tr
                      key={doctor.id}
                      className={`border-b border-border/50 hover:bg-gray-50/50 transition-colors ${
                        !doctor.active ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                            <Stethoscope className="w-4 h-4 text-teal-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doctor.name}</p>
                            {doctor.email && (
                              <p className="text-xs text-gray-400 truncate max-w-[140px]">
                                {doctor.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-600">
                            {doctor.qualification || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        {doctor.specialty ? (
                          <Badge variant="outline" className="text-xs">
                            {doctor.specialty}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{doctor.phone || '—'}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {doctor.registrationNo ? (
                          <Badge variant="outline" className="text-xs font-mono">
                            <BadgeCheck className="w-3 h-3 mr-1" />
                            {doctor.registrationNo}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {doctor._count.prescriptions}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-sm font-semibold text-emerald-600">
                          {doctor._count.sales > 0 ? `${doctor._count.sales} sales` : '—'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            doctor.active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {doctor.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleViewDetail(doctor)}
                            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleEdit(doctor)}
                            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingId(doctor.id);
                              setDeleteOpen(true);
                            }}
                            className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                            title={doctor.active ? 'Deactivate' : 'Already Inactive'}
                            disabled={!doctor.active}
                          >
                            <Trash2
                              className={`w-3.5 h-3.5 ${
                                doctor.active ? 'text-gray-500 hover:text-red-600' : 'text-gray-300'
                              }`}
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

      {/* Create/Edit Doctor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Doctor' : 'Add New Doctor'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update doctor information below.'
                : 'Fill in the details to register a new doctor.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Doctor Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border-border/80"
                placeholder="e.g., Dr. Rajesh Kumar"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                  Qualification
                </Label>
                <Input
                  value={form.qualification}
                  onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                  className="border-border/80"
                  placeholder="e.g., MBBS, MD, BDS"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Specialty</Label>
                <Input
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  className="border-border/80"
                  placeholder="e.g., Cardiology, General"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  Phone
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="border-border/80"
                  placeholder="e.g., 9876543210"
                  type="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  Email
                </Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="border-border/80"
                  placeholder="e.g., dr.rajesh@hospital.com"
                  type="email"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                Address
              </Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="border-border/80"
                placeholder="e.g., 15, MG Road, Chennai"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-gray-400" />
                Registration No.
              </Label>
              <Input
                value={form.registrationNo}
                onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
                className="border-border/80 font-mono text-sm"
                placeholder="e.g., TNMC-12345"
              />
            </div>
            {editing && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-border/60">
                <div>
                  <p className="text-sm font-medium text-gray-700">Active Status</p>
                  <p className="text-xs text-gray-400">
                    {form.active ? 'Doctor is currently active' : 'Doctor is currently inactive'}
                  </p>
                </div>
                <Switch
                  checked={form.active}
                  onCheckedChange={(checked) => setForm({ ...form, active: checked })}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            )}
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
              {saving ? 'Saving...' : editing ? 'Update Doctor' : 'Add Doctor'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Doctor Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewLoading ? (
            <div className="py-12 text-center text-gray-400 animate-pulse">
              Loading doctor details...
            </div>
          ) : selectedDoctor ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-emerald-600" />
                  {selectedDoctor.name}
                </DialogTitle>
                <DialogDescription>Doctor profile and analytics</DialogDescription>
              </DialogHeader>

              {/* Doctor Info Card */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50/80 rounded-lg border border-border/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span className="text-xs">Qualification</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedDoctor.qualification || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span className="text-xs">Specialty</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedDoctor.specialty || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-xs">Phone</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedDoctor.phone || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="text-xs">Email</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedDoctor.email || '—'}
                  </p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border border-border/60 bg-white">
                  <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Registration No.</span>
                  </div>
                  {selectedDoctor.registrationNo ? (
                    <p className="text-sm font-mono font-semibold text-gray-900">
                      {selectedDoctor.registrationNo}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Not provided</p>
                  )}
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-white">
                  <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Address</span>
                  </div>
                  {selectedDoctor.address ? (
                    <p className="text-sm font-medium text-gray-900">{selectedDoctor.address}</p>
                  ) : (
                    <p className="text-sm text-gray-400">Not provided</p>
                  )}
                </div>
              </div>

              {/* Sales Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-xs text-emerald-600 font-medium">Total Prescriptions</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {selectedDoctor.totalSalesCount}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-teal-50 border border-teal-200">
                  <p className="text-xs text-teal-600 font-medium">Total Sales Value</p>
                  <p className="text-lg font-bold text-teal-700">
                    {formatCurrency(selectedDoctor.totalSalesValue)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">Avg. Sale Value</p>
                  <p className="text-lg font-bold text-blue-700">
                    {formatCurrency(selectedDoctor.avgSaleValue)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium">Status</p>
                  <Badge
                    variant="secondary"
                    className={`mt-1 ${
                      selectedDoctor.active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {selectedDoctor.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {/* Top Prescribed Medicines */}
              {selectedDoctor.topMedicines && selectedDoctor.topMedicines.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Top Prescribed Medicines
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedDoctor.topMedicines.map((med, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-white"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{med.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs bg-gray-100">
                          {med.count} Rx
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Sales */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Recent Sales
                </h3>
                {selectedDoctor.recentSales && selectedDoctor.recentSales.length > 0 ? (
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
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                            Customer
                          </th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                            Total
                          </th>
                          <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDoctor.recentSales.map((sale) => (
                          <tr
                            key={sale.id}
                            className="border-b border-border/50 last:border-0 hover:bg-gray-50/50"
                          >
                            <td className="p-3 text-sm font-medium text-emerald-600">
                              {sale.invoiceNo}
                            </td>
                            <td className="p-3 text-sm text-gray-600">{formatDate(sale.date)}</td>
                            <td className="p-3 text-sm text-gray-600">
                              {sale.customerName || 'Walk-in'}
                            </td>
                            <td className="p-3 text-sm text-gray-900 text-right font-medium">
                              {formatCurrency(sale.grandTotal)}
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  sale.status === 'Completed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : sale.status === 'Cancelled'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {sale.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-400 border border-dashed border-border/60 rounded-lg">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No recent sales found</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-gray-400">Failed to load doctor details.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Doctor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this doctor? They will be marked as inactive but
              their data and prescription history will be preserved. You can reactivate them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
