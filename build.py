#!/usr/bin/env python3
"""
Portafolio Diego Aranzazu — pipeline de construcción.

  python build.py            # optimiza fotos (si hace falta) y regenera index.html
  python build.py --force    # re-optimiza todas las fotos

Lee:    data/photos.json, data/site.json, src/index.template.html, _originales/
Genera: img/photos/*.webp, img/about/*.webp, img/og.jpg, index.html
"""
import json
import sys
import html
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
ORIG = ROOT / "_originales"
ABOUT_SRC = ORIG / "_sobre-mi"
IMG = ROOT / "img"
WIDTHS = [480, 900, 1500, 2200]
ABOUT_WIDTHS = [600, 1000, 1600]
QUALITY = 80
FORCE = "--force" in sys.argv


def esc(s):
    return html.escape(str(s), quote=True)


# ───────────────────────── imágenes ─────────────────────────
def read_exif(im):
    ex = im.getexif()
    sub = {}
    try:
        sub = ex.get_ifd(0x8769)
    except Exception:
        pass

    def num(v):
        try:
            return float(v)
        except Exception:
            return None

    et = num(sub.get(33434))  # ExposureTime
    shutter = None
    if et:
        shutter = f"1/{round(1 / et)}" if et < 1 else f"{et:g}"
    ts = None
    raw = sub.get(36867) or ex.get(306)
    if raw:
        try:
            ts = datetime.strptime(str(raw), "%Y:%m:%d %H:%M:%S")
        except Exception:
            ts = None
    return {
        "iso": sub.get(34855),
        "f": num(sub.get(33437)),
        "shutter": shutter,
        "focal": num(sub.get(37386)),
        "ts": ts,
    }


