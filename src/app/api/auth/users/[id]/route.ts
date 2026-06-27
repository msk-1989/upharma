import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PATCH /api/auth/users/[id] - Update user (role, active, defaultCounterId, password reset)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, email, role, active, defaultCounterId, password } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ success: false, error: 'Name cannot be empty' }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) updateData.email = email?.trim() || null;

    if (role !== undefined) {
      const validRoles = ['Admin', 'Manager', 'Cashier', 'Pharmacist'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ success: false, error: `Role must be one of: ${validRoles.join(', ')}` }, { status: 400 });
      }
      // Prevent last admin from being demoted
      if (role !== 'Admin' && existing.role === 'Admin') {
        const adminCount = await db.user.count({ where: { role: 'Admin', active: true } });
        if (adminCount <= 1) {
          return NextResponse.json(
            { success: false, error: 'Cannot change role of the last active admin' },
            { status: 400 }
          );
        }
      }
      updateData.role = role;
    }

    if (active !== undefined) {
      // Prevent last admin from being deactivated
      if (!active && existing.role === 'Admin') {
        const adminCount = await db.user.count({ where: { role: 'Admin', active: true } });
        if (adminCount <= 1) {
          return NextResponse.json(
            { success: false, error: 'Cannot deactivate the last active admin' },
            { status: 400 }
          );
        }
      }
      updateData.active = active;
    }

    if (defaultCounterId !== undefined) {
      if (defaultCounterId) {
        const counter = await db.counter.findUnique({ where: { id: defaultCounterId } });
        if (!counter) {
          return NextResponse.json({ success: false, error: 'Selected counter not found' }, { status: 400 });
        }
      }
      updateData.defaultCounterId = defaultCounterId || null;
    }

    if (password !== undefined) {
      if (!password.trim()) {
        return NextResponse.json({ success: false, error: 'Password cannot be empty' }, { status: 400 });
      }
      updateData.password = password.trim();
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ success: true, data: user });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
