"use strict";

function openModal(){$("#modalBackdrop").classList.add("open");}
function closeModal(){$("#modalBackdrop").classList.remove("open");}
function openLegend(){
  $("#modalTitle").textContent="Leyenda";
  $("#modalBody").innerHTML=`
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;gap:10px;align-items:flex-start"><span class="swatch" style="background:var(--editable);width:18px;height:18px"></span><div><strong>Editable</strong><div class="footer-note">Datos que Juan o vos pueden modificar: estado, responsable, fechas, cantidades, configuración, etc.</div></div></div>
      <div style="display:flex;gap:10px;align-items:flex-start"><span class="swatch" style="background:var(--intrinsic);width:18px;height:18px"></span><div><strong>Intrínseco de plantilla</strong><div class="footer-note">Información propia de la tarea o del modelo base.</div></div></div>
      <div style="display:flex;gap:10px;align-items:flex-start"><span class="swatch" style="background:var(--computed);width:18px;height:18px"></span><div><strong>Automático / calculado</strong><div class="footer-note">Valores derivados por el sistema, como progreso o fecha recomendada de compra.</div></div></div>
    </div>`;
  $("#modalActions").innerHTML=`<button class="btn primary" onclick="closeModal()">Cerrar</button>`;
  openModal();
}
