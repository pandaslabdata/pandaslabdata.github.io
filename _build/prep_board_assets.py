"""Prepare the investigation-room assets for the site (light WebP) and MEASURE where things are.

    python _build/prep_board_assets.py

Sources: Motore Vox/assets (SITE-A pack + Library pieces). Output: assets/board/*.webp + _build/board_geometry.json
"""
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

BUILD = Path(__file__).resolve().parent
SITE = BUILD.parent
ENG = SITE.parent / "Motore Vox" / "assets"
OUT = SITE / "assets" / "board"
OUT.mkdir(parents=True, exist_ok=True)

SRC = {
    "room_16x9": ENG / "site/raw/SITE_HERO_16x9_PLATE.png",
    "room_9x16": ENG / "site/raw/SITE_HERO_9x16_PLATE.png",
    "desk": ENG / "site/parts/desk/piece_00.png",
    "felt": ENG / "site/raw/SITE_PLATE_FELT_TILE.png",
    "drawers": ENG / "site/raw/SITE_PHOTO_DRAWERS.png",
    "folder": ENG / "site/parts/kit/piece_00.png",
    "folder_open": ENG / "site/parts/kit/piece_01.png",
    "polaroid": ENG / "site/parts/kit/piece_02.png",
    "card": ENG / "site/parts/kit/piece_03.png",
    "label": ENG / "site/parts/kit/piece_04.png",
    "holder": ENG / "site/parts/kit/piece_05.png",
    "tape1": ENG / "ep_asteroid/parts/desk/piece_00.png",
    "tape2": ENG / "ep_asteroid/parts/desk/piece_04.png",
    "tape3": ENG / "ep_asteroid/parts/desk/piece_09.png",
    "paper1": ENG / "ep_asteroid/parts/desk/piece_01.png",
    "paper2": ENG / "ep_asteroid/parts/desk/piece_07.png",
    "clip": ENG / "ep_asteroid/parts/desk/piece_14.png",
    "pin1": ENG / "ep_asteroid/parts/desk/piece_18.png",
    "pin2": ENG / "ep_asteroid/parts/desk/piece_21.png",
    "postit": ENG / "ep_asteroid/parts/desk/piece_24.png",
    "logo": ENG / "brand/logo/piece_00.png",
    "st_observed": ENG / "case_067/parts/kit/piece_01.png",
    "st_estimate": ENG / "case_067/parts/kit/piece_02.png",
    "st_hypothesis": ENG / "case_067/parts/kit/piece_03.png",
    "st_scenario": ENG / "case_067/parts/kit/piece_04.png",
    "st_simulation": ENG / "case_067/parts/kit/piece_05.png",
    "st_whatif": ENG / "ep_asteroid/parts/labels/piece_03.png",
    "clip068": ENG / "case_068/parts/clips/piece_00.png",
    "scrap_q": ENG / "case_068/parts/scraps_lib/piece_12.png",
}
MAXW = {"room_16x9": 1600, "room_9x16": 900, "desk": 1600, "felt": 512, "drawers": 1200, "logo": 520,
        "folder": 520, "folder_open": 900, "polaroid": 420, "card": 520, "label": 520, "holder": 300,
        "clip068": 620, "scrap_q": 260, "postit": 260, "paper1": 420, "paper2": 420}
DEFAULT_W = 240


def save(name, im):
    w = MAXW.get(name, DEFAULT_W)
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    q = 72 if name.startswith("room") or name in ("drawers", "felt") else 80
    p = OUT / f"{name}.webp"
    im.save(p, "WEBP", quality=q, method=6)
    return im.size, p.stat().st_size


def bbox_frac(mask, W, H):
    ys, xs = np.where(mask)
    return [round(xs.min() / W, 4), round(ys.min() / H, 4), round((xs.max() + 1) / W, 4), round((ys.max() + 1) / H, 4)]


def cork_box(path):
    """inner cork area: warm orange pixels, largest component, eroded so pins stay inside the frame"""
    a = np.asarray(Image.open(path).convert("RGB"))
    hsv = cv2.cvtColor(a, cv2.COLOR_RGB2HSV)
    m = ((hsv[..., 0] >= 5) & (hsv[..., 0] <= 25) & (hsv[..., 1] > 90) & (hsv[..., 2] > 60)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    x, y, w, h = st[i, :4]
    H, W = m.shape
    return [round(x / W, 4), round(y / H, 4), round((x + w) / W, 4), round((y + h) / H, 4)]


def polaroid_window(path):
    a = np.asarray(Image.open(path).convert("RGBA")).astype(np.int16)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    grayish = (abs(r - g) < 14) & (abs(g - b) < 14) & (r < 175) & (al > 200)
    m = cv2.morphologyEx(grayish.astype(np.uint8), cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    x, y, w, h = st[i, :4]
    H, W = m.shape
    return [round(x / W, 4), round(y / H, 4), round((x + w) / W, 4), round((y + h) / H, 4)]


def drawer_labels(path):
    """the four blank cream cards inside the brass label holders"""
    a = np.asarray(Image.open(path).convert("RGB"))
    hsv = cv2.cvtColor(a, cv2.COLOR_RGB2HSV)
    m = ((hsv[..., 1] < 90) & (hsv[..., 2] > 150)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    H, W = m.shape
    cands = []
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if area > W * H * 0.003 and 1.8 < w / max(h, 1) < 6 and w < W * 0.25:
            cands.append((area, [round(x / W, 4), round(y / H, 4), round((x + w) / W, 4), round((y + h) / H, 4)]))
    cands = [c[1] for c in sorted(cands, reverse=True)[:4]]
    cands.sort(key=lambda b: (round(b[1] * 4), b[0]))   # top row first, then left to right
    return cands


def main():
    geo, report = {}, []
    for name, src in SRC.items():
        im = Image.open(src)
        im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
        size, kb = save(name, im)
        geo.setdefault("sizes", {})[name] = list(size)
        report.append(f"{name:14} {size[0]}x{size[1]}  {kb / 1024:.0f} KB")
    # Measured on a 5% grid (21/11/2026): the automatic detection is fooled by the lamp glow on the felt wall,
    # by the keyed polaroid window and by the low contrast of the drawer cards. Fractions of width/height.
    geo["cork_16x9"] = [0.12, 0.06, 0.855, 0.62]
    geo["cork_9x16"] = [0.09, 0.06, 0.90, 0.79]
    geo["polaroid_window"] = [0.09, 0.08, 0.91, 0.76]
    # top two measured on the pixels (cream card detection, 21/11 evening); bottom two derived from them on a screenshot
    geo["drawer_labels"] = [[0.245, 0.233, 0.365, 0.292], [0.656, 0.314, 0.762, 0.368], [0.245, 0.633, 0.365, 0.693], [0.641, 0.640, 0.747, 0.695]]
    geo["drawer_areas"] = [[0.12, 0.13, 0.48, 0.49], [0.52, 0.10, 0.90, 0.50], [0.12, 0.54, 0.48, 0.89], [0.52, 0.54, 0.88, 0.89]]
    (BUILD / "board_geometry.json").write_text(json.dumps(geo, indent=1), encoding="utf-8")
    print("\n".join(report))
    for k in ("cork_16x9", "cork_9x16", "polaroid_window", "drawer_labels"):
        print(k, geo[k])
    total = sum((OUT / f"{n}.webp").stat().st_size for n in SRC) / 1024
    print(f"TOTAL {total:.0f} KB")


if __name__ == "__main__":
    main()
