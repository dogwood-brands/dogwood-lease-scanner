import { useState, useEffect, useRef } from "react";

const FONT = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Playfair+Display:wght@400;500;600;700&display=swap";

// Simulated existing messy files
const MESSY_FILES = [
  { path: "/Leases/supercuts westheimer lease SIGNED final (2).pdf", size: "2.4 MB" },
  { path: "/Leases/amendment supercuts westheimer nov 2023.pdf", size: "890 KB" },
  { path: "/Real Estate/SC Memorial City/lease.pdf", size: "3.1 MB" },
  { path: "/Real Estate/SC Memorial City/amend 1 - rent increase.pdf", size: "420 KB" },
  { path: "/Dallas stores/preston royal supercuts executed.pdf", size: "2.8 MB" },
  { path: "/Dallas stores/mockingbird lease signed.pdf", size: "2.2 MB" },
  { path: "/Dallas stores/mockingbird amend1.pdf", size: "510 KB" },
  { path: "/Leases/atlanta buckhead supercuts.pdf", size: "3.5 MB" },
  { path: "/Leases/buckhead amend 1.pdf", size: "380 KB" },
  { path: "/Leases/buckhead amend 2.pdf", size: "410 KB" },
  { path: "/Leases/buckhead amendment 3 - holdover.pdf", size: "290 KB" },
  { path: "/sandy springs lease new location.pdf", size: "4.1 MB" },
  { path: "/Leases/KATY FRY RD lease jan 2024.pdf", size: "2.9 MB" },
  { path: "/Old/westheimer first amendment 2021.pdf", size: "450 KB" },
  { path: "/Leases/Misc/supercuts flex woodlands.pdf", size: "2.6 MB" },
  { path: "/insurance certs/westheimer COI 2024.pdf", size: "180 KB" },
  { path: "/correspondence/landlord letter buckhead renewal.pdf", size: "120 KB" },
];

