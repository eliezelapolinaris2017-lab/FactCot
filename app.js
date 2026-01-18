import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 🔐 Firebase config */
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_DOMAIN",
  projectId: "TU_PROJECT_ID",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* 🔑 Auth */
window.login = () =>{
  signInWithEmailAndPassword(auth,email.value,password.value);
};

onAuthStateChanged(auth,user=>{
  if(user){
    login.hidden=true;
    appSection.hidden=false;
    cargarKPI();
  }
});

/* 📄 Cotización */
window.crearCotizacion = async()=>{
  const ref = await addDoc(collection(db,"quotes"),{
    cliente:cliente.value,
    total:Number(total.value),
    status:"pendiente",
    createdAt:serverTimestamp()
  });
  alert("Link público: ?id="+ref.id);
};

/* 🧾 Factura */
window.crearFactura = async()=>{
  await addDoc(collection(db,"invoices"),{
    cliente:cliente.value,
    total:Number(total.value),
    metodo:metodo.value,
    status:"pagada",
    createdAt:serverTimestamp()
  });
  cargarKPI();
};

/* 📊 KPI */
async function cargarKPI(){
  let suma=0;
  const snap=await getDocs(collection(db,"invoices"));
  snap.forEach(d=>{
    if(d.data().status==="pagada") suma+=d.data().total;
  });
  kpiVentas.innerText="$"+suma;
}

/* ⚙️ Config */
window.guardarConfig=async()=>{
  await setDoc(doc(db,"config","empresa"),{
    nombre:empresa.value
  });
};

/* 💾 Backup */
window.hacerBackup=async()=>{
  await setDoc(doc(db,"system","backup"),{
    date:Date.now()
  });
  kpiBackup.innerText="Backup OK";
};
