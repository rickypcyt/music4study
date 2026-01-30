import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    const correctPassword = process.env.UPLOAD_PASSWORD;
    
    if (!correctPassword) {
      return NextResponse.json(
        { error: 'No se ha configurado una clave de acceso' },
        { status: 500 }
      );
    }
    
    if (password !== correctPassword) {
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
