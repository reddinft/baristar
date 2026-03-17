import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get('audio');

    if (!audioBlob || !(audioBlob instanceof Blob)) {
      return NextResponse.json({ error: 'Audio blob is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Build form data for Whisper
    const whisperForm = new FormData();
    whisperForm.append('file', audioBlob, 'audio.webm');
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('response_format', 'verbose_json');
    whisperForm.append('timestamp_granularities[]', 'word');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: whisperForm,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      console.error('Whisper API error:', whisperRes.status, errText);
      return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
    }

    const whisperData = await whisperRes.json();

    // Extract fields from verbose_json response
    const transcript: string = whisperData.text?.trim() ?? '';
    const detected_language: string = whisperData.language ?? 'english';
    const language_probability: number = whisperData.language_probability ?? 1.0;
    const avg_logprob: number = whisperData.segments?.[0]?.avg_logprob ?? 0;

    const words: Array<{ word: string; start: number; end: number; probability: number }> =
      (whisperData.words ?? []).map((w: { word: string; start: number; end: number; probability: number }) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        probability: w.probability ?? 1.0,
      }));

    // Derive phonetic hints
    const hints: string[] = [];

    if (avg_logprob < -0.3) {
      hints.push('spoken quickly or unclearly');
    }

    if (words.some((w) => w.probability < 0.7)) {
      hints.push('uncertain transcription — Barry may have misheard');
    }

    if (detected_language.toLowerCase() !== 'english') {
      hints.push('name may have non-English pronunciation');
    }

    // Check if any word was said very quickly (< 0.15s per syllable estimate)
    // Rough syllable count: vowel groups per word
    const countSyllables = (word: string) => {
      const matches = word.toLowerCase().match(/[aeiou]+/g);
      return Math.max(1, matches ? matches.length : 1);
    };

    const fastWord = words.find((w) => {
      const duration = w.end - w.start;
      const syllables = countSyllables(w.word);
      return duration > 0 && duration / syllables < 0.15;
    });

    if (fastWord && !hints.includes('spoken quickly or unclearly')) {
      hints.push('name was said quickly');
    }

    const phonetic_hints =
      hints.length > 0 ? hints.join('; ') : 'clear audio — Barry has no excuse this time';

    return NextResponse.json({
      transcript,
      detected_language,
      language_probability,
      avg_logprob,
      words,
      phonetic_hints,
    });
  } catch (error) {
    console.error('Transcribe route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
