# Estado de implementación V0.4

## Cambio adicional: soporte multiobra

La arquitectura no asume una única vivienda. Cada proyecto tiene un `obraId` independiente y puede seleccionarse desde la barra superior.

Esto aplica tanto al adaptador local como a Firestore:

```text
obras/{obraId}
  config/general
  tareas/{taskId}
  compras/{purchaseId}
  comentarios/{commentId}
```

## Fase 1 — Modularización

- [x] `data/plantilla_obra.json` extraído del `#templateData` original.
- [x] `fetch('./data/plantilla_obra.json')` utilizado solamente al crear/inicializar una obra nueva.
- [x] Fallback de selección manual de la plantilla al abrir por `file://`.
- [x] CSS extraído a `css/estilos.css`.
- [x] Cálculos puros extraídos a `js/calculos/rendimientos.js`.
- [x] UI separada en archivos clásicos y secuenciales, sin bundler.

## Fase 2 — Persistencia desacoplada

- [x] Tareas manuales con `crypto.randomUUID()` como ID interno.
- [x] ID visible corto `M-XXXX` para tareas manuales.
- [x] Compras nuevas también usan UUID interno e ID visible `C-XXXX`.
- [x] Capa `Repositorio` entre UI y persistencia.
- [x] Adaptador `localStorage` particionado por obra y registro.
- [x] Migración automática del antiguo `gestorObraV01.currentProject` si no existe todavía un catálogo V0.4.
- [x] Soporte para múltiples obras y selector de proyecto.
- [x] Comentarios append-only; eliminar una tarea no borra su historial.

## Fase 3 — Firestore

- [x] Adaptador `js/io/firebase.js` implementado.
- [x] `config/general` como documento agregado de configuración, pesos, coeficientes, calculadoras y settings.
- [x] Tareas, compras y comentarios en documentos independientes.
- [x] `onSnapshot()` para tareas, compras, comentarios y datos generales.
- [x] Persistencia offline con `enablePersistence({synchronizeTabs:true})`.
- [x] `firestore.rules` de validación inicial abierto, con advertencia de no usarlo en producción.
- [ ] Crear el proyecto real en Firebase Console y cargar su configuración en `firebase-config.js`.
- [ ] Reemplazar las reglas abiertas por autenticación y reglas restrictivas antes de uso real.

## Fase 4 — Inicialización, pruebas y publicación

- [x] Seed de proyecto nuevo mediante `WriteBatch` en el adaptador Firestore.
- [x] Protección para no superar el límite seguro del batch.
- [x] `.nojekyll` incluido para GitHub Pages.
- [x] README con instrucciones de publicación.
- [x] Prueba local de aislamiento entre dos obras.
- [x] Prueba de persistencia atómica local de tareas y comentarios.
- [x] Verificación de las funciones de cálculo.
- [x] Verificación de sintaxis de todos los archivos JavaScript.
- [x] Verificación de que la plantilla externa contiene exactamente las mismas estructuras que el JSON incrustado original: 232 tareas, 27 compras y 53 campos de configuración.
- [ ] Prueba real de concurrencia PC + celular contra Firestore, pendiente de conectar el proyecto Firebase.
- [ ] Publicación real en GitHub Pages, pendiente del repositorio de destino.

## Decisiones de concurrencia

Las escrituras de tareas y compras afectan únicamente el documento modificado. Los comentarios crean documentos nuevos. La marca `updatedAt` de la obra se actualiza por separado sin reescribir nombre, usuario u otros metadatos, evitando que un cliente con datos viejos pise cambios de otro dispositivo.

## Nota sobre apertura por doble clic

Los scripts clásicos, CSS y la interfaz pueden cargarse por `file://`. El punto excepcional es el `fetch()` del JSON externo: los navegadores suelen bloquearlo por política de origen local. Por eso, solo cuando hace falta crear una obra nueva bajo `file://`, la app ofrece seleccionar manualmente `data/plantilla_obra.json`. En HTTP/HTTPS —incluido GitHub Pages— el `fetch()` funciona directamente.
