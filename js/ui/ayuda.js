"use strict";

function renderHelp(){
 const mode=Repositorio?.nombre?.()||"persistencia local";
 $("#page-help").innerHTML=`
 <div class="page-head"><div><h2>Ayuda / almacenamiento</h2><p>Gestor de Obra V0.4 modular y preparado para múltiples proyectos.</p></div></div>
 <div class="grid2">
  <div class="card pad"><h3 class="section-title">Cómo guarda</h3>
   <p>Modo activo: <b>${esc(mode)}</b>.</p>
   <p>En local, cada obra se guarda por separado detrás de una capa de repositorio. Tareas, compras y comentarios se actualizan como registros individuales.</p>
   <p>Cuando Firebase está habilitado, cada obra vive bajo <code>obras/{obraId}</code> y los cambios de tareas, compras y comentarios se sincronizan con Firestore.</p>
   <div class="alert info">El selector superior permite cambiar de obra sin reemplazar ni mezclar sus datos.</div>
  </div>
  <div class="card pad"><h3 class="section-title">Archivos JSON</h3>
   <p><b>Abrir JSON</b> importa o actualiza una obra identificada por su <code>project.id</code>.</p>
   <p><b>Guardar</b> persiste y además permite escribir/exportar el JSON actual. <b>Guardar copia</b> descarga un backup.</p>
   <p>Las tareas manuales usan UUID como identificador interno y un ID corto legible para la pantalla.</p>
  </div>
 </div>
 <div class="card pad" style="margin-top:14px"><h3 class="section-title">Regla de uso</h3>
  <p>La herramienta gestiona y anticipa; no reemplaza planos, cálculos, ensayos ni aprobaciones del profesional responsable.</p>
 </div>`;
}
