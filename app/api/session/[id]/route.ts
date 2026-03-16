import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureSchema } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ensureSchema();
    const db = getDb();

    const result = await db.execute({
      sql: 'SELECT * FROM sessions WHERE id = ?',
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const row = result.rows[0];

    const misspellings = JSON.parse(row.misspellings_json as string);

    return NextResponse.json({
      sessionId: row.id,
      originalName: row.original_name,
      primaryMisspelling: row.primary_misspelling,
      misspellings: misspellings.map((opt: { misspelling: string; baristas_excuse: string; pattern: string; rank: number }) => ({
        name: opt.misspelling,
        excuse: opt.baristas_excuse,
        pattern: opt.pattern,
        rank: opt.rank,
      })),
      imageUrl: row.image_url,
      createdAt: row.created_at,
    });

  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 });
  }
}
