"use strict";

function calcNumber(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function calcMasonry(grossArea, openingsArea, bricksPerM2, wastePct){
  const netArea=Math.max(0,calcNumber(grossArea)-calcNumber(openingsArea));
  const quantity=netArea*calcNumber(bricksPerM2)*(1+calcNumber(wastePct)/100);
  return {netArea,quantity};
}
function calcPlaster(grossArea, openingsArea, kgPerM2, wastePct){
  const netArea=Math.max(0,calcNumber(grossArea)-calcNumber(openingsArea));
  const quantity=netArea*calcNumber(kgPerM2)*(1+calcNumber(wastePct)/100);
  return {netArea,quantity};
}
function calcPaint(grossArea, openingsArea, yieldM2PerL, coats, wastePct){
  const netArea=Math.max(0,calcNumber(grossArea)-calcNumber(openingsArea));
  const yieldValue=calcNumber(yieldM2PerL);
  const quantity=yieldValue>0 ? netArea*calcNumber(coats)/yieldValue*(1+calcNumber(wastePct)/100) : 0;
  return {netArea,quantity};
}
function calcCeramics(area, wastePct){
  const netArea=Math.max(0,calcNumber(area));
  const quantity=netArea*(1+calcNumber(wastePct)/100);
  return {netArea,quantity};
}
