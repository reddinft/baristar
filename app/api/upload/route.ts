import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { getDb, ensureSchema } from '@/lib/db';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
const BUCKET = 'baristar-uploads';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  }
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const photo = formData.get('photo') as File | null;
    const originalName = formData.get('originalName') as string | null;
    const misspelledName = formData.get('misspelledName') as string | null;
    const caption = formData.get('caption') as string | null;
    const sessionId = formData.get('sessionId') as string | null;

    // Validation
    if (!photo) {
      return NextResponse.json({ error: 'Photo is required' }, { status: 400 });
    }
    if (!originalName || !misspelledName) {
      return NextResponse.json({ error: 'Name fields are required' }, { status: 400 });
    }
    if (photo.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Photo must be under 5MB' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(photo.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or HEIC photos allowed' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const supabase = getSupabase();
    const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
    const filename = `upload-${Date.now()}-${uuidv4().slice(0, 8)}.${ext}`;

    const buffer = await photo.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, Buffer.from(buffer), {
        contentType: photo.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: 'Photo upload failed' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    const realPhotoUrl = publicUrl;

    // Find generated image if sessionId provided
    let generatedImageUrl: string | null = null;
    if (sessionId) {
      await ensureSchema();
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT image_url FROM sessions WHERE id = ?',
        args: [sessionId],
      });
      if (result.rows.length > 0) {
        generatedImageUrl = result.rows[0].image_url as string | null;
      }
    }

    // Store in DB
    await ensureSchema();
    const db = getDb();
    const galleryId = uuidv4();

    await db.execute({
      sql: `INSERT INTO gallery (id, original_name, misspelled_name, caption, real_photo_url, generated_image_url, session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        galleryId,
        originalName.trim().slice(0, 50),
        misspelledName.trim().slice(0, 50),
        caption?.trim().slice(0, 200) || null,
        realPhotoUrl,
        generatedImageUrl,
        sessionId || null,
      ],
    });

    return NextResponse.json({ success: true, galleryId });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Upload failed. Try again?' }, { status: 500 });
  }
}