const CLASSIFIED = [
  { file: "supercuts westheimer lease SIGNED final (2).pdf", store: "SC-1042", location: "Supercuts - Westheimer", address: "9750 Westheimer Rd, Ste 120, Houston, TX 77042", center: "Westheimer Town Center", landlord: "Weingarten Realty", type: "Original Lease", date: "2019-04-01", endDate: "2029-03-31", rent: 4200, cam: 850, sqft: 1200, confidence: 94, newPath: "/Dogwood/SC-1042/Original-Lease.pdf" },
  { file: "westheimer first amendment 2021.pdf", store: "SC-1042", location: "Supercuts - Westheimer", address: "9750 Westheimer Rd, Ste 120, Houston, TX 77042", center: "Westheimer Town Center", landlord: "Weingarten Realty", type: "Amendment #1", date: "2021-08-10", endDate: "2029-03-31", rent: 4200, cam: 850, sqft: 1200, confidence: 91, newPath: "/Dogwood/SC-1042/Amendment-01.pdf" },
  { file: "amendment supercuts westheimer nov 2023.pdf", store: "SC-1042", location: "Supercuts - Westheimer", address: "9750 Westheimer Rd, Ste 120, Houston, TX 77042", center: "Westheimer Town Center", landlord: "Weingarten Realty", type: "Amendment #2", date: "2023-11-15", endDate: "2029-03-31", rent: 4500, cam: 920, sqft: 1200, confidence: 88, newPath: "/Dogwood/SC-1042/Amendment-02.pdf" },
  { file: "lease.pdf (Memorial City)", store: "SC-1087", location: "Supercuts - Memorial City", address: "945 Gessner Rd, Ste 200, Houston, TX 77024", center: "Memorial City Plaza", landlord: "MetroNational Corporation", type: "Original Lease", date: "2021-01-15", endDate: "2026-01-14", rent: 4800, cam: 980, sqft: 1350, confidence: 96, newPath: "/Dogwood/SC-1087/Original-Lease.pdf" },
  { file: "amend 1 - rent increase.pdf", store: "SC-1087", location: "Supercuts - Memorial City", address: "945 Gessner Rd, Ste 200, Houston, TX 77024", center: "Memorial City Plaza", landlord: "MetroNational Corporation", type: "Amendment #1", date: "2024-03-01", endDate: "2026-01-14", rent: 5100, cam: 1020, sqft: 1350, confidence: 92, newPath: "/Dogwood/SC-1087/Amendment-01.pdf" },
  { file: "preston royal supercuts executed.pdf", store: "SC-2011", location: "Supercuts - Preston Royal", address: "6025 Royal Ln, Ste 110, Dallas, TX 75230", center: "Preston Royal Village", landlord: "Regency Centers", type: "Original Lease", date: "2020-07-01", endDate: "2030-06-30", rent: 4800, cam: 780, sqft: 1150, confidence: 95, newPath: "/Dogwood/SC-2011/Original-Lease.pdf" },
  { file: "mockingbird lease signed.pdf", store: "SC-2034", location: "Supercuts - Mockingbird Station", address: "5331 E Mockingbird Ln, Ste 140, Dallas, TX 75206", center: "Mockingbird Station", landlord: "UC Funds", type: "Original Lease", date: "2022-03-01", endDate: "2027-02-28", rent: 5200, cam: 1100, sqft: 1400, confidence: 93, newPath: "/Dogwood/SC-2034/Original-Lease.pdf" },
  { file: "mockingbird amend1.pdf", store: "SC-2034", location: "Supercuts - Mockingbird Station", address: "5331 E Mockingbird Ln, Ste 140, Dallas, TX 75206", center: "Mockingbird Station", landlord: "UC Funds", type: "Amendment #1", date: "2024-09-10", endDate: "2027-02-28", rent: 5500, cam: 1150, sqft: 1400, confidence: 89, newPath: "/Dogwood/SC-2034/Amendment-01.pdf" },
  { file: "atlanta buckhead supercuts.pdf", store: "SC-3005", location: "Supercuts - Buckhead", address: "3167 Peachtree Rd NE, Ste 108, Atlanta, GA 30305", center: "Buckhead Station", landlord: "Jamestown LP", type: "Original Lease", date: "2018-09-01", endDate: "2024-08-31", rent: 5800, cam: 1300, sqft: 1500, confidence: 90, newPath: "/Dogwood/SC-3005/Original-Lease.pdf" },
  { file: "buckhead amendment 3.pdf", store: "SC-3005", location: "Supercuts - Buckhead", address: "3167 Peachtree Rd NE, Ste 108, Atlanta, GA 30305", center: "Buckhead Station", landlord: "Jamestown LP", type: "Amendment #3", date: "2024-05-01", endDate: "2024-08-31", rent: 6200, cam: 1380, sqft: 1500, confidence: 91, newPath: "/Dogwood/SC-3005/Amendment-03.pdf" },
  { file: "sandy springs lease new location.pdf", store: "SC-3012", location: "Supercuts - Sandy Springs", address: "6690 Roswell Rd, Ste 210, Sandy Springs, GA 30328", center: "Prado Shopping Center", landlord: "Northwood Investors", type: "Original Lease", date: "2023-06-01", endDate: "2033-05-31", rent: 4500, cam: 920, sqft: 1250, confidence: 97, newPath: "/Dogwood/SC-3012/Original-Lease.pdf" },
  { file: "KATY FRY RD lease jan 2024.pdf", store: "SC-1098", location: "Supercuts - Katy Freeway", address: "1575 N Fry Rd, Ste 100, Katy, TX 77449", center: "Katy Ranch Crossing", landlord: "Katy Ranch Development", type: "Original Lease", date: "2024-01-01", endDate: "2029-12-31", rent: 3800, cam: 720, sqft: 1100, confidence: 93, newPath: "/Dogwood/SC-1098/Original-Lease.pdf" },
  { file: "supercuts flex woodlands.pdf", store: "SC-1055", location: "Supercuts - The Woodlands", address: "2100 Research Forest Dr, The Woodlands, TX 77381", center: "Research Forest Lakeside", landlord: "Howard Hughes Corp", type: "Original Lease", date: "2024-02-01", endDate: "2029-01-31", rent: 4100, cam: 800, sqft: 1180, confidence: 90, newPath: "/Dogwood/SC-1055/Original-Lease.pdf" },
  { file: "westheimer COI 2024.pdf", store: "SC-1042", location: "Supercuts - Westheimer", address: "", center: "", landlord: "", type: "Insurance Certificate", date: "2024-01-15", endDate: "", rent: 0, cam: 0, sqft: 0, confidence: 82, newPath: "/Dogwood/SC-1042/Other/COI-2024.pdf", note: "Non-lease: Insurance cert" },
  { file: "landlord letter buckhead renewal.pdf", store: "SC-3005", location: "Supercuts - Buckhead", address: "", center: "", landlord: "Jamestown LP", type: "Correspondence", date: "2024-07-22", endDate: "", rent: 0, cam: 0, sqft: 0, confidence: 75, newPath: "/Dogwood/SC-3005/Other/Renewal-Letter-2024.pdf", note: "Non-lease: Landlord letter re renewal" },
];

