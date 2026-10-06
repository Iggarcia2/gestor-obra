"use strict";

async function refreshProjectSelector(){
  const select=$("#projectSelect"); if(!select)return;
  const obras=await Repositorio.listarObras();
  if(!obras.length){select.innerHTML='<option value="">Sin obras</option>';return;}
  const counts={};obras.forEach(o=>counts[o.name]=(counts[o.name]||0)+1);
  select.innerHTML=obras.map(o=>{
    const suffix=counts[o.name]>1?` · ${String(o.id).slice(0,6)}`:"";
    return `<option value="${esc(o.id)}">${esc(o.name||"Proyecto")}${esc(suffix)}</option>`;
  }).join("");
  if(project?.project?.id)select.value=project.project.id;
}

async function createNewProject(){
  const name=prompt("Nombre del nuevo proyecto:","Nueva obra")||"Nueva obra";
  try{
    const template=await cargarPlantillaObra();
    const p=prepararProyectoDesdePlantilla(template,name);
    await Repositorio.guardarProyectoCompleto(p);
    await refreshProjectSelector();
    renderAll();toast("Nueva obra creada");
  }catch(err){
    if(err?.name!=="AbortError")alert("No se pudo crear la obra: "+err.message);
  }
}

async function switchProject(id){
  if(!id || id===project?.project?.id)return;
  try{
    await Repositorio.cambiarObra(id);
    renderAll();
    toast("Obra cambiada");
  }catch(err){alert("No se pudo abrir la obra: "+err.message);}
}

async function openProjectFile(){
  if("showOpenFilePicker" in window && window.isSecureContext){
    try{
      const [h]=await window.showOpenFilePicker({types:[{description:"Proyecto Gestor de Obra",accept:{"application/json":[".json"]}}],multiple:false});
      const f=await h.getFile();
      await loadProjectJson(await f.text(),h);
      toast("Proyecto importado con permiso de escritura");return;
    }catch(e){if(e.name==="AbortError")return;}
  }
  $("#fileFallback").click();
}

async function loadProjectJson(text,fileHandle=null){
  const p=JSON.parse(text);
  if(!p.tasks||!p.project)throw new Error("El archivo no parece un proyecto válido.");
  ensureProjectShape(p);
  await Repositorio.guardarProyectoCompleto(p);
  currentFileHandle=fileHandle;
  await refreshProjectSelector();
  renderAll();markSaved("Proyecto abierto");
}

async function saveProject(){
  await Repositorio.flush();
  project.project.updatedAt=nowISO();
  const contents=JSON.stringify(project,null,2);
  try{
    if(currentFileHandle){
      const w=await currentFileHandle.createWritable();await w.write(contents);await w.close();markSaved("JSON actualizado");toast("Guardado en el mismo JSON");return;
    }
    if("showSaveFilePicker" in window && window.isSecureContext){
      currentFileHandle=await window.showSaveFilePicker({suggestedName:(slug(project.project.name)||"proyecto")+".json",types:[{description:"Proyecto Gestor de Obra",accept:{"application/json":[".json"]}}]});
      const w=await currentFileHandle.createWritable();await w.write(contents);await w.close();markSaved("JSON creado");toast("JSON creado. Los próximos guardados actualizan este archivo.");return;
    }
  }catch(e){if(e.name==="AbortError")return;console.warn(e);}
  downloadProject();markSaved("Backup descargado");toast("Se descargó el JSON");
}

function downloadProject(){
  const blob=new Blob([JSON.stringify(project,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(slug(project.project.name)||"proyecto")+"_"+todayISO()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function exportCommentsCSV(){
  const rows=[["Fecha","Autor","ID tarea","Paquete","Comentario"],...project.comments.map(c=>[c.date,c.author,c.taskDisplayId||taskDisplayId(project.tasks.find(t=>t.id===c.taskId))||c.taskId,c.package,c.text])];
  const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(slug(project.project.name)||"proyecto")+"_comentarios.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

function wireUi(){
  $("#legendBtn").addEventListener("click",openLegend);
  $("#modalClose").onclick=closeModal;
  $("#modalBackdrop").addEventListener("click",e=>{if(e.target===$("#modalBackdrop"))closeModal();});
  $$(".nav button").forEach(b=>b.addEventListener("click",()=>{
    $$(".nav button").forEach(x=>x.classList.remove("active"));b.classList.add("active");
    $$(".page").forEach(p=>p.classList.remove("active"));currentPage=b.dataset.page;$("#page-"+currentPage).classList.add("active");
  }));
  $("#activeUser").addEventListener("change",async e=>{project.project.activeUser=e.target.value;markDirty();await Repositorio.guardarMeta({activeUser:e.target.value});});
  $("#projectSelect").addEventListener("change",e=>switchProject(e.target.value));
  $("#newBtn").addEventListener("click",createNewProject);
  $("#openBtn").addEventListener("click",openProjectFile);
  $("#saveBtn").addEventListener("click",saveProject);
  $("#backupBtn").addEventListener("click",downloadProject);
  $("#fileFallback").addEventListener("change",async e=>{
    const f=e.target.files[0];if(!f)return;
    try{await loadProjectJson(await f.text());toast("JSON importado");}catch(err){alert("No se pudo abrir el JSON: "+err.message);}
    e.target.value="";
  });
  $("#templateFallback").addEventListener("change",async e=>{
    const resolver=templateFallbackResolver;
    templateFallbackResolver=null;
    const f=e.target.files[0];
    if(!resolver)return;
    if(!f){resolver.reject(new DOMException("Selección cancelada","AbortError"));return;}
    try{resolver.resolve(JSON.parse(await f.text()));}catch(err){resolver.reject(err);}
    e.target.value="";
  });
  window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue="";}});
}

async function bootstrap(){
  wireUi();
  let loaded=await Repositorio.inicializar();
  if(!loaded){
    const template=await cargarPlantillaObra();
    const name=template?.project?.name||"Vivienda piloto";
    const p=prepararProyectoDesdePlantilla(template,name);
    await Repositorio.guardarProyectoCompleto(p);
  }
  await refreshProjectSelector();
  renderAll();
  markSaved(Repositorio.modo()==="firebase"?"Sincronizado":"Guardado local");
}

bootstrap().catch(err=>{
  console.error(err);
  const s=$("#saveState");if(s)s.textContent="Error de inicio";
  alert("No se pudo iniciar Gestor de Obra: "+err.message);
});
