"use strict";

window.FirebaseRepositorio = (()=>{
  let db=null;
  let currentObraId=null;
  let unsubscribers=[];
  const currentKey=`${STORAGE_PREFIX}.firebase.currentObraId`;

  function cfg(){return window.GESTOR_FIREBASE||{};}
  function estaConfigurado(){
    const c=cfg();
    return !!(c.enabled && c.config?.projectId && c.config?.apiKey && window.firebase?.initializeApp);
  }
  async function initSdk(){
    if(!estaConfigurado())return false;
    if(!firebase.apps.length)firebase.initializeApp(cfg().config);
    db=firebase.firestore();
    try{
      await db.enablePersistence({synchronizeTabs:true});
    }catch(err){
      if(!["failed-precondition","unimplemented"].includes(err.code))console.warn("Persistencia Firestore",err);
    }
    return true;
  }
  const obraRef=id=>db.collection("obras").doc(id);
  const configRef=id=>obraRef(id).collection("config").doc("general");

  function mapWithOrder(items,key){
    const out={};
    (items||[]).forEach((x,i)=>{out[x[key]]={...x,order:i};});
    return out;
  }
  function valuesOrdered(obj){
    return Object.values(obj||{}).sort((a,b)=>(a.order??999)-(b.order??999)).map(x=>{const y={...x};delete y.order;return y;});
  }
  function stopListeners(){unsubscribers.forEach(fn=>{try{fn();}catch{}});unsubscribers=[];}

  async function listarObras(){
    const snap=await db.collection("obras").get();
    return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||""))).map(x=>({id:x.id,name:x.name||"Proyecto",updatedAt:x.updatedAt,createdAt:x.createdAt}));
  }

  async function cargarObra(id){
    const ref=obraRef(id);
    const [root,conf,tasks,purchases,comments]=await Promise.all([
      ref.get(),configRef(id).get(),ref.collection("tareas").get(),ref.collection("compras").get(),ref.collection("comentarios").get()
    ]);
    if(!root.exists)return null;
    const rootData=root.data()||{};
    const c=conf.data()||{};
    const p={
      schemaVersion:rootData.schemaVersion||"0.2",
      templateVersion:rootData.templateVersion||"Gestor Obra V0.4",
      project:{...rootData,id},
      config:valuesOrdered(c.config),
      packages:valuesOrdered(c.packages),
      coefficients:valuesOrdered(c.coefficients),
      calculators:c.calculators||{masonry:{},plaster:{},paint:{},ceramics:{}},
      settings:c.settings||{purchaseLookAheadWeeks:6},
      tasks:tasks.docs.map(d=>({id:d.id,...d.data()})),
      purchases:purchases.docs.map(d=>({id:d.id,...d.data()})),
      comments:comments.docs.map(d=>({id:d.id,...d.data()}))
    };
    delete p.project.schemaVersion;
    delete p.project.templateVersion;
    return ensureProjectShape(p);
  }

  function upsertArrayById(arr,item){
    const i=arr.findIndex(x=>x.id===item.id);
    if(i>=0)arr[i]=item;else arr.push(item);
  }
  function applyChanges(arr,snap){
    snap.docChanges().forEach(ch=>{
      const item={id:ch.doc.id,...ch.doc.data()};
      if(ch.type==="removed"){
        const i=arr.findIndex(x=>x.id===item.id);
        if(i>=0)arr.splice(i,1);
      }else upsertArrayById(arr,item);
    });
  }
  function suscribir(id){
    stopListeners();
    unsubscribers.push(obraRef(id).onSnapshot(s=>{
      if(!s.exists || project?.project?.id!==id)return;
      const d=s.data()||{};
      project.project={...project.project,...d,id};
      delete project.project.schemaVersion;delete project.project.templateVersion;
      renderTop();
    }));
    unsubscribers.push(configRef(id).onSnapshot(s=>{
      if(!s.exists || project?.project?.id!==id)return;
      const c=s.data()||{};
      project.config=valuesOrdered(c.config);
      project.packages=valuesOrdered(c.packages);
      project.coefficients=valuesOrdered(c.coefficients);
      project.calculators=c.calculators||project.calculators;
      project.settings=c.settings||project.settings;
      renderDashboard();renderConfig();renderCalculators();
    }));
    unsubscribers.push(obraRef(id).collection("tareas").onSnapshot(s=>{
      if(project?.project?.id!==id)return;
      applyChanges(project.tasks,s);
      project.tasks.sort((a,b)=>String(taskDisplayId(a)).localeCompare(String(taskDisplayId(b)),"es",{numeric:true}));
      renderDashboard();renderTasks();
    }));
    unsubscribers.push(obraRef(id).collection("compras").onSnapshot(s=>{
      if(project?.project?.id!==id)return;
      applyChanges(project.purchases,s);
      project.purchases.sort((a,b)=>String(purchaseDisplayId(a)).localeCompare(String(purchaseDisplayId(b)),"es",{numeric:true}));
      renderDashboard();renderPurchases();
    }));
    unsubscribers.push(obraRef(id).collection("comentarios").onSnapshot(s=>{
      if(project?.project?.id!==id)return;
      applyChanges(project.comments,s);renderComments();
    }));
  }

  async function guardarProyectoCompleto(p){
    ensureProjectShape(p);
    currentObraId=p.project.id;
    const ref=obraRef(currentObraId);
    const operationCount=2+p.tasks.length+p.purchases.length+p.comments.length;
    if(operationCount>490)throw new Error(`El seed requiere ${operationCount} escrituras; supera el límite seguro de un WriteBatch.`);
    const batch=db.batch();
    batch.set(ref,{...p.project,schemaVersion:p.schemaVersion,templateVersion:p.templateVersion},{merge:true});
    batch.set(configRef(currentObraId),{
      config:mapWithOrder(p.config,"field"),
      packages:mapWithOrder(p.packages,"name"),
      coefficients:mapWithOrder(p.coefficients,"name"),
      calculators:p.calculators,
      settings:p.settings
    },{merge:true});
    p.tasks.forEach(t=>{const d={...t};delete d.id;batch.set(ref.collection("tareas").doc(t.id),d,{merge:true});});
    p.purchases.forEach(x=>{const d={...x};delete d.id;batch.set(ref.collection("compras").doc(x.id),d,{merge:true});});
    p.comments.forEach(x=>{const d={...x};delete d.id;batch.set(ref.collection("comentarios").doc(x.id),d,{merge:true});});
    await batch.commit();
    localStorage.setItem(currentKey,currentObraId);
    suscribir(currentObraId);
  }

  return {
    nombre:"Firebase Firestore",
    estaConfigurado,
    async inicializar(){
      if(!await initSdk())return null;
      currentObraId=cfg().obraId||localStorage.getItem(currentKey);
      if(!currentObraId)currentObraId=(await listarObras())[0]?.id||null;
      if(!currentObraId)return null;
      const p=await cargarObra(currentObraId);
      if(p){localStorage.setItem(currentKey,currentObraId);suscribir(currentObraId);}
      return p;
    },
    listarObras,
    async seleccionarObra(id){
      const p=await cargarObra(id);
      if(!p)return null;
      currentObraId=id;
      localStorage.setItem(currentKey,id);
      suscribir(id);
      return p;
    },
    guardarProyectoCompleto,
    async actualizarMeta(obraId,campos){
      await obraRef(obraId).set(campos,{merge:true});
      localStorage.setItem(currentKey,obraId);
    },
    async guardarConfiguracion(obraId,item){
      await configRef(obraId).update(new firebase.firestore.FieldPath("config",item.field,"value"),item.value);
    },
    async guardarPaquete(obraId,item){
      await configRef(obraId).update(new firebase.firestore.FieldPath("packages",item.name,"weight"),item.weight);
    },
    async guardarCoeficiente(obraId,item){
      const order=project.coefficients.findIndex(x=>x.name===item.name);
      await configRef(obraId).update(new firebase.firestore.FieldPath("coefficients",item.name),{...item,order});
    },
    async guardarCalculadoras(obraId,value){await configRef(obraId).update({calculators:value});},
    async guardarSettings(obraId,value){await configRef(obraId).update({settings:value});},
    async actualizarTarea(obraId,item,campos){await obraRef(obraId).collection("tareas").doc(item.id).update(campos||item);},
    async crearTarea(obraId,item){const d={...item};delete d.id;await obraRef(obraId).collection("tareas").doc(item.id).set(d);},
    async eliminarTarea(obraId,id){await obraRef(obraId).collection("tareas").doc(id).delete();},
    async actualizarCompra(obraId,item,campos){await obraRef(obraId).collection("compras").doc(item.id).update(campos||item);},
    async crearCompra(obraId,item){const d={...item};delete d.id;await obraRef(obraId).collection("compras").doc(item.id).set(d);},
    async agregarComentario(obraId,item){const d={...item};delete d.id;await obraRef(obraId).collection("comentarios").doc(item.id).set(d);},
    async flush(){}
  };
})();
