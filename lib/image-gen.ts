// Photorealistic cup prompt (from CREATIVE-BRIEF.md — EXACT variant A)
// Note: We do NOT include the misspelled name in the prompt — it's overlaid via CSS
const CUP_IMAGE_PROMPT = `A close-up photograph of a single paper coffee cup, the kind used at chain coffee shops like Starbucks. The cup has a brown cardboard sleeve around it. The sleeve is blank — no writing on it. The cup has a plastic lid with a small drink-through opening. Gentle wisps of steam rise from the lid. The background is softly blurred warm coffee shop interior — wooden surfaces, warm amber lighting. The cup sits on a wooden counter. Shallow depth of field. Shot with a 50mm lens. The sleeve is the main focus — empty and ready for writing. Photorealistic, high quality, warm tones.

Do not include: text on the sleeve, logos, barcodes, QR codes, multiple cups, people's hands (unless very slightly in frame holding cup), decorative patterns on the sleeve.`;

export interface ImageGenResult {
  imageUrl: string;
}

export async function generateCupImage(misspelledName: string): Promise<ImageGenResult> {
  const falKey = process.env.FAL_KEY;

  if (!falKey) {
    console.log('FAL_KEY not set — using placeholder image');
    return getPlaceholderImage();
  }

  try {
    // fal.ai REST API call for FLUX.1 [schnell]
    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: CUP_IMAGE_PROMPT,
        image_size: 'square_hd',
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('fal.ai API error:', response.status, errText);
      return getPlaceholderImage();
    }

    const data = await response.json();
    const imageUrl = data.images?.[0]?.url;

    if (!imageUrl) {
      console.error('No image URL in fal.ai response:', data);
      return getPlaceholderImage();
    }

    // Return the remote URL directly — no local storage
    return { imageUrl };

  } catch (error) {
    console.error('Image generation failed:', error);
    return getPlaceholderImage();
  }
}

function getPlaceholderImage(): ImageGenResult {
  return {
    imageUrl: '/placeholder-cup.svg',
  };
}
