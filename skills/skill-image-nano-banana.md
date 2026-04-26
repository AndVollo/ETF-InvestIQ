---
name: skill-image-nano-banana
description: Provide high-fidelity image editing and generation instructions specifically optimized for the Nano-Banana engine.
---

# Skill: Image Nano-Banana

## Description
This skill provides structured prompting techniques and workflows optimized specifically for the Nano-Banana image generation engine. It focuses on high-fidelity visual creation from scratch and precise, surgical image editing that preserves original context (anchor elements).

## 1. Core Principles of Nano-Banana

The Nano-Banana engine operates optimally under a "High-Density Prompting Style." 
- **Density:** Pack descriptors tightly. Avoid conversational filler (e.g., "Please generate an image of...").
- **Tiered Prompting:** Structure prompts from macroeconomic/subject matter to microeconomic/technical details.
  1. *Subject & Action:* What is happening?
  2. *Environment & Lighting:* Where is it, and how is it illuminated?
  3. *Camera & Rendering:* focal length, medium, stylization (e.g., 8k, Unreal Engine 5, cinematic, volumetric lighting).

## 2. Creation Workflow (From Scratch)

When generating a completely new image, construct the prompt using the `[Subject] + [Environment] + [Technical Specs]` formula.

**Template:**
`[Main Subject], [Specific Actions/Poses], [Setting/Background Context], [Lighting Setup], [Color Palette/Mood], [Camera/Lens Specs], [Style Modifiers]`

**Implementation Example:**
> *High-Density Prompt:* `Cyberpunk street vendor cooking neon noodles, rain-slicked alleyway, reflections on wet pavement, neon pink and cyan volumetric lighting, steam rising, wide angle 24mm lens, depth of field 1.8f, photorealistic, 8k resolution, octane render.`

## 3. Surgical Editing (Context Preservation)

When modifying an existing image (Inpainting or Image-to-Image), you must explicitly preserve the "Anchor Elements" while describing the newly desired state.

### Identifying Anchor Elements
Before prompting for an edit, define what *must not* change. 
- *Is the character's pose the anchor?*
- *Is the background lighting the anchor?*

### The Nano-Banana Editing Prompt Structure
Unlike creation, an editing prompt must reference the existing state positively while injecting the new element smoothly.

**Template for Editing/Inpainting:**
`[Retained Anchor Elements], [New/Modified Element integration], [Matching Technical Specs]`

**Implementation Example (Changing a shirt color while keeping the subject and background):**
> *Original Image:* A man in a blue shirt standing in a sunny park.
> *Surgical Edit Prompt:* `Man standing in sunny park, [WEARING BRIGHT RED FLANNEL SHIRT], sunlight filtering through trees, matching original photorealistic style, 35mm photography, consistent lighting.`

### Constraint: Denoising Strength
When using Image-to-Image in Nano-Banana, control the deviation from the original:
- **Low (0.1 - 0.3):** Minor texture changes or color shifts. Anchors are perfectly preserved.
- **Medium (0.4 - 0.6):** Moderate structural changes (e.g., changing clothing type or adding mid-sized objects).
- **High (0.7 - 0.9):** High deviation. Anchors begin to warp; use only when the pose is the only anchor needed.

## 4. Constraint Management

Nano-Banana struggles with multi-subject composition unless constrained geographically within the prompt.
- **Spatial Anchoring:** Use directional terms attached to subjects (`left foreground: neon sign`, `center focal point: samurai`, `background right: exploding vehicle`).
- **Negative Prompting:** Always employ a baseline negative prompt to prevent artifacting: `(worst quality, low quality:1.4), text, signature, watermark, blurry, mutated, extra limbs`.

## 5. Output Verification
Always verify the output against the original constraints:
1. Did the prompt density yield the correct texture?
2. During edits, did the anchor elements (lighting direction, background geometry) shift unexpectedly? If so, lower the denoising strength and increase the explicit prompt weighting of the anchor elements (e.g., `(original sunny background:1.5)`).
