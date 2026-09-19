"""Usage: python3 scripts/make_portfolio_mockup.py <frame.jpg> public/projects_photo/<Name>_Image.webp [tilt] [focus_x]
Needs Pillow. <frame.jpg> is a full-height (9:16) frame of the video at the moment its TikTok cover shows.
tilt: degrees, positive = counter-clockwise. focus_x: 0..1, shifts the crop window to centre an off-centre title.
In use: Aquis 7 0.371, Olympia -5, Billstedt 3, MyZeil -7, Rushfood 9.

Builds an 800x1000 portfolio mockup: a tilted phone with real iPhone proportions on a blurred,
purple-tinted backdrop. The picture must be a full-height (9:16) video frame; it fills the whole display.

The screen is 19.5:9, like a real iPhone. Island, status bar and home indicator use iOS point sizes (screen width = 393 pt):
island 126 x 37 pt at 11 pt, status bar 54 pt, home indicator 139 x 5 pt at 8 pt from the bottom."""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont

W, H = 800, 1000
SS = 3                                     # supersampling for clean edges
BODY_W, BODY_H = 360, 754                  # screen 338 x 732 = 19.5:9, the real iPhone display
BEZEL = 11
SCREEN_W, SCREEN_H = BODY_W - 2 * BEZEL, BODY_H - 2 * BEZEL     # 338 x 676 = 0.5
K = SCREEN_W / 393                         # px per iOS point
R_BODY, R_SCREEN = 60, 50
BTN = 3                                    # how far the side buttons stick out
ANGLE = 6.0                                # default tilt; positive = counter-clockwise. Pass another angle per tile for variety.
CENTER = (470, 515)
CLOCK = "17:11"

def P(v):                                  # iOS points -> supersampled px
    return v * K * SS

def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m

