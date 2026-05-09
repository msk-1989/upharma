import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/doctors/[id] — Get doctor with sale summary
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const doctor = await db.doctor.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sales: true,
            prescriptions: true,
          },
        },
      },
    });

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // Aggregate sales data
    const salesAgg = await db.sale.aggregate({
      where: {
        doctorId: id,
        status: 'Completed',
      },
      _sum: { grandTotal: true },
      _count: true,
    });

    // This month's prescriptions
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthPrescriptions = await db.prescription.count({
      where: {
        doctorId: id,
        date: { gte: monthStart },
      },
    });

    // Recent sales (last 10)
    const recentSales = await db.sale.findMany({
      where: { doctorId: id },
      orderBy: { date: 'desc' },
      take: 10,
      select: {
        id: true,
        invoiceNo: true,
        date: true,
        grandTotal: true,
        customerName: true,
        status: true,
      },
    });

    // Top prescribed medicines (via prescriptions → items)
    const prescriptionItems = await db.prescriptionItem.findMany({
      where: {
        prescription: { doctorId: id },
      },
      include: {
        medicine: {
          select: { id: true, name: true },
        },
      },
    });

    // Count occurrences of each medicine
    const medicineCounts = new Map<string, { name: string; count: number }>();
    for (const item of prescriptionItems) {
      const existing = medicineCounts.get(item.medicineId);
      if (existing) {
        existing.count++;
      } else {
        medicineCounts.set(item.medicineId, {
          name: item.medicine.name,
          count: 1,
        });
      }
    }
    const topMedicines = Array.from(medicineCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalSalesCount = salesAgg._count || 0;
    const totalSalesValue = salesAgg._sum.grandTotal || 0;
    const avgSaleValue = totalSalesCount > 0 ? totalSalesValue / totalSalesCount : 0;

    return NextResponse.json({
      success: true,
      data: {
        ...doctor,
        totalSalesCount,
        totalSalesValue,
        avgSaleValue,
        thisMonthPrescriptions,
        recentSales,
        topMedicines,
      },
    });
  } catch (error) {
    console.error('Doctor get error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/doctors/[id] — Update doctor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const doctor = await db.doctor.findUnique({ where: { id } });
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }

    const updated = await db.doctor.update({
      where: { id },
      data: {
        name: body.name?.trim() ?? doctor.name,
        qualification: body.qualification !== undefined ? (body.qualification?.trim() || null) : doctor.qualification,
        specialty: body.specialty !== undefined ? (body.specialty?.trim() || null) : doctor.specialty,
        phone: body.phone !== undefined ? (body.phone?.trim() || null) : doctor.phone,
        email: body.email !== undefined ? (body.email?.trim() || null) : doctor.email,
        address: body.address !== undefined ? (body.address?.trim() || null) : doctor.address,
        registrationNo: body.registrationNo !== undefined ? (body.registrationNo?.trim() || null) : doctor.registrationNo,
        active: body.active !== undefined ? body.active : doctor.active,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Doctor update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update doctor' },
      { status: 500 }
    );
  }
}

// DELETE /api/doctors/[id] — Soft delete (set active=false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const doctor = await db.doctor.findUnique({ where: { id } });
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }

    await db.doctor.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ success: true, message: 'Doctor deactivated successfully' });
  } catch (error) {
    console.error('Doctor delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate doctor' },
      { status: 500 }
    );
  }
}
