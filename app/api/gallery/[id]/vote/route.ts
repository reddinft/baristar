import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureSchema } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ensureSchema();
    const db = getDb();

    const updateResult = await db.execute({
      sql: 'UPDATE gallery SET votes = votes + 1 WHERE id = ? AND approved = 1',
      args: [id],
    });

    if (updateResult.rowsAffected === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rowResult = await db.execute({
      sql: 'SELECT votes FROM gallery WHERE id = ?',
      args: [id],
    });

    const votes = rowResult.rows[0]?.votes as number;
    return NextResponse.json({ votes });

  } catch (error) {
    console.error('Vote API error:', error);
    return NextResponse.json({ error: 'Vote failed' }, { status: 500 });
  }
}
