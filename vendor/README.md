# vendor/

Build UMD vendorizado de [`pixel-activity-scene`](https://github.com/malenitaa/librer-a-),
copiado en vez de cargado desde un CDN, porque la CSP de este repo
(`script-src 'self'`, ver `index.html`) no permite scripts de terceros.

| | |
|---|---|
| Fuente | `malenitaa/librer-a-` |
| Versión | `0.1.0` (`package.json`) |
| Commit vendorizado | `56c5a10` |
| Archivo original | `dist/pixel-activity-scene.umd.cjs` |
| Expone | `window.PixelActivityScene` (global UMD) |

## Cómo actualizar

Cuando `librer-a-` tenga cambios que querramos traer acá:

```bash
git clone https://github.com/malenitaa/librer-a-.git
cd librer-a-
npm install
npm run build
cp dist/pixel-activity-scene.umd.cjs /ruta/a/este/repo/vendor/pixel-activity-scene.umd.js
```

Después actualizar la tabla de arriba (versión y commit) en este mismo
archivo, y probar localmente antes de commitear — no hay build step
automático que valide esto en CI todavía.
