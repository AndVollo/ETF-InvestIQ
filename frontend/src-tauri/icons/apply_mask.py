import struct
import math

def apply_macos_mask(input_path, output_path):
    with open(input_path, 'rb') as f:
        header = bytearray(f.read(18))
        width = struct.unpack('<H', header[12:14])[0]
        height = struct.unpack('<H', header[14:16])[0]
        pixels = bytearray(f.read())
    
    # macOS standard corner radius for 1024px icon is about 176-180px
    r = 180 
    new_pixels = bytearray()
    
    for y in range(height):
        for x in range(width):
            idx = (y * width + x) * 4
            b, g, r_val, a = pixels[idx:idx+4]
            
            mask = 255
            # Top-left corner
            if x < r and y < r:
                if (x-r)**2 + (y-r)**2 > r**2: mask = 0
            # Top-right corner
            elif x > (width-r) and y < r:
                if (x-(width-r))**2 + (y-r)**2 > r**2: mask = 0
            # Bottom-left corner
            elif x < r and y > (height-r):
                if (x-r)**2 + (y-(height-r))**2 > r**2: mask = 0
            # Bottom-right corner
            elif x > (width-r) and y > (height-r):
                if (x-(width-r))**2 + (y-(height-r))**2 > r**2: mask = 0
                
            new_pixels.extend(struct.pack('BBBB', b, g, r_val, mask))

    header[16] = 32
    header[17] = 8
    with open(output_path, 'wb') as f:
        f.write(header)
        f.write(new_pixels)

if __name__ == "__main__":
    import sys
    apply_macos_mask(sys.argv[1], sys.argv[2])