def color_stats(im):
    """Color medio (para el fondo del placeholder) y color vibrante (para el brillo del visor)."""
    small = im.convert("RGB")
    small.thumbnail((64, 64))
    px = list(zip(*[iter(small.tobytes())] * 3))
    n = len(px)
    avg = tuple(sum(c[i] for c in px) // n for i in range(3))
    q = small.quantize(6).convert("RGB")
    best, best_score = avg, -1
    for count, c in q.getcolors(64 * 64):
        r, g, b = [v / 255 for v in c]
        mx, mn = max(r, g, b), min(r, g, b)
        sat = 0 if mx == 0 else (mx - mn) / mx
        lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        score = sat * (1 - abs(lum - 0.5)) * (count ** 0.35)
        if score > best_score:
            best, best_score = c, score
    hexa = lambda c: "#%02x%02x%02x" % c
    return hexa(avg), hexa(best)


def variants_for(src_w, candidates):
    ws = [w for w in candidates if w <= src_w]
    if not ws:
        ws = [src_w]
    elif src_w < candidates[-1] and src_w > ws[-1] and src_w - ws[-1] > 120:
        ws.append(src_w)
    return ws


def process_photo(p):
    f = p["file"]
    src = ORIG / f"{f}.jpg"
    if not src.exists():
        raise SystemExit(f"Falta el original: {src}")
    with Image.open(src) as im0:
        im = ImageOps.exif_transpose(im0)
        exif = read_exif(im0)
        w0, h0 = im.size
        widths = variants_for(w0, WIDTHS)
        outdir = IMG / "photos"
        outdir.mkdir(parents=True, exist_ok=True)
        for w in widths:
            out = outdir / f"{f}-{w}.webp"
            if out.exists() and not FORCE and out.stat().st_mtime >= src.stat().st_mtime:
                continue
            h = round(h0 * w / w0)
            im.convert("RGB").resize((w, h), Image.LANCZOS).save(out, "WEBP", quality=QUALITY, method=6)
        avg, vib = color_stats(im)
    p.update({"w": w0, "h": h0, "ratio": round(w0 / h0, 4), "widths": widths, "avg": avg, "vib": vib, "exif": exif})
    e = exif
    bits = []
    if e["focal"]:
        bits.append(f"{e['focal']:.0f} mm")
    if e["f"]:
        bits.append(f"f/{e['f']:g}")
    if e["shutter"]:
        bits.append(f"{e['shutter']} s")
    if e["iso"]:
        bits.append(f"ISO {e['iso']}")
    p["meta"] = " · ".join(bits)


def process_about():
    out = []
    outdir = IMG / "about"
    outdir.mkdir(parents=True, exist_ok=True)
    for i, name in enumerate(["1", "2", "3"], start=1):
        src = ABOUT_SRC / f"{name}.webp"
        if not src.exists():
            continue
        with Image.open(src) as im0:
            im = ImageOps.exif_transpose(im0).convert("RGB")
            w0, h0 = im.size
            widths = variants_for(w0, ABOUT_WIDTHS)
            for w in widths:
                dst = outdir / f"yo-{i}-{w}.webp"
                if dst.exists() and not FORCE and dst.stat().st_mtime >= src.stat().st_mtime:
                    continue
                im.resize((w, round(h0 * w / w0)), Image.LANCZOS).save(dst, "WEBP", quality=82, method=6)
            avg, _ = color_stats(im)
        out.append({"i": i, "w": w0, "h": h0, "widths": widths, "avg": avg})
    return out


def make_og(p):
    dst = IMG / "og.jpg"
    src = ORIG / f"{p['file']}.jpg"
    if dst.exists() and not FORCE and dst.stat().st_mtime >= src.stat().st_mtime:
        return
    with Image.open(src) as im0:
        im = ImageOps.exif_transpose(im0).convert("RGB")
        fx, fy = p["focus"]
        im = ImageOps.fit(im, (1200, 630), Image.LANCZOS, centering=(fx / 100, fy / 100))
        im.save(dst, "JPEG", quality=84, optimize=True)


# ───────────────────────── HTML helpers ─────────────────────────
def srcset(p, folder="photos", prefix=None):
    prefix = prefix or p["file"]
    return ", ".join(f"img/{folder}/{prefix}-{w}.webp {w}w" for w in p["widths"])


def src_default(p, target=900):
    ws = p["widths"]
    w = min(ws, key=lambda x: abs(x - target))
    return f"img/photos/{p['file']}-{w}.webp"


def img_tag(p, sizes, cls="", loading="lazy", priority=False, alt=None, style="", extra=""):
    big = p["widths"][-1]
    ratio_h = round(big / p["ratio"])
    attrs = [
        f'src="{src_default(p)}"',
        f'srcset="{srcset(p)}"',
        f'sizes="{sizes}"',
        f'width="{big}" height="{ratio_h}"',
        f'alt="{esc(alt if alt is not None else p["alt"])}"',
        'decoding="async"',
    ]
    if cls:
        attrs.append(f'class="{cls}"')
    if priority:
        attrs.append('fetchpriority="high"')
    else:
        attrs.append(f'loading="{loading}"')
    if style:
        attrs.append(f'style="{style}"')
    if extra:
        attrs.append(extra)
    return "<img " + " ".join(attrs) + ">"


def species_line(p):
    s = esc(p["common"])
    if p.get("latin"):
        s += f' <i>{esc(p["latin"])}</i>'
    return s


def pad(n, w=2):
    return str(n).zfill(w)


# ───────────────────────── secciones ─────────────────────────
def build_hero(by, cfg):
    slides = []
    for i, f in enumerate(cfg["hero"]):
        p = by[f]
        fx, fy = p["focus"]
        sp = p["common"] + (f" — {p['latin']}" if p.get("latin") else "")
        slides.append(
            f'<div class="hero__slide{" is-active" if i == 0 else ""}" data-title="{esc(p["title"])}" data-sp="{esc(sp)}" data-id="{esc(f)}" style="--fx:{fx}%;--fy:{fy}%;--c:{p["avg"]}">'
            + img_tag(p, "100vw", cls="hero__img", priority=(i == 0), loading="eager" if i < 2 else "lazy", alt=p["alt"])
            + "</div>"
        )
    return "\n".join(slides)


def build_hero_preload(by, cfg):
    p = by[cfg["hero"][0]]
    return (
        f'<link rel="preload" as="image" imagesrcset="{srcset(p)}" imagesizes="100vw" fetchpriority="high">'
    )


def build_marquee(by, cfg):
    words = ["Garzas", "Guacamayas", "Perdices de monte", "Cormoranes", "Gavilanes", "Loros", "Eufonias", "Anhingas", "Atrapamoscas", "Tinamúes"]
    pills = [by[f] for f in cfg["marquee_pills"]]
    parts = []
    for i, w in enumerate(words):
        parts.append(f'<span class="marquee__word">{esc(w)}</span>')
        if i % 2 == 1 and pills:
            p = pills[(i // 2) % len(pills)]
            parts.append(
                '<span class="marquee__pill">'
                + img_tag(p, "240px", alt="", extra='aria-hidden="true"')
                + "</span>"
            )
        else:
            parts.append('<span class="marquee__dot" aria-hidden="true">✦</span>')
    return "\n".join(parts)


def build_select(by, cfg):
    out = []
    for i, f in enumerate(cfg["select"], start=1):
        p = by[f]
        out.append(
            f'''<article class="sel__slide" style="--r:{p["ratio"]};--c:{p["avg"]}">
  <button class="sel__fig" data-lb="{esc(f)}" data-cursor="Ver" aria-label="Ampliar: {esc(p["title"])}">
    <span class="sel__media">{img_tag(p, "(max-width: 800px) 80vw, 62vw", cls="sel__img")}</span>
  </button>
  <div class="sel__cap">
    <span class="sel__num">{pad(i)}</span>
    <div><h3>{esc(p["title"])}</h3><p>{species_line(p)}</p><p class="mono">{esc(p["meta"])}</p></div>
  </div>
</article>'''
        )
    return "\n".join(out)


def build_bursts(by, cfg):
    pairs, index = [], []
    for i, (a, b) in enumerate(cfg["bursts"]):
        pa, pb = by[a], by[b]
        dt = None
        if pa["exif"]["ts"] and pb["exif"]["ts"]:
            dt = int(abs((pb["exif"]["ts"] - pa["exif"]["ts"]).total_seconds()))
        dts = f"+{dt} s" if dt else ""
        sp = pa["common"] + (f" · {pa['latin']}" if pa.get("latin") else "")
        fa, fb = pa["focus"], pb["focus"]
        pairs.append(
            f'''<figure class="burst__pair" data-i="{i}" data-dt="{esc(dts)}" data-meta-a="{esc(pa["meta"])}" data-meta-b="{esc(pb["meta"])}">
  <div class="burst__frame burst__frame--a" style="--fx:{fa[0]}%;--fy:{fa[1]}%">{img_tag(pa, "(max-width: 900px) 92vw, 60vw", alt=pa["alt"])}</div>
  <div class="burst__frame burst__frame--b" style="--fx:{fb[0]}%;--fy:{fb[1]}%">{img_tag(pb, "(max-width: 900px) 92vw, 60vw", alt=pb["alt"])}</div>
  <span class="burst__scan" aria-hidden="true"></span>
  <span class="burst__tag burst__tag--a mono">A</span><span class="burst__tag burst__tag--b mono">B</span>
</figure>'''
        )
        index.append(
            f'<li data-i="{i}"><span class="mono">{pad(i + 1)}</span><b>{esc(pa["common"])}</b><em class="mono">{esc(dts)}</em></li>'
        )
    return "\n".join(pairs), "\n".join(index)


def group_members(photos, key):
    if key == "flight":
        return [p for p in photos if p["flight"]]
    return [p for p in photos if p["group"] == key]


def build_collections(by, photos, groups):
    order = ["agua", "flight", "loros", "suelo", "cantores", "fauna"]
    rows, previews = [], []
    for i, key in enumerate(order):
        g = groups[key]
        n = len(group_members(photos, key))
        cover = by[g["cover"]]
        rows.append(
            f'''<li><a class="coll__row" href="#galeria" data-filter="{key}" data-i="{i}" data-cursor="Ver">
  <span class="coll__n mono">{pad(i + 1)}</span>
  <span class="coll__name">{esc(g["name"])}</span>
  <span class="coll__blurb">{esc(g["blurb"])}</span>
  <span class="coll__count mono">{pad(n)} fotos</span>
  <span class="coll__arrow" aria-hidden="true">↗</span>
  <span class="coll__thumb">{img_tag(cover, "160px", alt="")}</span>
</a></li>'''
        )
        previews.append(
            f'<div class="coll__pv" data-i="{i}" style="--c:{cover["avg"]}">{img_tag(cover, "30vw", alt="", style=f"object-position:{cover["focus"][0]}% {cover["focus"][1]}%")}</div>'
        )
    return "\n".join(rows), "\n".join(previews), order


def build_filters(photos, groups, order):
    btns = [f'<button class="chip is-active" data-filter="all" aria-pressed="true">Todas <sup>{len(photos)}</sup></button>']
    for key in order:
        n = len(group_members(photos, key))
        btns.append(f'<button class="chip" data-filter="{key}" aria-pressed="false">{esc(groups[key]["name"])} <sup>{n}</sup></button>')
    return "\n".join(btns)


def build_gallery(photos):
    out = []
    for i, p in enumerate(photos):
        gs = p["group"] + (" flight" if p["flight"] else "")
        out.append(
            f'''<figure class="g-item" data-id="{esc(p["file"])}" data-groups="{gs}" data-title="{esc(p["title"])}" data-common="{esc(p["common"])}" data-latin="{esc(p.get("latin", ""))}" data-meta="{esc(p["meta"])}" data-color="{p["vib"]}" style="--r:{p["ratio"]};--c:{p["avg"]}">
  <button class="g-item__btn" aria-label="Ampliar: {esc(p["title"])}" data-cursor="Ver">
    <span class="g-item__media">{img_tag(p, "(max-width: 700px) 50vw, (max-width: 1200px) 33vw, 25vw")}</span>
    <span class="g-item__cap"><b>{esc(p["title"])}</b><i>{esc(p["common"])}</i></span>
  </button>
</figure>'''
        )
    return "\n".join(out)


def build_about(about, site):
    if len(about) < 3:
        return "", ""
    ab = {a["i"]: a for a in about}

    def tag(a, sizes, alt, cls=""):
        ss = ", ".join(f"img/about/yo-{a['i']}-{w}.webp {w}w" for w in a["widths"])
        mid = f"img/about/yo-{a['i']}-{a['widths'][-1]}.webp"
        return f'<img src="{mid}" srcset="{ss}" sizes="{sizes}" width="{a["widths"][-1]}" height="{round(a["widths"][-1] * a["h"] / a["w"])}" alt="{esc(alt)}" loading="lazy" decoding="async" class="{cls}">'

    collage = f'''<figure class="about__ph about__ph--main" style="--c:{ab[3]["avg"]}"><div class="about__mask">{tag(ab[3], "(max-width: 900px) 80vw, 34vw", "Diego Aranzazu fotografiando entre las palmas de cera, con teleobjetivo y mochila")}</div><figcaption class="mono">En campo</figcaption></figure>
<figure class="about__ph about__ph--a" style="--c:{ab[1]["avg"]}"><div class="about__mask">{tag(ab[1], "(max-width: 900px) 50vw, 20vw", "Diego Aranzazu con gorra y su cámara con teleobjetivo en medio del bosque")}</div></figure>
<figure class="about__ph about__ph--b" style="--c:{ab[2]["avg"]}"><div class="about__mask">{tag(ab[2], "(max-width: 900px) 50vw, 20vw", "Diego Aranzazu junto a su cámara montada en trípode, con el paisaje de montaña al fondo")}</div></figure>'''
    return collage, ""


def build_about_text(site):
    a = site["about"]
    paras = "\n".join(f"<p>{esc(t)}</p>" for t in a["paragraphs"])
    gear = "\n".join(f'<li><span class="mono">{esc(k)}</span><b>{esc(v)}</b></li>' for k, v in a["gear"])
    princ = "\n".join(
        f'<li><span class="mono">{pad(i)}</span><div><h4>{esc(t)}</h4><p>{esc(d)}</p></div></li>' for i, (t, d) in enumerate(a["principles"], start=1)
    )
    return paras, gear, princ


def build_contact_links(site):
    c = site["contact"]
    links = []
    if c.get("email"):
        links.append(f'<a class="clink" href="mailto:{esc(c["email"])}" data-magnetic data-cursor="Escribir"><span>Correo</span><b>{esc(c["email"])}</b><i aria-hidden="true">↗</i></a>')
    if c.get("whatsapp"):
        num = "".join(ch for ch in c["whatsapp"] if ch.isdigit())
        links.append(f'<a class="clink" href="https://wa.me/{num}" target="_blank" rel="noopener" data-magnetic data-cursor="Escribir"><span>WhatsApp</span><b>{esc(c["whatsapp"])}</b><i aria-hidden="true">↗</i></a>')
    if c.get("instagram"):
        handle = c["instagram"].lstrip("@")
        links.append(f'<a class="clink" href="https://instagram.com/{esc(handle)}" target="_blank" rel="noopener" data-magnetic data-cursor="Seguir"><span>Instagram</span><b>@{esc(handle)}</b><i aria-hidden="true">↗</i></a>')
    return "\n".join(links)


# ───────────────────────── main ─────────────────────────
def main():
    cat = json.loads((ROOT / "data" / "photos.json").read_text(encoding="utf-8"))
    site = json.loads((ROOT / "data" / "site.json").read_text(encoding="utf-8"))
    photos = cat["photos"]
    for p in photos:
        process_photo(p)
    by = {p["file"]: p for p in photos}
    about = process_about()
    make_og(by[cat["hero"][0]])

    for k in ("hero", "select", "band", "intro"):
        vals = cat[k] if isinstance(cat[k], list) else [cat[k]]
        for v in vals:
            assert v in by, f"{k}: {v} no está en el catálogo"
    for a, b in cat["bursts"]:
        assert a in by and b in by

    rows, previews, order = build_collections(by, photos, cat["groups"])
    pairs, burst_index = build_bursts(by, cat)
    about_html, _ = build_about(about, site)
    about_paras, about_gear, about_princ = build_about_text(site)

    max_focal = max((p["exif"]["focal"] or 0) for p in photos)
    fastest = max((int(p["exif"]["shutter"].split("/")[1]) for p in photos if p["exif"]["shutter"] and "/" in p["exif"]["shutter"]), default=0)

    band = by[cat["band"]]
    intro = by[cat["intro"]]
    first_hero = by[cat["hero"][0]]

    c = site["contact"]
    same_as = []
    if c.get("instagram"):
        same_as.append(f'https://instagram.com/{c["instagram"].lstrip("@")}')
    jsonld = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": site["name"],
        "jobTitle": "Fotógrafo de naturaleza",
        "description": site["description"],
        "nationality": site["country"],
        "knowsAbout": ["Fotografía de aves", "Fotografía de naturaleza", "Aviturismo"],
    }
    if same_as:
        jsonld["sameAs"] = same_as
    if site.get("url"):
        jsonld["url"] = site["url"]

    rep = {
        "NAME": esc(site["name"]),
        "NAME_FIRST": esc(site["name_first"]),
        "NAME_LAST": esc(site["name_last"]),
        "SIGNATURE": esc(site["signature"]),
        "ROLE": esc(site["role"]),
        "COUNTRY": esc(site["country"]),
        "YEAR": str(site["year"]),
        "DESCRIPTION": esc(site["description"]),
        "OG_IMAGE": esc(site["url"].rstrip("/") + "/img/og.jpg") if site.get("url") else "img/og.jpg",
        "OG_URL_META": f'<meta property="og:url" content="{esc(site["url"])}">' if site.get("url") else "",
        "JSONLD": json.dumps(jsonld, ensure_ascii=False),
        "HERO_PRELOAD": build_hero_preload(by, cat),
        "HERO_SLIDES": build_hero(by, cat),
        "HERO_COUNT": pad(len(cat["hero"])),
        "MARQUEE": build_marquee(by, cat),
        "MANIFESTO": esc(site["manifesto"]),
        "INTRO_IMG": img_tag(intro, "(max-width: 900px) 50vw, 24vw", alt=intro["alt"]),
        "INTRO_CAP": species_line(intro),
        "STAT_PHOTOS": str(len(photos)),
        "STAT_FOCAL": f"{max_focal:.0f}",
        "STAT_SHUTTER": str(fastest),
        "STAT_COLLECTIONS": str(len(order)),
        "SELECT_SLIDES": build_select(by, cat),
        "SELECT_COUNT": pad(len(cat["select"])),
        "BURST_PAIRS": pairs,
        "BURST_INDEX": burst_index,
        "BAND_IMG": img_tag(band, "100vw", cls="band__img", alt=band["alt"]),
        "BAND_TEXT": esc(site["band_text"]),
        "COLL_ROWS": rows,
        "COLL_PREVIEWS": previews,
        "FILTERS": build_filters(photos, cat["groups"], order),
        "GALLERY": build_gallery(photos),
        "GALLERY_COUNT": str(len(photos)),
        "ABOUT_COLLAGE": about_html,
        "ABOUT_TITLE": esc(site["about"]["title"]),
        "ABOUT_PARAS": about_paras,
        "ABOUT_GEAR": about_gear,
        "ABOUT_PRINCIPLES": about_princ,
        "CONTACT_TEXT": esc(site["contact_text"]),
        "CONTACT_LINKS": build_contact_links(site),
        "CONTACT_EMAIL": esc(site["contact"].get("email", "")),
    }

    tpl = (ROOT / "src" / "index.template.html").read_text(encoding="utf-8")
    for k, v in rep.items():
        tpl = tpl.replace("{{" + k + "}}", v)
    left = [m for m in __import__("re").findall(r"\{\{[A-Z_]+\}\}", tpl)]
    if left:
        raise SystemExit(f"Placeholders sin resolver: {sorted(set(left))}")
    (ROOT / "index.html").write_text(tpl, encoding="utf-8")
    total = sum(f.stat().st_size for f in (IMG).rglob("*") if f.is_file())
    print(f"OK - {len(photos)} fotos - img/ = {total / 1e6:.1f} MB - index.html {len(tpl) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
