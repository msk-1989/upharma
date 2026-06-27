import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PATCH /api/counters/[id] — Update counter details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.counter.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Counter not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, location, printerName, status } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ success: false, error: 'Counter name cannot be empty' }, { status: 400 });
      }
      // Check name uniqueness if changing
      if (name.trim() !== existing.name) {
        const nameTaken = await db.counter.findFirst({ where: { name: name.trim() } });
        if (nameTaken) {
          return NextResponse.json({ success: false, error: 'A counter with this name already exists' }, { status: 400 });
        }
      }
      updateData.name = name.trim();
    }
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (printerName !== undefined) updateData.printerName = printerName?.trim() || null;
    if (status !== undefined) {
      if (!['Active', 'Inactive'].includes(status)) {
        return NextResponse.json({ success: false, error: 'Status must be Active or Inactive' }, { status: 400 });
      }
      // Cannot deactivate a counter that has an active shift
      if (status === 'Inactive') {
        const activeShift = await db.counterShift.findFirst({
          where: { counterId: id, shiftStatus: 'Open' },
        });
        if (activeShift) {
          return NextResponse.json(
            { success: false, error: 'Cannot deactivate counter with an active shift. Close the shift first.' },
            { status: 400 }
          );
        }
      }
      updateData.status = status;
    }

    const counter = await db.counter.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: counter });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/counters/[id] — Soft delete (set status to Inactive)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.counter.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Counter not found' }, { status: 404 });
    }

    if (existing.status === 'Inactive') {
      return NextResponse.json({ success: false, error: 'Counter is already inactive' }, { status: 400 });
    }

    // Check for active shift
    const activeShift = await db.counterShift.findFirst({
      where: { counterId: id, shiftStatus: 'Open' },
    });
    if (activeShift) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete counter with an active shift. Close the shift first.' },
        { status: 400 }
      );
    }

    const counter = await db.counter.update({
      where: { id },
      data: { status: 'Inactive' },
    });

    return NextResponse.json({ success: true, data: counter });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
