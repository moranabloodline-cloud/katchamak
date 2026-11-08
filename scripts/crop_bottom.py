"""Crop the bottom strip of the original Kachamak screenshot for close inspection."""
from PIL import Image
import os

SRC = "/home/z/my-project/upload/pasted_image_1794173055590.png"
OUT = "/home/z/my-project/scripts/crops"
os.makedirs(OUT, exist_ok=True)

img = Image.open(SRC)
w, h = img.size
print("size:", w, h)

# bottom strip regions (x1, y1, x2, y2)
regions = {
    "bottom_left": (0, int(h * 0.93), int(w * 0.28), h),      # info + Split Write Grid List
    "bottom_center": (int(w * 0.27), int(h * 0.93), int(w * 0.73), h),  # timer + words
    "bottom_right": (int(w * 0.70), int(h * 0.93), w, h),     # No Label / First Draft / dot
}
for name, box in regions.items():
    crop = img.crop(box)
    crop = crop.resize((crop.width * 3, crop.height * 3), Image.LANCZOS)  # zoom 3x
    path = f"{OUT}/{name}.png"
    crop.save(path)
    print("saved", path, crop.size)
