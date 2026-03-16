import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const result = db.prepare(`
      UPDATE gallery SET votes = votes + 1 WHERE id = ? AND approved = 1
    `).run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const row = db.prepare('SELECT votes FROM gallery WHERE id = ?').get(id) as { votes: number };
    return NextResponse.json({ votes: row.votes });
  } catch (error) {
    console.error('Vote API error:', error);
    return NextResponse.json({ error: 'Vote failed' }, { status: 500 });
  }
}
