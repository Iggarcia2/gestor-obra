"use strict";

function configOptions(type){
 const map={
  "Sí/No":["Sí","No"],"Sí/No/A definir":["Sí","No","A definir"],
  "Disponibilidad plano":["Sí","No","A desarrollar"],
  "Intervención":["Obra nueva","Reforma","Ampliación","Reforma + ampliación"],
  "Intervención existente":["No aplica","Demolición total","Demolición parcial","Conservar completa"],
  "Cochera":["No","Cubierta","Descubierta"],
  "Fundación":["A definir","Zapatas corridas","Zapatas aisladas","Platea","Pilotes","Otra"],
  "Estructura":["Mampostería + columnas/vigas HºAº","Estructura independiente HºAº + cerramientos","Mampostería portante","A definir"],
  "Mampuesto":["Ladrillo hueco","Ladrillo común","Bloque de hormigón","Otro","A definir"],
  "Cubierta":["Losa plana","Chapa","Teja","Otra","A definir"],
  "Cielorraso":["Losa / revoque directo","Placa de yeso suspendida","Combinado","A definir"],
  "Piso":["Cerámico","Porcelanato","Cemento alisado","Piso flotante","Madera","Otro","A definir"],
  "Cloaca":["Red pública","Cámara séptica / pozo","Otro","A definir"],
  "Agua caliente":["Termotanque a gas","Calefón","Termotanque eléctrico","Combinado","A definir"],
  "Gas":["Red","Garrafa / tanque","No","A definir"],
  "Climatización":["Splits individuales","Sistema central","Radiadores","Piso radiante","No","A definir"],
  "Responsable":["Juan","Vos","Ambos","Otro"]
 }; return map[type]||null;
}
function renderConfig(){
 const el=$("#page-config"); if(!el)return;
 const groups={};
 project.config.forEach(c=>(groups[c.category]??=[]).push(c));
 el.innerHTML=`
 <div class="page-head"><div><h2>Configuración de obra</h2><p>El verde es editable. “A definir / A desarrollar” queda visible como restricción.</p></div><div class="toolbar"><button class="btn" onclick="applyBasicRules()">Aplicar reglas básicas</button></div></div>
 <div class="alert info" style="margin-bottom:14px"><strong>Multiobra:</strong> estos parámetros pertenecen únicamente a <b>${esc(project.project.name)}</b>.</div>
 ${Object.entries(groups).map(([cat,items],idx)=>`<details class="card config-group" ${idx<2?"open":""}><summary>${esc(cat)}</summary><div class="config-fields">
 ${items.map(c=>{
   const opts=configOptions(c.controlType); const id="cfg-"+project.config.indexOf(c);
   let control="";
   if(opts) control=`<select id="${id}" onchange="setConfig('${jsq(c.field)}',this.value)">${opts.map(o=>`<option ${String(c.value)===String(o)?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
   else if(c.controlType==="Número") control=`<input type="number" value="${esc(c.value??"")}" onchange="setConfig('${jsq(c.field)}',this.value===''?'':Number(this.value))">`;
   else control=`<input value="${esc(c.value??"")}" onchange="setConfig('${jsq(c.field)}',this.value)">`;
   return `<div class="field"><label>${esc(c.field)}</label>${control}<div class="config-note">${esc(c.note||"")}</div></div>`;
 }).join("")}</div></details>`).join("")}
 <div class="card pad">
   <div class="page-head" style="margin:0 0 10px"><div><h3 style="margin:0">Pesos por paquete</h3><p>La suma debería ser 100 %. Son editables.</p></div><div id="weightTotal"></div></div>
   <div class="package-grid">${project.packages.map((p,i)=>`<div class="package-weight"><span>${esc(p.name)}</span><input type="number" step="0.5" value="${p.weight}" onchange="updatePackageWeight(${i},this.value)"></div>`).join("")}</div>
 </div>`;
 updateWeightTotal();
}
async function setConfig(field,value){
 await Repositorio.guardarConfiguracion(field,value);
 renderTop();renderDashboard();renderConfig();
 if(field==="Nombre de obra")await refreshProjectSelector();
}
async function updatePackageWeight(i,v){await Repositorio.guardarPaquete(i,v);updateWeightTotal();renderDashboard();}
function updateWeightTotal(){const x=$("#weightTotal");if(x){const t=project.packages.reduce((a,p)=>a+num(p.weight),0);x.innerHTML=`<span class="badge ${Math.abs(t-100)<.01?"done":"review"}">Total ${t.toFixed(1)}%</span>`;}}
async function applyPackage(packageName, applies){
 const changed=[];
 project.tasks.filter(t=>t.package===packageName).forEach(t=>{
   const fields={applies:applies?"Sí":"No",status:applies?(t.status==="No aplica"?"Pendiente":t.status):"No aplica"};
   changed.push(Repositorio.actualizarTarea(t.id,fields));
 });
 await Promise.all(changed);
}
async function applyBasicRules(){
 if(!confirm("Se aplicarán únicamente reglas obvias (demolición, gas, climatización y exteriores). No se tocarán otros paquetes. ¿Continuar?"))return;
 const exists=configValue("Existe construcción en el lote");
 const intervention=configValue("Intervención sobre existente");
 await applyPackage("01 Demolición / existente", exists==="Sí" && ["Demolición total","Demolición parcial"].includes(intervention));
 await applyPackage("08 Instalación de gas", configValue("Gas")!=="No");
 await applyPackage("10 Climatización", configValue("Climatización")!=="No");
 await applyPackage("17 Exteriores", configValue("Exteriores incluidos")==="Sí");
 renderAll();toast("Reglas básicas aplicadas");
}
