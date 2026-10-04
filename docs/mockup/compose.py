"""Lays single-phone shots from .shots/ side by side into docs/img/."""
from PIL import Image

GROUPS = {"evening": ["vote", "locked", "khata"], "morning": ["delivery", "sunita", "why"], "receipt": ["receipt"]}
for name, shots in GROUPS.items():
    ims = [Image.open(f".shots/{s}.png").convert("RGB") for s in shots]
    # each shot has 56 css px (112 device px) of padding on both sides; overlap it
    pad = 0
    w = sum(i.width for i in ims) - pad * (len(ims) - 1)
    out = Image.new("RGB", (w, ims[0].height), ims[0].getpixel((2, 2)))
    x = 0
    for i in ims:
        out.paste(i, (x, 0))
        x += i.width - pad
    out.save(f"../img/{name}.png", optimize=True)
    print(f"docs/img/{name}.png", out.size)
