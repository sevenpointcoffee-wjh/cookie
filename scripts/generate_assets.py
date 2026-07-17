from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets"


@dataclass
class Sprite:
    name: str
    image: Image.Image
    box: tuple[int, int, int, int] | None = None


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
        alpha,
    )


def radial_disc(size: int, inner: str, outer: str, squash: float = 1.0) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = img.load()
    c1 = rgba(inner)
    c2 = rgba(outer)
    cx = cy = size / 2
    radius = size * 0.48
    for y in range(size):
        for x in range(size):
            dx = (x - cx) / radius
            dy = ((y - cy) / radius) / squash
            d = math.sqrt(dx * dx + dy * dy)
            if d <= 1:
                t = min(1, d)
                light = max(0, 1 - math.sqrt((x - size * 0.34) ** 2 + (y - size * 0.26) ** 2) / (size * 0.82))
                shade = max(0, 1 - math.sqrt((x - size * 0.72) ** 2 + (y - size * 0.76) ** 2) / (size * 0.85))
                rr = int(c1[0] * (1 - t) + c2[0] * t + 38 * light - 16 * shade)
                gg = int(c1[1] * (1 - t) + c2[1] * t + 26 * light - 12 * shade)
                bb = int(c1[2] * (1 - t) + c2[2] * t + 12 * light - 8 * shade)
                aa = int(255 * min(1, (1 - d) * 16))
                px[x, y] = (max(0, min(255, rr)), max(0, min(255, gg)), max(0, min(255, bb)), aa)
    return img


def drop_shadow(sprite: Image.Image, radius: int = 18, offset: tuple[int, int] = (0, 18), alpha: int = 120) -> Image.Image:
    w, h = sprite.size
    out = Image.new("RGBA", (w + radius * 4, h + radius * 4), (0, 0, 0, 0))
    mask = sprite.split()[-1]
    shadow = Image.new("RGBA", sprite.size, (23, 10, 7, alpha))
    shadow.putalpha(mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius))
    out.alpha_composite(shadow, (radius * 2 + offset[0], radius * 2 + offset[1]))
    out.alpha_composite(sprite, (radius * 2, radius * 2))
    return out


def trim_alpha(img: Image.Image, padding: int = 8) -> Image.Image:
    alpha = img.split()[-1]
    box = alpha.getbbox()
    if not box:
        return img
    x1, y1, x2, y2 = box
    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(img.width, x2 + padding)
    y2 = min(img.height, y2 + padding)
    return img.crop((x1, y1, x2, y2))


