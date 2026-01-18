/* Billing LocalStorage v1
   - Cotizaciones / Facturas
   - Link publico: index.html?id=DOCID
   - Aceptar/Declinar + Marcar pagada
   - KPI ventas del mes (solo facturas pagadas)
   - Config empresa + logo (DataURL)
   - Clientes CRUD
   - Temas por plantilla
   - Backup export/import + KPI rojo si >7 dias
*/

(function(){
  "use strict";

  // ====== Storage Keys ======
  const KEY = {
    SETTINGS: "billing.settings.v1",
    CLIENTS:  "billing.clients.v1",
    DOCS:     "billing.docs.v1",
    LAST_BACKUP: "billing.lastBackup.v1"
  };

  // ====== DOM ======
  const $ = (id)=>document.getElementById(id);

  const views = {
    public: $("viewPublic"),
    dash: $("viewDashboard"),
    neu: $("viewNew"),
    clients: $("viewClients"),
    settings: $("viewSettings"),
  };

  // Header
  const brandLogo = $("brandLogo");
  const brandName = $("brandName");
  const brandSub  = $("brandSub");
  const kpiSales  = $("kpiSales");
  const kpiBackup = $("kpiBackup");
  const kpiBackupCard = $("kpiBackupCard");

  // Public
  const pubTitle = $("pubTitle");
  const pubStatus = $("pubStatus");
  const pubClient = $("pubClient");
  const pubTotal = $("pubTotal");
  const pubPayInfo = $("pubPayInfo");
  const btnAccept = $("btnAccept");
  const btnDecline = $("btnDecline");
  const btnMarkPaid = $("btnMarkPaid");
  const btnStripe = $("btnStripe");

  // Dashboard
  const docsBody = $("docsBody");
  const dashMeta = $("dashMeta");
  const tabs = Array.from(document.querySelectorAll(".tab"));

  // New
  const docType = $("docType");
  const docClient = $("docClient");
  const docSubtotal = $("docSubtotal");
  const docTaxRate = $("docTaxRate");
  const docPayMethod = $("docPayMethod");
  const docStripeLink = $("docStripeLink");
  const docNotes = $("docNotes");
  const docTotal = $("docTotal");
  const btnCreate = $("btnCreate");
  const btnClear = $("btnClear");

  // Clients
  const btnNewClient = $("btnNewClient");
  const clientForm = $("clientForm");
  const cName = $("cName");
  const cPhone = $("cPhone");
  const cEmail = $("cEmail");
  const cAddr = $("cAddr");
  const btnSaveClient = $("btnSaveClient");
  const btnCancelClient = $("btnCancelClient");
  const clientsBody = $("clientsBody");

  // Settings
  const sCompany = $("sCompany");
  const sPhone = $("sPhone");
  const sEmail = $("sEmail");
  const sAddr = $("sAddr");
  const sLogo = $("sLogo");
  const logoPreview = $("logoPreview");
  const sTheme = $("sTheme");
  const btnBackup = $("btnBackup");
  const btnRestore = $("btnRestore");
  const restoreFile = $("restoreFile");
  const btnSaveSettings = $("btnSaveSettings");
  const btnFactoryReset = $("btnFactoryReset");

  // ====== State ======
  let state = {
    tab: "all",
    editingClientId: null,
    publicDocId: null
  };

  // ====== Utilities ======
  function now(){ return Date.now(); }
  function fmtMoney(n){
    const x = Number.isFinite(n) ? n : 0;
    return x.toLocaleString("en-US",{style:"currency",currency:"USD"});
  }
  function fmtDate(ts){
    if(!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString("es-PR", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  }
  function uid(){
    return "DOC_" + Math.random().toString(16).slice(2) + "_" + Math.random().toString(16).slice(2);
  }

  function load(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return fallback;
      return JSON.parse(raw);
    }catch(_){
      return fallback;
    }
  }
  function save(key, val){
    localStorage.setItem(key, JSON.stringify(val));
  }

  function safeText(s){
    return (s ?? "").toString().trim();
  }

  function clampNum(v, def=0){
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  }

  // ====== Data Model ======
  // Settings
  function defaultSettings(){
    return {
      company: "Billing",
      phone: "",
      email: "",
      address: "",
      logoDataUrl: "",
      theme: "gold",
      payment: { cash:true, ath:true, stripe:true }
    };
  }

  // Clients
  function getClients(){ return load(KEY.CLIENTS, []); }
  function setClients(list){ save(KEY.CLIENTS, list); }

  // Docs
  function getDocs(){ return load(KEY.DOCS, []); }
  function setDocs(list){ save(KEY.DOCS, list); }

  function getLastBackup(){ return load(KEY.LAST_BACKUP, 0); }
  function setLastBackup(ts){ save(KEY.LAST_BACKUP, ts); }

  // ====== Themes (CSS variables) ======
  const THEMES = {
    gold:   { accent:"#d6b15a", accent2:"#22d3ee" },
    blue:   { accent:"#60a5fa", accent2:"#22d3ee" },
    emerald:{ accent:"#34d399", accent2:"#d6b15a" },
    mono:   { accent:"#e5e7eb", accent2:"#9ca3af" }
  };

  function applyTheme(themeKey){
    const t = THEMES[themeKey] || THEMES.gold;
    document.documentElement.style.setProperty("--accent", t.accent);
    document.documentElement.style.setProperty("--accent2", t.accent2);
  }

  // ====== Bootstrap seed (first run) ======
  function ensureSeed(){
    const s = load(KEY.SETTINGS, null);
    if(!s) save(KEY.SETTINGS, defaultSettings());
    if(!localStorage.getItem(KEY.CLIENTS)) setClients([]);
    if(!localStorage.getItem(KEY.DOCS)) setDocs([]);
    if(!localStorage.getItem(KEY.LAST_BACKUP)) setLastBackup(0);

    const clients = getClients();
    if(clients.length === 0){
      clients.push({ id: "C_" + Math.random().toString(16).slice(2), name:"Cliente Demo", phone:"", email:"", address:"" });
      setClients(clients);
    }
  }

  // ====== Header render ======
  function renderBrand(){
    const s = load(KEY.SETTINGS, defaultSettings());
    if(brandName) brandName.textContent = s.company || "Billing";
    if(brandSub) brandSub.textContent = s.email ? s.email : "LocalStorage • Sin Firebase";

    if(brandLogo){
      if(s.logoDataUrl){
        brandLogo.src = s.logoDataUrl;
        brandLogo.style.display = "block";
      }else{
        brandLogo.removeAttribute("src");
        brandLogo.style.display = "none";
      }
    }

    applyTheme(s.theme || "gold");
  }

  // ====== KPI ======
  function calcMonthlySales(){
    const docs = getDocs();
    const nowD = new Date();
    const y = nowD.getFullYear();
    const m = nowD.getMonth();
    let sum = 0;

    for(const d of docs){
      if(d.type !== "invoice") continue;
      if(d.status !== "paid") continue;
      const dt = new Date(d.updatedAt || d.paidAt || d.createdAt || 0);
      if(dt.getFullYear() === y && dt.getMonth() === m){
        sum += Number(d.total || 0);
      }
    }
    return sum;
  }

  function renderKpis(){
    if(kpiSales) kpiSales.textContent = fmtMoney(calcMonthlySales());

    const last = getLastBackup();
    const days = last ? Math.floor((now() - last) / (1000*60*60*24)) : 999;
    const overdue = days >= 7;

    if(kpiBackupCard){
      kpiBackupCard.classList.remove("bad","good");
      kpiBackupCard.classList.add(overdue ? "bad" : "good");
    }
    if(kpiBackup){
      if(overdue){
        kpiBackup.textContent = last ? `Vencido (${days}d)` : "Nunca";
      }else{
        kpiBackup.textContent = `OK (${days}d)`;
      }
    }
  }

  // ====== Routing ======
  function hideAll(){
    Object.values(views).forEach(v=>{ if(v) v.hidden = true; });
  }

  function route(){
    renderBrand();
    renderKpis();

    const qs = new URLSearchParams(location.search);
    const publicId = qs.get("id");
    if(publicId){
      showPublic(publicId);
      return;
    }

    const hash = location.hash || "#/dashboard";
    const path = hash.split("?")[0];

    hideAll();
    if(path === "#/dashboard"){
      if(views.dash) views.dash.hidden = false;
      renderDashboard();
    }else if(path === "#/new"){
      if(views.neu) views.neu.hidden = false;
      renderNew();
    }else if(path === "#/clients"){
      if(views.clients) views.clients.hidden = false;
      renderClients();
    }else if(path === "#/settings"){
      if(views.settings) views.settings.hidden = false;
      renderSettings();
    }else{
      location.hash = "#/dashboard";
    }
  }

  // ====== Public View ======
  function pillStatus(el, status){
    if(!el) return;
    el.classList.remove("good","bad","warn");
    el.textContent = statusLabel(status);
    if(status === "accepted" || status === "paid") el.classList.add("good");
    else if(status === "declined") el.classList.add("bad");
    else el.classList.add("warn");
  }

  function statusLabel(status){
    switch(status){
      case "pending": return "Pendiente";
      case "accepted": return "Aceptada";
      case "declined": return "Declinada";
      case "paid": return "Pagada";
      default: return "—";
    }
  }

  function showPublic(id){
    hideAll();
    if(views.public) views.public.hidden = false;

    const docs = getDocs();
    const doc = docs.find(x=>x.id === id);
    state.publicDocId = id;

    if(!doc){
      if(pubTitle) pubTitle.textContent = "Documento no encontrado";
      if(pubClient) pubClient.textContent = "—";
      if(pubTotal) pubTotal.textContent = "—";
      if(pubPayInfo) pubPayInfo.textContent = "—";
      pillStatus(pubStatus, "pending");
      if(btnAccept) btnAccept.disabled = true;
      if(btnDecline) btnDecline.disabled = true;
      if(btnMarkPaid) btnMarkPaid.disabled = true;
      if(btnStripe) btnStripe.style.display = "none";
      return;
    }

    if(pubTitle) pubTitle.textContent = doc.type === "invoice" ? "Factura" : "Cotización";
    if(pubClient) pubClient.textContent = doc.clientName || "—";
    if(pubTotal) pubTotal.textContent = fmtMoney(doc.total || 0);
    pillStatus(pubStatus, doc.status || "pending");

    const s = load(KEY.SETTINGS, defaultSettings());
    const payBits = [];
    if(s.payment?.cash) payBits.push("Cash en persona");
    if(s.payment?.ath) payBits.push("ATH Móvil");
    if(s.payment?.stripe && doc.stripeLink) payBits.push("Tarjeta (link)");
    if(pubPayInfo) pubPayInfo.textContent = payBits.length ? payBits.join(" • ") : "—";

    if(btnStripe){
      btnStripe.style.display = (doc.type === "invoice" && doc.stripeLink) ? "inline-flex" : "none";
      btnStripe.href = doc.stripeLink || "#";
      btnStripe.target = "_blank";
      btnStripe.rel = "noopener";
    }

    const locked = (doc.status === "paid" || doc.status === "declined");
    if(btnAccept) btnAccept.disabled = locked || doc.type !== "quote";
    if(btnDecline) btnDecline.disabled = locked || doc.type !== "quote";
    if(btnMarkPaid) btnMarkPaid.disabled = (doc.type !== "invoice") || (doc.status === "paid");
  }

  function updateDoc(id, patch){
    const docs = getDocs();
    const i = docs.findIndex(x=>x.id === id);
    if(i === -1) return;
    docs[i] = { ...docs[i], ...patch, updatedAt: now() };
    setDocs(docs);
    renderKpis();
  }

  if(btnAccept){
    btnAccept.addEventListener("click", ()=>{
      if(!state.publicDocId) return;
      updateDoc(state.publicDocId, { status:"accepted" });
      showPublic(state.publicDocId);
    });
  }

  if(btnDecline){
    btnDecline.addEventListener("click", ()=>{
      if(!state.publicDocId) return;
      updateDoc(state.publicDocId, { status:"declined" });
      showPublic(state.publicDocId);
    });
  }

  if(btnMarkPaid){
    btnMarkPaid.addEventListener("click", ()=>{
      if(!state.publicDocId) return;
      updateDoc(state.publicDocId, { status:"paid", paidAt: now() });
      showPublic(state.publicDocId);
    });
  }

  // ====== Dashboard ======
  function actionButton(label, onClick, variant){
    const b = document.createElement("button");
    b.className = "btn" + (variant ? ` ${variant}` : "");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function renderDashboard(){
    if(dashMeta) dashMeta.textContent = `Hoy: ${fmtDate(now())}`;

    const docs = getDocs().slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    const filtered = docs.filter(d=>{
      if(state.tab === "all") return true;
      if(state.tab === "quotes") return d.type === "quote";
      if(state.tab === "invoices") return d.type === "invoice";
      return true;
    });

    if(!docsBody) return;
    docsBody.innerHTML = "";

    for(const d of filtered){
      const tr = document.createElement("tr");

      const tdDate = document.createElement("td");
      tdDate.textContent = fmtDate(d.createdAt);
      tr.appendChild(tdDate);

      const tdType = document.createElement("td");
      tdType.textContent = d.type === "invoice" ? "Factura" : "Cotización";
      tr.appendChild(tdType);

      const tdClient = document.createElement("td");
      tdClient.textContent = d.clientName || "—";
      tr.appendChild(tdClient);

      const tdTotal = document.createElement("td");
      tdTotal.textContent = fmtMoney(d.total || 0);
      tr.appendChild(tdTotal);

      const tdStatus = document.createElement("td");
      tdStatus.textContent = statusLabel(d.status);
      tr.appendChild(tdStatus);

      const tdAct = document.createElement("td");

      tdAct.appendChild(actionButton("Copiar link", ()=>{
        const url = `${location.origin}${location.pathname}?id=${encodeURIComponent(d.id)}`;
        navigator.clipboard?.writeText(url).catch(()=>{});
        alert(`Link:\n${url}`);
      }, "ghost"));

      tdAct.appendChild(actionButton("Abrir", ()=>{
        location.href = `${location.pathname}?id=${encodeURIComponent(d.id)}`;
      }, "ghost"));

      tdAct.appendChild(actionButton("Borrar", ()=>{
        if(!confirm("Eliminar este documento?")) return;
        const all = getDocs().filter(x=>x.id !== d.id);
        setDocs(all);
        renderDashboard();
        renderKpis();
      }, "danger"));

      tr.appendChild(tdAct);
      docsBody.appendChild(tr);
    }
  }

  // Tabs filter
  tabs.forEach(t=>{
    t.addEventListener("click", ()=>{
      const next = t.getAttribute("data-tab") || "all";
      state.tab = next;
      tabs.forEach(x=>x.classList.toggle("active", x === t));
      renderDashboard();
    });
  });

  // ====== New Doc ======
  function populateClientSelect(selectEl){
    if(!selectEl) return;
    const clients = getClients().slice().sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    selectEl.innerHTML = "";
    for(const c of clients){
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name || "—";
      selectEl.appendChild(opt);
    }
  }

  function computeTotals(){
    const sub = clampNum(docSubtotal?.value, 0);
    const taxRate = clampNum(docTaxRate?.value, 0);
    const tax = sub * (taxRate/100);
    const total = sub + tax;
    if(docTotal) docTotal.value = total.toFixed(2);
    return { sub, taxRate, tax, total };
  }

  function toggleStripeField(){
    if(!docStripeLink) return;
    const isInvoice = (docType?.value === "invoice");
    const isStripe = (docPayMethod?.value === "stripe");
    docStripeLink.closest?.(".field")?.classList?.toggle("hidden", !(isInvoice && isStripe));
    // fallback si no hay wrapper
    docStripeLink.style.display = (isInvoice && isStripe) ? "block" : "none";
  }

  function clearNewForm(){
    if(docType) docType.value = "quote";
    if(docSubtotal) docSubtotal.value = "";
    if(docTaxRate) docTaxRate.value = "11.5";
    if(docPayMethod) docPayMethod.value = "cash";
    if(docStripeLink) docStripeLink.value = "";
    if(docNotes) docNotes.value = "";
    computeTotals();
    toggleStripeField();
  }

  function renderNew(){
    populateClientSelect(docClient);
    toggleStripeField();
    computeTotals();
  }

  function createDoc(){
    const clients = getClients();
    const clientId = docClient?.value || "";
    const client = clients.find(c=>c.id === clientId);

    const type = docType?.value === "invoice" ? "invoice" : "quote";
    const totals = computeTotals();

    if(!client){
      alert("Selecciona un cliente.");
      return;
    }
    if(totals.sub <= 0){
      alert("Subtotal inválido. Pon un número mayor a 0.");
      return;
    }

    const payMethod = safeText(docPayMethod?.value || "cash");
    const stripeLink = safeText(docStripeLink?.value || "");

    const d = {
      id: uid(),
      type,
      clientId: client.id,
      clientName: client.name || "—",
      subtotal: Number(totals.sub.toFixed(2)),
      taxRate: Number(totals.taxRate.toFixed(2)),
      tax: Number(totals.tax.toFixed(2)),
      total: Number(totals.total.toFixed(2)),
      status: "pending",
      payMethod: (type === "invoice") ? payMethod : "",
      stripeLink: (type === "invoice" && payMethod === "stripe") ? stripeLink : "",
      notes: safeText(docNotes?.value || ""),
      createdAt: now(),
      updatedAt: now(),
      paidAt: 0
    };

    const docs = getDocs();
    docs.unshift(d);
    setDocs(docs);

    renderKpis();
    clearNewForm();

    const url = `${location.origin}${location.pathname}?id=${encodeURIComponent(d.id)}`;
    navigator.clipboard?.writeText(url).catch(()=>{});
    alert(`Creado.\nLink:\n${url}`);

    location.hash = "#/dashboard";
    renderDashboard();
  }

  if(docSubtotal) docSubtotal.addEventListener("input", computeTotals);
  if(docTaxRate) docTaxRate.addEventListener("input", computeTotals);
  if(docType) docType.addEventListener("change", ()=>{
    toggleStripeField();
  });
  if(docPayMethod) docPayMethod.addEventListener("change", ()=>{
    toggleStripeField();
  });

  if(btnCreate) btnCreate.addEventListener("click", createDoc);
  if(btnClear) btnClear.addEventListener("click", clearNewForm);

  // ====== Clients CRUD ======
  function clearClientForm(){
    state.editingClientId = null;
    if(cName) cName.value = "";
    if(cPhone) cPhone.value = "";
    if(cEmail) cEmail.value = "";
    if(cAddr) cAddr.value = "";
    if(clientForm) clientForm.classList.remove("editing");
  }

  function renderClients(){
    const clients = getClients().slice().sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    if(!clientsBody) return;
    clientsBody.innerHTML = "";

    for(const c of clients){
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      tdName.textContent = c.name || "—";
      tr.appendChild(tdName);

      const tdPhone = document.createElement("td");
      tdPhone.textContent = c.phone || "—";
      tr.appendChild(tdPhone);

      const tdEmail = document.createElement("td");
      tdEmail.textContent = c.email || "—";
      tr.appendChild(tdEmail);

      const tdAct = document.createElement("td");
      tdAct.appendChild(actionButton("Editar", ()=>{
        state.editingClientId = c.id;
        if(cName) cName.value = c.name || "";
        if(cPhone) cPhone.value = c.phone || "";
        if(cEmail) cEmail.value = c.email || "";
        if(cAddr) cAddr.value = c.address || "";
        if(clientForm) clientForm.classList.add("editing");
      }, "ghost"));

      tdAct.appendChild(actionButton("Borrar", ()=>{
        if(!confirm("Eliminar este cliente?")) return;
        const next = getClients().filter(x=>x.id !== c.id);
        setClients(next);

        // si hay docs con ese cliente, se quedan con el nombre ya grabado
        renderClients();
        populateClientSelect(docClient);
        renderDashboard();
      }, "danger"));

      tr.appendChild(tdAct);
      clientsBody.appendChild(tr);
    }
  }

  function saveClient(){
    const name = safeText(cName?.value);
    if(!name){
      alert("Nombre requerido.");
      return;
    }
    const phone = safeText(cPhone?.value);
    const email = safeText(cEmail?.value);
    const address = safeText(cAddr?.value);

    const clients = getClients();
    if(state.editingClientId){
      const i = clients.findIndex(x=>x.id === state.editingClientId);
      if(i !== -1){
        clients[i] = { ...clients[i], name, phone, email, address };
      }
    }else{
      clients.push({ id:"C_" + Math.random().toString(16).slice(2), name, phone, email, address });
    }
    setClients(clients);

    clearClientForm();
    renderClients();
    populateClientSelect(docClient);
    renderDashboard();
  }

  if(btnNewClient) btnNewClient.addEventListener("click", clearClientForm);
  if(btnSaveClient) btnSaveClient.addEventListener("click", saveClient);
  if(btnCancelClient) btnCancelClient.addEventListener("click", clearClientForm);

  // ====== Settings ======
  function renderSettings(){
    const s = load(KEY.SETTINGS, defaultSettings());
    if(sCompany) sCompany.value = s.company || "";
    if(sPhone) sPhone.value = s.phone || "";
    if(sEmail) sEmail.value = s.email || "";
    if(sAddr) sAddr.value = s.address || "";
    if(sTheme) sTheme.value = s.theme || "gold";

    if(logoPreview){
      if(s.logoDataUrl){
        logoPreview.src = s.logoDataUrl;
        logoPreview.style.display = "block";
      }else{
        logoPreview.removeAttribute("src");
        logoPreview.style.display = "none";
      }
    }
  }

  function saveSettings(){
    const prev = load(KEY.SETTINGS, defaultSettings());
    const next = {
      ...prev,
      company: safeText(sCompany?.value) || "Billing",
      phone: safeText(sPhone?.value),
      email: safeText(sEmail?.value),
      address: safeText(sAddr?.value),
      theme: safeText(sTheme?.value) || "gold",
      logoDataUrl: prev.logoDataUrl || ""
    };
    save(KEY.SETTINGS, next);
    renderBrand();
    renderKpis();
    alert("Configuración guardada.");
  }

  if(btnSaveSettings) btnSaveSettings.addEventListener("click", saveSettings);

  if(sLogo){
    sLogo.addEventListener("change", (e)=>{
      const file = e.target.files?.[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        const s = load(KEY.SETTINGS, defaultSettings());
        s.logoDataUrl = reader.result;
        save(KEY.SETTINGS, s);
        renderBrand();
        renderSettings();
      };
      reader.readAsDataURL(file);
    });
  }

  // ====== Backup / Restore ======
  function exportBackup(){
    const payload = {
      meta: { app:"Billing LocalStorage", version:"v1", exportedAt: now() },
      settings: load(KEY.SETTINGS, defaultSettings()),
      clients: getClients(),
      docs: getDocs()
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `billing-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);

    setLastBackup(now());
    renderKpis();
  }

  function importBackupFromText(text){
    let obj;
    try{
      obj = JSON.parse(text);
    }catch{
      alert("Backup inválido (JSON corrupto).");
      return;
    }
    if(!obj || typeof obj !== "object"){
      alert("Backup inválido.");
      return;
    }
    if(!obj.settings || !Array.isArray(obj.clients) || !Array.isArray(obj.docs)){
      alert("Backup incompleto. Debe incluir settings, clients y docs.");
      return;
    }

    save(KEY.SETTINGS, { ...defaultSettings(), ...obj.settings });
    setClients(obj.clients);
    setDocs(obj.docs);
    setLastBackup(now());
    renderBrand();
    renderKpis();
    alert("Backup restaurado.");
    location.hash = "#/dashboard";
    route();
  }

  if(btnBackup) btnBackup.addEventListener("click", exportBackup);

  if(btnRestore){
    btnRestore.addEventListener("click", ()=>{
      if(restoreFile) restoreFile.click();
    });
  }

  if(restoreFile){
    restoreFile.addEventListener("change", (e)=>{
      const file = e.target.files?.[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        importBackupFromText(reader.result);
      };
      reader.readAsText(file);
      e.target.value = "";
    });
  }

  // ====== Factory Reset ======
  function factoryReset(){
    if(!confirm("Esto borra TODO (settings, clientes, docs). ¿Seguro?")) return;
    localStorage.removeItem(KEY.SETTINGS);
    localStorage.removeItem(KEY.CLIENTS);
    localStorage.removeItem(KEY.DOCS);
    localStorage.removeItem(KEY.LAST_BACKUP);
    ensureSeed();
    alert("Reset completo. Empezamos limpio.");
    location.search = "";
    location.hash = "#/dashboard";
  }

  if(btnFactoryReset) btnFactoryReset.addEventListener("click", factoryReset);

  // ====== Global nav helpers (si existen botones externos) ======
  window.goAdmin = function(){
    // Quita ?id=... sin recargar pesado
    const url = `${location.origin}${location.pathname}${location.hash || "#/dashboard"}`;
    history.replaceState({}, "", url);
    route();
  };

  // ====== Init ======
  ensureSeed();
  clearNewForm();

  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  window.addEventListener("load", route);

  // Primer render inmediato por si el DOM ya está listo
  route();

})();
