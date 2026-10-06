"use strict";

function renderCalculators(){
 const el=$("#page-calculators"); if(!el)return;
 const c=project.calculators;
 const masonry=calcMasonry(c.masonry.grossArea,c.masonry.openingsArea,c.masonry.bricksPerM2,c.masonry.wastePct);
 const plaster=calcPlaster(c.plaster.grossArea,c.plaster.openingsArea,c.plaster.kgPerM2,c.plaster.wastePct);
 const paint=calcPaint(c.paint.grossArea,c.paint.openingsArea,c.paint.yieldM2PerL,c.paint.coats,c.paint.wastePct);
 const ceramics=calcCeramics(c.ceramics.area,c.ceramics.wastePct);
 el.innerHTML=`
 <div class="page-head"><div><h2>Rendimientos y calculadoras</h2><p>Coeficientes editables. La salida es un estimativo; Juan / vos definen el pedido final.</p></div></div>
 <div class="rule-box"><strong>⚠️ Ventanas, puertas y huecos:</strong> antes de calcular ladrillos, revoque o pintura, descontar las aberturas. Ejemplo: 100 m² brutos − 18 m² de puertas/ventanas = 82 m² netos; recién después aplicar consumo y merma.</div>
 <div class="card pad" style="margin-bottom:14px"><h3 class="section-title">Coeficientes de referencia</h3><div class="table-wrap"><table><thead><tr><th>Dato</th><th>Unidad</th><th>Valor</th><th>Merma %</th><th>Nota</th></tr></thead><tbody>
 ${project.coefficients.map((x,i)=>`<tr><td class="cell-intrinsic">${esc(x.name)}</td><td class="cell-intrinsic">${esc(x.unit)}</td><td class="cell-editable"><input type="number" step="any" value="${esc(x.value??"")}" onchange="updateCoeff(${i},'value',this.value)"></td><td class="cell-editable"><input type="number" step=".1" value="${esc(x.wastePct??"")}" onchange="updateCoeff(${i},'wastePct',this.value)"></td><td class="cell-intrinsic">${esc(x.note||"")}</td></tr>`).join("")}</tbody></table></div></div>
 <div class="calc-grid">
  ${calcCard("Mampostería",[
   ["Superficie bruta de muros","m²","masonry","grossArea",c.masonry.grossArea],
   ["Aberturas a descontar","m²","masonry","openingsArea",c.masonry.openingsArea],
   ["Ladrillos por m²","un/m²","masonry","bricksPerM2",c.masonry.bricksPerM2],
   ["Merma","%","masonry","wastePct",c.masonry.wastePct],
   ["Cantidad final a pedir (manual)","un","masonry","finalOrder",c.masonry.finalOrder]
  ],`Superficie neta: <b>${masonry.netArea.toFixed(2)} m²</b><br>Cantidad teórica: <b>${masonry.quantity.toFixed(0)} un</b>`)}
  ${calcCard("Revoque",[
   ["Superficie bruta","m²","plaster","grossArea",c.plaster.grossArea],
   ["Aberturas a descontar","m²","plaster","openingsArea",c.plaster.openingsArea],
   ["Coeficiente","kg/m²","plaster","kgPerM2",c.plaster.kgPerM2],
   ["Merma","%","plaster","wastePct",c.plaster.wastePct]
  ],`Superficie neta: <b>${plaster.netArea.toFixed(2)} m²</b><br>Cantidad estimada: <b>${plaster.quantity.toFixed(1)} kg</b>`)}
  ${calcCard("Pintura",[
   ["Superficie bruta","m²","paint","grossArea",c.paint.grossArea],
   ["Aberturas a descontar","m²","paint","openingsArea",c.paint.openingsArea],
   ["Rendimiento","m²/L/mano","paint","yieldM2PerL",c.paint.yieldM2PerL],
   ["Cantidad de manos","un","paint","coats",c.paint.coats],
   ["Merma","%","paint","wastePct",c.paint.wastePct]
  ],`Superficie neta: <b>${paint.netArea.toFixed(2)} m²</b><br>Litros estimados: <b>${paint.quantity.toFixed(1)} L</b>`)}
  ${calcCard("Cerámicos / revestimientos",[
   ["Superficie a cubrir","m²","ceramics","area",c.ceramics.area],
   ["Merma por cortes","%","ceramics","wastePct",c.ceramics.wastePct],
   ["Cantidad final a pedir (manual)","m²","ceramics","finalOrder",c.ceramics.finalOrder]
  ],`Superficie teórica a comprar: <b>${ceramics.quantity.toFixed(2)} m²</b>`)}
 </div>`;
}
function calcCard(title,rows,result){return`<div class="card calc-card"><h3 class="section-title">${title}</h3>${rows.map(r=>`<div class="calc-row"><span>${r[0]}</span><input type="number" step="any" value="${esc(r[4]??"")}" onchange="updateCalc('${r[2]}','${r[3]}',this.value)"><small>${r[1]}</small></div>`).join("")}<div class="calc-result">${result}</div></div>`;}
async function updateCalc(group,key,value){await Repositorio.guardarCalculadora(group,key,value);renderCalculators();}
async function updateCoeff(i,key,value){await Repositorio.guardarCoeficiente(i,key,value);renderCalculators();}
