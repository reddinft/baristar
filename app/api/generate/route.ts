import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateMisspellings } from '@/lib/misspelling';
import { generateCupImage } from '@/lib/image-gen';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const trimmedName = name.trim().slice(0, 50); // max 50 chars
    
    if (trimmedName.length < 1) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    // Step 1: Generate misspellings via GPT-4o-mini
    const misspellingResult = await generateMisspellings(trimmedName);
    const primaryMisspelling = misspellingResult.options[0];

    // Step 2: Generate cup image via fal.ai FLUX.1 [schnell]
    const imageResult = await generateCupImage(primaryMisspelling.misspelling);

    // Step 3: Store in SQLite
    const sessionId = uuidv4();
    const db = getDb();
    
    db.prepare(`
      INSERT INTO sessions (id, original_name, primary_misspelling, misspellings_json, image_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      sessionId,
      trimmedName,
      primaryMisspelling.misspelling,
      JSON.stringify(misspellingResult.options),
      imageResult.imageUrl,
    );

    return NextResponse.json({
      sessionId,
      misspellings: misspellingResult.options.map(opt => ({
        name: opt.misspelling,
        excuse: opt.baristas_excuse,
        pattern: opt.pattern,
        rank: opt.rank,
      })),
      imageUrl: imageResult.imageUrl,
      primaryMisspelling: primaryMisspelling.misspelling,
      originalName: trimmedName,
    });

  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate your coffee name. Try again?' },
      { status: 500 }
    );
  }
}
