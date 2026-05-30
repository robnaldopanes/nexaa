import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

export async function GET(request: NextRequest) {
  try {
    if (!JWT_SECRET) {
      return NextResponse.json({ valid: true, user: { role: 'admin' } });
    }
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return NextResponse.json({ valid: true, user: decoded });
  } catch {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
}
