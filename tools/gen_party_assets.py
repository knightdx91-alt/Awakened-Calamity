#!/usr/bin/env python3
"""Generate pixel-exact FireRed party screen assets from source/pokefirered.

Decodes the GBA tileset/tilemap/palette data used by the real party menu
(graphics/party_menu/*) plus the small/normal latin fonts, and writes PNGs
+ a metadata JSON to src/assets/party/ for the JS party screen renderer.
"""
import json
import os
import struct
from PIL import Image

FR = os.path.join(os.path.dirname(__file__), '..', 'source', 'pokefirered')
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'party')
os.makedirs(OUT, exist_ok=True)

def fr(*p):
    return os.path.join(FR, *p)

# ── Palette: bg.png holds 11 GBA palettes (176 colors); palBuffer in game ──
bg_ts = Image.open(fr('graphics/party_menu/bg.png'))
PAL = bg_ts.getpalette()  # flat [r,g,b,...] * 176
TSPX = bg_ts.load()
TS_COLS = bg_ts.size[0] // 8

def pal_rgb(i):
    return (PAL[i*3], PAL[i*3+1], PAL[i*3+2])

# ── bg tilemap render (u16 entries with palette+flip bits) ──
def render_bg_tilemap(ents, tiles_w, pal_override=None, transparent=False):
    tiles_h = len(ents) // tiles_w
    out = Image.new('RGBA', (tiles_w*8, tiles_h*8), (0, 0, 0, 0))
    o = out.load()
    for i, e in enumerate(ents):
        tid, hf, vf, pn = e & 0x3ff, (e >> 10) & 1, (e >> 11) & 1, e >> 12
        if pal_override is not None:
            pn = pal_override
        tx0, ty0 = (tid % TS_COLS)*8, (tid // TS_COLS)*8
        bx, by = (i % tiles_w)*8, (i // tiles_w)*8
        for y in range(8):
            for x in range(8):
                sx = tx0 + (7-x if hf else x)
                sy = ty0 + (7-y if vf else y)
                ci = TSPX[sx, sy] & 0xf
                if ci == 0 and transparent:
                    continue
                o[bx+x, by+y] = pal_rgb(pn*16 + ci) + (255,)
    return out

def read_u16map(path):
    d = open(path, 'rb').read()
    return struct.unpack('<%dH' % (len(d)//2), d)

bg_ents = read_u16map(fr('graphics/party_menu/bg.bin'))
bg_full = render_bg_tilemap(bg_ents, 32)
bg_full.crop((0, 0, 240, 160)).save(os.path.join(OUT, 'party_bg.png'))

# Cancel button area = bg tiles (23,17)-(29,18); selected = same tiles pal 2
def bg_region(tx, ty, tw, th, pal_override=None):
    ents = [bg_ents[(ty+r)*32 + tx + c] for r in range(th) for c in range(tw)]
    return render_bg_tilemap(tuple(ents), tw, pal_override)

bg_region(23, 17, 7, 2, 1).save(os.path.join(OUT, 'cancel_norm.png'))
bg_region(23, 17, 7, 2, 2).save(os.path.join(OUT, 'cancel_sel.png'))

# ── Party slot boxes: u8 tile-number maps drawn into windows whose 16-color
# palette = bg palette 3 with 6 entries swapped per state (party_menu.c
# LoadPartyBoxPalette; offsets {4,5,6} and {1,7,8}). ──
def read_u8map(path):
    return open(path, 'rb').read()

OFFS1, OFFS2 = (4, 5, 6), (1, 7, 8)
BOX_STATES = {
    # state: (palBuffer ids for offsets1, ids for offsets2)
    'norm':        ((52, 53, 54),    (49, 55, 56)),
    'sel':         ((116, 117, 118), (97, 103, 104)),
    'action':      ((100, 101, 102), (161, 167, 168)),
    'fainted':     ((84, 85, 86),    (81, 87, 88)),
    'fainted_sel': ((148, 149, 150), (97, 103, 104)),
}

def box_palette(ids1, ids2):
    pal16 = [pal_rgb(48 + i) for i in range(16)]  # window base = bg palette 3
    for off, gi in zip(OFFS1, ids1):
        pal16[off] = pal_rgb(gi)
    for off, gi in zip(OFFS2, ids2):
        pal16[off] = pal_rgb(gi)
    return pal16

def render_box(tilenums, tiles_w, pal16):
    tiles_h = len(tilenums) // tiles_w
    out = Image.new('RGBA', (tiles_w*8, tiles_h*8), (0, 0, 0, 0))
    o = out.load()
    for i, tid in enumerate(tilenums):
        tx0, ty0 = (tid % TS_COLS)*8, (tid // TS_COLS)*8
        bx, by = (i % tiles_w)*8, (i // tiles_w)*8
        for y in range(8):
            for x in range(8):
                ci = TSPX[tx0+x, ty0+y] & 0xf
                if ci == 0:
                    continue  # window color 0 = transparent over bg
                o[bx+x, by+y] = pal16[ci] + (255,)
    return out

main_map = read_u8map(fr('graphics/party_menu/slot_main.bin'))
wide_map = read_u8map(fr('graphics/party_menu/slot_wide.bin'))
empty_map = read_u8map(fr('graphics/party_menu/slot_wide_empty.bin'))
for state, (ids1, ids2) in BOX_STATES.items():
    p = box_palette(ids1, ids2)
    render_box(main_map, 10, p).save(os.path.join(OUT, 'main_%s.png' % state))
    render_box(wide_map, 18, p).save(os.path.join(OUT, 'wide_%s.png' % state))
render_box(empty_map, 18, box_palette(*BOX_STATES['norm'])).save(
    os.path.join(OUT, 'wide_empty.png'))

# ── Pokéball sprite (32×64 = closed + open frames), own embedded palette ──
def save_sprite(path, out_name, fw, fh, frames):
    im = Image.open(fr(path))
    p = im.getpalette()
    px = im.load()
    for fi, name in enumerate(frames):
        o = Image.new('RGBA', (fw, fh), (0, 0, 0, 0))
        op = o.load()
        fx, fy = (fi * fw) % im.size[0], (fi * fw) // im.size[0] * fh
        # frames stacked vertically in these sheets
        fx, fy = 0, fi * fh
        for y in range(fh):
            for x in range(fw):
                ci = px[fx+x, fy+y] & 0xf
                if ci == 0:
                    continue
                op[x, y] = (p[ci*3], p[ci*3+1], p[ci*3+2], 255)
        o.save(os.path.join(OUT, out_name % name))

save_sprite('graphics/party_menu/pokeball.png', 'ball_%s.png', 32, 32,
            ['closed', 'open'])

# ── Held item icons (8×16 = item + mail) ──
save_sprite('graphics/party_menu/hold_icons.png', 'hold_%s.png', 8, 8,
            ['item', 'mail'])

# ── Status icons: 256×8 sheet, 32×8 frames in anim order ──
st_im = Image.open(fr('graphics/interface/status_icons.png'))
st_pal = st_im.getpalette()
st_px = st_im.load()
STATUSES = ['PSN', 'PAR', 'SLP', 'FRZ', 'BRN', 'PKRS', 'FNT']
for fi, name in enumerate(STATUSES):
    o = Image.new('RGBA', (32, 8), (0, 0, 0, 0))
    op = o.load()
    for y in range(8):
        for x in range(32):
            ci = st_px[fi*32 + x, y] & 0xf
            if ci == 0:
                continue
            op[x, y] = (st_pal[ci*3], st_pal[ci*3+1], st_pal[ci*3+2], 255)
    o.save(os.path.join(OUT, 'status_%s.png' % name.lower()))

# ── Message box frame: FR default party-menu frame (type7, light gray) drawn
# as a 3×3 9-slice. type7.gbapal supplies the colors. ──
frame_p = Image.open(fr('graphics/text_window/type7.png'))
fpal = frame_p.getpalette()
fpx = frame_p.load()
frame_out = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
fop = frame_out.load()
for y in range(24):
    for x in range(24):
        ci = fpx[x, y] & 0xf
        if ci == 0:
            continue  # transparent corners
        fop[x, y] = (fpal[ci*3], fpal[ci*3+1], fpal[ci*3+2], 255)
frame_out.save(os.path.join(OUT, 'msg_frame.png'))
# interior fill = type1 palette color 1
FRAME_FILL = (fpal[3], fpal[4], fpal[5])

# ── Fonts. latin_small: glyph g = two 8×8 tiles (stacked) at tile offset 2g
# in the sheet's TL,TR,BL,BR per-16×16-cell tile order (gbagfx font.c).
# latin_normal: glyph g = whole 16×16 cell g. Encode fg=red, shadow=blue. ──
FG, SH = (255, 0, 0, 255), (0, 0, 255, 255)

def font_color(im, x, y):
    ci = im.load()[x, y] & 0x3
    return FG if ci == 1 else SH if ci == 2 else None

def gen_small_font():
    im = Image.open(fr('graphics/fonts/latin_small.png'))
    n_cells = (im.size[0]//16) * (im.size[1]//16)
    n_glyphs = n_cells * 2
    out = Image.new('RGBA', (16*8, ((n_glyphs+15)//16)*16), (0, 0, 0, 0))
    op = out.load()
    for g in range(n_glyphs):
        cell, half = g >> 1, g & 1
        cx, cy = (cell % 16)*16, (cell // 16)*16
        ox, oy = (g % 16)*8, (g // 16)*16
        for t in range(2):  # tile order within glyph: half*2 + t
            ti = half*2 + t
            sx, sy = cx + (ti & 1)*8, cy + (ti >> 1)*8
            for y in range(8):
                for x in range(8):
                    c = font_color(im, sx+x, sy+y)
                    if c:
                        op[ox+x, oy+t*8+y] = c
    out.save(os.path.join(OUT, 'font_small.png'))
    return n_glyphs

def gen_normal_font():
    im = Image.open(fr('graphics/fonts/latin_normal.png'))
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    op = out.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            c = font_color(im, x, y)
            if c:
                op[x, y] = c
    out.save(os.path.join(OUT, 'font_normal.png'))

n_small = gen_small_font()
gen_normal_font()

# ── Glyph width tables from src/text.c ──
def parse_widths(name):
    src = open(fr('src/text.c')).read()
    start = src.index(name)
    start = src.index('{', start)
    end = src.index('}', start)
    return [int(t) for t in src[start+1:end].replace('\n', ' ').split(',')
            if t.strip()]

w_small = parse_widths('sFontSmallLatinGlyphWidths')
w_normal = parse_widths('sFontNormalLatinGlyphWidths')

# ── Charmap: ASCII/needed chars → glyph ids ──
charmap = {}
for line in open(fr('charmap.txt'), encoding='utf-8'):
    line = line.split('@')[0].strip()
    if not line or '=' not in line:
        continue
    lhs, rhs = [s.strip() for s in line.split('=', 1)]
    rhs_bytes = rhs.split()
    if len(rhs_bytes) != 1:
        continue
    if lhs.startswith("'") and lhs.endswith("'") and len(lhs) >= 3:
        ch = lhs[1:-1]
        if ch == '\\\\':
            ch = '\\'
        if len(ch) == 1 and ch not in charmap:
            charmap[ch] = int(rhs_bytes[0], 16)
    elif lhs == 'LV':
        charmap['\x01'] = int(rhs_bytes[0], 16)  # \x01 = Lv ligature

# ── Colors ──
boxpal = box_palette(*BOX_STATES['norm'])
def hexc(rgb):
    return '#%02x%02x%02x' % rgb

# std text window palette 0 (message box): color 1 = bg/white, 2 = fg, 3 = shadow
std0 = open(fr('graphics/text_window/stdpal_0.pal')).read().splitlines()
std_cols = [tuple(int(v) for v in l.split()) for l in std0[3:]]

meta = {
    'smallWidths': w_small,
    'normalWidths': w_normal,
    'charmap': charmap,
    'colors': {
        'boxText':   {'fg': hexc(boxpal[3]), 'shadow': hexc(boxpal[2])},
        'genderM':   {'fg': hexc(pal_rgb(59)), 'shadow': hexc(pal_rgb(60))},
        'genderF':   {'fg': hexc(pal_rgb(75)), 'shadow': hexc(pal_rgb(76))},
        'hpGreen':   [hexc(pal_rgb(57)), hexc(pal_rgb(58))],
        'hpYellow':  [hexc(pal_rgb(73)), hexc(pal_rgb(74))],
        'hpRed':     [hexc(pal_rgb(89)), hexc(pal_rgb(90))],
        'msgText':   {'fg': hexc(std_cols[2]), 'shadow': hexc(std_cols[3])},
        'msgBg':     hexc(std_cols[1]),
        'msgFrameFill': hexc(FRAME_FILL),
        # CANCEL button text: sFontColorTable[0] = {transparent, LIGHT_GRAY(3), DARK_GRAY(2)}
        # into the std text palette
        'cancelText': {'fg': hexc(std_cols[3]), 'shadow': hexc(std_cols[2])},
    },
}
with open(os.path.join(OUT, 'party_meta.json'), 'w') as f:
    json.dump(meta, f)

print('done:', sorted(os.listdir(OUT)))
print('small glyphs:', n_small, 'widths:', len(w_small), len(w_normal),
      'charmap entries:', len(charmap))