def draw_cookie(size: int = 680, gold: bool = False) -> Image.Image:
    random.seed(72 if not gold else 91)
    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if gold:
        disc = radial_disc(size, "#ffd45b", "#b46b1f")
    else:
        disc = radial_disc(size, "#e7a046", "#8c431d")
    base.alpha_composite(disc)
    d = ImageDraw.Draw(base, "RGBA")
    rim_color = (255, 231, 153, 90) if gold else (255, 204, 118, 70)
    d.ellipse((size * 0.08, size * 0.08, size * 0.92, size * 0.92), outline=rim_color, width=max(5, size // 70))
    d.arc((size * 0.13, size * 0.13, size * 0.87, size * 0.87), 205, 340, fill=(61, 20, 9, 90), width=max(8, size // 45))
    chip_positions = [
        (0.27, 0.31, 0.055),
        (0.57, 0.27, 0.043),
        (0.72, 0.43, 0.062),
        (0.38, 0.59, 0.064),
        (0.61, 0.70, 0.055),
        (0.44, 0.46, 0.069),
        (0.75, 0.65, 0.042),
        (0.29, 0.73, 0.042),
        (0.20, 0.53, 0.048),
        (0.52, 0.83, 0.052),
    ]
    for x, y, r in chip_positions:
        rx = int(size * r)
        cx = int(size * x)
        cy = int(size * y)
        d.ellipse((cx - rx, cy - rx, cx + rx, cy + rx), fill=(67, 29, 14, 230))
        d.ellipse((cx - rx * 0.55, cy - rx * 0.70, cx - rx * 0.05, cy - rx * 0.20), fill=(123, 64, 28, 110))
        d.ellipse((cx - rx, cy - rx, cx + rx, cy + rx), outline=(31, 13, 8, 120), width=max(2, size // 170))
    for _ in range(26):
        x = random.randint(int(size * 0.18), int(size * 0.82))
        y = random.randint(int(size * 0.16), int(size * 0.84))
        if math.dist((x, y), (size / 2, size / 2)) < size * 0.37:
            length = random.randint(size // 26, size // 11)
            angle = random.random() * math.pi
            x2 = x + int(math.cos(angle) * length)
            y2 = y + int(math.sin(angle) * length)
            d.line((x, y, x2, y2), fill=(88, 42, 19, 82), width=max(2, size // 180))
            d.line((x + 1, y - 1, x2 + 1, y2 - 1), fill=(255, 210, 129, 38), width=1)
    if gold:
        glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow, "RGBA")
        for i in range(9):
            a = 28 - i * 2
            pad = int(size * (0.035 + i * 0.015))
            gd.ellipse((pad, pad, size - pad, size - pad), outline=(255, 232, 117, a), width=8)
        base = Image.alpha_composite(glow, base)
        d = ImageDraw.Draw(base, "RGBA")
        for i in range(14):
            ang = i * math.tau / 14
            r1 = size * 0.47
            r2 = size * 0.54
            cx = size / 2 + math.cos(ang) * r1
            cy = size / 2 + math.sin(ang) * r1
            ex = size / 2 + math.cos(ang) * r2
            ey = size / 2 + math.sin(ang) * r2
            d.line((cx, cy, ex, ey), fill=(255, 230, 93, 130), width=max(3, size // 130))
    return drop_shadow(trim_alpha(base, 0), 28 if size > 400 else 14, (0, 22 if size > 400 else 10), 105)


def icon_canvas(size: int = 220) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    for i in range(14):
        pad = i * 4
        d.rounded_rectangle((pad, pad, size - pad, size - pad), radius=42, fill=(38, 24, 30, max(0, 88 - i * 5)))
    d.rounded_rectangle((18, 18, size - 18, size - 18), radius=42, fill=(255, 231, 177, 235), outline=(143, 90, 42, 150), width=4)
    d.rounded_rectangle((28, 28, size - 28, size - 28), radius=34, fill=(55, 33, 42, 255))
    return img, d


def draw_icon(kind: str, size: int = 220) -> Image.Image:
    img, d = icon_canvas(size)
    cx = cy = size // 2
    if kind == "cursor":
        d.rounded_rectangle((82, 52, 130, 154), radius=17, fill=(229, 218, 194, 255), outline=(119, 91, 80, 230), width=4)
        d.rounded_rectangle((63, 103, 156, 174), radius=24, fill=(235, 226, 202, 255), outline=(119, 91, 80, 230), width=4)
        for x in (82, 101, 120):
            d.rounded_rectangle((x, 40, x + 20, 112), radius=10, fill=(247, 238, 216, 255), outline=(119, 91, 80, 180), width=3)
        d.ellipse((109, 112, 140, 143), fill=(201, 151, 82, 160))
    elif kind == "witch":
        d.ellipse((70, 72, 150, 156), fill=(244, 196, 135, 255), outline=(108, 57, 43, 230), width=5)
        d.polygon([(48, 78), (172, 78), (116, 25)], fill=(68, 47, 91, 255), outline=(26, 18, 35, 255))
        d.rounded_rectangle((47, 74, 173, 94), radius=10, fill=(31, 24, 38, 255))
        d.arc((84, 103, 110, 127), 0, 180, fill=(86, 46, 34, 255), width=3)
        d.arc((113, 103, 139, 127), 0, 180, fill=(86, 46, 34, 255), width=3)
        d.arc((88, 118, 132, 145), 10, 170, fill=(129, 54, 53, 255), width=4)
        d.ellipse((47, 95, 76, 139), fill=(216, 180, 101, 230))
        d.ellipse((144, 95, 173, 139), fill=(216, 180, 101, 230))
    elif kind == "oven":
        d.rounded_rectangle((50, 55, 170, 170), radius=24, fill=(106, 55, 43, 255), outline=(230, 160, 79, 220), width=5)
        d.rounded_rectangle((68, 82, 152, 155), radius=18, fill=(36, 26, 29, 255), outline=(235, 180, 105, 190), width=4)
        for i, color in enumerate([(250, 207, 91, 240), (236, 99, 55, 220), (255, 149, 54, 210)]):
            d.pieslice((82 + i * 8, 92 - i * 2, 138 - i * 5, 158), 200, 340, fill=color)
        d.ellipse((67, 62, 84, 79), fill=(247, 200, 112, 255))
        d.ellipse((136, 62, 153, 79), fill=(247, 200, 112, 255))
    elif kind == "alchemy":
        d.ellipse((58, 123, 162, 178), fill=(91, 201, 183, 220), outline=(42, 105, 116, 255), width=5)
        d.rectangle((77, 55, 143, 129), fill=(67, 54, 89, 255))
        d.rounded_rectangle((67, 45, 153, 70), radius=12, fill=(128, 107, 163, 255), outline=(39, 31, 58, 220), width=4)
        d.ellipse((79, 111, 141, 156), fill=(80, 232, 199, 220))
        for x, y, r in [(64, 63, 8), (154, 95, 6), (118, 32, 5), (144, 39, 4)]:
            d.ellipse((x - r, y - r, x + r, y + r), fill=(154, 248, 223, 190))
    elif kind == "portal":
        for i in range(9):
            pad = 30 + i * 5
            d.ellipse((pad, pad, size - pad, size - pad), outline=(128, 72, 255, 190 - i * 15), width=7)
        d.ellipse((74, 74, 146, 146), fill=(25, 14, 48, 255))
        d.arc((60, 50, 166, 162), 210, 580, fill=(244, 180, 255, 230), width=8)
    elif kind == "guild":
        d.polygon([(110, 35), (158, 70), (140, 162), (80, 162), (62, 70)], fill=(192, 129, 63, 255), outline=(66, 38, 34, 255))
        d.polygon([(110, 49), (143, 76), (130, 151), (90, 151), (77, 76)], fill=(247, 213, 133, 255))
        d.rectangle((101, 102, 119, 151), fill=(75, 43, 39, 255))
        d.line((78, 78, 143, 78), fill=(74, 43, 37, 200), width=5)
    elif kind == "multiplier":
        d.ellipse((58, 58, 162, 162), fill=(218, 91, 52, 255), outline=(255, 212, 118, 230), width=8)
        d.line((78, 78, 142, 142), fill=(255, 234, 186, 255), width=11)
        d.line((142, 78, 78, 142), fill=(255, 234, 186, 255), width=11)
        d.ellipse((66, 64, 91, 89), fill=(255, 234, 186, 255))
        d.ellipse((129, 130, 154, 155), fill=(255, 234, 186, 255))
    elif kind == "clock":
        d.ellipse((52, 52, 168, 168), fill=(224, 219, 190, 255), outline=(89, 69, 66, 255), width=7)
        d.line((110, 110, 110, 70), fill=(69, 47, 48, 255), width=8)
        d.line((110, 110, 145, 126), fill=(69, 47, 48, 255), width=7)
        d.ellipse((99, 99, 121, 121), fill=(211, 91, 58, 255))
    elif kind == "ember":
        d.polygon([(110, 35), (145, 103), (128, 174), (82, 174), (66, 104)], fill=(234, 77, 52, 255), outline=(70, 34, 37, 230))
        d.polygon([(108, 75), (133, 118), (117, 162), (91, 162), (84, 116)], fill=(255, 205, 89, 245))
    elif kind == "prism":
        d.polygon([(110, 38), (158, 99), (128, 174), (77, 174), (60, 98)], fill=(87, 226, 214, 220), outline=(231, 249, 242, 230))
        d.polygon([(110, 38), (158, 99), (108, 113)], fill=(196, 124, 255, 190))
        d.polygon([(60, 98), (108, 113), (77, 174)], fill=(255, 213, 113, 170))
    else:
        d.ellipse((65, 65, 155, 155), fill=(255, 202, 93, 255))
    return trim_alpha(img, 10)


def draw_background() -> Image.Image:
    w, h = 1280, 720
    img = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    d = ImageDraw.Draw(img, "RGBA")
    for y in range(h):
        t = y / h
        r = int(22 + 28 * t)
        g = int(18 + 14 * t)
        b = int(31 + 18 * t)
        d.line((0, y, w, y), fill=(r, g, b, 255))
    d.ellipse((865, 65, 1032, 232), fill=(245, 214, 138, 210))
    d.ellipse((825, 42, 980, 200), fill=(42, 32, 50, 255))
    for x in range(60, w, 145):
        y = 110 + int(math.sin(x * 0.02) * 20)
        d.ellipse((x, y, x + 3, y + 3), fill=(255, 222, 153, 130))
    for shelf_y in (430, 522, 608):
        d.rounded_rectangle((48, shelf_y, w - 48, shelf_y + 22), radius=8, fill=(95, 52, 42, 180))
        d.rectangle((48, shelf_y + 18, w - 48, shelf_y + 25), fill=(38, 24, 25, 160))
    rng = random.Random(12)
    for i in range(34):
        x = rng.randint(75, w - 140)
        y = rng.choice([382, 474, 560])
        color = rng.choice([(138, 85, 68, 210), (196, 118, 68, 210), (72, 54, 79, 210), (212, 171, 91, 210)])
        d.rounded_rectangle((x, y, x + rng.randint(24, 48), y + rng.randint(38, 78)), radius=8, fill=color, outline=(255, 221, 154, 45))
    for i in range(7):
        x = 215 + i * 135
        d.line((x, 0, x + 18, 260), fill=(244, 164, 84, 34), width=4)
        d.ellipse((x - 16, 250, x + 36, 302), fill=(243, 156, 76, 58))
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay, "RGBA")
    od.rectangle((0, 0, w, h), outline=(255, 206, 126, 46), width=8)
    for i in range(24):
        od.rectangle((i * 60, 0, i * 60 + 2, h), fill=(255, 242, 190, 8))
    img = Image.alpha_composite(img, overlay.filter(ImageFilter.GaussianBlur(0.5)))
    return img.convert("RGB")


def draw_particles() -> Image.Image:
    img = Image.new("RGBA", (360, 140), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    rng = random.Random(18)
    for i in range(24):
        x = rng.randint(12, 340)
        y = rng.randint(16, 122)
        r = rng.randint(4, 12)
        if i % 4 == 0:
            d.polygon([(x, y - r), (x + r, y), (x, y + r), (x - r, y)], fill=(255, 222, 130, 210))
        else:
            d.ellipse((x - r, y - r, x + r, y + r), fill=rng.choice([(179, 91, 38, 220), (236, 156, 74, 230), (99, 45, 22, 220)]))
    return trim_alpha(img, 4)


def make_sprites() -> list[Sprite]:
    return [
        Sprite("cookie-main", draw_cookie(680, False)),
        Sprite("cookie-gold", draw_cookie(300, True)),
        Sprite("background-atelier", draw_background().convert("RGBA")),
        Sprite("crumbs", draw_particles()),
        Sprite("icon-cursor", draw_icon("cursor")),
        Sprite("icon-witch", draw_icon("witch")),
        Sprite("icon-oven", draw_icon("oven")),
        Sprite("icon-alchemy", draw_icon("alchemy")),
        Sprite("icon-portal", draw_icon("portal")),
        Sprite("icon-guild", draw_icon("guild")),
        Sprite("upgrade-multiplier", draw_icon("multiplier")),
        Sprite("upgrade-clock", draw_icon("clock")),
        Sprite("upgrade-ember", draw_icon("ember")),
        Sprite("upgrade-prism", draw_icon("prism")),
    ]


def build_atlas(sprites: list[Sprite]) -> Image.Image:
    atlas = Image.new("RGBA", (2048, 2048), (18, 15, 24, 255))
    d = ImageDraw.Draw(atlas, "RGBA")
    for y in range(2048):
        t = y / 2048
        d.line((0, y, 2048, y), fill=(int(25 + 40 * t), int(19 + 16 * t), int(32 + 12 * t), 255))
    cells = {
        "cookie-main": (44, 72, 760, 788),
        "cookie-gold": (836, 102, 1206, 472),
        "background-atelier": (44, 900, 1324, 1620),
        "crumbs": (1358, 950, 1768, 1130),
        "icon-cursor": (1330, 92, 1586, 348),
        "icon-witch": (1630, 92, 1886, 348),
        "icon-oven": (1330, 396, 1586, 652),
        "icon-alchemy": (1630, 396, 1886, 652),
        "icon-portal": (1330, 700, 1586, 956),
        "icon-guild": (1630, 700, 1886, 956),
        "upgrade-multiplier": (1390, 1196, 1618, 1424),
        "upgrade-clock": (1662, 1196, 1890, 1424),
        "upgrade-ember": (1390, 1484, 1618, 1712),
        "upgrade-prism": (1662, 1484, 1890, 1712),
    }
    for sprite in sprites:
        x1, y1, x2, y2 = cells[sprite.name]
        w, h = x2 - x1, y2 - y1
        plate = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        pd = ImageDraw.Draw(plate, "RGBA")
        pd.rounded_rectangle((0, 0, w - 1, h - 1), radius=28, fill=(255, 229, 169, 18), outline=(255, 221, 133, 80), width=2)
        fitted = sprite.image.copy()
        fitted.thumbnail((w - 32, h - 32), Image.Resampling.LANCZOS)
        px = (w - fitted.width) // 2
        py = (h - fitted.height) // 2
        plate.alpha_composite(fitted, (px, py))
        atlas.alpha_composite(plate, (x1, y1))
        sprite.box = (x1, y1, x2, y2)
    d.rectangle((0, 0, 2048, 56), fill=(18, 15, 24, 245))
    d.text((32, 18), "Cookie Atelier Deluxe - generated atlas and cutout source", fill=(255, 226, 166, 230))
    return atlas


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    sprites = make_sprites()
    atlas = build_atlas(sprites)
    atlas_path = ASSET_DIR / "atelier-atlas.png"
    atlas.save(atlas_path)
    manifest = {}
    for sprite in sprites:
        out = ASSET_DIR / f"{sprite.name}.png"
        sprite.image.save(out)
        manifest[sprite.name] = {
            "file": out.name,
            "atlas": atlas_path.name,
            "atlasBox": sprite.box,
            "size": sprite.image.size,
        }
    (ASSET_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"generated {len(sprites)} sprites")
    print(atlas_path)


if __name__ == "__main__":
    main()
