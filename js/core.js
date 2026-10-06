"use strict";

const STORAGE_PREFIX = "gestorObra.v04";
const LEGACY_STORAGE_KEY = "gestorObraV01.currentProject";
const STATUSES = ["Pendiente","Lista 🟢","En curso","Bloqueada 🔴","Espera control ⚠️","Terminada ✅","No aplica"];
const YESNO = ["Sí","No"];
const PURCHASE_STATES = ["A definir","Cotizando","Pedido","En fabricación","Listo para retirar/entregar","Recibido","Cancelado"];

let project = null;
let currentFileHandle = null;
let currentPage = "dashboard";
let dirty = false;
let taskPage = 1;
let taskPageSize = 25;
let filters = {q:"", package:"", status:"", owner:"", zone:""};
let templateFallbackResolver = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clone = o => JSON.parse(JSON.stringify(o));
const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
};
const nowISO = () => new Date().toISOString();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "p-"+Date.now()+"-"+Math.random().toString(16).slice(2));
const esc = v => String(v ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
const slug = s => (s||"proyecto").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const parseDate = s => s ? new Date(s+"T12:00:00") : null;
const addDays = (dateStr, delta) => {
  if(!dateStr) return "";
  const d=parseDate(dateStr); d.setDate(d.getDate()+delta); return d.toISOString().slice(0,10);
};
const daysBetween = (a,b) => Math.round((parseDate(b)-parseDate(a))/86400000);
function fmtDate(s){ if(!s) return "—"; const d=parseDate(s); return d.toLocaleDateString("es-AR"); }
function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
function pct(v){ return `${Math.round(num(v))}%`; }
function jsq(s){return String(s).replace(/\\/g,"\\\\").replace(/'/g,"\\'");}
function taskDisplayId(t){ return t?.displayId || t?.id || ""; }
function purchaseDisplayId(p){ return p?.displayId || p?.id || ""; }
function shortRecordId(prefix, id){ return `${prefix}-${String(id).replace(/-/g,"").slice(0,4).toUpperCase()}`; }

function emptyProject(){
  return {
    schemaVersion:"0.2",
    templateVersion:"Gestor Obra V0.4",
    project:{id:null,name:"Sin obra cargada",createdAt:null,updatedAt:null,activeUser:"Juan"},
    config:[],packages:[],tasks:[],purchases:[],coefficients:[],
    calculators:{masonry:{},plaster:{},paint:{},ceramics:{}},comments:[],
    settings:{purchaseLookAheadWeeks:6}
  };
}

async function cargarPlantillaObra(){
  try{
    const res = await fetch("./data/plantilla_obra.json", {cache:"no-store"});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }catch(err){
    if(location.protocol === "file:") return await seleccionarPlantillaLocal();
    throw err;
  }
}

function seleccionarPlantillaLocal(){
  return new Promise((resolve,reject)=>{
    templateFallbackResolver = {resolve,reject};
    const input = $("#templateFallback");
    input.value = "";
    input.click();
  });
}

function prepararProyectoDesdePlantilla(template, name="Nueva obra"){
  const p=clone(template);
  p.schemaVersion="0.2";
  p.templateVersion="Gestor Obra V0.4 / "+(p.templateVersion||"plantilla");
  p.project ||= {};
  p.project.id=uid();
  p.project.createdAt=nowISO();
  p.project.updatedAt=nowISO();
  p.project.activeUser="Juan";
  p.project.name=name;
  const c=(p.config||[]).find(x=>x.field==="Nombre de obra");
  if(c)c.value=name;
  return ensureProjectShape(p);
}

function ensureProjectShape(target=project){
  target ||= emptyProject();
  target.comments ||= []; target.tasks ||= []; target.purchases ||= []; target.config ||= [];
  target.packages ||= []; target.coefficients ||= [];
  target.calculators ||= {masonry:{},plaster:{},paint:{},ceramics:{}};
  target.settings ||= {purchaseLookAheadWeeks:6};
  target.project ||= {};
  target.project.id ||= uid();
  target.project.name ||= "Proyecto";
  target.project.activeUser ||= "Juan";
  target.project.createdAt ||= nowISO();
  target.project.updatedAt ||= target.project.createdAt;
  target.tasks.forEach(t=>{ t.displayId ||= t.id; });
  target.purchases.forEach(p=>{ p.displayId ||= p.id; });
  target.comments.forEach(c=>{ c.id ||= uid(); });
  return target;
}

function setProject(nextProject){
  project = ensureProjectShape(nextProject);
  filters={q:"",package:"",status:"",owner:"",zone:""};
  taskPage=1;
  currentFileHandle=null;
  const u=$("#activeUser"); if(u)u.value=project.project.activeUser||"Juan";
}

function markDirty(msg="Cambios sincronizando"){
  dirty=true;
  if(project?.project) project.project.updatedAt=nowISO();
  const s=$("#saveState"); if(s)s.textContent=msg;
  const t=$("#topProjectName"); if(t)t.textContent=project?.project?.name||"Proyecto";
}
function markSaved(msg="Guardado"){
  dirty=false;
  const s=$("#saveState");
  if(s)s.textContent=msg+" · "+new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
}
function toast(msg){
  const t=$("#toast"); if(!t)return;
  t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400);
}
function getConfig(field){ return project.config.find(x=>x.field===field); }
function configValue(field){ return getConfig(field)?.value; }
function badgeClass(status){
  if(status==="Lista 🟢")return"ready"; if(status==="En curso")return"progress"; if(status==="Bloqueada 🔴")return"blocked";
  if(status==="Espera control ⚠️")return"review"; if(status==="Terminada ✅")return"done"; if(status==="No aplica")return"na"; return"pending";
}
function statusBadge(s){return `<span class="badge ${badgeClass(s)}">${esc(s||"Pendiente")}</span>`;}
function isApplicable(t){ return t.applies==="Sí" && t.status!=="No aplica"; }
function taskReady(t){
  if(!isApplicable(t)) return {ok:false,reason:"No aplica"};
  if(t.status==="Bloqueada 🔴") return {ok:false,reason:t.blockReason||"Marcada como bloqueada"};
  if(t.status==="Espera control ⚠️") return {ok:false,reason:"Espera control"};
  if(t.requiresReview==="Sí" && t.reviewed!=="Sí" && ["Lista 🟢","En curso","Terminada ✅"].includes(t.status)) return {ok:false,reason:"Falta visto / control"};
  if(t.blockReason) return {ok:false,reason:t.blockReason};
  if(["Lista 🟢","En curso","Terminada ✅"].includes(t.status)) return {ok:true,reason:"Lista"};
  return {ok:false,reason:"Aún pendiente"};
}
function packageStats(){
  return project.packages.map(p=>{
    const ts=project.tasks.filter(t=>t.package===p.name && isApplicable(t));
    const done=ts.filter(t=>t.status==="Terminada ✅").length;
    const progress=ts.length?done/ts.length*100:0;
    return {...p,count:ts.length,done,progress,contribution:progress*num(p.weight)/100};
  });
}
function overallProgress(){ return packageStats().reduce((a,p)=>a+p.contribution,0); }
function taskComments(taskId){ return project.comments.filter(c=>c.taskId===taskId).sort((a,b)=>String(b.date).localeCompare(String(a.date))); }
function purchaseStartDate(p){
  if(!p.neededDate) return "";
  return addDays(p.neededDate,-(num(p.leadDays)+num(p.bufferDays)));
}
function purchaseAlert(p){
  if(["Recibido","Cancelado"].includes(p.status)||p.arrived==="Sí") return {label:"Cerrada",cls:"done"};
  const start=purchaseStartDate(p); if(!start) return {label:"Sin fecha",cls:"pending"};
  const d=daysBetween(todayISO(),start);
  if(d<0)return{label:`Vencida ${Math.abs(d)} d`,cls:"blocked"};
  if(d<=14)return{label:`Acción en ${d} d`,cls:"review"};
  if(d<=30)return{label:`Próxima ${d} d`,cls:"purchase"};
  return{label:`En ${d} d`,cls:"pending"};
}

function renderAll(){
  renderTop();
  renderDashboard();
  renderConfig();
  renderTasks();
  renderPurchases();
  renderCalculators();
  renderComments();
  renderHelp();
}
function renderTop(){
  const t=$("#topProjectName"); if(t)t.textContent=project?.project?.name||configValue("Nombre de obra")||"Proyecto";
  const u=$("#activeUser"); if(u)u.value=project?.project?.activeUser||"Juan";
  const p=$("#projectSelect"); if(p && project?.project?.id)p.value=project.project.id;
  const m=$("#storageMode"); if(m && window.Repositorio)m.textContent=Repositorio.nombre();
}
