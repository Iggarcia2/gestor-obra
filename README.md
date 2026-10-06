# Gestor de Obra V0.4

Refactor modular del prototipo V0.3, preparado para múltiples obras, persistencia atómica y Firebase Firestore.

## Estructura

```text
index.html
.nojekyll
firestore.rules
css/
  estilos.css
data/
  plantilla_obra.json
js/
  core.js
  app.js
  calculos/
    rendimientos.js
  io/
    repositorio.js
    firebase.js
    firebase-config.js
  ui/
    dashboard.js
    configuracion.js
    tareas.js
    compras.js
    rendimientos.js
    comentarios.js
    ayuda.js
    modales.js
```

## Qué cambió

- La plantilla masiva salió del HTML y vive en `data/plantilla_obra.json`.
- Los estilos viven en `css/estilos.css`.
- Los cálculos métricos son funciones puras en `js/calculos/rendimientos.js`.
- La UI está separada por secciones.
- La persistencia pasa por `Repositorio` y no por accesos directos desde la UI.
- `localStorage` está particionado por `obraId` y por tipo de registro.
- Se soportan varias obras; el selector superior cambia el proyecto activo.
- Las tareas manuales y compras nuevas usan UUID interno y un ID corto visible.
- El adaptador Firestore está implementado pero desactivado por defecto.
- Se conserva importación/exportación JSON como respaldo.

## Uso local

La aplicación no necesita build ni npm. Para probar todo tal como funcionará en GitHub Pages, conviene servir la carpeta por HTTP:

```bash
python -m http.server 8000
```

Luego abrir `http://localhost:8000`.

También se puede abrir `index.html` con doble clic. Los scripts clásicos funcionan así, pero los navegadores suelen bloquear `fetch()` de archivos locales. Si no existe todavía ninguna obra guardada, la aplicación pedirá seleccionar manualmente `data/plantilla_obra.json`. Una vez creada la obra, el trabajo local queda en `localStorage` y no vuelve a necesitar la plantilla hasta crear otra obra.

## Múltiples obras

Cada obra tiene un `project.id` propio. En local se guarda con prefijos del tipo:

```text
gestorObra.v04.obras.{obraId}.meta
gestorObra.v04.obras.{obraId}.tasks.{taskId}
gestorObra.v04.obras.{obraId}.purchases.{purchaseId}
gestorObra.v04.obras.{obraId}.comments.{commentId}
```

Por eso crear una obra nueva no reemplaza la anterior.

## Firebase

1. Crear un proyecto y una app Web en Firebase Console.
2. Crear Cloud Firestore.
3. Copiar el objeto de configuración de la app a `js/io/firebase-config.js`.
4. Cambiar `enabled: false` por `enabled: true`.
5. Publicar temporalmente las reglas de `firestore.rules` durante la etapa de validación.
6. Abrir la app y crear una obra nueva. El seed se escribe con un `WriteBatch`.

La estructura usada es:

```text
obras/{obraId}
  config/general
  tareas/{taskId}
  compras/{purchaseId}
  comentarios/{commentId}
```

> **Importante:** las reglas incluidas permiten lectura y escritura sin autenticación y son solamente para pruebas. Antes de usar la app con datos reales hay que implementar autenticación y reglas restrictivas.

Firestore usa listeners `onSnapshot()` para tareas, compras y comentarios. La persistencia offline se activa con `enablePersistence({ synchronizeTabs: true })`.

## GitHub Pages

Subir toda la carpeta conservando la estructura y el archivo `.nojekyll`. Activar GitHub Pages desde la rama principal. Al ejecutarse por HTTPS, `fetch('./data/plantilla_obra.json')` funciona normalmente y también queda disponible la File System Access API en navegadores compatibles.
