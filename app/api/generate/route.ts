import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateMisspellings, VoiceMetadata, detectCorrection } from '@/lib/misspelling';
import { generateCupImage } from '@/lib/image-gen';
import { getDb, ensureSchema } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, voiceMetadata } = body as { name: string; voiceMetadata?: VoiceMetadata };

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const trimmedName = name.trim().slice(0, 50); // max 50 chars

    if (trimmedName.length < 1) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    // Detect correction hints (e.g. "Marc with a C", "Sarah with an H")
    const correctionHint = detectCorrection(trimmedName);
    // Use base name for storage if correction detected (store "Marc" not "Marc with a C")
    const nameForStorage = correctionHint.hasCorrection ? correctionHint.baseName : trimmedName;

    // Step 1: Generate misspellings via GPT-4o-mini (with optional voice context)
    const misspellingResult = await generateMisspellings(trimmedName, voiceMetadata, undefined, correctionHint);
    const primaryMisspelling = misspellingResult.options[0];

    // Step 2: Generate cup image via fal.ai FLUX.1 [schnell]
    const imageResult = await generateCupImage(primaryMisspelling.misspelling);

    // Step 3: Store in Turso
    const sessionId = uuidv4();
    await ensureSchema();
    const db = getDb();

    await db.execute({
      sql: `INSERT INTO sessions (id, original_name, primary_misspelling, misspellings_json, image_url)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        sessionId,
        nameForStorage,
        primaryMisspelling.misspelling,
        JSON.stringify(misspellingResult.options),
        imageResult.imageUrl,
      ],
    });

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
      originalName: nameForStorage,
      correctionUsed: correctionHint.hasCorrection ? correctionHint.correctionText : null,
      archetypes: misspellingResult.archetypes,
      fromCache: misspellingResult.fromCache,
    });

  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate your coffee name. Try again?' },
      { status: 500 }
    );
  }
}
