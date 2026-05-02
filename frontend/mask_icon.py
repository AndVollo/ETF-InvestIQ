from PIL import Image, ImageDraw

def create_squircle_mask(size, border_radius):
    # Create an alpha mask with the given size and border radius
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    
    # Draw a white rounded rectangle on the black mask
    draw.rounded_rectangle(
        [(0, 0), (size[0] - 1, size[1] - 1)],
        radius=border_radius,
        fill=255
    )
    return mask

def main():
    input_path = "/Users/andreyvolovich/.gemini/antigravity/brain/6a6bc641-7515-4d51-8a29-680394df0019/ultra_simple_solid_iq_1777708137658.png"
    output_path = "./src-tauri/assets/source-icon.png"
    
    # Open the image and ensure it's RGBA
    img = Image.open(input_path).convert("RGBA")
    
    # The generated image already has some rounded corners drawn on a white/black background.
    # To be safe, let's crop it slightly to remove any artifacts, then apply our own perfect mask.
    width, height = img.size
    
    # Standard iOS/macOS squircle radius is about 22.5% of the width
    radius = int(width * 0.225)
    
    mask = create_squircle_mask((width, height), radius)
    
    # Apply the mask to the alpha channel
    img.putalpha(mask)
    
    # Save the result as a PNG with transparency
    img.save(output_path, format="PNG")
    print(f"Successfully saved masked icon to {output_path}")

if __name__ == "__main__":
    main()
