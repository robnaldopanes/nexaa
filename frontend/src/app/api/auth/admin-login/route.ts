import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!JWT_SECRET || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 });
    }

    const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    return NextResponse.json({ token, email });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
