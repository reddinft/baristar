import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const rows = db.prepare(`
      SELECT 
        id, original_name, misspelled_name, caption,
        real_photo_url, generated_image_url, session_id,
        votes, created_at
      FROM gallery
      WHERE approved = 1
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = (db.prepare('SELECT COUNT(*) as count FROM gallery WHERE approved = 1').get() as { count: number }).count;

    return NextResponse.json({
      items: rows,
      total,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Gallery API error:', error);
    return NextResponse.json({ error: 'Failed to load gallery' }, { status: 500 });
  }
}
