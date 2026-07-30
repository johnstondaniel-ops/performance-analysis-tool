from PIL import Image, ImageDraw, ImageFilter
import os, subprocess

SIZE = 1024
out_dir = os.path.dirname(os.path.abspath(__file__))

def make_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))

    # ── Background ──────────────────────────────────────────────
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(bg).rounded_rectangle(
        [0, 0, size - 1, size - 1],
        radius=int(size * 0.225),
        fill=(13, 13, 26, 255)
    )
    img = Image.alpha_composite(img, bg)

    cx = size // 2
    src_y = int(size * 0.13)
    spread = int(size * 0.38)
    bot_y = int(size * 0.76)

    def layer(polygon, color, alpha, blur):
        l = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        ImageDraw.Draw(l).polygon(polygon, fill=(*color, alpha))
        return l.filter(ImageFilter.GaussianBlur(blur * size // 1024))

    # Outer glow
    img = Image.alpha_composite(img, layer(
        [(cx, src_y), (cx - spread, bot_y), (cx + spread, bot_y)],
        (232, 197, 71), 40, 55
    ))
    # Mid beam
    img = Image.alpha_composite(img, layer(
        [(cx, src_y), (cx - int(spread * .55), bot_y), (cx + int(spread * .55), bot_y)],
        (232, 197, 71), 75, 28
    ))
    # Core
    img = Image.alpha_composite(img, layer(
        [(cx, src_y), (cx - int(spread * .18), bot_y), (cx + int(spread * .18), bot_y)],
        (255, 245, 180), 110, 12
    ))

    # ── Lamp glow ───────────────────────────────────────────────
    for r, a, blur in [(0.065, 200, 16), (0.035, 255, 6)]:
        lamp = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        lr = int(size * r)
        ImageDraw.Draw(lamp).ellipse(
            [cx - lr, src_y - lr, cx + lr, src_y + lr],
            fill=(255, 252, 210, a)
        )
        img = Image.alpha_composite(img, lamp.filter(ImageFilter.GaussianBlur(blur * size // 1024)))

    # White hot centre
    dot = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    dr = int(size * 0.018)
    ImageDraw.Draw(dot).ellipse([cx - dr, src_y - dr, cx + dr, src_y + dr], fill=(255, 255, 255, 255))
    img = Image.alpha_composite(img, dot)

    # ── Track bars ──────────────────────────────────────────────
    track_colors = [
        (232, 197, 71),   # gold
        (124, 101, 193),  # violet
        (74, 222, 128),   # green
        (244, 114, 182),  # pink
    ]
    tx0, tx1 = int(size * 0.14), int(size * 0.86)
    th = int(size * 0.042)
    gap = int(size * 0.020)
    total_h = len(track_colors) * th + (len(track_colors) - 1) * gap
    ty_start = int(size * 0.89) - total_h

    tracks = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    tdraw = ImageDraw.Draw(tracks)
    for i, (r, g, b) in enumerate(track_colors):
        ty = ty_start + i * (th + gap)
        tdraw.rounded_rectangle(
            [tx0, ty, tx1, ty + th],
            radius=th // 2,
            fill=(r, g, b, 190)
        )
    img = Image.alpha_composite(img, tracks)

    return img


# Generate master
master = make_icon(SIZE)
master.save(os.path.join(out_dir, 'icon_1024.png'))
print('Generated icon_1024.png')

# Build iconset
iconset_dir = os.path.join(out_dir, 'icon.iconset')
os.makedirs(iconset_dir, exist_ok=True)

sizes = [
    ('icon_16x16.png',        16),
    ('icon_16x16@2x.png',     32),
    ('icon_32x32.png',        32),
    ('icon_32x32@2x.png',     64),
    ('icon_128x128.png',     128),
    ('icon_128x128@2x.png',  256),
    ('icon_256x256.png',     256),
    ('icon_256x256@2x.png',  512),
    ('icon_512x512.png',     512),
    ('icon_512x512@2x.png', 1024),
]

for name, px in sizes:
    resized = make_icon(px) if px > 64 else master.resize((px, px), Image.LANCZOS)
    resized.save(os.path.join(iconset_dir, name))
    print(f'  {name}')

# Convert to .icns
icns_path = os.path.join(out_dir, 'icon.icns')
subprocess.run(['iconutil', '-c', 'icns', iconset_dir, '-o', icns_path], check=True)
print(f'Created {icns_path}')
