"use strict";

function renderComments(){
 const el=$("#page-comments"); if(!el)return;
 const comments=[...project.comments].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 el.innerHTML=`
 <div class="page-head"><div><h2>Comentarios / historial</h2><p>Fecha, autor, tarea y paquete quedan asociados para poder analizarlos después.</p></div><button class="btn" onclick="exportCommentsCSV()">Exportar CSV</button></div>
 <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Autor</th><th>ID tarea</th><th>Paquete</th><th>Comentario</th></tr></thead><tbody>
 ${comments.map(c=>{const t=project.tasks.find(x=>x.id===c.taskId);const visible=c.taskDisplayId||taskDisplayId(t)||c.taskId;const taskCell=t?`<button class="btn" style="padding:3px 6px" onclick="openTask('${c.taskId}')">${esc(visible)}</button>`:`<span class="badge na">${esc(visible)} · tarea eliminada</span>`;return`<tr><td>${new Date(c.date).toLocaleString("es-AR")}</td><td>${esc(c.author)}</td><td>${taskCell}</td><td>${esc(c.package)}</td><td>${esc(c.text)}</td></tr>`}).join("")||'<tr><td colspan="5" class="empty">Todavía no hay comentarios.</td></tr>'}</tbody></table></div>`;
}