def cover_fit(im, size, focus_x=0.5):
    """Resize and crop to fill `size`. focus_x shifts the horizontal crop window (0 = left, 1 = right),
    e.g. to centre a title that sits off-centre in the frame."""
    tw, th = size
    scale = max(tw / im.width, th / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    x, y = round((im.width - tw) * focus_x), (im.height - th) // 2
    return im.crop((x, y, x + tw, y + th))

def clock_font(px):
    try:
        f = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", int(px))
        try: f.set_variation_by_name("Semibold")
        except Exception: pass
        return f
    except Exception:
        return ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", int(px))

def draw_status_bar(screen):
    """Clock centred in the left ear, signal / wifi / battery centred in the right ear of the island."""
    sw = screen.width
    d = ImageDraw.Draw(screen)
    white = (255, 255, 255, 255)
    cy = P(11 + 18.5)                                       # level with the island's centre
    ear = (sw - P(126)) / 2                                 # width left and right of the island
    # clock
    font = clock_font(P(17))
    box = d.textbbox((0, 0), CLOCK, font=font)
    d.text((ear / 2 - (box[2] - box[0]) / 2 + P(4), cy - (box[3] + box[1]) / 2), CLOCK, font=font, fill=white)
    # icon group: signal 18pt, wifi 17pt, battery 27pt, 6pt gaps
    gx = sw - ear / 2 - P(74) / 2 - P(4)
    for i, h in enumerate((4.5, 6.5, 9, 11.5)):            # signal
        x0 = gx + P(i * 4.7)
        d.rounded_rectangle([x0, cy + P(5.8) - P(h), x0 + P(3.2), cy + P(5.8)], radius=P(1), fill=white)
    wx, wy = gx + P(18 + 6 + 8.5), cy + P(5.6)              # wifi
    for r in (11.5, 7.7, 3.9):
        d.arc([wx - P(r), wy - P(r), wx + P(r), wy + P(r)], start=225, end=315, fill=white, width=max(1, int(P(2.3))))
    d.ellipse([wx - P(1.5), wy - P(2.4), wx + P(1.5), wy + P(0.6)], fill=white)
    bx = gx + P(18 + 6 + 17 + 6)                            # battery
    d.rounded_rectangle([bx, cy - P(6), bx + P(24.5), cy + P(6)], radius=P(3.8), outline=(255, 255, 255, 115), width=max(1, int(P(1.1))))
    d.rounded_rectangle([bx + P(2), cy - P(4), bx + P(22.5), cy + P(4)], radius=P(2.2), fill=white)
    d.rounded_rectangle([bx + P(25.6), cy - P(2), bx + P(27), cy + P(2)], radius=P(0.7), fill=(255, 255, 255, 115))

def make_screen(cover, focus_x=0.5):
    """Full-height (9:16) video frames fill the whole display. Trimmed TikTok covers keep their full
    width on a blurred copy of themselves, so no hook text is cut off. The status bar lies on top."""
    sw, sh = SCREEN_W * SS, SCREEN_H * SS
    if cover.width / cover.height <= 0.6:
        screen = cover_fit(cover, (sw, sh), focus_x).convert("RGBA")
    else:
        back = cover_fit(cover, (sw, sh)).filter(ImageFilter.GaussianBlur(sw / 16))
        screen = ImageEnhance.Brightness(back).enhance(0.72).convert("RGBA")
        h = round(cover.height * sw / cover.width)
        screen.paste(cover.resize((sw, h), Image.LANCZOS).convert("RGBA"), (0, (sh - h) // 2))
    fade_h = int(P(54) * 2)                                  # soft dark fade so the status bar stays legible
    col = Image.new("L", (1, fade_h), 0)
    for y in range(fade_h):
        col.putpixel((0, y), int(125 * (1 - y / fade_h) ** 1.6))
    dark = Image.new("RGBA", (sw, fade_h), (0, 0, 0, 255))
    dark.putalpha(col.resize((sw, fade_h)))
    screen.alpha_composite(dark, (0, 0))
    draw_status_bar(screen)
    return screen

def build(cover_path, out_path, angle=ANGLE, focus_x=0.5):
    cover = Image.open(cover_path).convert("RGB")

    bg = cover_fit(cover, (W, H)).filter(ImageFilter.GaussianBlur(42))
    bg = ImageEnhance.Brightness(bg).enhance(0.62)
    bg = ImageEnhance.Color(bg).enhance(1.25)
    bg = Image.blend(bg, Image.new("RGB", (W, H), (92, 28, 150)), 0.52).convert("RGBA")

    pw, ph = (BODY_W + 2 * BTN) * SS, BODY_H * SS
    ox = BTN * SS                                            # body starts after the left buttons
    phone = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
    d = ImageDraw.Draw(phone)
    edge = (52, 52, 58, 255)
    for y0, y1 in ((0.155, 0.19), (0.225, 0.295), (0.315, 0.385)):   # action button + volume keys, left
        d.rounded_rectangle([0, ph * y0, ox + 4 * SS, ph * y1], radius=2 * SS, fill=edge)
    d.rounded_rectangle([pw - ox - 4 * SS, ph * 0.26, pw - 1, ph * 0.37], radius=2 * SS, fill=edge)  # power, right
    bw_ = BODY_W * SS
    d.rounded_rectangle([ox, 0, ox + bw_ - 1, ph - 1], radius=R_BODY * SS, fill=(46, 46, 52, 255))               # frame
    d.rounded_rectangle([ox + 2.5 * SS, 2.5 * SS, ox + bw_ - 1 - 2.5 * SS, ph - 1 - 2.5 * SS], radius=(R_BODY - 2.5) * SS, fill=(6, 6, 9, 255))  # bezel
    sx, sy = ox + BEZEL * SS, BEZEL * SS
    sw, sh = SCREEN_W * SS, SCREEN_H * SS
    phone.paste(make_screen(cover, focus_x), (sx, sy), rounded_mask((sw, sh), R_SCREEN * SS))
    d = ImageDraw.Draw(phone)
    iw, ih = P(126), P(37)                                                                                        # dynamic island
    d.rounded_rectangle([sx + (sw - iw) / 2, sy + P(11), sx + (sw + iw) / 2, sy + P(11) + ih], radius=ih / 2, fill=(0, 0, 0, 255))
    hw, hh = P(139), P(5)                                                                                         # home indicator
    d.rounded_rectangle([sx + (sw - hw) / 2, sy + sh - P(8) - hh, sx + (sw + hw) / 2, sy + sh - P(8)], radius=hh / 2, fill=(255, 255, 255, 235))

    phone = phone.rotate(angle, resample=Image.BICUBIC, expand=True)
    phone = phone.resize((phone.width // SS, phone.height // SS), Image.LANCZOS)

    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sil = Image.new("RGBA", phone.size, (10, 0, 30, 150))
    sil.putalpha(phone.getchannel("A").point(lambda a: int(a * 0.55)))
    pos = (CENTER[0] - phone.width // 2, CENTER[1] - phone.height // 2)
    shadow.paste(sil, (pos[0] + 10, pos[1] + 26), sil)
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))

    out = Image.alpha_composite(bg, shadow)
    out.alpha_composite(phone, pos)
    out.convert("RGB").save(out_path, "WEBP", quality=84, method=6)

if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2],
          float(sys.argv[3]) if len(sys.argv) > 3 else ANGLE,
          float(sys.argv[4]) if len(sys.argv) > 4 else 0.5)
    print("screen %dx%d = %.4f (19.5:9 = 0.4615)" % (SCREEN_W, SCREEN_H, SCREEN_W / SCREEN_H))
