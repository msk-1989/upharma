import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compare } from 'bcryptjs';

export const dynamic = 'force-dynamic';

// POST /api/auth (general auth)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, pin } = body;

    if (pin) {
      const user = await db.user.findFirst({ where: { pin, active: true } });
      if (user) {
        await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
        return NextResponse.json({ success: true, data: { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email } });
      }
      return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
    }

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }

    const user = await db.user.findFirst({ where: { username } });
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 401 });
    if (!user.active) return NextResponse.json({ success: false, error: 'User is inactive' }, { status: 401 });

    const valid = await compare(password, user.password);
    if (!valid) return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });

    await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    return NextResponse.json({
      success: true,
      data: { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// GET /api/auth/users
export async function GET() {
  try {
    const users = await db.user.findMany({ orderBy: { createdAt: 'asc' } });
    const safeUsers = users.map(({ password, pin, ...u }) => u);
    return NextResponse.json({ success: true, data: safeUsers });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
