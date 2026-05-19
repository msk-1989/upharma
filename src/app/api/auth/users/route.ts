import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/auth/users - List all users with their assigned counter
export async function GET() {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
        defaultCounterId: true,
        defaultCounter: { select: { id: true, name: true } },
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Users list error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/auth/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, name, email, password, role, defaultCounterId } = body;

    if (!username || !username.trim()) {
      return NextResponse.json({ success: false, error: 'Username is required' }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (!password || !password.trim()) {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
    }

    // Check if username already exists
    const existing = await db.user.findFirst({ where: { username: username.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Username already exists' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['Admin', 'Manager', 'Cashier', 'Pharmacist'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ success: false, error: `Role must be one of: ${validRoles.join(', ')}` }, { status: 400 });
    }

    // Validate counter if provided
    if (defaultCounterId) {
      const counter = await db.counter.findUnique({ where: { id: defaultCounterId } });
      if (!counter) {
        return NextResponse.json({ success: false, error: 'Selected counter not found' }, { status: 400 });
      }
    }

    const user = await db.user.create({
      data: {
        username: username.trim().toLowerCase(),
        name: name.trim(),
        email: email?.trim() || null,
        password: password.trim(), // Note: in production, this should be hashed
        role: role || 'Cashier',
        defaultCounterId: defaultCounterId || null,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
        defaultCounterId: true,
        defaultCounter: { select: { id: true, name: true } },
        lastLogin: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
