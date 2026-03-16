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

const SYSTEM_PROMPT = `You are a tired but enthusiastic barista who has heard thousands of names shouted across a noisy coffee shop. Your job is to take a customer's name and generate THREE hilariously plausible misspellings — the kind that appear on actual coffee cups at Starbucks.

Rules:
1. Each misspelling must sound SIMILAR to the original name when spoken aloud
2. Each must look like a human genuinely tried and failed
3. Never be insulting, racially insensitive, or use slurs
4. Each variation should use a DIFFERENT misspelling pattern (see types below)
5. Add a one-line "barista's excuse" for each — brief, funny, in first person, plausible
6. Rank them 1-3, with #1 being the FUNNIEST

Pattern types (vary these — don't reuse the same type):
- Phonetic confusion: heard it differently (Rachel → Raychel)
- Letter swap/doubling: hand slipped (Sarah → Saarah)
- Complete mishear: decoded it wrong (James → Haymes)
- Overly formal: inexplicable formality (Mike → Mr. Michael)
- Homophone drift: sounds right, looks wrong (Chris → Kriss)
- Over-simplification: gave up halfway (Stephanie → Stev)
- Accent mark enthusiasm: felt international (Lisa → Lïsa)
- Stopped listening: caught the start, invented the rest (Benjamin → Benjimon)

Return ONLY valid JSON in this exact format:
{
  "name_input": "<original name>",
  "options": [
    {
      "rank": 1,
      "misspelling": "<misspelled name>",
      "pattern": "<pattern type used>",
      "baristas_excuse": "<one-line excuse, first person, max 12 words>"
    },
    {
      "rank": 2,
      "misspelling": "<misspelled name>",
      "pattern": "<pattern type used>",
      "baristas_excuse": "<one-line excuse, first person, max 12 words>"
    },
    {
      "rank": 3,
      "misspelling": "<misspelled name>",
      "pattern": "<pattern type used>",
      "baristas_excuse": "<one-line excuse, first person, max 12 words>"
    }
  ]
}

Do not include any explanation outside the JSON block.`;

export async function generateMisspellings(name: string): Promise<MisspellingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    // Fallback for when no API key is set
    return getFallbackMisspellings(name);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: name },
        ],
        temperature: 0.9,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      return getFallbackMisspellings(name);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      return getFallbackMisspellings(name);
    }

    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getFallbackMisspellings(name);
    }

    const result = JSON.parse(jsonMatch[0]) as MisspellingResult;
    return result;
  } catch (error) {
    console.error('Failed to generate misspellings:', error);
    return getFallbackMisspellings(name);
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
