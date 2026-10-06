"use strict";

function renderPurchases(){
 const el=$("#page-purchases"); if(!el)return;
 el.innerHTML=`
 <div class="page-head"><div><h2>Compras a futuro</h2><p>Fecha recomendada = fecha necesaria − plazo del proveedor − margen.</p></div><button class="btn primary" onclick="newPurchase()">+ Nueva compra</button></div>
 <div class="alert warn" style="margin-bottom:12px"><strong>Objetivo:</strong> mirar las compras con tiempo. Cargá el plazo real del proveedor cuando lo conozcas.</div>
 <div class="table-wrap"><table><thead><tr><th>ID</th><th>Elemento</th><th>Paquete</th><th>Necesario</th><th>Plazo</th><th>Margen</th><th>Iniciar gestión</th><th>Alerta</th><th>Estado</th><th>Responsable</th><th>Llegó</th></tr></thead><tbody>
 ${project.purchases.map(p=>{const start=purchaseStartDate(p),a=purchaseAlert(p);return`<tr>
  <td class="cell-intrinsic">${esc(purchaseDisplayId(p))}</td><td class="cell-intrinsic"><b>${esc(p.item)}</b></td><td class="cell-intrinsic">${esc(p.package)}</td>
  <td class="cell-editable"><input style="width:125px" type="date" value="${esc(p.neededDate||"")}" onchange="updatePurchase('${p.id}','neededDate',this.value)"></td>
  <td class="cell-editable"><input style="width:65px" type="number" value="${esc(p.leadDays??"")}" onchange="updatePurchase('${p.id}','leadDays',this.value)"></td>
  <td class="cell-editable"><input style="width:65px" type="number" value="${esc(p.bufferDays??"")}" onchange="updatePurchase('${p.id}','bufferDays',this.value)"></td>
  <td class="cell-computed">${fmtDate(start)}</td><td class="cell-computed"><span class="badge ${a.cls}">${esc(a.label)}</span></td>
  <td class="cell-editable"><select onchange="updatePurchase('${p.id}','status',this.value)">${PURCHASE_STATES.map(s=>`<option ${p.status===s?"selected":""}>${esc(s)}</option>`).join("")}</select></td>
  <td class="cell-editable"><select onchange="updatePurchase('${p.id}','owner',this.value)">${["Juan","Vos","Ambos"].map(s=>`<option ${p.owner===s?"selected":""}>${s}</option>`).join("")}</select></td>
  <td class="cell-editable"><select onchange="updatePurchase('${p.id}','arrived',this.value)">${YESNO.map(s=>`<option ${p.arrived===s?"selected":""}>${s}</option>`).join("")}</select></td>
 </tr>`}).join("")}</tbody></table></div>`;
}
async function updatePurchase(id,k,v){
 const p=project.purchases.find(x=>x.id===id);if(!p)return;
 const value=["leadDays","bufferDays"].includes(k)?(v===""?"":num(v)):v;
 const campos={[k]:value};
 const preview={...p,...campos};
 campos.startDate=purchaseStartDate(preview);
 await Repositorio.actualizarCompra(id,campos);
 renderDashboard();renderPurchases();
}
async function newPurchase(){
 const id=uid();
 const p={id,displayId:shortRecordId("C",id),item:"Nueva compra",package:project.packages[0]?.name||"",type:"Material",neededDate:"",leadDays:"",bufferDays:"",startDate:"",status:"A definir",owner:"Juan",arrived:"No",comment:""};
 await Repositorio.crearCompra(p);renderPurchases();
}
