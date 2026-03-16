import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { getDb } from '@/lib/db';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

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

    // Save photo locally (dev mode — prod would use R2)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
    const filename = `upload-${Date.now()}-${uuidv4().slice(0, 8)}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    
    const buffer = await photo.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
    
    const realPhotoUrl = `/uploads/${filename}`;

    // Find generated image if sessionId provided
    let generatedImageUrl: string | null = null;
    if (sessionId) {
      const db = getDb();
      const session = db.prepare('SELECT image_url FROM sessions WHERE id = ?').get(sessionId) as { image_url: string } | undefined;
      if (session) {
        generatedImageUrl = session.image_url;
      }
    }

    // Store in DB
    const db = getDb();
    const galleryId = uuidv4();
    
    db.prepare(`
      INSERT INTO gallery (id, original_name, misspelled_name, caption, real_photo_url, generated_image_url, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      galleryId,
      originalName.trim().slice(0, 50),
      misspelledName.trim().slice(0, 50),
      caption?.trim().slice(0, 200) || null,
      realPhotoUrl,
      generatedImageUrl,
      sessionId || null,
    );

    return NextResponse.json({ success: true, galleryId });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Upload failed. Try again?' }, { status: 500 });
  }
}
