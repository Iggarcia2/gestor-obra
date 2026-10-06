"use strict";

const RepositorioLocal = (()=>{
  const currentKey = `${STORAGE_PREFIX}.currentObraId`;
  const k = (obraId,segment,id="") => `${STORAGE_PREFIX}.obras.${obraId}.${segment}${id?"."+encodeURIComponent(id):""}`;

  function setJson(key,value){ localStorage.setItem(key,JSON.stringify(value)); }
  function getJson(key){ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):null; }
  function scan(prefix){
    const rows=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key && key.startsWith(prefix)) rows.push(getJson(key));
    }
    return rows.filter(Boolean);
  }
  function clearObra(obraId){
    const prefix=`${STORAGE_PREFIX}.obras.${obraId}.`;
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key?.startsWith(prefix))keys.push(key);
    }
    keys.forEach(key=>localStorage.removeItem(key));
  }
  function listar(){
    const prefix=`${STORAGE_PREFIX}.obras.`;
    const metas=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key?.startsWith(prefix) || !key.endsWith(".meta"))continue;
      const meta=getJson(key);
      if(meta?.id)metas.push(meta);
    }
    return metas.sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
  }
  function guardarCompleto(p){
    ensureProjectShape(p);
    const obraId=p.project.id;
    clearObra(obraId);
    setJson(k(obraId,"meta"),p.project);
    p.config.forEach((x,i)=>setJson(k(obraId,"config",x.field),{...x,order:i}));
    p.packages.forEach((x,i)=>setJson(k(obraId,"packages",x.name),{...x,order:i}));
    p.tasks.forEach(x=>setJson(k(obraId,"tasks",x.id),x));
    p.purchases.forEach(x=>setJson(k(obraId,"purchases",x.id),x));
    p.comments.forEach(x=>setJson(k(obraId,"comments",x.id),x));
    p.coefficients.forEach((x,i)=>setJson(k(obraId,"coefficients",x.name),{...x,order:i}));
    setJson(k(obraId,"calculators"),p.calculators);
    setJson(k(obraId,"settings"),p.settings);
    setJson(k(obraId,"versions"),{schemaVersion:p.schemaVersion,templateVersion:p.templateVersion});
    localStorage.setItem(currentKey,obraId);
  }
  function cargar(obraId){
    if(!obraId)return null;
    const meta=getJson(k(obraId,"meta")); if(!meta)return null;
    const versions=getJson(k(obraId,"versions"))||{};
    const stripOrder=x=>{const y={...x};delete y.order;return y;};
    const p={
      schemaVersion:versions.schemaVersion||"0.2",
      templateVersion:versions.templateVersion||"Gestor Obra V0.4",
      project:meta,
      config:scan(k(obraId,"config")+".").sort((a,b)=>(a.order??999)-(b.order??999)).map(stripOrder),
      packages:scan(k(obraId,"packages")+".").sort((a,b)=>(a.order??999)-(b.order??999)).map(stripOrder),
      tasks:scan(k(obraId,"tasks")+".").sort((a,b)=>String(taskDisplayId(a)).localeCompare(String(taskDisplayId(b)),"es",{numeric:true})),
      purchases:scan(k(obraId,"purchases")+".").sort((a,b)=>String(purchaseDisplayId(a)).localeCompare(String(purchaseDisplayId(b)),"es",{numeric:true})),
      comments:scan(k(obraId,"comments")+"."),
      coefficients:scan(k(obraId,"coefficients")+".").sort((a,b)=>(a.order??999)-(b.order??999)).map(stripOrder),
      calculators:getJson(k(obraId,"calculators"))||{masonry:{},plaster:{},paint:{},ceramics:{}},
      settings:getJson(k(obraId,"settings"))||{purchaseLookAheadWeeks:6}
    };
    return ensureProjectShape(p);
  }
  function migrarLegacy(){
    if(listar().length)return null;
    const raw=localStorage.getItem(LEGACY_STORAGE_KEY); if(!raw)return null;
    try{
      const p=ensureProjectShape(JSON.parse(raw));
      guardarCompleto(p);
      return p;
    }catch(e){ console.warn("No se pudo migrar localStorage V0.3",e); return null; }
  }
  return {
    nombre:"localStorage particionado",
    async inicializar(){
      const migrated=migrarLegacy();
      if(migrated)return migrated;
      let id=localStorage.getItem(currentKey);
      if(!id)id=listar()[0]?.id;
      return cargar(id);
    },
    async listarObras(){return listar().map(x=>({id:x.id,name:x.name||"Proyecto",updatedAt:x.updatedAt,createdAt:x.createdAt}));},
    async seleccionarObra(id){localStorage.setItem(currentKey,id);return cargar(id);},
    async guardarProyectoCompleto(p){guardarCompleto(p);},
    async actualizarMeta(obraId,campos){
      const meta=getJson(k(obraId,"meta"))||{id:obraId};
      const next={...meta,...campos,id:obraId};
      setJson(k(obraId,"meta"),next);
      localStorage.setItem(currentKey,obraId);
    },
    async guardarConfiguracion(obraId,item){
      const key=k(obraId,"config",item.field), old=getJson(key);
      const order=old?.order ?? project.config.findIndex(x=>x.field===item.field);
      setJson(key,{...item,order});
    },
    async guardarPaquete(obraId,item){
      const key=k(obraId,"packages",item.name), old=getJson(key);
      const order=old?.order ?? project.packages.findIndex(x=>x.name===item.name);
      setJson(key,{...item,order});
    },
    async guardarCoeficiente(obraId,item){
      const key=k(obraId,"coefficients",item.name), old=getJson(key);
      const order=old?.order ?? project.coefficients.findIndex(x=>x.name===item.name);
      setJson(key,{...item,order});
    },
    async guardarCalculadoras(obraId,value){setJson(k(obraId,"calculators"),value);},
    async guardarSettings(obraId,value){setJson(k(obraId,"settings"),value);},
    async actualizarTarea(obraId,item){setJson(k(obraId,"tasks",item.id),item);},
    async crearTarea(obraId,item){setJson(k(obraId,"tasks",item.id),item);},
    async eliminarTarea(obraId,id){localStorage.removeItem(k(obraId,"tasks",id));},
    async actualizarCompra(obraId,item){setJson(k(obraId,"purchases",item.id),item);},
    async crearCompra(obraId,item){setJson(k(obraId,"purchases",item.id),item);},
    async agregarComentario(obraId,item){setJson(k(obraId,"comments",item.id),item);},
    async flush(){}
  };
})();

