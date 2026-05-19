import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/doctors — List/search doctors
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { specialty: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { registrationNo: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const doctors = await db.doctor.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            sales: true,
            prescriptions: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: doctors });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/doctors — Create doctor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Doctor name is required' },
        { status: 400 }
      );
    }

    const doctor = await db.doctor.create({
      data: {
        name: body.name.trim(),
        qualification: body.qualification?.trim() || null,
        specialty: body.specialty?.trim() || null,
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        address: body.address?.trim() || null,
        registrationNo: body.registrationNo?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: doctor }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
