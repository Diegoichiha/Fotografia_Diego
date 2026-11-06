# Diego Aranzazu — Portafolio de fotografía de aves

Sitio estático (HTML + CSS + JS, sin frameworks) para el portafolio del fotógrafo de naturaleza Diego Aranzazu.
43 fotografías de aves y fauna de Colombia, con scroll suave, scroll horizontal, comparador de ráfagas, galería filtrable y visor a pantalla completa.

## Secciones

1. **Preloader** con diafragma de cámara que se abre.
2. **Hero** a pantalla completa con 5 fotos que rotan, nombre gigante y parallax con el mouse.
3. **Marquee** de especies con velocidad ligada al scroll.
4. **Manifiesto** con revelado palabra por palabra y datos reales sacados de los EXIF (alcance, obturación).
5. **Selección**: 7 fotos en scroll horizontal fijado (en móvil, carrusel táctil).
6. **Ráfagas**: pares de disparos tomados con 1–2 s de diferencia, con barrido A → B al hacer scroll.
7. **Banda panorámica** con parallax.
8. **Colecciones**: índice con foto flotante que sigue el cursor; al hacer clic filtra la galería.
9. **Galería completa**: filas justificadas, filtros animados (GSAP Flip) y visor con teclado, gestos táctiles y datos de la toma.
10. **Sobre mí** con las fotos del fotógrafo, equipo y principios de trabajo.
11. **Contacto** y pie de página.

## Cómo está organizado

```
data/photos.json        catálogo: título, especie, colección, punto focal, orden de la galería
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

1. Copiar el JPG a `_originales/` (p. ej. `IMG_0100.jpg`).
2. Agregar una entrada en `data/photos.json` (el orden del arreglo es el orden de la galería).
3. `python build.py`.

Las especies del catálogo son una identificación preliminar: **revisar con Diego**.

## Pendiente por confirmar

- **Apellido**: la firma en las fotos dice "D. Aranzazu" (con z); el pedido original decía "Aranzasu". Se cambia en `data/site.json` (`name`, `name_last`, `signature`) y se corre `python build.py`.
- **Contacto**: `data/site.json` → `contact`. Hoy el correo es un placeholder (`correo@ejemplo.com`); WhatsApp e Instagram vacíos (no se muestran hasta llenarlos).
- **URL pública**: `data/site.json` → `url` (para la imagen de redes sociales y `og:url`).
- **Textos** de "Sobre mí" y manifiesto: son borradores, ajustar con la voz de Diego.
- **IMG_0043** (gallineta morada, 485 px de ancho) quedó fuera por baja resolución; enviar una versión grande para incluirla.

## Publicar

Es un sitio 100 % estático con rutas relativas: sirve en GitHub Pages (rama `main`, carpeta raíz) o en cualquier hosting estático.