window.Repositorio = (()=>{
  let adapter=RepositorioLocal;
  let mode="local";

  function obraId(){return project?.project?.id;}
  function fail(err){console.error(err);toast("Error de persistencia: "+err.message);throw err;}
  async function touch(){
    if(!project?.project)return;
    project.project.updatedAt=nowISO();
    await adapter.actualizarMeta(obraId(),{updatedAt:project.project.updatedAt});
  }
  async function persistAndTouch(fn){
    await fn();
    await touch();
    markSaved(mode==="firebase"?"Sincronizado":"Guardado local");
  }

  return {
    async inicializar(){
      if(window.FirebaseRepositorio?.estaConfigurado?.()){
        adapter=window.FirebaseRepositorio;
        mode="firebase";
      }
      const loaded=await adapter.inicializar().catch(fail);
      if(loaded)setProject(loaded);
      return loaded;
    },
    modo(){return mode;},
    nombre(){return adapter.nombre||mode;},
    async listarObras(){return adapter.listarObras().catch(fail);},
    async cambiarObra(id){
      const loaded=await adapter.seleccionarObra(id).catch(fail);
      if(!loaded)throw new Error("No se encontró la obra seleccionada.");
      setProject(loaded);
      markSaved(mode==="firebase"?"Sincronizado":"Guardado local");
      return project;
    },
    async guardarProyectoCompleto(p){
      setProject(p);
      await adapter.guardarProyectoCompleto(project).catch(fail);
      markSaved(mode==="firebase"?"Sincronizado":"Guardado local");
    },
    async guardarMeta(campos={}){
      const updatedAt=nowISO();
      Object.assign(project.project,campos,{updatedAt});
      await adapter.actualizarMeta(obraId(),{...campos,updatedAt}).catch(fail);
      markSaved(mode==="firebase"?"Sincronizado":"Guardado local");
    },
    async guardarConfiguracion(campo,valor){
      const item=getConfig(campo); if(!item)return;
      item.value=valor;
      if(campo==="Nombre de obra")project.project.name=valor||"Proyecto";
      if(campo==="Horizonte de revisión de compras (semanas)")project.settings.purchaseLookAheadWeeks=num(valor)||6;
      markDirty();
      await persistAndTouch(async()=>{
        await adapter.guardarConfiguracion(obraId(),item);
        if(campo==="Nombre de obra")await adapter.actualizarMeta(obraId(),{name:project.project.name});
        if(campo==="Horizonte de revisión de compras (semanas)")await adapter.guardarSettings(obraId(),project.settings);
      }).catch(fail);
    },
    async guardarPaquete(index,weight){
      const item=project.packages[index]; if(!item)return;
      item.weight=num(weight); markDirty();
      await persistAndTouch(()=>adapter.guardarPaquete(obraId(),item)).catch(fail);
    },
    async guardarCoeficiente(index,key,value){
      const item=project.coefficients[index]; if(!item)return;
      item[key]=value===""?null:num(value);markDirty();
      await persistAndTouch(()=>adapter.guardarCoeficiente(obraId(),item)).catch(fail);
    },
    async guardarCalculadora(group,key,value){
      project.calculators[group][key]=value===""?null:num(value);markDirty();
      await persistAndTouch(()=>adapter.guardarCalculadoras(obraId(),project.calculators)).catch(fail);
    },
    async actualizarTarea(id,campos){
      const t=project.tasks.find(x=>x.id===id); if(!t)return;
      Object.assign(t,campos);markDirty();
      await persistAndTouch(()=>adapter.actualizarTarea(obraId(),t,campos)).catch(fail);
    },
    async crearTarea(tareaData){
      project.tasks.push(tareaData);markDirty();
      await persistAndTouch(()=>adapter.crearTarea(obraId(),tareaData)).catch(fail);
    },
    async eliminarTarea(id){
      project.tasks=project.tasks.filter(t=>t.id!==id);
      markDirty();
      await persistAndTouch(()=>adapter.eliminarTarea(obraId(),id)).catch(fail);
    },
    async actualizarCompra(id,campos){
      const p=project.purchases.find(x=>x.id===id);if(!p)return;
      Object.assign(p,campos);markDirty();
      await persistAndTouch(()=>adapter.actualizarCompra(obraId(),p,campos)).catch(fail);
    },
    async crearCompra(compraData){
      project.purchases.push(compraData);markDirty();
      await persistAndTouch(()=>adapter.crearCompra(obraId(),compraData)).catch(fail);
    },
    async agregarComentario(comentarioData){
      project.comments.push(comentarioData);markDirty();
      await persistAndTouch(()=>adapter.agregarComentario(obraId(),comentarioData)).catch(fail);
    },
    async guardarSettings(){await persistAndTouch(()=>adapter.guardarSettings(obraId(),project.settings)).catch(fail);},
    async flush(){await adapter.flush?.();markSaved(mode==="firebase"?"Sincronizado":"Guardado local");}
  };
})();
