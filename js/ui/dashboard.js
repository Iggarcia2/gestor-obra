"use strict";

function renderDashboard(){
  const el=$("#page-dashboard"); if(!el)return;
  const applicable=project.tasks.filter(isApplicable);
  const blocked=applicable.filter(t=>t.status==="Bloqueada 🔴");
  const controls=applicable.filter(t=>t.status==="Espera control ⚠️" || (t.requiresReview==="Sí"&&t.reviewed!=="Sí"&&t.status==="En curso"));
  const today=applicable.filter(t=>t.targetDate===todayISO()&&t.status!=="Terminada ✅");
  const in7=applicable.filter(t=>t.targetDate && daysBetween(todayISO(),t.targetDate)>=0 && daysBetween(todayISO(),t.targetDate)<=7 && t.status!=="Terminada ✅");
  const purchases30=project.purchases.filter(p=>{
    if(["Recibido","Cancelado"].includes(p.status)||p.arrived==="Sí")return false;
    const s=purchaseStartDate(p); if(!s)return false; const d=daysBetween(todayISO(),s); return d<=30;
  });
  const progress=overallProgress();
  const pk=packageStats();
  const pendingDefs=project.config.filter(c=>String(c.value??"").toLowerCase().includes("a definir")||String(c.value??"").toLowerCase().includes("a desarrollar")).length;

  el.innerHTML=`
  <div class="page-head"><div><h2>Dashboard</h2><p>Vista rápida de avance, bloqueos, compras y controles.</p></div></div>
  <div class="kpis">
    <div class="card kpi"><div class="label">HOY</div><div class="num">${today.length}</div></div>
    <div class="card kpi"><div class="label">ESTA SEMANA</div><div class="num">${in7.length}</div></div>
    <div class="card kpi"><div class="label">🔴 BLOQUEADAS</div><div class="num">${blocked.length}</div></div>
    <div class="card kpi"><div class="label">⏳ COMPRAS ≤30 DÍAS</div><div class="num">${purchases30.length}</div></div>
    <div class="card kpi"><div class="label">⚠️ CONTROLES</div><div class="num">${controls.length}</div></div>
  </div>
  <div class="grid2">
    <div class="card pad">
      <div class="progress-title"><div><div class="label">PROGRESO GENERAL PONDERADO</div><strong>${pct(progress)}</strong></div><span class="badge pending">${applicable.filter(t=>t.status==="Terminada ✅").length}/${applicable.length} tareas terminadas</span></div>
      <div class="progress-wrap"><div class="progress-bar" style="width:${Math.min(100,progress)}%"></div></div>
      <div class="footer-note">El peso se define por paquete. Dentro de cada paquete, el avance se calcula con tareas aplicables terminadas.</div>
      <div class="table-wrap" style="margin-top:14px;max-height:430px">
       <table><thead><tr><th>Paquete</th><th>Peso</th><th>Avance</th><th>Contribución</th></tr></thead><tbody>
       ${pk.map(p=>`<tr><td>${esc(p.name)}</td><td>${p.weight}%</td><td><div style="display:flex;align-items:center;gap:7px"><div class="progress-wrap" style="width:110px;height:12px"><div class="progress-bar" style="width:${p.progress}%"></div></div>${pct(p.progress)}</div></td><td>${p.contribution.toFixed(1)}%</td></tr>`).join("")}
       </tbody></table>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card pad">
        <h3 class="section-title">🔴 Bloqueos activos</h3>
        <div class="mini-list">${blocked.slice(0,8).map(t=>`<div class="mini-item" onclick="openTask('${t.id}')"><strong>${esc(taskDisplayId(t))} · ${esc(t.name)}</strong><div class="meta">${esc(t.blockReason||"Sin motivo cargado")} · ${esc(t.owner||"")}</div></div>`).join("")||'<div class="empty">Sin tareas bloqueadas.</div>'}</div>
      </div>
      <div class="card pad">
        <h3 class="section-title">⏳ Compras que requieren mirada</h3>
        <div class="mini-list">${purchases30.slice(0,8).map(p=>{const a=purchaseAlert(p);return`<div class="mini-item"><strong>${esc(p.item)}</strong> <span class="badge ${a.cls}">${a.label}</span><div class="meta">Necesario ${fmtDate(p.neededDate)} · ${esc(p.owner||"")}</div></div>`}).join("")||'<div class="empty">No hay compras con fecha cercana.</div>'}</div>
      </div>
      <div class="card pad">
        <h3 class="section-title">Información pendiente</h3>
        <div style="font-size:30px;font-weight:750">${pendingDefs}</div><div class="footer-note">Campos de configuración en “A definir” o “A desarrollar”.</div>
      </div>
    </div>
  </div>
  <div class="rule-box" style="margin-top:14px"><strong>⚠️ Regla de cálculo que no debemos perder:</strong> para mampostería, revoque y pintura se parte de <b>superficie neta = superficie bruta − puertas − ventanas − otros huecos</b>. Recién después se aplica rendimiento y merma.</div>`;
}
