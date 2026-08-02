# Cómo poner esto en internet (sin saber programar)

Esta guía es para vos si nunca usaste una terminal ni "GitHub para
programar" — solo querés tener tu propia página con las criaturitas
funcionando, con un link para mandarle a alguien.

No hace falta instalar ningún programa en tu computadora. Todo se hace
desde el navegador.

## Opción recomendada: GitHub Pages (gratis)

### Paso 1 — Crear una cuenta de GitHub

Si ya tenés una, saltá al paso 2.

1. Andá a [github.com](https://github.com) y hacé clic en **Sign up**.
2. Seguí los pasos (email, contraseña, nombre de usuario).

### Paso 2 — Crear un repositorio nuevo

Un "repositorio" es, para esto, simplemente una carpeta donde van a vivir
los archivos de la página.

1. Arriba a la derecha, hacé clic en el **+** y elegí **New repository**.
2. Ponele un nombre, por ejemplo `mis-criaturas`.
3. Dejalo en **Public**.
4. Hacé clic en **Create repository**.

### Paso 3 — Subir los archivos

1. En la página del repositorio recién creado, buscá el link que dice
   **uploading an existing file** (o el botón **Add file → Upload files**).
2. Arrastrá y soltá estos 4 archivos ahí (los mismos que están en esta
   carpeta del proyecto):
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md` (opcional, no afecta el funcionamiento)
3. Abajo de todo, hacé clic en **Commit changes** (o "Guardar cambios").

### Paso 4 — Activar GitHub Pages

1. En el repositorio, andá a la pestaña **Settings**.
2. En el menú de la izquierda, buscá **Pages**.
3. Donde dice **Branch**, elegí `main` (o la que tengas) y la carpeta
   `/ (root)`.
4. Hacé clic en **Save**.
5. Esperá un minuto y refrescá la página. Va a aparecer un mensaje con tu
   link, algo como:

   `https://tu-usuario.github.io/mis-criaturas/`

### Paso 5 — Usarlo

Abrí ese link y agregale al final `?user=` y el usuario de GitHub que
querés ver saltando, por ejemplo:

```
https://tu-usuario.github.io/mis-criaturas/?user=torvalds
```

También podés simplemente escribir el usuario en el buscador de arriba de
la página, sin tocar el link.

### Para compartirlo

Una vez que cargaste un usuario, aparece un botón con un ícono de cadena
(🔗) arriba a la derecha. Hacé clic ahí y el link (ya con el usuario
incluido) se copia solo — pegalo donde quieras mandarlo.

## Opción alternativa: Vercel (también gratis, un toque más rápida)

1. Andá a [vercel.com](https://vercel.com) y creá una cuenta (podés usar
   tu cuenta de GitHub para entrar directo).
2. Hacé clic en **Add New → Project**.
3. Elegí el repositorio que creaste en el Paso 2 de arriba.
4. Dejá todas las opciones por defecto y hacé clic en **Deploy**.
5. En un minuto te da un link tipo `https://mis-criaturas.vercel.app`.

## ¿Y si no quiero subir nada a internet?

Se puede abrir el archivo `index.html` directo en tu computadora
haciéndole doble clic, pero **no va a poder cargar los datos de
GitHub** (los navegadores bloquean ese tipo de pedido cuando el archivo
se abre así, sin estar "hosteado" en algún lado). Para que funcione de
verdad hace falta alguna de las dos opciones de arriba.

## Algo salió mal

- **"no se encontró a @usuario"**: revisá que el nombre de usuario de
  GitHub esté bien escrito (sin `@`, sin espacios).
- **La página carga pero no aparecen las criaturas**: puede ser que ese
  usuario no tenga actividad pública reciente. Probá con otro usuario,
  como `torvalds`.
- **No aparece nada al abrir el link de GitHub Pages**: esperá 1-2
  minutos después del Paso 4, a veces tarda en activarse la primera vez.
