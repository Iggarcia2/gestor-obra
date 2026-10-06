"use strict";

function uniqueTask(key){return [...new Set(project.tasks.map(t=>t[key]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"es"));}
function quickStatusClass(status){
  if(status==="Bloqueada 🔴")return"status-blocked";
  if(status==="Espera control ⚠️")return"status-review";
  if(status==="Terminada ✅")return"status-done";
  if(status==="Lista 🟢")return"status-ready";
  if(status==="En curso")return"status-progress";
  if(status==="No aplica")return"status-na";
  return"";
}
async function updateTaskStatusQuick(id,value){
  const t=project.tasks.find(x=>x.id===id); if(!t)return;
  const campos={status:value};
  if(value==="No aplica") campos.applies="No";
  else if(t.applies==="No") campos.applies="Sí";
  if(value==="Terminada ✅" && t.requiresReview==="Sí" && t.reviewed!=="Sí"){
    campos.status="Espera control ⚠️";
    toast("La tarea requiere visto antes de marcarla Terminada.");
  }
  const preview={...t,...campos};
  campos.ready=taskReady(preview).ok?"Sí":"No";
  await Repositorio.actualizarTarea(id,campos);
  renderDashboard();renderTasks();
}
function renderTasks(){
 const el=$("#page-tasks"); if(!el)return;
 let list=project.tasks.filter(t=>{
   const q=filters.q.toLowerCase();
   return (!q || [taskDisplayId(t),t.id,t.name,t.package,t.subpackage,t.currentComment].some(v=>String(v||"").toLowerCase().includes(q)))
    &&(!filters.package||t.package===filters.package)&&(!filters.status||t.status===filters.status)
    &&(!filters.owner||t.owner===filters.owner)&&(!filters.zone||t.zone===filters.zone);
 });
 const pages=Math.max(1,Math.ceil(list.length/taskPageSize)); if(taskPage>pages)taskPage=pages;
 const start=(taskPage-1)*taskPageSize; const page=list.slice(start,start+taskPageSize);
 el.innerHTML=`
 <div class="page-head"><div><h2>Tareas / EDT</h2><p>${project.tasks.length} tareas de ${esc(project.project.name)}.</p></div><div class="toolbar"><button class="btn primary" onclick="openNewTask()">+ Tarea imprevista</button></div></div>
 <div class="filters">
  <input placeholder="Buscar tarea, ID, paquete..." value="${esc(filters.q)}" oninput="setTaskFilter('q',this.value)">
  <select onchange="setTaskFilter('package',this.value)"><option value="">Todos los paquetes</option>${uniqueTask("package").map(v=>`<option ${filters.package===v?"selected":""}>${esc(v)}</option>`).join("")}</select>
  <select onchange="setTaskFilter('status',this.value)"><option value="">Todos los estados</option>${STATUSES.map(v=>`<option ${filters.status===v?"selected":""}>${esc(v)}</option>`).join("")}</select>
  <select onchange="setTaskFilter('owner',this.value)"><option value="">Responsable</option>${uniqueTask("owner").map(v=>`<option ${filters.owner===v?"selected":""}>${esc(v)}</option>`).join("")}</select>
  <select onchange="setTaskFilter('zone',this.value)"><option value="">Ambiente / zona</option>${uniqueTask("zone").map(v=>`<option ${filters.zone===v?"selected":""}>${esc(v)}</option>`).join("")}</select>
 </div>
 <div class="table-wrap"><table><thead><tr><th>ID</th><th>Paquete</th><th>Tarea</th><th>Zona</th><th>Responsable</th><th>Fecha</th><th>Estado</th><th>Control</th><th>¿Lista?</th></tr></thead><tbody>
 ${page.map(t=>{const r=taskReady(t);return`<tr class="clickable" onclick="openTask('${t.id}')">
  <td class="cell-intrinsic"><b>${esc(taskDisplayId(t))}</b></td><td class="cell-intrinsic">${esc(t.package)}</td><td class="cell-intrinsic">${esc(t.name)}</td>
  <td class="cell-editable">${esc(t.zone||"—")}</td><td class="cell-editable">${esc(t.owner||"—")}</td><td class="cell-editable">${fmtDate(t.targetDate)}</td>
  <td class="cell-editable" onclick="event.stopPropagation()"><select class="quick-status ${quickStatusClass(t.status)}" onchange="updateTaskStatusQuick('${t.id}',this.value)">${STATUSES.map(s=>`<option ${t.status===s?"selected":""}>${esc(s)}</option>`).join("")}</select></td><td class="cell-editable">${t.requiresReview==="Sí"?`⚠️ ${t.reviewed==="Sí"?"Visto":"Pendiente"}`:"—"}</td>
  <td class="cell-computed">${r.ok?'<span class="badge ready">Sí</span>':`<span class="badge pending">No</span>`}</td></tr>`}).join("")||'<tr><td colspan="9" class="empty">No hay resultados.</td></tr>'}
 </tbody></table></div>
 <div class="pagination"><span>Mostrando ${list.length?start+1:0}–${Math.min(start+taskPageSize,list.length)} de ${list.length}</span><div><button onclick="changeTaskPage(-1)">Anterior</button> <span style="padding:0 7px">Página ${taskPage}/${pages}</span> <button onclick="changeTaskPage(1)">Siguiente</button></div></div>`;
}
function setTaskFilter(k,v){filters[k]=v;taskPage=1;renderTasks();}
function changeTaskPage(d){taskPage=Math.max(1,taskPage+d);renderTasks();}

function selectHtml(name,value,options,cls=""){
 return `<select name="${name}" class="${cls}">${options.map(o=>`<option ${String(value)===String(o)?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
}
function inputHtml(name,value,type="text"){return `<input name="${name}" type="${type}" value="${esc(value??"")}">`;}
function openTask(id){
 const t=project.tasks.find(x=>x.id===id); if(!t)return;
 const manual=t.origin==="Agregada durante obra"; const ready=taskReady(t);
 $("#modalTitle").textContent=`${taskDisplayId(t)} · ${t.name}`;
 $("#modalBody").innerHTML=`
 <form id="taskForm"><div class="form-grid">
  <div class="field readonly"><label>ID visible</label><div class="readonly-box">${esc(taskDisplayId(t))}</div></div>
  <div class="field readonly"><label>Origen</label><div class="readonly-box">${esc(t.origin)}</div></div>
  <div class="field"><label>Evaluar para plantilla futura</label>${selectHtml("evaluateForTemplate",t.evaluateForTemplate||"No",YESNO)}</div>

  <div class="field ${manual?"":"readonly"}"><label>Paquete (Nivel 1)</label>${manual?selectHtml("package",t.package||"",project.packages.map(p=>p.name)): `<div class="readonly-box">${esc(t.package)}</div>`}</div>
  <div class="field ${manual?"":"readonly"}"><label>Subpaquete (Nivel 2)</label>${manual?inputHtml("subpackage",t.subpackage):`<div class="readonly-box">${esc(t.subpackage||"")}</div>`}</div>
  <div class="field ${manual?"":"readonly"}"><label>Tipo</label>${manual?selectHtml("type",t.type||"Ejecución",["Ejecución","Definición","💡 Decidir","Gestión / Resolver","Control ⚠️","Compra / Material","Espera / Secado","Limpieza / Preparación"]):`<div class="readonly-box">${esc(t.type)}</div>`}</div>

  <div class="field span3 ${manual?"":"readonly"}"><label>Tarea</label>${manual?inputHtml("name",t.name):`<div class="readonly-box">${esc(t.name)}</div>`}</div>

  <div class="field"><label>Aplica</label>${selectHtml("applies",t.applies||"Sí",YESNO)}</div>
  <div class="field"><label>Ambiente / Zona</label>${inputHtml("zone",t.zone)}</div>
  <div class="field"><label>Equipo ejecutor</label>${inputHtml("executor",t.executor)}</div>

  <div class="field"><label>Responsable gestión</label>${selectHtml("owner",t.owner||"Juan",["Juan","Vos","Ambos"])}</div>
  <div class="field"><label>Fecha objetivo</label>${inputHtml("targetDate",t.targetDate,"date")}</div>
  <div class="field"><label>Estado</label>${selectHtml("status",t.status||"Pendiente",STATUSES)}</div>

  <div class="field"><label>Requiere visto</label>${selectHtml("requiresReview",t.requiresReview||"No",YESNO)}</div>
  <div class="field"><label>Visto</label>${selectHtml("reviewed",t.reviewed||"No",YESNO)}</div>
  <div class="field"><label>¿Lista para hacer? (automático)</label><div class="computed-box">${ready.ok?"🟢 Sí":"🔴 No"} · ${esc(ready.reason)}</div></div>

  <div class="field"><label>Compra anticipada</label>${selectHtml("advancePurchase",t.advancePurchase||"No",YESNO)}</div>
  <div class="field"><label>Fecha necesaria material</label>${inputHtml("materialNeededDate",t.materialNeededDate,"date")}</div>
  <div class="field"><label>Anticipación (días)</label>${inputHtml("anticipationDays",t.anticipationDays,"number")}</div>

  <div class="field span3"><label>Motivo / bloqueo</label>${inputHtml("blockReason",t.blockReason)}</div>
  <div class="field span3"><label>Nota actual</label><textarea name="currentComment">${esc(t.currentComment||"")}</textarea></div>
  <div class="field span3 readonly"><label>Evidencia / Fotos</label><div class="readonly-box">Campo reservado. Esta versión todavía no almacena fotografías.</div></div>
  ${manual?`<div class="field span3 readonly"><label>ID interno</label><div class="readonly-box" style="font-family:monospace;font-size:11px">${esc(t.id)}</div></div>`:""}
 </div></form>
 <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">
 <div class="grid2">
  <div><h4 style="margin:0 0 8px">Agregar comentario al historial</h4><div class="field"><textarea id="newTaskComment" placeholder="Escribí el comentario..."></textarea></div><button class="btn" onclick="addCommentToTask('${t.id}')">Agregar comentario</button></div>
  <div><h4 style="margin:0 0 8px">Historial</h4><div class="comment-stream">${taskComments(t.id).map(c=>`<div class="comment"><div class="meta">${fmtDate((c.date||"").slice(0,10))} · ${esc(c.author)} · ${esc(c.package||"")}</div>${esc(c.text)}</div>`).join("")||'<div class="empty">Sin comentarios.</div>'}</div></div>
 </div>`;
 $("#modalActions").innerHTML=`${manual?`<button class="btn danger" onclick="deleteTask('${t.id}')">Eliminar tarea</button>`:""}<button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveTask('${t.id}')">Guardar tarea</button>`;
 openModal();
}
async function saveTask(id){
 const t=project.tasks.find(x=>x.id===id); if(!t)return;
 const f=new FormData($("#taskForm"));
 const campos={};
 ["evaluateForTemplate","package","subpackage","type","name","applies","zone","executor","owner","targetDate","status","requiresReview","reviewed","advancePurchase","materialNeededDate","anticipationDays","blockReason","currentComment"].forEach(k=>{
   if(f.has(k))campos[k]=f.get(k);
 });
 if(campos.applies==="No") campos.status="No aplica";
 if(campos.applies==="Sí"&&campos.status==="No aplica")campos.status="Pendiente";
 campos.manageStartDate=campos.materialNeededDate?addDays(campos.materialNeededDate,-num(campos.anticipationDays)):"";
 const preview={...t,...campos};
 campos.ready=taskReady(preview).ok?"Sí":"No";
 await Repositorio.actualizarTarea(id,campos);
 closeModal();renderAll();toast("Tarea actualizada");
}
async function openNewTask(){
 const id=uid();
 const t={id,displayId:shortRecordId("M",id),package:project.packages[0]?.name||"",subpackage:"Imprevistos / manual",name:"Nueva tarea",type:"Gestión / Resolver",applies:"Sí",zone:"Toda la obra",executor:"",owner:"Juan",targetDate:"",status:"Pendiente",requiresReview:"No",reviewed:"No",advancePurchase:"No",materialNeededDate:"",anticipationDays:"",manageStartDate:"",ready:"No",blockReason:"",currentComment:"",evidence:"",origin:"Agregada durante obra",evaluateForTemplate:"Sí"};
 await Repositorio.crearTarea(t);renderTasks();openTask(id);
}
async function deleteTask(id){
 if(!confirm("¿Eliminar esta tarea manual?"))return;
 await Repositorio.eliminarTarea(id);closeModal();renderAll();
}
async function addCommentToTask(id){
 const area=$("#newTaskComment"), text=area?.value.trim(); if(!text)return;
 const t=project.tasks.find(x=>x.id===id);
 const c={id:uid(),date:nowISO(),author:project.project.activeUser||"Juan",taskId:id,taskDisplayId:taskDisplayId(t),package:t?.package||"",text};
 await Repositorio.agregarComentario(c);
 area.value=""; openTask(id); renderComments(); toast("Comentario agregado");
}
