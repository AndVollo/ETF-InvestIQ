import struct
import os

def remove_white_background(input_path, output_path):
    with open(input_path, 'rb') as f:
        header = bytearray(f.read(18))
        width = struct.unpack('<H', header[12:14])[0]
        height = struct.unpack('<H', header[14:16])[0]
        pixel_depth = header[16]
        
        pixels = bytearray(f.read())
    
    bytes_per_pixel = pixel_depth // 8
    new_pixels = bytearray()
    
    for i in range(0, len(pixels), bytes_per_pixel):
        chunk = pixels[i:i+bytes_per_pixel]
        if len(chunk) < 3: break
        
        b, g, r = chunk[0], chunk[1], chunk[2]
        
        # If the pixel is white/near-white, make it transparent
        # Otherwise, keep it opaque
        if r > 240 and g > 240 and b > 240:
            new_pixels.extend(struct.pack('BBBB', b, g, r, 0))
        else:
            new_pixels.extend(struct.pack('BBBB', b, g, r, 255))
    
    # Update header for 32-bit (BGRA) output
    header[16] = 32 # 32 bits per pixel
    header[17] = 8  # 8 bits of alpha
    
    with open(output_path, 'wb') as f:
        f.write(header)
        f.write(new_pixels)

if __name__ == "__main__":
    import sys
    remove_white_background(sys.argv[1], sys.argv[2])
