import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureSchema } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await ensureSchema();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const rowsResult = await db.execute({
      sql: `SELECT 
        id, original_name, misspelled_name, caption,
        real_photo_url, generated_image_url, session_id,
        votes, created_at
      FROM gallery
      WHERE approved = 1
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
      args: [limit, offset],
    });

    const countResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM gallery WHERE approved = 1',
      args: [],
    });

    const total = countResult.rows[0].count as number;

    return NextResponse.json({
      items: rowsResult.rows,
      total,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Gallery API error:', error);
    return NextResponse.json({ error: 'Failed to load gallery' }, { status: 500 });
  }
}
