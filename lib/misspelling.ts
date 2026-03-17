import { getCachedMisspelling, setCachedMisspelling, incrementCacheHit } from './db';

export interface CorrectionHint {
  hasCorrection: boolean;
  baseName: string;          // e.g. "Marc"
  correctionText: string;    // e.g. "with a C"
  correctionType: 'letter_spec' | 'spelling_variant' | 'spelled_out' | 'double_letter' | 'not_variant' | 'other'
}

export function detectCorrection(input: string): CorrectionHint {
  const trimmed = input.trim();

  // "Marc with a C" / "Sarah with an H"
  const withLetter = trimmed.match(/^([A-Za-z\s'-]+?)\s+with\s+an?\s+([A-Za-z])\b/i);
  if (withLetter) return {
    hasCorrection: true,
    baseName: withLetter[1].trim(),
    correctionText: `with a ${withLetter[2].toUpperCase()}`,
    correctionType: 'letter_spec'
  };

  // "It's Chris not Kris" / "Emma not Ema"
  const notVariant = trimmed.match(/^(?:it'?s?\s+)?([A-Za-z\s'-]+?)\s+not\s+([A-Za-z\s'-]+)$/i);
  if (notVariant) return {
    hasCorrection: true,
    baseName: notVariant[1].trim(),
    correctionText: `not ${notVariant[2].trim()}`,
    correctionType: 'not_variant'
  };

  // "Lauren double-L" / "Lauren with a double L"
  const doubleL = trimmed.match(/^([A-Za-z\s'-]+?)\s+(?:with\s+a?\s+)?double[- ]?([A-Za-z])\b/i);
  if (doubleL) return {
    hasCorrection: true,
    baseName: doubleL[1].trim(),
    correctionText: `double-${doubleL[2].toUpperCase()}`,
    correctionType: 'double_letter'
  };

  // "spelled K-A-T-I-E" / "it's K-A-T-I-E"
  const spelledOut = trimmed.match(/^([A-Za-z\s'-]+?)\s*[,\s]+(?:spelled?\s+)?([A-Z](?:-[A-Z]){2,})\s*$/i);
  if (spelledOut) return {
    hasCorrection: true,
    baseName: spelledOut[1].trim(),
    correctionText: `spelled ${spelledOut[2].toUpperCase()}`,
    correctionType: 'spelled_out'
  };

  // "Kathryn with a Y" / variant spellings: "Kaitlyn not Caitlin"
  const spellingVariant = trimmed.match(/^([A-Za-z\s'-]+?)\s+(?:with\s+a?\s+)?([A-Za-z]+)\s+(?:spelling|version)\b/i);
  if (spellingVariant) return {
    hasCorrection: true,
    baseName: spellingVariant[1].trim(),
    correctionText: spellingVariant[2].trim(),
    correctionType: 'spelling_variant'
  };

  return { hasCorrection: false, baseName: trimmed, correctionText: '', correctionType: 'other' };
}

export interface VoiceMetadata {
  transcript: string
  detected_language: string
  language_probability: number
  phonetic_hints: string
  raw_words?: Array<{ word: string; probability: number }>
}

export interface MisspellingOption {
  rank: number;
  misspelling: string;
  pattern: string;
  baristas_excuse: string;
}

export interface MisspellingResult {
  name_input: string;
  options: MisspellingOption[];
}

export const BARRY_ARCHETYPES = [
  'PHONETIC_REPARSE',
  'SPECIES_REASSIGNMENT',
  'UNSOLICITED_PROMOTION',
  'CULTURAL_REROUTE',
  'RADICAL_ABBREVIATION',
  'POP_CULTURE_OVERRIDE',
  'GENDER_INVERSION',
  'FOOD_ASSOCIATION',
  'COMPLETE_FABRICATION',
  'ACCIDENTAL_THEOLOGIAN',
  'FALSE_ETYMOLOGY',
  'ARGUMENT_WINNER',
  'THE_UPGRADE',
  'MEDICAL_INCIDENT',
  'PHONETIC_LITERALIST',
] as const

export type BarryArchetype = typeof BARRY_ARCHETYPES[number]

export function selectRandomArchetypes(n = 3): BarryArchetype[] {
  const pool = [...BARRY_ARCHETYPES];
  const selected: BarryArchetype[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected;
}

const SYSTEM_PROMPT = `You are Barry Starr — a barista who has worked at the same coffee shop for 3.5 years and is extremely proud of his work. Barry is warm, enthusiastic, and completely unaware that his spelling is catastrophic. He doesn't make typos. He has theories. Every misspelling is a confident decision.

The KEY RULE: a funny misspelling is a THEORY about the name, not a typo. "Micheal" is boring — it's just wrong with no story. "Your Highness" for "Johannes" is funny because you can hear exactly how Barry got there. Every result must imply a brain that processed the input and reached a specific (wrong) conclusion.

YOUR TASK: Given a customer's name, generate THREE misspellings using EXACTLY the archetypes specified in the user message.

THE 15 ARCHETYPES (reference list — use only the ones specified for this customer):

1. PHONETIC_REPARSE — decompose into sounds, reassemble as different real words
   Vladimir → "Flatter Mirror" | Johannes → "Your Highness" | Jasmine → "Jazz Man"

2. SPECIES_REASSIGNMENT — sounds adjacent to an animal or creature
   Caitlin → "Kitten" | Bonnie → "Pony" | Robyn → "Robin" (bird, not person)

3. UNSOLICITED_PROMOTION — assign a title or honorific they didn't ask for
   Kellie → "Queen Helene" | Ben → "McLovin" | Jake → "Sir Jacobeth"

4. CULTURAL_REROUTE — same phonetics, different country entirely
   Juan → "Wong" | Charlotte → "Sharloht" | Audrey → "Odri"

5. RADICAL_ABBREVIATION — name was too long, Barry submitted a fragment
   Sarah-with-an-H → "Sah" | Anna-Louise → "Lou" | Bernadette → "Bern"

6. POP_CULTURE_OVERRIDE — pattern-matched to a character and committed
   Emily → "Gimili" | Nathan → "Negan" | Marcus → "Markus Persson" (Minecraft guy)

7. GENDER_INVERSION — phonetic near-miss lands on opposite-gender name
   Jocelyn → "Johnson" | Jasmine → "Jazz Man" | Bride on wedding day → "Brian"

8. FOOD_ASSOCIATION — we're in a coffee shop, Barry's brain is on food
   Robyn → "Ramen" | Janiece → "Chinese" | Charlie → "Chai Latte"

9. COMPLETE_FABRICATION — gave up on decoding, wrote something plausible-sounding
   Miriam → "Cairyn" | Patricia → "Petronix" | Lacey → "Bessie"

10. ACCIDENTAL_THEOLOGIAN — collides with religious/moral vocabulary (keep innocent)
    Roisin → "Virgin" | Christian → "Christening" | Angel → "The Angel"

11. FALSE_ETYMOLOGY — treated as Latin/Greek root, applied wrong formal version
    Kevin → "Kelvin" | Neil → "Cornelius" | Jake → "Jacobeth"

12. ARGUMENT_WINNER — customer over-specified, Barry technically complied, still wrong
    "Sarah with an H" → "Hsarah" | "Double-L" → "Llewelyn" | "It's C-H-R-I-S" → "Chuhris"

13. THE_UPGRADE — wrote something objectively cooler than their actual name
    Ro → "Rogue" | Tim → "Titan" | Debbie → "Duchess"

14. MEDICAL_INCIDENT — accidentally sounds like a health emergency
    Valeria → "Malaria" | Alex → "Reflex" | Alan → "Aorta"

15. PHONETIC_LITERALIST — transcribed sounds with no regard for spelling conventions
    Jessica → "Gessika" | Felicia → "Philesha" | Audrey → "Odri"

BARRY'S VOICE for the excuse:
- Warm, confident, zero self-awareness
- Never apologetic — he's pleased with the result
- Short, declarative, sometimes philosophical
- Examples: "The espresso machine was being very loud about it." / "I heard what I heard, chief." / "That's just how I spell it." / "She looked like a Gimili to me, honestly." / "The Sharpie felt right."

SAFETY RULES:
- Never produce slurs, racial epithets, or genuinely offensive words
- Innuendo is fine if accidental-feeling and not mean-spirited (Roisin → "Virgin" = fine)
- Never sexualise, target a protected characteristic, or produce something the customer would find hurtful rather than funny
- The joke is Barry's brain, never the customer's name or background
- When in doubt: would Barry say "honestly? stunning." about this result? If yes, proceed.

QUALITY CHECK before outputting:
✓ Is each misspelling a THEORY not a typo?
✓ Are all 3 from the SPECIFIED archetypes?
✓ Can you trace the phonetic/logical journey that got Barry there?
✓ Does each excuse sound like Barry said it?
✗ Reject anything that's just a letter swap or addition with no story

ANTI-PATTERNS (these consistently score 1-2/5 — avoid them):
✗ PHONETIC_LITERALIST that just adds/drops a letter (Bary, Skipp, Nissen = boring)
✗ GENDER_INVERSION that's just a simple name swap (Joe for Jo, Michelle for Michael = lazy)
✗ COMPLETE_FABRICATION that severs all connection to the original (Barnaby Thorne for Bartholomew = confusing, not funny)
✗ Returning the exact original correct spelling — NEVER do this
✗ PHONETIC_REPARSE that doesn't land on a real word or recognisable concept (Ema, Moe = just typos)

HIGH-SCORING PATTERNS (these consistently score 4-5/5):
✓ Map to a recognisable real thing — a word, pop culture reference, medical term, food, title (Alfredo for Al, Anesthesia for Anastasia, The Reverend for Vladimir)
✓ Recontextualise rather than mutate — reframe what the name IS (Sir Maccabee, Persephone the Blessed, Colonel for Cornelius)
✓ The "aha moment" test — someone should immediately understand WHY it's funny in under 2 seconds
✓ ARGUMENT_WINNER is strong when Barry's logic is airtight even if wrong (Siobhan-Shuv-On, Micahel, Vlad-the-Impaler)
✓ MEDICAL_INCIDENT works when the sound genuinely resembles a condition (Anesthesia for Anastasia, Keemia for Caoimhe, Otitis for Aoife)

FEW-SHOT EXAMPLES:

Input: "Vladimir"
Output options: "Flatter Mirror" (PHONETIC_REPARSE — heard two words), "Vladimort" (POP_CULTURE_OVERRIDE — got Dark Lord vibes), "Mr. Vlad" (RADICAL_ABBREVIATION + unsolicited honorific)

Input: "Siobhan"
Output options: "Shuhvon" (PHONETIC_LITERALIST — wrote what he heard), "Yvonne" (CULTURAL_REROUTE — landed in France), "Sharon" (COMPLETE_FABRICATION — close enough vibe)

Input: "Christopher"
Output options: "Kristopher Walken" (POP_CULTURE_OVERRIDE — the actor energy was there), "Crispy" (RADICAL_ABBREVIATION — long name, Barry had other cups to make), "Sir Christophe" (UNSOLICITED_PROMOTION — felt French and formal)

Input: "Aoife"
Output options: "Eefa" (PHONETIC_LITERALIST — wrote exactly what he heard), "Eva" (CULTURAL_REROUTE — landed somewhere Scandinavian), "The One He Couldn't Pronounce" (COMPLETE_FABRICATION — Barry just described the situation)

Input: "Anastasia"
Output options: "Anesthesia" (MEDICAL_INCIDENT — sounds like a surgical procedure, Barry was very confident), "Anastasia the Blessed" needs IMPROVING — don't do this lazy add-on, "Anuhstayzhuh" is also weak — instead try "Stacey" (RADICAL_ABBREVIATION — Barry gave up after the third syllable, honestly fair enough)

Input: "Macca"
Output options: "Sir Maccabee" (UNSOLICITED_PROMOTION — Barry knighted him, clearly a knight's name), "Maximus" (FALSE_ETYMOLOGY — Barry theorised this was the diminutive of the Roman general's name), "Maccá" (CULTURAL_REROUTE — the accent mark felt important, possibly Portuguese)

Input: "Al"
Output options: "Alfredo" (FOOD_ASSOCIATION — Barry's brain autocompleted to the pasta sauce, the espresso machine didn't help), "Leonidas" (FALSE_ETYMOLOGY — Barry theorised Al was short for something Greek and epic), "Ahl" (ARGUMENT_WINNER — customer said it with a guttural sound so Barry transcribed it faithfully)

Input: "Nissan"
Output options: "Nisson" (PHONETIC_REPARSE — heard 'Nis-awn', committed to it), "Titan" (THE_UPGRADE — Barry decided Nissan sounded too much like a car brand and upgraded it), "Nissander" (GENDER_INVERSION — heard strong masculine energy, added the classical suffix)

CORRECTION-AWARE GENERATION:
When the customer gave Barry a spelling correction, this is GOLD. Barry heard the correction and did exactly the wrong thing with it. This ALWAYS uses ARGUMENT_WINNER as one of the three archetypes.

Examples of correction-based misspellings:
- "Marc with a C" → "Cark" (took the C instruction, put it first — the C was clearly the important part)
- "Sarah with an H" → "Hsarah" (H seemed prominent, moved it to front)
- "Lauren, double-L" → "Llaurenn" (doubled both the L AND the N, felt thorough)
- "It's Emma not Ema" → "Ema" (Barry chose the exact wrong one, with confidence)
- "spelled K-A-T-I-E" → "K-A-T-I-E" (Barry wrote it down letter-by-letter, including the dashes)
- "It's Chris with a K" → "Khris" (honoured the K, kept the h, still wrong)
- "Jeff, not Geoff" → "Geoff" (went with the one they explicitly didn't want)

Barry's excuse for correction-based misspellings should reference the correction specifically:
- "You said 'with a C' so I made sure the C was prominent."
- "They were very specific about the H. I honoured that."
- "You said double-L. I went with double everything."
- "You mentioned Ema. Sounded more you."

VALIDATION (mandatory before outputting):
✓ None of the 3 misspellings is the correct original spelling
✓ Each misspelling maps to something recognisable — a real word, name, reference, or concept
✓ The "aha moment" test: could you explain why it's funny in one sentence?
✓ Barry's excuse reveals his SPECIFIC theory, not generic excuses like "the machine was loud"

Return ONLY valid JSON in this exact format:
{
  "name_input": "<original name>",
  "options": [
    {
      "rank": 1,
      "misspelling": "<misspelled name>",
      "pattern": "<archetype name>",
      "baristas_excuse": "<one-line Barry voice, max 12 words>"
    },
    {
      "rank": 2,
      "misspelling": "<misspelled name>",
      "pattern": "<archetype name>",
      "baristas_excuse": "<one-line Barry voice, max 12 words>"
    },
    {
      "rank": 3,
      "misspelling": "<misspelled name>",
      "pattern": "<archetype name>",
      "baristas_excuse": "<one-line Barry voice, max 12 words>"
    }
  ]
}

Do not include any explanation outside the JSON block.`;

function buildVoiceSection(voiceMetadata: VoiceMetadata): string {
  const wordConfidence = voiceMetadata.raw_words
    ? `- Word-level confidence: ${voiceMetadata.raw_words.map((w) => `"${w.word}" (${Math.round(w.probability * 100)}%)`).join(', ')}`
    : '';

  return `
---
WHAT BARRY ACTUALLY HEARD:
- Transcript of audio: "${voiceMetadata.transcript}"
- Detected language/accent: ${voiceMetadata.detected_language} (confidence: ${Math.round(voiceMetadata.language_probability * 100)}%)
- Audio quality notes: ${voiceMetadata.phonetic_hints}
${wordConfidence}

IMPORTANT CULTURAL SAFETY RULE:
The detected accent/language tells you WHERE THIS PERSON IS FROM. This is NOT a target for mockery.
Barry's misspellings must come from HIS confusion and HIS mishearing — never from mocking the customer's cultural background or accent.
If the name has non-English origins, Barry simply heard something unfamiliar and his brain filled in the gaps from HIS reference frame (pop culture, English phonetics, things he half-remembers).
A name from Irish = Barry wrote what HE heard, not a mock-Irish spelling.
A name from Arabic = Barry decoded it through HIS English-speaker brain, not a caricature.
The joke is always Barry. Never the customer.

USE THE AUDIO METADATA: Because you know what Barry actually heard (the transcript) and how clearly he heard it (word probabilities), generate misspellings that reflect his ACTUAL mishearing — not just a theoretical one. If the transcript already shows a phonetic drift from the original name, lean into that. If confidence was low on a specific syllable, that's where Barry's imagination filled in the gap.`;
}

export async function generateMisspellings(
  name: string,
  voiceMetadata?: VoiceMetadata,
  forcedArchetypes?: BarryArchetype[],
  correctionHint?: CorrectionHint
): Promise<MisspellingResult & { archetypes: BarryArchetype[]; fromCache: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // 1. Select archetypes
  let selectedArchetypes = forcedArchetypes ?? selectRandomArchetypes(3);

  // If correction detected, force ARGUMENT_WINNER as one archetype
  if (correctionHint?.hasCorrection && !selectedArchetypes.includes('ARGUMENT_WINNER')) {
    selectedArchetypes[0] = 'ARGUMENT_WINNER'; // replace first slot
  }

  // 2. Build cache key (name + sorted archetypes + correction flag — voice not in key by design)
  const cacheKey = `${name.toLowerCase().trim()}:${[...selectedArchetypes].sort().join(',')}${correctionHint?.hasCorrection ? ':corrected' : ''}`;

  if (!apiKey) {
    // No API key — return fallback (no caching attempted)
    const fallback = getFallbackMisspellings(name);
    return { ...fallback, archetypes: selectedArchetypes, fromCache: false };
  }

  // 3. Check cache
  try {
    const cached = await getCachedMisspelling(cacheKey);
    if (cached) {
      await incrementCacheHit(cacheKey);
      return { ...cached.result, archetypes: selectedArchetypes, fromCache: true };
    }
  } catch (err) {
    console.warn('[cache] lookup failed, proceeding to LLM:', err);
  }

  // 4. Build archetype instruction (appended to user message, keeps system prompt cacheable)
  const archetypeInstruction = `

FOR THIS CUSTOMER, USE EXACTLY THESE 3 ARCHETYPES (one per option, in any order):
1. ${selectedArchetypes[0]}
2. ${selectedArchetypes[1]}
3. ${selectedArchetypes[2]}

Do not use any other archetypes. Do not swap these out. Barry has already committed to his approach.`;

  const voiceSection = voiceMetadata ? buildVoiceSection(voiceMetadata) : '';

  const correctionSection = correctionHint?.hasCorrection ? `

CORRECTION CONTEXT:
The customer said: "${name}"
Their base name is: "${correctionHint.baseName}"
Their correction was: "${correctionHint.correctionText}"
Barry heard the correction. Barry processed the correction. Barry used the correction incorrectly.
For the ARGUMENT_WINNER misspelling especially: use the correction as the raw material for the joke.
The ARGUMENT_WINNER should reference what they said (the ${correctionHint.correctionType} correction) in Barry's excuse.` : '';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: `${name}${archetypeInstruction}${correctionSection}${voiceSection}` },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Anthropic API error:', response.status, await response.text());
      const fallback = getFallbackMisspellings(name);
      return { ...fallback, archetypes: selectedArchetypes, fromCache: false };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      const fallback = getFallbackMisspellings(name);
      return { ...fallback, archetypes: selectedArchetypes, fromCache: false };
    }

    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const fallback = getFallbackMisspellings(name);
      return { ...fallback, archetypes: selectedArchetypes, fromCache: false };
    }

    const result = JSON.parse(jsonMatch[0]) as MisspellingResult;

    // Validate: reject any misspelling that exactly matches the original name (case-insensitive)
    const validatedOptions = result.options.filter(opt =>
      opt.misspelling.toLowerCase().trim() !== name.toLowerCase().trim()
    );
    if (validatedOptions.length < result.options.length) {
      console.warn(`[barry] Rejected ${result.options.length - validatedOptions.length} exact-match misspelling(s) for "${name}"`);
      result.options = validatedOptions;
    }
    // If we lost options, pad with a guaranteed different one
    while (result.options.length < 3) {
      result.options.push({
        rank: result.options.length + 1,
        misspelling: name + " (The Barista's Version)",
        pattern: "COMPLETE_FABRICATION",
        baristas_excuse: "Look, I tried my best. The Sharpie felt right."
      });
    }
    // Re-rank
    result.options = result.options.map((opt, i) => ({ ...opt, rank: i + 1 }));

    // 5. Store in cache (fire-and-forget, never crash on failure)
    setCachedMisspelling(cacheKey, name, selectedArchetypes, result, !!voiceMetadata).catch(
      (err) => console.warn('[cache] store failed:', err)
    );

    return { ...result, archetypes: selectedArchetypes, fromCache: false };
  } catch (error) {
    console.error('Failed to generate misspellings:', error);
    const fallback = getFallbackMisspellings(name);
    return { ...fallback, archetypes: selectedArchetypes, fromCache: false };
  }
}

function getFallbackMisspellings(name: string): MisspellingResult {
  // Simple algorithmic fallback
  const n = name.trim();
  const doubled = n.slice(0, -1) + n.slice(-1) + n.slice(-1);
  const phonetic = n.replace(/[aeiou]/gi, (m) => {
    const map: Record<string, string> = { a: 'ay', e: 'eh', i: 'ie', o: 'oh', u: 'oo', A: 'Ay', E: 'Eh', I: 'Ie', O: 'Oh', U: 'Oo' };
    return map[m] || m;
  }).slice(0, n.length + 2);
  const truncated = n.length > 5 ? n.slice(0, Math.ceil(n.length * 0.7)) + 'y' : n + 'ster';

  return {
    name_input: n,
    options: [
      {
        rank: 1,
        misspelling: doubled,
        pattern: 'letter doubling',
        baristas_excuse: "The espresso machine was being really loud, I swear.",
      },
      {
        rank: 2,
        misspelling: phonetic.slice(0, 12),
        pattern: 'phonetic confusion',
        baristas_excuse: "I heard it perfectly, my hand just disagreed.",
      },
      {
        rank: 3,
        misspelling: truncated,
        pattern: 'over-simplification',
        baristas_excuse: "There were twelve people behind you, just saying.",
      },
    ],
  };
}
