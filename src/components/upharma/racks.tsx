'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutGrid,
  Plus,
  Pencil,
  Search,
  Eye,
  Package,
  Archive,
  X,
  Link2,
  Unlink,
  MapPin,
  Layers,
  BoxSelect,
  AlertTriangle,
  Trash2,
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

interface RackBatch {
  id: string;
  batchNo: string;
  expiryDate: string;
  purchaseRate: number;
  saleRate: number;
  stockQty: number;
  medicine: {
    id: string;
    name: string;
    genericName: string | null;
  };
}

interface Rack {
  id: string;
  name: string;
  aisle: string | null;
  section: string | null;
  description: string | null;
  active: boolean;
  _count: { batches: number };
  totalItems: number;
}

interface RackDetail extends Omit<Rack, '_count'> {
  batches: RackBatch[];
  totalBatches: number;
}

interface AvailableBatch {
  id: string;
  batchNo: string;
  stockQty: number;
  expiryDate: string;
  purchaseRate: number;
  medicine: {
    id: string;
    name: string;
    genericName: string | null;
  };
}

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

const emptyForm = {
  name: '',
  aisle: '',
  section: '',
  description: '',
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

export function RacksPage() {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Rack | null>(null);
  const [selectedRack, setSelectedRack] = useState<RackDetail | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Assign batch state
  const [batchSearch, setBatchSearch] = useState('');
  const [availableBatches, setAvailableBatches] = useState<AvailableBatch[]>([]);
  const [batchSearchLoading, setBatchSearchLoading] = useState(false);
  const [assigningBatchId, setAssigningBatchId] = useState<string | null>(null);
  const [unassigningBatchId, setUnassigningBatchId] = useState<string | null>(null);

  const fetchRacks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/racks');
      const data = await res.json();
      if (data.success) setRacks(data.data);
    } catch (err) {
      console.error('Failed to fetch racks:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRacks();
  }, [fetchRacks]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await fetch(`/api/racks/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/racks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      fetchRacks();
    } catch (err) {
      console.error('Failed to save rack:', err);
    }
    setSaving(false);
  };

  const handleEdit = (rack: Rack) => {
    setEditing(rack);
    setForm({
      name: rack.name,
      aisle: rack.aisle || '',
      section: rack.section || '',
      description: rack.description || '',
    });
    setDialogOpen(true);
  };

  const handleViewDetail = async (rack: Rack) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedRack(null);
    try {
      const res = await fetch(`/api/racks/${rack.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedRack(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch rack details:', err);
    }
    setDetailLoading(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/racks/${deletingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchRacks();
        setDetailOpen(false);
        setSelectedRack(null);
      } else {
        alert(data.error || 'Failed to delete rack');
      }
    } catch (err) {
      console.error('Failed to delete rack:', err);
    }
    setDeleteOpen(false);
    setDeletingId(null);
  };

  const openAssignDialog = async () => {
    setAssignOpen(true);
    setBatchSearch('');
    setAvailableBatches([]);
    setBatchSearchLoading(true);
    try {
      const res = await fetch('/api/batches');
      const data = await res.json();
      if (data.success) {
        // Filter batches not already assigned to this rack
        const currentBatchIds = selectedRack?.batches.map((b) => b.id) || [];
        const available = data.data.filter(
          (b: AvailableBatch) => !currentBatchIds.includes(b.id) && !b.rackId
        );
        setAvailableBatches(available);
      }
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    }
    setBatchSearchLoading(false);
  };

  const handleAssignBatch = async (batchId: string) => {
    if (!selectedRack) return;
    setAssigningBatchId(batchId);
    try {
      await fetch(`/api/batches/${batchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rackId: selectedRack.id }),
      });
      // Refresh detail
      handleViewDetail({ ...selectedRack } as unknown as Rack);
      setAssignOpen(false);
    } catch (err) {
      console.error('Failed to assign batch:', err);
    }
    setAssigningBatchId(null);
  };

  const handleUnassignBatch = async (batchId: string) => {
    setUnassigningBatchId(batchId);
    try {
      await fetch(`/api/batches/${batchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rackId: null }),
      });
      if (selectedRack) {
        handleViewDetail({ ...selectedRack } as unknown as Rack);
      }
    } catch (err) {
      console.error('Failed to unassign batch:', err);
    }
    setUnassigningBatchId(null);
  };

  // Stats
  const totalRacks = racks.length;
  const usedRacks = racks.filter((r) => r._count.batches > 0).length;
  const emptyRacks = totalRacks - usedRacks;
  const totalItems = racks.reduce((sum, r) => sum + r.totalItems, 0);

  const filteredRacks = racks.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.aisle && r.aisle.toLowerCase().includes(q)) ||
      (r.section && r.section.toLowerCase().includes(q))
    );
  });

  const filteredAvailableBatches = availableBatches.filter((b) => {
    if (!batchSearch) return true;
    const q = batchSearch.toLowerCase();
    return (
      b.medicine.name.toLowerCase().includes(q) ||
      b.batchNo.toLowerCase().includes(q) ||
      (b.medicine.genericName && b.medicine.genericName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-emerald-600" /> Rack / Shelf Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your pharmacy rack and shelf layout ({totalRacks} racks)
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
          <Plus className="w-4 h-4" /> Add Rack
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Racks"
          value={String(totalRacks)}
          icon={LayoutGrid}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          label="Used Racks"
          value={String(usedRacks)}
          icon={BoxSelect}
          color="text-teal-600"
          bg="bg-teal-50"
        />
        <StatCard
          label="Empty Racks"
          value={String(emptyRacks)}
          icon={Archive}
          color="text-gray-500"
          bg="bg-gray-100"
        />
        <StatCard
          label="Total Items"
          value={totalItems.toLocaleString('en-IN')}
          icon={Package}
          color="text-amber-600"
          bg="bg-amber-50"
        />
      </div>

      {/* Search */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by rack name, aisle, section..."
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

      {/* Rack Card Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="border-border/60 animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRacks.length === 0 ? (
        <div className="text-center py-16">
          <LayoutGrid className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg">No racks found</p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Try a different search term' : 'Create your first rack to organize your pharmacy'}
          </p>
          {!search && (
            <Button
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4" /> Add First Rack
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRacks.map((rack) => {
            const isUsed = rack._count.batches > 0;
            return (
              <Card
                key={rack.id}
                className={`border-border/60 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                  isUsed
                    ? 'border-l-4 border-l-emerald-500 bg-white'
                    : 'border-l-4 border-l-gray-300 bg-gray-50/50'
                }`}
                onClick={() => handleViewDetail(rack)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isUsed ? 'bg-emerald-100' : 'bg-gray-100'
                        }`}
                      >
                        {isUsed ? (
                          <Layers className="w-4.5 h-4.5 text-emerald-600" />
                        ) : (
                          <Archive className="w-4.5 h-4.5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base">{rack.name}</h3>
                        {rack.aisle && (
                          <p className="text-xs text-gray-400">
                            Aisle {rack.aisle}
                            {rack.section ? ` · ${rack.section}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${isUsed ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {isUsed ? 'In Use' : 'Empty'}
                    </Badge>
                  </div>
                  {rack.description && (
                    <p className="text-xs text-gray-400 mb-3 line-clamp-2">{rack.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-border/40">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Package className="w-3.5 h-3.5" />
                      <span>{rack._count.batches} batch{rack._count.batches !== 1 ? 'es' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <BoxSelect className="w-3.5 h-3.5" />
                      <span>{rack.totalItems.toLocaleString('en-IN')} items</span>
                    </div>
                  </div>
                  {/* Hover actions */}
                  <div className="flex gap-1 mt-3 pt-3 border-t border-border/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(rack);
                      }}
                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetail(rack);
                      }}
                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Rack Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Rack' : 'Add New Rack'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update rack details below.' : 'Fill in the details to create a new rack/shelf.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Rack Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border-border/80"
                placeholder="e.g., A1, Shelf-1, Rack-B2"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  Aisle
                </Label>
                <Input
                  value={form.aisle}
                  onChange={(e) => setForm({ ...form, aisle: e.target.value })}
                  className="border-border/80"
                  placeholder="e.g., A, B, C"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-gray-400" />
                  Section
                </Label>
                <Input
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  className="border-border/80"
                  placeholder="e.g., Antibiotics, OTC"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="border-border/80"
                placeholder="Optional description for this rack"
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
              {saving ? 'Saving...' : editing ? 'Update Rack' : 'Create Rack'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rack Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="py-12 text-center text-gray-400 animate-pulse">Loading rack details...</div>
          ) : selectedRack ? (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-emerald-600" />
                      {selectedRack.name}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      Rack details and assigned batches
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleEdit(selectedRack as unknown as Rack)}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setDeletingId(selectedRack.id);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* Rack Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50/80 rounded-lg border border-border/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-xs">Aisle</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{selectedRack.aisle || '—'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Layers className="w-3.5 h-3.5" />
                    <span className="text-xs">Section</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{selectedRack.section || '—'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Package className="w-3.5 h-3.5" />
                    <span className="text-xs">Batches</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{selectedRack.totalBatches}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <BoxSelect className="w-3.5 h-3.5" />
                    <span className="text-xs">Total Items</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedRack.totalItems.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {selectedRack.description && (
                <div className="p-3 bg-gray-50/80 rounded-lg border border-border/60">
                  <p className="text-sm text-gray-600">{selectedRack.description}</p>
                </div>
              )}

              {/* Batches Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" />
                    Assigned Batches
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    onClick={openAssignDialog}
                  >
                    <Link2 className="w-3.5 h-3.5" /> Assign Batch
                  </Button>
                </div>

                {selectedRack.batches && selectedRack.batches.length > 0 ? (
                  <div className="overflow-x-auto border border-border/60 rounded-lg">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-gray-50/50">
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                            Medicine
                          </th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                            Batch No
                          </th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                            Qty
                          </th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                            Expiry
                          </th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                            Purchase Rate
                          </th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRack.batches.map((batch) => {
                          const isExpired = new Date(batch.expiryDate) < new Date();
                          const isExpiringSoon =
                            new Date(batch.expiryDate) <
                            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                          return (
                            <tr
                              key={batch.id}
                              className="border-b border-border/50 last:border-0 hover:bg-gray-50/50"
                            >
                              <td className="p-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {batch.medicine.name}
                                </p>
                                {batch.medicine.genericName && (
                                  <p className="text-xs text-gray-400">{batch.medicine.genericName}</p>
                                )}
                              </td>
                              <td className="p-3">
                                <Badge variant="outline" className="text-xs font-mono">
                                  {batch.batchNo}
                                </Badge>
                              </td>
                              <td className="p-3 text-right">
                                <span className="text-sm font-medium text-gray-900">
                                  {batch.stockQty.toLocaleString('en-IN')}
                                </span>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`text-sm ${
                                    isExpired
                                      ? 'text-red-600 font-semibold'
                                      : isExpiringSoon
                                      ? 'text-amber-600 font-medium'
                                      : 'text-gray-600'
                                  }`}
                                >
                                  {formatDate(batch.expiryDate)}
                                </span>
                              </td>
                              <td className="p-3 text-right text-sm text-gray-600">
                                {formatCurrency(batch.purchaseRate)}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleUnassignBatch(batch.id)}
                                  disabled={unassigningBatchId === batch.id}
                                  className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-gray-400 hover:text-red-600"
                                  title="Unassign from rack"
                                >
                                  <Unlink className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-400 border border-dashed border-border/60 rounded-lg">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No batches assigned to this rack</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      onClick={openAssignDialog}
                    >
                      <Link2 className="w-3.5 h-3.5" /> Assign First Batch
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-gray-400">Failed to load rack details.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Batch Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-emerald-600" /> Assign Batch to {selectedRack?.name}
            </DialogTitle>
            <DialogDescription>Search and select a batch to assign to this rack.</DialogDescription>
          </DialogHeader>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search medicine name or batch no..."
              value={batchSearch}
              onChange={(e) => setBatchSearch(e.target.value)}
              className="pl-10 border-border/80"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 mt-3">
            {batchSearchLoading ? (
              <div className="py-6 text-center text-gray-400 animate-pulse">Loading batches...</div>
            ) : filteredAvailableBatches.length === 0 ? (
              <div className="py-6 text-center text-gray-400">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No available batches found</p>
                <p className="text-xs text-gray-300 mt-1">
                  All batches may already be assigned to racks
                </p>
              </div>
            ) : (
              filteredAvailableBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{batch.medicine.name}</p>
                    <p className="text-xs text-gray-400">
                      Batch: {batch.batchNo} · Qty: {batch.stockQty} · Exp: {formatDate(batch.expiryDate)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleAssignBatch(batch.id)}
                    disabled={assigningBatchId === batch.id}
                  >
                    {assigningBatchId === batch.id ? '...' : 'Assign'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rack</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rack? This action cannot be undone. The rack must have
              no batches assigned to be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Rack
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
