import { NextRequest, NextResponse } from 'next/server';
import { parseBody, verifyUploadSchema } from '@/lib/schemas';
import { allow } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // 5 intentos por minuto e IP, para frenar la fuerza bruta
    if (!(await allow(request, 'verify-upload', 5))) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 });
    }

    const correctPassword = process.env.UPLOAD_PASSWORD;
    
    if (!correctPassword) {
      return NextResponse.json(
        { error: 'No se ha configurado una clave de acceso' },
        { status: 500 }
      );
    }
    
    const parsed = await parseBody(request, verifyUploadSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    if (parsed.data.password !== correctPassword) {
      return NextResponse.json(
        { error: 'Clave incorrecta' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}
