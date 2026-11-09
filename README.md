# Diego Aranzazu — Portafolio de fotografía de aves

Sitio estático (HTML + CSS + JS, sin frameworks) para el portafolio del fotógrafo de naturaleza Diego Aranzazu.
329 fotografías de aves y fauna de Colombia (54 de colibríes), con scroll suave, scroll horizontal, comparador de ráfagas, cintas de colibríes, galería filtrable y visor a pantalla completa.

## Secciones

1. **Preloader** con diafragma de cámara que se abre.
2. **Hero** a pantalla completa con 5 fotos que rotan, nombre gigante y parallax con el mouse.
3. **Marquee** de especies con velocidad ligada al scroll.
4. **Manifiesto** con revelado palabra por palabra y datos reales sacados de los EXIF (alcance, obturación).
5. **Selección**: 10 fotos en scroll horizontal fijado (en móvil, carrusel táctil).
6. **Ráfagas**: pares de disparos tomados con 1–2 s de diferencia, con barrido A → B al hacer scroll.
7. **Colibríes**: dos cintas de fotos que corren en sentidos opuestos y aceleran con el scroll.
8. **Banda panorámica** con parallax.
9. **Colecciones**: 9 colecciones con foto flotante que sigue el cursor; al hacer clic filtra la galería.
10. **Galería completa**: las 329 fotos en filas justificadas, filtros animados (GSAP Flip) y visor con teclado, gestos táctiles y datos de la toma.
11. **Sobre mí** con las fotos del fotógrafo, equipo y principios de trabajo.
12. **Contacto** y pie de página.

Cada foto sale en una sola sección destacada (hero, selección, ráfagas o cintas de colibríes) y siempre en la galería, que es el archivo completo.

## Cómo está organizado

```
data/photos.json        primeras 43 fotos + colecciones + qué fotos van en hero, selección y ráfagas
data/photos_extra_*.txt resto de las fotos, una por línea: archivo|colección|f(vuelo)|nombre|científico|título|foco
data/site.json          textos, nombre, contacto
src/index.template.html plantilla con {{PLACEHOLDERS}}
build.py                optimiza fotos + genera index.html
assets/css, assets/js   estilos y comportamiento (a mano, sin build)
assets/vendor           GSAP, ScrollTrigger, Flip, Lenis (locales, sin CDN)
assets/fonts            Instrument Serif, Inter Tight, DM Mono (locales)
img/                    WebP optimizados (generado por build.py)
_originales/            fotos originales de Drive (NO van a git)
index.html              página final (generada, sí va a git)
```

## Trabajar en local

```bash
python build.py          # regenera img/ (solo lo que cambió) e index.html
python build.py --force  # re-optimiza todas las fotos
npx http-server . -p 5230 -c-1
```

Requiere Python 3.12 con Pillow (`pip install pillow`).

## Agregar o cambiar una foto

1. Copiar el JPG a `_originales/` (p. ej. `IMG_2000.jpg`; si viene en HEIC, convertirlo antes a JPG).
2. Agregar una línea en un `data/photos_extra_*.txt` (colecciones: `colibries`, `cantores`, `troncos`, `agua`, `loros`, `suelo`, `rapaces`, `fauna`, `paisaje`).
3. `python build.py` (la galería se ordena sola, intercalando colecciones y especies).

Las especies del catálogo son una identificación preliminar: **revisar con Diego**.

## Pendiente por confirmar

- **Apellido**: la firma en las fotos dice "D. Aranzazu" (con z); el pedido original decía "Aranzasu". Se cambia en `data/site.json` (`name`, `name_last`, `signature`) y se corre `python build.py`.
- **Contacto**: `data/site.json` → `contact`. Hoy el correo es un placeholder (`correo@ejemplo.com`); WhatsApp e Instagram vacíos (no se muestran hasta llenarlos).
- **URL pública**: `data/site.json` → `url` (para la imagen de redes sociales y `og:url`).
- **Textos** de "Sobre mí" y manifiesto: son borradores, ajustar con la voz de Diego.
- **IMG_0043** (gallineta morada, 485 px de ancho) quedó fuera por baja resolución; enviar una versión grande para incluirla.
- **Nombres de especie**: son una identificación mía a partir de las fotos (por eso muchos dicen solo "Tangara", "Colibrí" o "Ave de monte"); Diego puede corregirlos en los `.txt` y `photos.json`.
- Las 3 fotos `IMG_2024120…` venían en HEIC y se convirtieron a JPG (cuadradas, 1440 px).

## Publicar

Es un sitio 100 % estático con rutas relativas: sirve en GitHub Pages (rama `main`, carpeta raíz) o en cualquier hosting estático.
