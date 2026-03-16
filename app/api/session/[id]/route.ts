import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as {
      id: string;
      original_name: string;
      primary_misspelling: string;
      misspellings_json: string;
      image_url: string | null;
      created_at: number;
    } | undefined;
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const misspellings = JSON.parse(session.misspellings_json);

    return NextResponse.json({
      sessionId: session.id,
      originalName: session.original_name,
      primaryMisspelling: session.primary_misspelling,
      misspellings: misspellings.map((opt: { misspelling: string; baristas_excuse: string; pattern: string; rank: number }) => ({
        name: opt.misspelling,
        excuse: opt.baristas_excuse,
        pattern: opt.pattern,
        rank: opt.rank,
      })),
      imageUrl: session.image_url,
      createdAt: session.created_at,
    });

  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 });
  }
}
