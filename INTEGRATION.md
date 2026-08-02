# Plan de integración: `git` (contribution creatures) ← `test` + `librer-a-`

Este documento es el plan de trabajo para que **contribution creatures** deje
de tener su fetch y su renderer propios (todo hoy vive en un único `app.js`)
y pase a apoyarse en dos repos hermanos:

- **[`test`](https://github.com/malenitaa/test)** (dev-activity-api): reemplaza
  el fetch actual a `github-contributions-api.jogruber.de` por un backend
  propio que combina GitHub + GitLab + npm.
- **[`librer-a-`](https://github.com/malenitaa/librer-a-)** (pixel-activity-scene):
  reemplaza el motor de criaturas/canvas hecho a mano (`app.js:126-560`) por
  la librería genérica de escenas pixel, modo `jump`.

No es un simple `import` porque este repo hace más de lo que el modo `jump`
de la librería soporta hoy: **1 a 3 criaturas saltando en simultáneo**
repartiendo los días activos entre ellas (`app.js:492-497`), 3 sprites
distintos con hash fijo por orden (`slime`/`cat`/`ghost`), y un sintetizador
de audio "boing" por cada salto (`Boinger`, `app.js:303-337`). El modo `jump`
de la librería (`src/modes/jump.js`) hoy solo mueve **una** criatura. Esa
diferencia hay que resolverla con un modo custom, no perderla.

Cada fase está separada en pasos **de tu lado** (cuentas, credenciales,
decisiones de producto, revisión visual) y **de mi lado** (código). Nada de
esto se ejecuta todavía — es la hoja de ruta para acordar el orden antes de
tocar código de verdad.

## Arquitectura resultante

```
                     ┌─────────────┐
                     │   test      │  GET /v1/activity?github=...
                     │ (Cloudflare │  (reemplaza jogruber.de)
                     │  Worker)    │
                     └──────┬──────┘
                             │ { days: [{date, count, sources}] }
                             ▼
┌──────────────────────────────────────────────────┐
│  git (contribution creatures)                       │
│  fetch propio → fetch a test                          │
│                             │                          │
│                             ▼                          │
│              pixel-activity-scene (vendorizada)         │
│              modo custom "multi-jump" (extiende el        │
│              modo `jump` de librer-a- para 1-3 criaturas)   │
│              audio "boing" enganchado a cada salto            │
│              (fuera de la librería, en la capa de la app)      │
└──────────────────────────────────────────────────┘
```

`test` y `librer-a-` no se tocan para esto — son consumidos tal cual (con una
extensión vía plugin en el caso de la librería, no un fork).

---

## Fase 0 — Prerrequisitos compartidos con `git-flowers`

Estos dos pasos son comunes a la migración de `git` y de `git-flowers`; si ya
los hiciste para uno, no hace falta repetirlos.

**De tu lado:**
1. Cuenta gratuita de Cloudflare (si no tenés una).
2. En el repo `test`: `cd workers && npm install && npx wrangler login && npm run deploy`.
   Guardá la URL `*.workers.dev` que te devuelve — la vamos a necesitar en la
   Fase 2.
3. Decidir si querés dominio propio para esa Worker (opcional, no bloqueante).

**De mi lado:** nada en esta fase — no tengo credenciales tuyas de Cloudflare,
así que el deploy es 100% manual de tu parte. Si el deploy falla puedo ayudar
a diagnosticar el error de `wrangler`.

---

## Fase 1 — Vendorizar `pixel-activity-scene` en este repo

Este repo también es estático, sin bundler, con CSP estricta
(`script-src 'self'`, `index.html:6`, ver también `vercel.json`). Cargar la
librería desde un CDN rompería esa política y el principio de "cero
dependencias de terceros en runtime" que el propio README declara
explícitamente en la sección de seguridad. Por eso se resuelve
**vendorizando** el build, igual que en `git-flowers`.

**De mi lado:**
1. En `librer-a-`: `npm install && npm run build` → genera
   `dist/pixel-activity-scene.umd.cjs`.
2. Copiar ese archivo a `vendor/pixel-activity-scene.umd.js` (nuevo
   directorio en este repo).
3. Agregar `<script src="vendor/pixel-activity-scene.umd.js"></script>` en
   `index.html`, antes de `app.js`.
4. Documentar cómo actualizar el vendor cuando `librer-a-` publique cambios.

**De tu lado:** ninguno estrictamente necesario; opcionalmente revisar que
estés de acuerdo con vendorizar en vez de publicar a npm + CDN.

---

## Fase 2 — Migrar el fetch: `fetchContributions` → `test`

**De tu lado:**
- Confirmar la URL de la Worker desplegada en la Fase 0.
- Decidir: ¿mantenemos fallback a `jogruber.de` si `test` no responde? Este
  repo ya tiene un patrón de "fallback a cache vieja" (`app.js:208-214`); la
  recomendación es agregar `test` como fuente primaria y jogruber.de como
  fallback antes de recurrir a cache vieja, no como reemplazo total —
  reduce el riesgo de que un free tier nuevo sin historial de uptime tumbe
  la app.

**De mi lado:**
1. En `app.js`, constantes de configuración (líneas 7-19): reemplazar
   `API_BASE` por la URL de `test`, agregar `API_BASE_FALLBACK` si se aprueba
   el fallback.
2. Adaptar `fetchContributions` (líneas 182-215) y `normalizeContributions`
   (líneas 227-241) al shape de `test` (`{ days: [{date, count, sources}] }`)
   en vez del shape actual de jogruber.de
   (`{ contributions: [{date, count, level}] }`) — noten que `test` **no**
   calcula `level` (0-4), solo `count`; ese cálculo de nivel (`LEVEL_COLORS`,
   línea 17) hay que portarlo a este repo con los mismos umbrales que usa
   hoy jogruber.de, para que la grilla se vea igual.
3. `test` requiere `year` explícito por request (no hay equivalente al
   `?y=last` de una sola llamada). Este repo ya trabaja por "vista"
   (trimestre/año, `state.viewMode`, líneas 469-475) así que el impacto es
   menor que en `git-flowers`, pero igual hay que decidir si el toggle
   "ver año completo" dispara un nuevo fetch a `test` (con su propio caché
   en `localStorage`) — comportamiento a validar con vos.
4. Actualizar CSP `connect-src` en `index.html:6` (y `vercel.json`, que
   además define headers de seguridad HTTP reales) para incluir el host de
   la Worker de `test`.
5. Actualizar `README.md`/`INSTALACION.md`, sección "Cómo funciona".

**De tu lado (cierre de fase):** revisar visualmente con 2-3 usuarios reales
que la grilla y los niveles de color sigan viéndose igual que hoy, antes de
pasar a la Fase 3.

---

## Fase 3 — Migrar el render: modo custom `multi-jump`

El modo `jump` de `librer-a-` (`src/modes/jump.js`) mueve **una sola**
criatura entre celdas activas (`_cursor`, `_activeCells`). Este repo reparte
los días activos entre 1 a 3 criaturas según cuántos días activos haya
(`numCreatures`, `app.js:492`) y anima cada una con su propio timeline de
saltos por pasos discretos (no easing continuo — a propósito, según el
README: "es más simple de resolver a mano... que configurando GSAP para que
*no* interpole"). Esa mecánica de pasos + el audio por salto son las dos
cosas que hay que preservar explícitamente.

**De mi lado:**
1. Escribir un modo custom `multi-jump` en un nuevo archivo `multiJumpMode.js`,
   basado en la estructura de `src/modes/jump.js` de la librería pero:
   - En `setup`/`onDataChange`: en vez de una lista única `_activeCells`,
     repartir las celdas activas entre 1-3 instancias internas de
     "criatura", con la misma regla de `numCreatures` que hoy
     (`app.js:492`: 0 días activos → 0 criaturas, 1-3 → 1, 4-11 → 2, 12+ → 3).
   - Portar la clase `Creature` (segmentos, `buildSegments`, `tick`, arco de
     salto, `app.js:343-412`) tal cual, adaptando `cellCenter`/`layout` a los
     datos de grid que expone `context.grid` de la librería en vez de
     `computeLayout` propio.
   - Exponer un hook (callback en `update` o evento propio del modo) que
     dispare el sonido en cada aterrizaje — la librería no maneja audio, así
     que el `Boinger` (`app.js:303-337`) se mantiene tal cual, viviendo en la
     capa de la app, no en la librería, y se lo engancha desde ese hook.
   - Registrar los 3 sprites (`slime`, `cat`, `ghost`, `app.js:27-124`) como
     overrides de sprites del modo, uno por criatura activa, en el mismo
     orden fijo (`CREATURE_ORDER`) que usa hoy.
2. Reemplazar en `app.js` el bucle `animationFrame`/`drawGrid`/`drawCreatures`
   manual (líneas 512-567) por la instanciación de `PixelActivityScene` con
   `mode: 'multi-jump'` y `theme: 'night-violet'` (tema que ya trae
   `librer-a-` y coincide con la paleta violeta/rosa nocturna de este repo).
3. Mantener intactos: formulario de usuario, toggle trimestre/año, botón
   compartir, botón mute (enganchado al `Boinger`, que sigue siendo propio
   de esta app).
4. Eliminar el código de render/creature manual una vez confirmado que
   `multi-jump` cubre todo lo que hacía.

**De tu lado:**
- Revisar visualmente que las 1-3 criaturas sigan saltando con la misma
  sensación (arco, velocidad según nivel de commits, sonido en cada salto)
  que hoy — es el caso más fácil de perder matices en una migración apurada.
- Aprobar antes de borrar el código de render original.

---

## Fase 4 — Verificación y despliegue

**De mi lado:** correr localmente (`python3 -m http.server` o `npx serve .`)
y verificar los casos del README: usuario válido con mucha/poca actividad,
usuario inexistente, toggle trimestre/año, mute, compartir link.

**De tu lado:**
- Aprobación visual final.
- Push a la branch de deploy — Vercel se redespliega solo con el push (según
  `vercel.json`), no hace falta ningún paso manual adicional.

---

## Plan de rollback

Cada fase es un commit separado y reversible:

- Si `test` tiene downtime prolongado → revertir solo la Fase 2 (volver a
  `jogruber.de` como `API_BASE`), sin tocar la Fase 3.
- Si el modo `multi-jump` custom tiene un bug visual o de audio → revertir
  solo la Fase 3 (volver al render manual original), sin tocar la Fase 2.
- Recomendación: migrar fetch (Fase 2) y render (Fase 3) en commits/PRs
  separados, no juntos, para poder revertir cada uno de forma independiente.

---

## Checklist resumen

- [ ] **Vos:** desplegar `test` en Cloudflare Workers, pasar la URL
- [x] **Yo:** vendorizar `pixel-activity-scene` (Fase 1)
- [ ] **Yo:** migrar fetch/normalize a `test`, actualizar CSP y `vercel.json` (Fase 2)
- [ ] **Vos:** revisar visualmente Fase 2, aprobar
- [ ] **Yo:** modo custom `multi-jump` + audio enganchado + migración de `app.js` (Fase 3)
- [ ] **Vos:** revisar visualmente Fase 3 (arco, velocidad, sonido), aprobar
- [ ] **Yo:** verificación local de casos borde (Fase 4)
- [ ] **Vos:** aprobación final + push a la branch de deploy