function Badge({ status }) {
  const m = { active: ["rgba(34,197,94,0.12)","#22c55e","rgba(34,197,94,0.25)"], expiring: ["rgba(251,191,36,0.12)","#fbbf24","rgba(251,191,36,0.25)"], expired: ["rgba(239,68,68,0.12)","#ef4444","rgba(239,68,68,0.25)"] };
  const [bg,c,br] = m[status] || m.active;
  return <span style={{ padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", background:bg, color:c, border:`1px solid ${br}` }}>{status}</span>;
}

function Conf({ v }) {
  return <span style={{ fontSize:11, fontWeight:600, color: v>=90?"#22c55e":v>=80?"#fbbf24":"#ef4444" }}>{v}%</span>;
}

export default function App() {
  const [view, setView] = useState("scan");
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [fileIdx, setFileIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [leases, setLeases] = useState([]);
  const [toast, setToast] = useState(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadPhase, setUploadPhase] = useState("drop"); // drop, processing, review
  const [uploadFile, setUploadFile] = useState("");
  const [uploadData, setUploadData] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [selectedLease, setSelectedLease] = useState(null);
  const [editField, setEditField] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { const l=document.createElement("link"); l.href=FONT; l.rel="stylesheet"; document.head.appendChild(l); }, []);

  const gold = "#A38252";
  const show = (m,t="success") => { setToast({m,t}); setTimeout(()=>setToast(null),3500); };
  const fmt = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0}).format(n);
  const days = d => Math.ceil((new Date(d)-new Date())/864e5);
  const getStatus = end => { const d=days(end); return d<0?"expired":d<365?"expiring":"active"; };

  // Scan simulation
 async function startScan() {
  setPhase('scanning');
  // 1. Get files from Dropbox
  const scanRes = await fetch('/api/dropbox/scan',
    { method: 'POST' });
  const { files } = await scanRes.json();

  // 2. OCR + Classify each file
  const results = [];
  for (const file of files) {
    const ocrRes = await fetch('/api/ocr', {
      method: 'POST',
      body: JSON.stringify({
        filePath: file.path
      })
    });
    const { text } = await ocrRes.json();

    const classRes = await fetch('/api/classify', {
      method: 'POST',
      body: JSON.stringify({
        ocrText: text,
        fileName: file.name
      })
    });
    const classified = await classRes.json();
    results.push({
      ...classified,
      file: file.name,
      path: file.path
    });
  }
  setResults(results);
  setPhase('review');
}

  function approveResults() {
    const stores = {};
    results.filter(r=>r.type.includes("Lease")||r.type.includes("Amendment")).forEach(r=>{
      if(!stores[r.store]||r.type==="Original Lease") {
        stores[r.store] = { ...r, docs: [], latestAmend: r.type, latestDate: r.date, status: getStatus(r.endDate) };
      }
      stores[r.store].docs.push(r);
      if(r.type!=="Original Lease" && new Date(r.date)>new Date(stores[r.store].latestDate)) {
        stores[r.store].latestAmend = r.type;
        stores[r.store].latestDate = r.date;
        stores[r.store].rent = r.rent;
        stores[r.store].cam = r.cam;
      }
    });
    setLeases(Object.values(stores));
    setView("portfolio");
    show(`${Object.keys(stores).length} locations organized & tracked`);
  }

  // Upload simulation
  function handleUpload(name) {
    setUploadFile(name||"document.pdf"); setUploadPhase("processing");
    setTimeout(()=>{
      setUploadData({
        store:"", location:"", address:"", center:"", landlord:"", type:"Original Lease",
        date:"", endDate:"", rent:"", cam:"", sqft:"", confidence: 91,
        notes:"", market:"Houston", newPath:""
      });
      setUploadPhase("review");
    }, 2800);
  }

  function saveUpload() {
    const nl = { ...uploadData, rent:Number(uploadData.rent)||0, cam:Number(uploadData.cam)||0, sqft:Number(uploadData.sqft)||0,
      status: uploadData.endDate ? getStatus(uploadData.endDate) : "active",
      docs:[{ file:uploadFile, type:uploadData.type, date:uploadData.date }],
      latestAmend: uploadData.type, latestDate: uploadData.date,
      newPath: `/Dogwood/${uploadData.store||"NEW"}/${uploadData.type.replace(/ /g,"-")}.pdf` };
    // Check if store exists
    const existing = leases.findIndex(l=>l.store===nl.store);
    if(existing>=0 && nl.store) {
      const updated = [...leases];
      updated[existing] = { ...updated[existing], ...nl, docs:[...updated[existing].docs, ...nl.docs] };
      setLeases(updated);
      show(`Updated ${nl.store} with new ${nl.type}`);
    } else {
      setLeases(p=>[nl,...p]);
      show(`Added new location: ${nl.location||nl.store}`);
    }
    setUploadModal(false); setUploadPhase("drop"); setUploadData({});
    show(`Saved & uploaded to Dropbox: ${nl.newPath}`);
  }

  const leaseResults = results.filter(r=>r.type.includes("Lease")||r.type.includes("Amendment"));
  const otherResults = results.filter(r=>!r.type.includes("Lease")&&!r.type.includes("Amendment"));
  const groups = {}; leaseResults.forEach(r=>{ if(!groups[r.store]) groups[r.store]=[]; groups[r.store].push(r); });
  const activeL = leases.filter(l=>l.status==="active").length;
  const totalRent = leases.filter(l=>l.status!=="expired").reduce((a,l)=>a+l.rent+(l.cam||0),0);

  const iS = { width:"100%", padding:"9px 12px", borderRadius:7, fontSize:12, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.03)", color:"#E8E4DD", fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#0A0E19", color:"#E8E4DD", minHeight:"100vh" }}>
      <div style={{ position:"fixed",inset:0,zIndex:0,pointerEvents:"none",background:"radial-gradient(ellipse at 15% 0%,rgba(163,130,82,0.05) 0%,transparent 55%)" }}/>
      <div style={{ position:"relative",zIndex:1 }}>

        {/* HEADER */}
        <header style={{ padding:"0 28px",height:58,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",background:"rgba(10,14,25,0.85)",position:"sticky",top:0,zIndex:100 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:30,height:30,borderRadius:7,background:`linear-gradient(135deg,${gold},#7A6240)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#0A0E19",fontFamily:"'Playfair Display',serif" }}>D</div>
            <div><div style={{ fontSize:13,fontWeight:600 }}>Dogwood Brands</div><div style={{ fontSize:8,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.15em" }}>Lease Management</div></div>
          </div>
          <nav style={{ display:"flex",gap:2 }}>
            {[{k:"scan",l:"⚡ Scan Dropbox"},{k:"portfolio",l:"Portfolio"},{k:"upload",l:"+ Upload"}].map(t=>(
              <button key={t.k} onClick={()=>{ if(t.k==="upload"){setUploadModal(true);setUploadPhase("drop")} else setView(t.k) }}
                style={{ padding:"6px 14px",borderRadius:6,border:t.k==="upload"?"none":"none",cursor:"pointer",fontSize:11,fontWeight:t.k==="upload"?600:500,fontFamily:"'DM Sans',sans-serif",
                  background:t.k==="upload"?`linear-gradient(135deg,${gold},#8B7040)`:view===t.k?`rgba(163,130,82,0.15)`:"transparent",
                  color:t.k==="upload"?"#0A0E19":view===t.k?gold:"rgba(255,255,255,0.4)",
                  ...(t.k==="upload"?{boxShadow:"0 2px 8px rgba(163,130,82,0.2)"}:{}),
                  transition:"all 0.15s" }}>{t.l}</button>
            ))}
          </nav>
          <div style={{ display:"flex",gap:6,alignItems:"center" }}>
            <button onClick={()=>show("Synced to Google Sheets")} style={{ padding:"5px 10px",borderRadius:6,fontSize:10,border:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.02)",color:"rgba(255,255,255,0.35)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
              Sync Sheets
            </button>
          </div>
        </header>

        {toast && <div style={{ position:"fixed",top:72,right:28,zIndex:200,background:toast.t==="success"?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)",border:`1px solid ${toast.t==="success"?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`,borderRadius:8,padding:"9px 14px",fontSize:12,fontWeight:500,color:toast.t==="success"?"#22c55e":"#ef4444",backdropFilter:"blur(12px)",animation:"fadeIn 0.3s" }}>{toast.m}</div>}

        <main style={{ padding:"24px 28px",maxWidth:1300,margin:"0 auto" }}>

          {/* ═══ SCAN VIEW ═══ */}
          {view==="scan" && (
            <div style={{ animation:"fadeIn 0.4s" }}>
              {phase==="idle" && (
                <div style={{ maxWidth:640,margin:"50px auto",textAlign:"center" }}>
                  <div style={{ fontSize:44,marginBottom:16,opacity:0.8 }}>📂</div>
                  <h1 style={{ fontSize:26,fontWeight:300,fontFamily:"'Playfair Display',serif",marginBottom:8 }}>Scan & Organize Your Dropbox</h1>
                  <p style={{ fontSize:13,color:"rgba(255,255,255,0.4)",lineHeight:1.7,marginBottom:28 }}>
                    Connects to your Dropbox, OCRs every document, AI classifies each file (which store, lease vs amendment vs other), extracts all key terms, and reorganizes into clean folders. File names don't matter — it reads the actual content.
                  </p>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:4,flexWrap:"wrap",marginBottom:28 }}>
                    {["Find PDFs","→","OCR Text","→","AI Classify","→","Extract Data","→","Organize","→","Track"].map((s,i)=>(
                      s==="→"?<span key={i} style={{color:"rgba(255,255,255,0.12)",fontSize:11}}>→</span>:
                      <span key={i} style={{padding:"4px 8px",borderRadius:5,background:"rgba(163,130,82,0.08)",border:"1px solid rgba(163,130,82,0.12)",color:gold,fontSize:10,fontWeight:500}}>{s}</span>
                    ))}
                  </div>
                  <button onClick={startScan} style={{ padding:"11px 28px",borderRadius:9,fontSize:14,fontWeight:600,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",background:`linear-gradient(135deg,${gold},#8B7040)`,color:"#0A0E19",boxShadow:"0 4px 20px rgba(163,130,82,0.3)",display:"inline-flex",alignItems:"center",gap:7 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Scan My Dropbox
                  </button>
                  <p style={{ fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:10 }}>Nothing moves until you approve</p>
                </div>
              )}

              {(phase==="scanning"||phase==="classifying") && (
                <div style={{ maxWidth:640,margin:"30px auto" }}>
                  <h2 style={{ fontSize:20,fontWeight:400,fontFamily:"'Playfair Display',serif",marginBottom:16 }}>
                    {phase==="scanning"?"Scanning & OCR Processing...":"AI Classifying Documents..."}
                  </h2>
                  <div style={{ width:"100%",height:5,borderRadius:3,background:"rgba(255,255,255,0.06)",marginBottom:10,overflow:"hidden" }}>
                    <div style={{ height:"100%",borderRadius:3,background:`linear-gradient(90deg,${gold},#C4A469)`,transition:"width 0.3s",width:`${Math.min(progress,100)}%` }}/>
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,0.25)",marginBottom:20 }}>
                    <span>{phase==="scanning"?`File ${fileIdx} of ${MESSY_FILES.length}`:`Classifying ${Math.min(Math.round((progress-50)*CLASSIFIED.length/50),CLASSIFIED.length)} of ${CLASSIFIED.length}`}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  {phase==="scanning" && (
                    <div style={{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:9,padding:14,maxHeight:300,overflow:"auto" }}>
                      {MESSY_FILES.slice(0,fileIdx).map((f,i)=>(
                        <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",animation:"fadeIn 0.2s" }}>
                          <span style={{ fontSize:10,color:"rgba(255,255,255,0.45)",fontFamily:"monospace" }}>{f.path}</span>
                          <span style={{ fontSize:9,color:"rgba(255,255,255,0.2)" }}>{f.size}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {phase==="classifying" && (
                    <div style={{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:9,padding:14 }}>
                      {["Running OCR text extraction...","Identifying landlord entities & addresses...","Matching documents to store locations...","Classifying: Original Lease vs Amendment vs Other...","Extracting rent, dates, square footage...","Assigning store numbers by market...","Building organized folder structure..."].slice(0,Math.ceil((progress-50)/7)).map((m,i)=>(
                        <div key={i} style={{ fontSize:11,color:"rgba(255,255,255,0.4)",padding:"3px 0",display:"flex",alignItems:"center",gap:6,animation:"fadeIn 0.3s" }}>
                          <div style={{width:4,height:4,borderRadius:"50%",background:gold}}/>{m}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {phase==="review" && (
                <div style={{ animation:"fadeIn 0.4s" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
                    <div>
                      <h2 style={{ fontSize:22,fontWeight:300,fontFamily:"'Playfair Display',serif",marginBottom:4 }}>Scan Complete</h2>
                      <p style={{ fontSize:12,color:"rgba(255,255,255,0.3)" }}>{MESSY_FILES.length} files → {results.length} classified → {Object.keys(groups).length} store locations</p>
                    </div>
                    <div style={{ display:"flex",gap:7 }}>
                      <button onClick={()=>{setPhase("idle");setResults([])}} style={{ padding:"7px 14px",borderRadius:7,fontSize:11,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Re-scan</button>
                      <button onClick={approveResults} style={{ padding:"7px 18px",borderRadius:7,fontSize:11,fontWeight:600,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",background:`linear-gradient(135deg,${gold},#8B7040)`,color:"#0A0E19" }}>✓ Approve & Organize All</button>
                    </div>
                  </div>

                  <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginBottom:24 }}>
                    {[{l:"Lease Docs",v:leaseResults.length},{l:"Other Files",v:otherResults.length},{l:"Avg Confidence",v:`${Math.round(results.reduce((a,r)=>a+r.confidence,0)/results.length)}%`},{l:"Needs Review",v:results.filter(r=>r.confidence<85).length}].map((m,i)=>(
                      <div key={i} style={{ flex:"1 1 150px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,padding:"14px 16px" }}>
                        <div style={{ fontSize:9,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3 }}>{m.l}</div>
                        <div style={{ fontSize:22,fontWeight:700,color:gold,fontFamily:"'Playfair Display',serif" }}>{m.v}</div>
                      </div>
                    ))}
                  </div>

                  {Object.entries(groups).map(([store,docs])=>(
                    <div key={store} style={{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:9,marginBottom:7,overflow:"hidden" }}>
                      <div style={{ padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                        <div><span style={{ fontSize:10,fontFamily:"monospace",color:gold,marginRight:8 }}>{store}</span><span style={{ fontSize:12,fontWeight:600 }}>{docs[0].location}</span><span style={{ fontSize:10,color:"rgba(255,255,255,0.25)",marginLeft:10 }}>{docs[0].address}</span></div>
                        <span style={{ fontSize:10,color:gold }}>{docs[0].landlord}</span>
                      </div>
                      <div style={{ borderTop:"1px solid rgba(255,255,255,0.04)",padding:"0 16px" }}>
                        {docs.sort((a,b)=>new Date(a.date)-new Date(b.date)).map((d,i)=>(
                          <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<docs.length-1?"1px solid rgba(255,255,255,0.03)":"none",fontSize:11 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                              <span style={{ color:d.type==="Original Lease"?"#22c55e":"#60a5fa",fontWeight:500,minWidth:100 }}>{d.type}</span>
                              <span style={{ color:"rgba(255,255,255,0.2)",fontFamily:"monospace",fontSize:9 }}>{d.file}</span>
                            </div>
                            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                              {d.rent>0&&<span style={{ color:"rgba(255,255,255,0.35)" }}>{fmt(d.rent)}/mo</span>}
                              <span style={{ color:"rgba(255,255,255,0.2)",fontSize:10 }}>{d.date}</span>
                              <Conf v={d.confidence}/>
                              <span style={{ color:"rgba(255,255,255,0.15)",fontFamily:"monospace",fontSize:9 }}>→ {d.newPath.split("/").pop()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {otherResults.length>0 && (
                    <div style={{ marginTop:20 }}>
                      <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",marginBottom:8,fontWeight:600 }}>Non-Lease Documents</div>
                      <div style={{ background:"rgba(251,191,36,0.04)",border:"1px solid rgba(251,191,36,0.1)",borderRadius:9,padding:"10px 16px" }}>
                        {otherResults.map((d,i)=>(
                          <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<otherResults.length-1?"1px solid rgba(255,255,255,0.03)":"none",fontSize:11 }}>
                            <div><span style={{ color:"#fbbf24",fontWeight:500,marginRight:10 }}>{d.type}</span><span style={{ color:"rgba(255,255,255,0.25)",fontFamily:"monospace",fontSize:9 }}>{d.file}</span></div>
                            <div style={{ display:"flex",gap:8,alignItems:"center" }}><span style={{ color:"rgba(255,255,255,0.25)",fontSize:10 }}>{d.note}</span><Conf v={d.confidence}/></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ PORTFOLIO VIEW ═══ */}
          {view==="portfolio" && !selectedLease && (
            <div style={{ animation:"fadeIn 0.4s" }}>
              {leases.length===0 ? (
                <div style={{ textAlign:"center",padding:"70px 0",color:"rgba(255,255,255,0.25)" }}>
                  <p style={{ fontSize:14,marginBottom:12 }}>No leases yet. Scan your Dropbox or upload a document.</p>
                  <button onClick={()=>setView("scan")} style={{ padding:"8px 20px",borderRadius:7,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",background:`linear-gradient(135deg,${gold},#8B7040)`,color:"#0A0E19" }}>Go to Scanner</button>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22 }}>
                    <div>
                      <h1 style={{ fontSize:24,fontWeight:300,fontFamily:"'Playfair Display',serif",marginBottom:3 }}>Supercuts Lease Portfolio</h1>
                      <p style={{ fontSize:11,color:"rgba(255,255,255,0.3)" }}>{leases.length} locations</p>
                    </div>
                    <button onClick={()=>{setUploadModal(true);setUploadPhase("drop")}} style={{ padding:"7px 16px",borderRadius:7,fontSize:11,fontWeight:600,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",background:`linear-gradient(135deg,${gold},#8B7040)`,color:"#0A0E19",display:"flex",alignItems:"center",gap:5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Upload Document
                    </button>
                  </div>

                  <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginBottom:24 }}>
                    {[{l:"Active",v:activeL},{l:"Expiring",v:leases.filter(l=>l.status==="expiring").length},{l:"Monthly All-In",v:fmt(totalRent)},{l:"Annual",v:fmt(totalRent*12)}].map((m,i)=>(
                      <div key={i} style={{ flex:"1 1 160px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,padding:"16px 18px" }}>
                        <div style={{ fontSize:9,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3 }}>{m.l}</div>
                        <div style={{ fontSize:22,fontWeight:700,color:gold,fontFamily:"'Playfair Display',serif" }}>{m.v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderRadius:10,border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden" }}>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%",borderCollapse:"collapse",fontSize:11 }}>
                        <thead><tr style={{ background:"rgba(255,255,255,0.03)" }}>
                          {["Store","Location","Landlord","Base Rent","All-In","SqFt","Latest Doc","Ends","Status"].map(h=>(
                            <th key={h} style={{ padding:"8px 12px",textAlign:"left",fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.25)",borderBottom:"1px solid rgba(255,255,255,0.05)",whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>{leases.map((l,i)=>(
                          <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)",cursor:"pointer" }}
                            onClick={()=>setSelectedLease(l)}
                            onMouseEnter={e=>e.currentTarget.style.background="rgba(163,130,82,0.04)"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <td style={{ padding:"10px 12px",fontFamily:"monospace",fontSize:10,color:gold }}>{l.store}</td>
                            <td style={{ padding:"10px 12px",fontWeight:600 }}>{l.location}<br/><span style={{fontWeight:400,fontSize:9,color:"rgba(255,255,255,0.25)"}}>{l.address}</span></td>
                            <td style={{ padding:"10px 12px",color:"rgba(255,255,255,0.4)" }}>{l.landlord}</td>
                            <td style={{ padding:"10px 12px",color:gold,fontWeight:500 }}>{fmt(l.rent)}</td>
                            <td style={{ padding:"10px 12px",color:"rgba(255,255,255,0.4)" }}>{fmt(l.rent+(l.cam||0))}</td>
                            <td style={{ padding:"10px 12px",color:"rgba(255,255,255,0.35)" }}>{l.sqft?.toLocaleString()}</td>
                            <td style={{ padding:"10px 12px" }}><div style={{fontSize:10,fontWeight:500}}>{l.latestAmend}</div><div style={{fontSize:8,color:"rgba(255,255,255,0.2)"}}>{l.latestDate}</div></td>
                            <td style={{ padding:"10px 12px",color:"rgba(255,255,255,0.4)",fontSize:10 }}>{l.endDate}</td>
                            <td style={{ padding:"10px 12px" }}><Badge status={l.status}/></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Detail View */}
          {view==="portfolio" && selectedLease && (
            <div style={{ animation:"fadeIn 0.3s" }}>
              <button onClick={()=>setSelectedLease(null)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:4,marginBottom:16,padding:0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>Back
              </button>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24 }}>
                <div>
                  <div style={{ fontSize:10,fontFamily:"monospace",color:gold,marginBottom:3 }}>{selectedLease.store}</div>
                  <h1 style={{ fontSize:24,fontWeight:400,fontFamily:"'Playfair Display',serif",marginBottom:3 }}>{selectedLease.location}</h1>
                  <p style={{ fontSize:12,color:"rgba(255,255,255,0.35)" }}>{selectedLease.center} · {selectedLease.address}</p>
                </div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  <Badge status={selectedLease.status}/>
                  <button onClick={()=>{setUploadModal(true);setUploadPhase("drop")}} style={{ padding:"6px 12px",borderRadius:6,fontSize:10,fontWeight:600,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",background:`rgba(163,130,82,0.15)`,color:gold }}>+ Add Document</button>
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14 }}>
                <div style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:20 }}>
                  <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",marginBottom:14,fontWeight:600 }}>Lease Terms</div>
                  {[["Landlord",selectedLease.landlord],["Base Rent",fmt(selectedLease.rent)+"/mo"],["CAM/NNN",fmt(selectedLease.cam||0)+"/mo"],["All-In",fmt(selectedLease.rent+(selectedLease.cam||0))+"/mo"],["Sq Ft",selectedLease.sqft?.toLocaleString()],["Start",selectedLease.date],["End",selectedLease.endDate],["Latest",selectedLease.latestAmend]].map(([k,v])=>(
                    <div key={k} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ fontSize:11,color:"rgba(255,255,255,0.3)" }}>{k}</span>
                      <span style={{ fontSize:11,fontWeight:500 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:20 }}>
                  <div style={{ fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",marginBottom:14,fontWeight:600 }}>Document History</div>
                  {(selectedLease.docs||[]).map((d,i)=>(
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                      <div><div style={{ fontSize:11,fontWeight:500,color:d.type==="Original Lease"?"#22c55e":"#60a5fa" }}>{d.type}</div><div style={{ fontSize:9,color:"rgba(255,255,255,0.2)" }}>{d.file}</div></div>
                      <span style={{ fontSize:10,color:"rgba(255,255,255,0.25)" }}>{d.date}</span>
                    </div>
                  ))}
                  {(!selectedLease.docs||selectedLease.docs.length===0)&&<p style={{fontSize:11,color:"rgba(255,255,255,0.2)"}}>No documents tracked yet</p>}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ═══ UPLOAD MODAL ═══ */}
        {uploadModal && (
          <div style={{ position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn 0.2s" }}
            onClick={e=>{if(e.target===e.currentTarget){setUploadModal(false);setUploadPhase("drop")}}}>
            <div style={{ background:"#11152A",border:"1px solid rgba(255,255,255,0.08)",borderRadius:13,width:"100%",maxWidth:uploadPhase==="review"?580:460,maxHeight:"85vh",overflow:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.5)" }}>
              <div style={{ padding:"18px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div>
                  <h2 style={{ fontSize:16,fontWeight:500,fontFamily:"'Playfair Display',serif",margin:0 }}>
                    {uploadPhase==="drop"?"Upload Document":uploadPhase==="processing"?"Processing...":"Review & Save"}
                  </h2>
                  <p style={{ fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:2 }}>
                    {uploadPhase==="drop"?"Drop a lease, amendment, or any document":uploadPhase==="processing"?"OCR + AI classification running":"Verify extracted data, then save"}
                  </p>
                </div>
                <button onClick={()=>{setUploadModal(false);setUploadPhase("drop")}} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:16 }}>✕</button>
              </div>
              <div style={{ padding:24 }}>
                {uploadPhase==="drop" && (
                  <div style={{ border:`2px dashed ${dragOver?"rgba(163,130,82,0.6)":"rgba(255,255,255,0.08)"}`,borderRadius:10,padding:"40px 20px",textAlign:"center",background:dragOver?"rgba(163,130,82,0.04)":"transparent",cursor:"pointer",transition:"all 0.2s" }}
                    onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)}
                    onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)handleUpload(f.name)}}
                    onClick={()=>fileRef.current?.click()}>
                    <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.tiff" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f)handleUpload(f.name)}}/>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(163,130,82,0.4)" strokeWidth="1.5" style={{marginBottom:12}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <div style={{ fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.5)",marginBottom:4 }}>Drop your document here</div>
                    <div style={{ fontSize:10,color:"rgba(255,255,255,0.2)" }}>PDF, DOCX, scanned images · OCR handles everything</div>
                    <div style={{ marginTop:14,padding:"6px 12px",borderRadius:6,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",fontSize:9,color:"rgba(255,255,255,0.25)",display:"inline-block" }}>
                      Auto-classifies → extracts data → saves to Dropbox → updates tracker
                    </div>
                  </div>
                )}
                {uploadPhase==="processing" && (
                  <div style={{ textAlign:"center",padding:"24px 0" }}>
                    <div style={{ width:44,height:44,margin:"0 auto 16px",border:"3px solid rgba(255,255,255,0.05)",borderTop:`3px solid ${gold}`,borderRadius:"50%",animation:"spin 1s linear infinite" }}/>
                    <div style={{ fontSize:12,fontWeight:500,color:"rgba(255,255,255,0.5)",marginBottom:6 }}>{uploadFile}</div>
                    <div style={{ fontSize:10,color:"rgba(255,255,255,0.2)" }}>OCR extracting text → AI classifying → extracting lease terms...</div>
                  </div>
                )}
                {uploadPhase==="review" && (
                  <div>
                    <div style={{ padding:"7px 10px",borderRadius:6,marginBottom:16,background:"rgba(163,130,82,0.08)",border:"1px solid rgba(163,130,82,0.15)",fontSize:10,color:"rgba(163,130,82,0.8)",display:"flex",alignItems:"center",gap:5 }}>
                      ℹ Review extracted data. Fix anything the AI got wrong.
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                      {[
                        {k:"store",l:"Store #",ph:"e.g. SC-1042"},
                        {k:"location",l:"Location Name",ph:"e.g. Supercuts - Westheimer"},
                        {k:"address",l:"Address",ph:"Full address"},
                        {k:"center",l:"Shopping Center",ph:"Center name"},
                        {k:"landlord",l:"Landlord",ph:"Landlord entity"},
                        {k:"type",l:"Document Type",ph:"",select:["Original Lease","Amendment #1","Amendment #2","Amendment #3","Amendment #4","Amendment #5","Correspondence","Insurance","Other"]},
                        {k:"date",l:"Document Date",ph:"YYYY-MM-DD",type:"date"},
                        {k:"endDate",l:"Lease End Date",ph:"YYYY-MM-DD",type:"date"},
                        {k:"rent",l:"Base Rent $/mo",ph:"4200",type:"number"},
                        {k:"cam",l:"CAM/NNN $/mo",ph:"850",type:"number"},
                        {k:"sqft",l:"Sq Ft",ph:"1200",type:"number"},
                        {k:"market",l:"Market",ph:"",select:["Houston","Dallas","Atlanta","Austin","Other"]},
                      ].map(f=>(
                        <div key={f.k} style={f.k==="address"?{gridColumn:"1/3"}:{}}>
                          <label style={{ display:"block",fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.3)",marginBottom:3 }}>{f.l}</label>
                          {f.select ? (
                            <select value={uploadData[f.k]||""} onChange={e=>setUploadData(p=>({...p,[f.k]:e.target.value}))} style={{...iS,background:"rgba(10,14,25,0.9)"}}>
                              {f.select.map(o=><option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input type={f.type||"text"} value={uploadData[f.k]||""} onChange={e=>setUploadData(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} style={iS}/>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop:10 }}>
                      <label style={{ display:"block",fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.3)",marginBottom:3 }}>Key Terms / Notes</label>
                      <textarea value={uploadData.notes||""} onChange={e=>setUploadData(p=>({...p,notes:e.target.value}))} placeholder="Escalation, co-tenancy, kick-outs..." rows={2} style={{...iS,resize:"vertical"}}/>
                    </div>
                    <div style={{ display:"flex",gap:7,justifyContent:"flex-end",marginTop:18,paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                      <button onClick={()=>{setUploadModal(false);setUploadPhase("drop")}} style={{ padding:"8px 16px",borderRadius:7,fontSize:11,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
                      <button onClick={saveUpload} style={{ padding:"8px 20px",borderRadius:7,fontSize:11,fontWeight:600,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",background:`linear-gradient(135deg,${gold},#8B7040)`,color:"#0A0E19" }}>Save & Upload to Dropbox</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{margin:0;box-sizing:border-box}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px}
        ::placeholder{color:rgba(255,255,255,0.15)} select option{background:#11152A;color:#E8E4DD}
        input:focus,textarea:focus,select:focus{border-color:rgba(163,130,82,0.4)!important}
      `}</style>
    </div>
  );
}
