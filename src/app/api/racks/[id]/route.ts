import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/racks/[id] — Get rack with its batches
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rack = await db.rack.findUnique({
      where: { id },
      include: {
        batches: {
          where: { active: true },
          include: {
            medicine: {
              select: {
                id: true,
                name: true,
                genericName: true,
              },
            },
          },
        },
      },
    });

    if (!rack) {
      return NextResponse.json(
        { success: false, error: 'Rack not found' },
        { status: 404 }
      );
    }

    // Calculate totals
    const totalItems = rack.batches.reduce((sum, b) => sum + b.stockQty, 0);
    const totalBatches = rack.batches.length;

    return NextResponse.json({
      success: true,
      data: {
        ...rack,
        totalItems,
        totalBatches,
      },
    });
  } catch (error) {
    console.error('Rack get error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/racks/[id] — Update rack details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const rack = await db.rack.findUnique({ where: { id } });
    if (!rack) {
      return NextResponse.json(
        { success: false, error: 'Rack not found' },
        { status: 404 }
      );
    }

    const updated = await db.rack.update({
      where: { id },
      data: {
        name: body.name?.trim() ?? rack.name,
        aisle: body.aisle !== undefined ? (body.aisle?.trim() || null) : rack.aisle,
        section: body.section !== undefined ? (body.section?.trim() || null) : rack.section,
        description: body.description !== undefined ? (body.description?.trim() || null) : rack.description,
        active: body.active !== undefined ? body.active : rack.active,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Rack update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update rack' },
      { status: 500 }
    );
  }
}

// DELETE /api/racks/[id] — Delete rack (only if no batches assigned)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rack = await db.rack.findUnique({
      where: { id },
      include: { _count: { select: { batches: true } } },
    });

    if (!rack) {
      return NextResponse.json(
        { success: false, error: 'Rack not found' },
        { status: 404 }
      );
    }

    if (rack._count.batches > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete rack with assigned batches. Unassign all batches first.' },
        { status: 400 }
      );
    }

    await db.rack.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Rack deleted successfully' });
  } catch (error) {
    console.error('Rack delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete rack' },
      { status: 500 }
    );
  }
}
