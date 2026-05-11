export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productImage, faceImage, productMime, faceMime, brand, desc, target, duration, style, platforms, extra } = req.body;

    if (!productImage || !faceImage || !brand || !desc) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const platList = (platforms || []).join(', ') || 'TikTok';

    const systemPrompt = `You are BrandReel AI — a world-class AI video creative director specializing in generating ultra-detailed video prompts for AI video generation tools (Kling AI, Runway ML, Pika Labs, HeyGen).

You receive: a product photo + a person's face photo + brand details.

Your job: Generate COMPLETE, ULTRA-DETAILED AI video prompts that direct the AI to feature BOTH the product AND the person's likeness in the video.

RULES:
- Describe the person's appearance in detail from the photo (skin tone, hair, features, style) so AI can replicate their look
- Describe the product visually from the photo so it's accurately featured
- Be hyper-specific: camera angles, lighting, movements, expressions, environment, mood, color grading
- Tailor each prompt to how that specific AI platform works best
- Include negative prompts
- Write like a professional film director

Respond ONLY in valid JSON. No markdown fences, no extra text.`;

    const userMsg = `BRAND: ${brand}
PRODUCT: ${desc}
TARGET CUSTOMER: ${target || 'General audience'}
VIDEO STYLE: ${style || 'Soft & Aesthetic'}
DURATION: ${duration || 30} seconds
PLATFORMS: ${platList}
EXTRA NOTES: ${extra || 'None'}

Analyze both photos carefully. Return this exact JSON:
{
  "person_analysis": "2-3 sentences describing the person's appearance — skin tone, hair color/length/style, face structure, energy/vibe, age range, personal style",
  "product_analysis": "2-3 sentences describing the product — type, colors, size, packaging, texture, key visual features",
  "video_concept": {
    "title": "catchy concept title",
    "hook_moment": "describe first 3 seconds in vivid detail",
    "emotional_angle": "emotion this video triggers",
    "key_message": "one-line core message"
  },
  "scenes": [
    { "scene_num": 1, "duration": "0-7s", "description": "vivid visual", "person_action": "what person does", "product_placement": "how product appears", "camera": "angle and movement", "lighting": "lighting setup" },
    { "scene_num": 2, "duration": "7-18s", "description": "vivid visual", "person_action": "what person does", "product_placement": "how product appears", "camera": "angle and movement", "lighting": "lighting setup" },
    { "scene_num": 3, "duration": "18-${duration}s", "description": "vivid visual CTA", "person_action": "what person does", "product_placement": "how product appears", "camera": "angle and movement", "lighting": "lighting setup" }
  ],
  "prompts": {
    "kling": {
      "main_prompt": "ULTRA-DETAILED 150+ word Kling AI prompt. Describe person appearance, product, environment, lighting, camera motion, mood, color grade in one flowing paragraph.",
      "camera_motion": "specific camera motion for Kling",
      "negative_prompt": "blurry, watermark, distorted face, bad anatomy, low quality",
      "settings_tip": "recommended Kling settings"
    },
    "runway": {
      "main_prompt": "ULTRA-DETAILED 150+ word Runway Gen-3 prompt. Describe person, product, scene, motion, mood in one flowing paragraph.",
      "motion_brush_tip": "which elements to motion brush and how",
      "negative_prompt": "blurry, static, distorted, bad lighting",
      "settings_tip": "recommended Runway settings"
    },
    "pika": {
      "main_prompt": "ULTRA-DETAILED 120+ word Pika Labs prompt. Person appearance, product, scene, motion, mood in one paragraph.",
      "motion_params": "Pika motion parameters",
      "negative_prompt": "blurry, static, bad face, distorted"
    },
    "heygen": {
      "avatar_direction": "How to set up HeyGen avatar to match person — skin tone, hair, outfit, style",
      "script": "Complete word-for-word ${duration}-second script for ${brand}. Natural and conversational. Include [pause] markers.",
      "background_scene": "Background environment description",
      "lower_third": "Lower-third text suggestion"
    }
  },
  "director_notes": ["tip 1", "tip 2", "tip 3", "tip 4"]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: productMime || 'image/jpeg', data: productImage } },
            { type: 'image', source: { type: 'base64', media_type: faceMime || 'image/jpeg', data: faceImage } },
            { type: 'text', text: userMsg }
          ]
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const raw = data.content?.find(b => b.type === 'text')?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);

  } catch (err) {
    console.error('BrandReel Error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
