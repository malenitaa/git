# contribution creatures

Página web standalone (HTML/CSS/JS puro, sin build, sin backend) que convierte el
contribution graph de un usuario de GitHub en una escena pixel donde criaturitas
(slime, gato, fantasma) van saltando de cuadrado en cuadrado según la actividad
real de commits.

> Este es el README **técnico** (arquitectura, seguridad, deploy). Si buscás
> una guía de instalación en criollo sin usar la terminal, es
> [`INSTALACION.md`](./INSTALACION.md). Licencia: [MIT](./LICENSE).

## Cómo funciona

- **Datos**: GitHub no expone una API pública sin auth para el contribution
  calendar (el campo `contributionsCollection` de la GraphQL API requiere un
  token personal, que no se puede exponer de forma segura en una app 100%
  cliente). Este proyecto usa
  [`github-contributions-api.jogruber.de`](https://github.com/grubersjoe/github-contributions-api),
  una API de terceros gratuita, sin key/token, con CORS habilitado para fetch
  directo desde el navegador — es la misma que usa la librería
  `react-github-calendar`. Endpoint: `GET /v4/{username}?y=last`.
- **Cache**: la respuesta se guarda en `localStorage` por 15 minutos
  (`ghcc:v1:{usuario}`) para no golpear la API en cada refresh. Si la API
  falla pero hay algo en cache (aunque esté vencido), se usa igual y se avisa
  en pantalla.
- **Grilla**: se arma igual que la de GitHub (53 semanas x 7 días, columnas =
  semanas), coloreada por nivel de intensidad (0-4) con la paleta violeta →
  rosa.
- **Criaturas y saltos ("hop")**: se toman los días con actividad en el rango
  visible y se reparten entre 1-3 criaturas (más días activos → más
  criaturas). Cada criatura arma un timeline de saltos: por cada tramo
  cuadrado→cuadrado se calcula la distancia en píxeles y se divide por un
  *step* fijo para obtener la cantidad de pasos de la animación; días con más
  commits generan menos pasos (salto más rápido) y más altura de arco (salto
  más grande). La posición y el frame del sprite solo se actualizan una vez
  por *tick* (~11 fps), no hay interpolación suave — es el mismo approach que
  usan cosas tipo "Slime Contributions", pero con estética propia.
- **Render**: todo en un único `<canvas>` (nada de cientos de nodos DOM
  animados), sprites pixel dibujados a mano con `fillRect` (sin archivos de
  imagen).
- **Audio**: un "boing" corto sintetizado con Web Audio (oscilador + envolvente),
  sin samples/assets. Botón de mute arriba a la derecha.
- **Por defecto** se muestra el último trimestre (mejor performance con
  usuarios con años de historial); hay un botón para ver el año completo.
- **Compartir**: el usuario cargado queda en la URL (`?user=alguien`) y hay un
  botón que copia ese link al portapapeles.

### ¿Por qué no GSAP?

Se evaluó, pero el timeline de saltos por pasos discretos (no easing suave) es
más simple de resolver a mano con `requestAnimationFrame` que configurando
GSAP para que *no* interpole. Evitarlo también permite mantener una CSP bien
estricta (`script-src 'self'`, sin CDNs) y el proyecto en cero dependencias.

## Estructura

```
index.html   → markup + CSP
style.css    → estética pixel nocturna (violeta/lavanda/rosa)
app.js       → fetch + cache + grilla + criaturas + audio + UI
```

Sin `node_modules`, sin bundler, sin paso de build.

## Correr local

Cualquier servidor estático sirve (hace falta servir por http, `file://`
puede pisar el fetch por CORS/CSP en algunos navegadores):

```bash
python3 -m http.server 8000
# o
npx serve .
```

Después abrir `http://localhost:8000?user=TU_USUARIO`.

## Deploy

### GitHub Pages

1. Settings → Pages → Deploy from branch → elegir la branch y carpeta raíz (`/`).
2. Listo, no hace falta ningún build step.

### Vercel

1. Importar el repo en Vercel.
2. Framework preset: "Other" / static — no hay comando de build ni output
   directory especial (se sirve el root tal cual).
3. [`vercel.json`](./vercel.json) ya incluye los headers de seguridad
   (CSP, `X-Frame-Options`, `Referrer-Policy`, etc.) — no hace falta
   configurar nada extra.

## Seguridad

- Cero backend propio: todo corre en el navegador de quien visita la página.
  No hay servidor, base de datos ni sesión que atacar.
- La única API externa usada es de solo lectura, pública, sin token/key
  expuesto en el cliente (no hace falta ninguno).
- Cero dependencias de terceros cargadas en runtime (no hay CDN de JS/CSS,
  no hay `npm install` en el bundle final) — elimina el vector de supply
  chain más común en este tipo de proyectos.
- CSP en el `<meta>` de `index.html` restringe `connect-src` únicamente al
  dominio de la API de contribuciones, y bloquea scripts/estilos inline y de
  cualquier origen que no sea el propio (`script-src 'self'`, sin
  `unsafe-inline` ni `unsafe-eval`).

### Revisión OWASP (client-side, sin backend)

La mayoría de las categorías clásicas del OWASP Top 10 no aplican porque no
hay servidor, base de datos ni autenticación propios (inyección SQL, broken
auth, SSRF, etc. quedan fuera de alcance). Lo que sí se revisó y se
endureció, pensando en A03 (Injection/XSS), A05 (Security Misconfiguration)
y A08 (Software and Data Integrity Failures):

| Riesgo | Estado | Mitigación |
|---|---|---|
| XSS reflejado vía `?user=` o input | Cubierto | El username se valida contra un whitelist (`/^[a-zA-Z0-9][a-zA-Z0-9-]*$/`) antes de usarse, y todo texto dinámico se inserta con `textContent`/`.value`, nunca `innerHTML` con datos externos (los únicos `innerHTML` usados interpolan solo números ya calculados por la propia app). |
| Inyección de host/SSRF vía username manipulado | Cubierto | El username solo se concatena como *path segment* (`encodeURIComponent`) sobre un `API_BASE` hardcodeado con esquema `https://` fijo — no hay forma de que el input cambie el host o el protocolo de la request. |
| Datos externos (API de terceros / localStorage) sin validar tipos | Corregido en esta revisión | `normalizeContributions()` en `app.js` filtra entradas con fecha no-ISO y coacciona `count`/`level` a números en rango válido antes de usarlos, así un valor corrupto no genera un total con concatenación de strings ni rompe el layout de la grilla (NaN). |
| Filtración de la URL (con el username) al dominio de terceros vía `Referer` | Corregido en esta revisión | `<meta name="referrer" content="strict-origin-when-cross-origin">` en `index.html`. |
| Clickjacking (falta `frame-ancestors`/`X-Frame-Options`) | Mitigado donde el hosting lo permite | `<meta http-equiv="Content-Security-Policy">` no puede llevar `frame-ancestors` (limitación del spec, no de esta app). Para Vercel se agregó [`vercel.json`](./vercel.json) con `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Permissions-Policy` restrictiva a nivel de header HTTP real. GitHub Pages no soporta headers custom, así que en ese hosting queda como riesgo residual — bajo impacto porque la página no tiene acciones destructivas ni de escritura que un clickjack pueda explotar. |
| Reverse tabnabbing (`target="_blank"` sin `rel="noopener"`) | No aplica | La página no tiene links `<a>` salientes. |
| Secretos/tokens expuestos en el cliente | No aplica | La API usada no requiere key; no hay ningún secreto en el bundle. |
| Datos sensibles en `localStorage` | Bajo riesgo aceptado | Solo se cachea el contribution graph público de un usuario (no es información sensible ni privada). |

## Límites conocidos

- La API de terceros cachea 1h de su lado y tiene rate limit propio; si algún
  día deja de estar disponible, se puede self-hostear el mismo proyecto
  (es open source) y cambiar `API_BASE` en `app.js`.
- El layout de sprites es pixel art hecho a mano en `app.js` (arrays de
  8x7), no hay archivos de imagen que reemplazar si se quiere ajustar el
  diseño de las criaturas.
