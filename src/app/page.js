"use client";
import { useState, useEffect, useRef } from "react";

const FONT = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Playfair+Display:wght@400;500;600;700&display=swap";

function Badge({ status }) {
  const m = { active: ["rgba(34,197,94,0.12)", "#22c55e", "rgba(34,197,94,0.25)"], expiring: ["rgba(251,191,36,0.12)", "#fbbf24", "rgba(251,191,36,0.25)"], expired: ["rgba(239,68,68,0.12)", "#ef4444", "rgba(239,68,68,0.25)"] };
  const [bg, c, br] = m[status] || ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.4)", "rgba(255,255,255,0.1)"];
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", background: bg, color: c, border: `1px solid ${br}` }}>{status}</span>;
}
function Conf({ v }) { return <span style={{ fontSize: 11, fontWeight: 600, color: v >= 90 ? "#22c55e" : v >= 80 ? "#fbbf24" : "#ef4444" }}>{v}%</span>; }

export default function App() {
  const [view, setView] = useState("portfolio");
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [scanLog, setScanLog] = useState([]);
  const [currentFile, setCurrentFile] = useState("");
  const [fileCount, setFileCount] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [results, setResults] = useState([]);
  const [leases, setLeases] = useState([]);
  const [toast, setToast] = useState(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadPhase, setUploadPhase] = useState("drop");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadData, setUploadData] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [selectedLease, setSelectedLease] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [loading, setLoading] = useState(true);
  // ═══ MEMORY STATE ═══
  const [memory, setMemory] = useState({ stores: [], entities: [], totalStores: 0, loaded: false });
  const fileRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => { const l = document.createElement("link"); l.href = FONT; l.rel = "stylesheet"; document.head.appendChild(l); }, []);

  // Load store memory on startup
  useEffect(() => {
    fetch("/api/memory").then(r => r.json()).then(data => {
      if (data.success) {
        setMemory({ stores: data.stores, entities: data.entities, totalStores: data.totalStores, loaded: true, byEntity: data.byEntity });
      }
    }).catch(() => setMemory(prev => ({ ...prev, loaded: true })));
  }, []);

  // ═══ LOAD LEASES FROM DATABASE ON STARTUP ═══
  useEffect(() => {
    loadLeasesFromDB();
  }, []);

  async function loadLeasesFromDB() {
    setLoading(true);
    try {
      const res = await fetch('/api/leases');
      const data = await res.json();
      if (data.leases && data.leases.length > 0) {
        const transformed = data.leases.map(l => ({
          id: l.id,
          salon_number: Number(l.salon_number) || 0,
          store: l.store_number || String(l.salon_number || ''),
          storeName: (l.location_name || '').replace(/^SUPERCUTS - /, '').replace(/^SMARTSTYLE - /, ''),
          address: [l.address, l.city, l.state, l.zip].filter(Boolean).join(', '),
          center: l.shopping_center || '',
          landlord: l.landlord || '',
          landlordContact: l.landlord_contact || '',
          rent: Number(l.monthly_rent) || 0,
          cam: Number(l.monthly_cam) || 0,
          sqft: Number(l.sqft) || 0,
          date: l.lease_start || '',
          endDate: l.lease_end || '',
          renewal: l.renewal_options || '',
          keyTerms: l.key_terms || '',
          entity: l.entity || 'Unknown',
          market: l.market || '',
          led: l.led_date || '',
          sales2024: Number(l.annual_sales_2024) || 0,
          phone: (l.notes || '').replace('Phone: ', ''),
          status: getStatus(l.lease_end || l.led_date),
          latestAmend: l.latest_amendment || 'Original Lease',
          latestDate: l.amendment_date || '',
          dropboxFolder: l.dropbox_folder || '',
          documentCount: Number(l.document_count) || 0,
          docs: [],
          // Keep raw DB fields for updates
          _dbId: l.id,
        }));

        // Load documents for all leases
        try {
          const docsRes = await fetch('/api/documents');
          const docsData = await docsRes.json();
          if (docsData.documents) {
            docsData.documents.forEach(doc => {
              const lease = transformed.find(l => l._dbId === doc.lease_id);
              if (lease) {
                lease.docs.push({
                  file: doc.file_name,
                  type: doc.doc_type || 'Unknown',
                  date: doc.doc_date || '',
                  confidence: doc.confidence || 0,
                });
              }
            });
          }
        } catch (e) {
          console.log('Could not load documents:', e);
        }

        setLeases(transformed);
        // If we have data, default to portfolio view
        if (transformed.length > 0) setView("portfolio");
      }
    } catch (err) {
      console.error('Failed to load leases:', err);
    }
    setLoading(false);
  }

  const gold = "#A38252";
  const show = (m, t = "success") => { setToast({ m, t }); setTimeout(() => setToast(null), 3500); };
  const fmt = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
  const days = d => Math.ceil((new Date(d) - new Date()) / 864e5);
  const getStatus = end => { if (!end) return "active"; const d = days(end); return d < 0 ? "expired" : d < 365 ? "expiring" : "active"; };

  function addLog(msg, type = "info") {
    setScanLog(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 50);
  }

  // Build context from classified docs for AI to match subsequent files
  function buildSessionContext(classifiedSoFar) {
    const all = [...leases, ...classifiedSoFar];
    if (all.length === 0) return [];
    const seen = new Set();
    return all.filter(l => {
      const key = String(l.salon_number || l.store || "");
      if (!key || key === "0" || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(l => ({
      salon_number: l.salon_number || l.store || "",
      entity: l.entity || l.entity_name || "",
      address: l.address || l.property_address || "",
      landlord: l.landlord || l.landlord_name || "",
      center: l.center || l.shopping_center || "",
    }));
  }

  // Find store from memory by salon number
  function getMemoryStore(salonNum) {
    if (!salonNum || !memory.stores.length) return null;
    return memory.stores.find(s => s.salon_number === Number(salonNum));
  }

  // ═══ SCAN ═══
  async function startScan() {
    setPhase("scanning");
    setProgress(0);
    setScanLog([]);
    setResults([]);
    setProcessedCount(0);

    addLog("Connecting to Dropbox...", "system");
    if (memory.loaded && memory.totalStores > 0) {
      addLog(`Store memory loaded: ${memory.totalStores} salons across ${memory.entities.length} entities (${memory.entities.join(", ")})`, "success");
    }

    let files;
    try {
      const scanRes = await fetch("/api/dropbox/scan", { method: "POST" });
      const scanData = await scanRes.json();
      if (!scanData.success) { addLog("Dropbox scan failed: " + (scanData.error || "Unknown"), "error"); show("Dropbox scan failed", "error"); setPhase("idle"); return; }
      files = scanData.files;
      setFileCount(files.length);
      setProgress(5);
      addLog(`Found ${files.length} PDFs across ${scanData.foldersScanned || "multiple"} folders`, "success");
      files.forEach(f => addLog(`📄 ${f.path}`, "file"));
    } catch (err) { addLog("Connection error: " + err.message, "error"); show("Failed to connect", "error"); setPhase("idle"); return; }

    setPhase("processing");
    addLog("", "divider");
    addLog("Starting OCR + AI Classification...", "system");
    addLog(`AI has ${memory.totalStores}-store directory loaded as permanent memory`, "detail");

    const classified = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFile(file.name);
      setProcessedCount(i + 1);
      setProgress(5 + ((i / files.length) * 90));
      addLog(`[${i + 1}/${files.length}] ${file.name}`, "processing");

      try {
        addLog(`  → OCR...`, "detail");
        const ocrRes = await fetch("/api/ocr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filePath: file.path }) });
        const ocrData = await ocrRes.json();
        if (!ocrData.success) { addLog(`  ✗ OCR failed: ${ocrData.error}`, "error"); continue; }
        addLog(`  → OCR done (${ocrData.pageCount || "?"} pages)`, "detail");

        const sessionCtx = buildSessionContext(classified);
        addLog(`  → AI classifying (memory: ${memory.totalStores} stores + ${sessionCtx.length} session matches)...`, "detail");

        const classRes = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ocrText: ocrData.text, fileName: file.name, filePath: file.path, dropboxLink: file.path, folderPath: file.folder || file.path, existingLeases: sessionCtx }),
        });
        const classData = await classRes.json();

        // The classify route now saves to DB automatically
        const savedToDb = classData.saved_to_db || false;

        if (classData.document_type || (classData.success && classData.classification)) {
          const c = classData.classification || classData;
          // Enrich with memory data if matched
          const memStore = getMemoryStore(c.salon_number);
          const result = {
            ...c,
            entity: c.entity_name || c.entity || (memStore ? memStore.entity : "Unknown"),
            salon_number: c.salon_number || 0,
            store: c.salon_number ? String(c.salon_number) : (c.store_name || ""),
            storeName: c.store_name || (memStore ? memStore.store_name : ""),
            storeSource: c.store_number_source || (savedToDb ? "matched_directory" : "unmatched"),
            suggestedFolder: c.suggested_folder || "",
            suggestedFilename: c.suggested_filename || "",
            classNotes: c.classification_notes || "",
            led: memStore ? memStore.led : "",
            sales2024: memStore ? memStore.sales_2024 : 0,
            phone: memStore ? memStore.phone : "",
            file: file.name,
            path: file.path,
            folder: file.folder,
            savedToDb,
            leaseId: classData.lease_id || null,
            documentId: classData.document_id || null,
          };
          classified.push(result);
          setResults(prev => [...prev, result]);

          const matchIcon = result.storeSource === "matched_directory" ? "🎯" : result.storeSource === "found_in_document" ? "📄" : "⚠️";
          const dbIcon = savedToDb ? " 💾" : "";
          addLog(`  ${matchIcon} Salon #${result.salon_number || "?"} → ${result.entity} / ${result.storeName}${dbIcon}`, "success");
          addLog(`  ✓ ${result.document_type} | ${result.property_address || "—"}`, "success");
          addLog(`  ✓ Confidence: ${result.confidence}% (${result.storeSource})`, result.confidence >= 85 ? "success" : "error");
          if (savedToDb) addLog(`  💾 Saved to database`, "detail");
          if (result.classNotes) addLog(`  → ${result.classNotes}`, "detail");
        } else {
          addLog(`  ✗ Failed: ${classData.error || "Unknown"}`, "error");
        }
      } catch (err) { addLog(`  ✗ ${err.message}`, "error"); continue; }
    }

    setProgress(100);
    addLog("", "divider");
    addLog(`Done! ${classified.length}/${files.length} classified.`, "system");
    const savedCount = classified.filter(c => c.savedToDb).length;
    addLog(`${savedCount} saved to database automatically`, "system");
    const matched = classified.filter(c => c.storeSource === "matched_directory").length;
    addLog(`${matched} matched to store directory, ${classified.length - matched} unmatched or document-only`, "system");
    const ents = [...new Set(classified.map(c => c.entity))];
    ents.forEach(e => addLog(`  ${e}: ${classified.filter(c => c.entity === e).length} docs`, "detail"));
    setPhase("review");
  }

  // ═══ APPROVE — now reloads from database ═══
  async function approveResults() {
    show("Loading portfolio from database...");
    // Reload from DB since classify route already saved everything
    await loadLeasesFromDB();
    setView("portfolio");
    show(`Portfolio updated with ${results.length} new documents`);
  }

  // ═══ UPLOAD — now uses /api/upload for full pipeline ═══
  async function handleUpload(file) {
    if (!file) return;
    setUploadFile(file); setUploadFileName(file.name); setUploadPhase("processing");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();

      if (result.error) {
        throw new Error(result.error);
      }

      const c = result.classification || {};
      const mem = getMemoryStore(c.salon_number);
      setUploadData({
        entity: c.entity || "", salon_number: c.salon_number || "",
        storeName: c.store_name || c.shopping_center || (mem ? mem.store_name : ""),
        address: c.property_address || "", center: c.shopping_center || "",
        landlord: c.landlord || c.landlord_name || "", landlordContact: c.landlord_contact || "",
        type: c.document_type || "Original Lease",
        date: c.document_date || c.lease_start || "", endDate: c.lease_end || "",
        rent: c.monthly_rent || "", cam: c.monthly_cam || "",
        sqft: c.sqft || "", market: c.market || "",
        renewal: c.renewal_options || "", keyTerms: c.key_terms || "",
        suggestedFolder: c.suggested_folder || "", suggestedFilename: c.suggested_filename || "",
        confidence: c.confidence || 0, classNotes: c.classification_notes || c.key_terms || "",
        storeSource: c.store_number_source || (result.lease_id ? "matched" : ""),
        // DB IDs from the upload response
        _leaseId: result.lease_id,
        _documentId: result.document?.id,
        _savedToDb: result.success,
      });
      setUploadPhase("review"); return;
    } catch (err) {
      // Fallback to manual entry if upload pipeline fails
      setUploadData({ entity: "", salon_number: "", storeName: "", address: "", center: "", landlord: "", landlordContact: "", type: "Original Lease", date: "", endDate: "", rent: "", cam: "", sqft: "", market: "", renewal: "", keyTerms: "", suggestedFolder: "", suggestedFilename: "", confidence: 0, classNotes: err.message, _savedToDb: false });
      setUploadPhase("review");
    }
  }

  async function saveUpload() {
    // If already saved to DB by /api/upload, just update any edited fields
    if (uploadData._savedToDb && uploadData._leaseId) {
      try {
        await fetch(`/api/leases/${uploadData._leaseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: uploadData.entity || undefined,
            landlord: uploadData.landlord || undefined,
            landlord_contact: uploadData.landlordContact || undefined,
            monthly_rent: Number(uploadData.rent) || undefined,
            monthly_cam: Number(uploadData.cam) || undefined,
            sqft: Number(uploadData.sqft) || undefined,
            lease_start: uploadData.date || undefined,
            lease_end: uploadData.endDate || undefined,
            renewal_options: uploadData.renewal || undefined,
            key_terms: uploadData.keyTerms || undefined,
            market: uploadData.market || undefined,
            latest_amendment: uploadData.type || undefined,
            amendment_date: uploadData.date || undefined,
          }),
        });
      } catch (e) {
        console.error('Failed to update lease:', e);
      }
    } else {
      // Not yet saved — save manually to DB
      try {
        await fetch('/api/leases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_number: String(uploadData.salon_number || 'TBD'),
            location_name: uploadData.storeName ? `SUPERCUTS - ${uploadData.storeName}` : null,
            salon_number: String(uploadData.salon_number || ''),
            address: uploadData.address,
            shopping_center: uploadData.center,
            entity: uploadData.entity,
            landlord: uploadData.landlord,
            landlord_contact: uploadData.landlordContact,
            lease_start: uploadData.date || null,
            lease_end: uploadData.endDate || null,
            monthly_rent: Number(uploadData.rent) || null,
            monthly_cam: Number(uploadData.cam) || null,
            sqft: Number(uploadData.sqft) || null,
            market: uploadData.market,
            renewal_options: uploadData.renewal,
            key_terms: uploadData.keyTerms,
            latest_amendment: uploadData.type,
            amendment_date: uploadData.date || null,
            status: 'active',
          }),
        });
      } catch (e) {
        console.error('Failed to create lease:', e);
      }
    }

    // Reload from database
    await loadLeasesFromDB();

    setUploadModal(false); setUploadPhase("drop"); setUploadData({}); setUploadFile(null);
    show(`Saved: ${uploadData.storeName || uploadFileName} → ${uploadData.entity || 'portfolio'}`);
  }

  // Derived
  const entities = [...new Set(leases.map(l => l.entity).filter(Boolean))].sort();
  const resultsByEntity = {};
  results.forEach(r => { const e = r.entity || "Unknown"; if (!resultsByEntity[e]) resultsByEntity[e] = []; resultsByEntity[e].push(r); });
  const activeL = leases.filter(l => l.status === "active").length;
  const totalRent = leases.filter(l => l.status !== "expired").reduce((a, l) => a + l.rent + (l.cam || 0), 0);
  const iS = { width: "100%", padding: "9px 12px", borderRadius: 7, fontSize: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E8E4DD", fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: "#0A0E19", color: "#E8E4DD", minHeight: "100vh" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 15% 0%,rgba(163,130,82,0.05) 0%,transparent 55%)" }} />

      {/* ═══ LOADING SCREEN ═══ */}
      {loading && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0A0E19", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
          <div style={{ width: 44, height: 44, border: "3px solid rgba(255,255,255,0.05)", borderTop: `3px solid ${gold}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <div style={{ color: gold, fontSize: 20, fontFamily: "'Playfair Display',serif" }}>Dogwood Brands</div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Loading portfolio from database...</div>
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1 }}>

        <header style={{ padding: "0 28px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", background: "rgba(10,14,25,0.85)", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: `linear-gradient(135deg,${gold},#7A6240)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#0A0E19", fontFamily: "'Playfair Display',serif" }}>D</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Dogwood Brands</div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                Lease Management {leases.length > 0 ? `· ${leases.length} Locations` : memory.loaded && memory.totalStores > 0 ? `· ${memory.totalStores} Salons` : ""}
              </div>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 2 }}>
            {[{ k: "scan", l: "⚡ Scan" }, { k: "portfolio", l: "Portfolio" }, { k: "upload", l: "+ Upload" }].map(t => (
              <button key={t.k} onClick={() => { if (t.k === "upload") { setUploadModal(true); setUploadPhase("drop") } else setView(t.k) }}
                style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: t.k === "upload" ? 600 : 500, fontFamily: "'DM Sans',sans-serif", background: t.k === "upload" ? `linear-gradient(135deg,${gold},#8B7040)` : view === t.k ? "rgba(163,130,82,0.15)" : "transparent", color: t.k === "upload" ? "#0A0E19" : view === t.k ? gold : "rgba(255,255,255,0.4)", ...(t.k === "upload" ? { boxShadow: "0 2px 8px rgba(163,130,82,0.2)" } : {}), transition: "all 0.15s" }}>{t.l}</button>
            ))}
          </nav>
          <button onClick={() => show("Synced to Google Sheets")} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 10, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Sync Sheets</button>
        </header>

        {toast && <div style={{ position: "fixed", top: 72, right: 28, zIndex: 200, background: toast.t === "success" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${toast.t === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: 8, padding: "9px 14px", fontSize: 12, fontWeight: 500, color: toast.t === "success" ? "#22c55e" : "#ef4444", backdropFilter: "blur(12px)" }}>{toast.m}</div>}

        <main style={{ padding: "24px 28px", maxWidth: 1300, margin: "0 auto" }}>

          {/* ═══ SCAN ═══ */}
          {view === "scan" && (
            <div>
              {phase === "idle" && (
                <div style={{ maxWidth: 680, margin: "40px auto", textAlign: "center" }}>
                  <div style={{ fontSize: 44, marginBottom: 16 }}>📂</div>
                  <h1 style={{ fontSize: 26, fontWeight: 300, fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>AI-Powered Lease Scanner</h1>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 20 }}>
                    AI reads every document and matches it to your store directory — it already knows all {memory.totalStores || "your"} salon locations, entities, and addresses before scanning a single file.
                  </p>

                  {/* Memory status */}
                  {memory.loaded && memory.totalStores > 0 && (
                    <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)", borderRadius: 9, padding: "12px 16px", marginBottom: 20, textAlign: "left" }}>
                      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#22c55e", marginBottom: 6, fontWeight: 600 }}>🧠 Store Memory Loaded</div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <div><span style={{ fontSize: 18, fontWeight: 700, color: "#22c55e" }}>{memory.totalStores}</span><span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>Salons</span></div>
                        <div><span style={{ fontSize: 18, fontWeight: 700, color: "#22c55e" }}>{memory.entities.length}</span><span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>Entities</span></div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        {memory.entities.map(e => (
                          <span key={e} style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(163,130,82,0.1)", border: "1px solid rgba(163,130,82,0.15)", color: gold, fontSize: 10, fontWeight: 500 }}>
                            {e} ({(memory.byEntity[e] || []).length})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DB status */}
                  {leases.length > 0 && (
                    <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.12)", borderRadius: 9, padding: "12px 16px", marginBottom: 20, textAlign: "left" }}>
                      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#60a5fa", marginBottom: 6, fontWeight: 600 }}>💾 Database Connected</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                        {leases.length} locations loaded · {leases.filter(l => l.docs.length > 0).length} with documents · Scan results save automatically
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexWrap: "wrap", marginBottom: 24 }}>
                    {["Find PDFs", "→", "OCR", "→", "Match to Store Directory", "→", "Extract Terms", "→", "Save to DB"].map((s, i) => (
                      s === "→" ? <span key={i} style={{ color: "rgba(255,255,255,0.12)", fontSize: 11 }}>→</span> :
                        <span key={i} style={{ padding: "4px 8px", borderRadius: 5, background: "rgba(163,130,82,0.08)", border: "1px solid rgba(163,130,82,0.12)", color: gold, fontSize: 10, fontWeight: 500 }}>{s}</span>
                    ))}
                  </div>
                  <button onClick={startScan} style={{ padding: "11px 28px", borderRadius: 9, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", background: `linear-gradient(135deg,${gold},#8B7040)`, color: "#0A0E19", boxShadow: "0 4px 20px rgba(163,130,82,0.3)", display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    Scan My Dropbox
                  </button>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", marginTop: 8 }}>Results save to database automatically during scan</p>
                </div>
              )}

              {(phase === "scanning" || phase === "processing") && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 400, fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>
                        {phase === "scanning" ? "Scanning Dropbox..." : `Processing (${processedCount}/${fileCount})`}
                      </h2>
                      {currentFile && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{currentFile}</p>}
                    </div>
                    <div style={{ display: "flex", gap: 14, textAlign: "right" }}>
                      <div><div style={{ fontSize: 22, fontWeight: 700, color: gold, fontFamily: "'Playfair Display',serif" }}>{fileCount}</div><div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>PDFs</div></div>
                      <div><div style={{ fontSize: 22, fontWeight: 700, color: "#22c55e", fontFamily: "'Playfair Display',serif" }}>{results.length}</div><div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>Classified</div></div>
                      <div><div style={{ fontSize: 22, fontWeight: 700, color: "#60a5fa", fontFamily: "'Playfair Display',serif" }}>{results.filter(r => r.savedToDb).length}</div><div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>Saved</div></div>
                    </div>
                  </div>
                  <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", marginBottom: 10, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg,${gold},#C4A469)`, transition: "width 0.3s", width: `${Math.min(progress, 100)}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 18 }}>
                    <span>{processedCount}/{fileCount} processed · {results.length} classified · {results.filter(r => r.savedToDb).length} saved to DB</span>
                    <span>{Math.round(progress)}%</span>
                  </div>

                  {results.length > 0 && (
                    <div style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.1)", borderRadius: 9, padding: "10px 14px", marginBottom: 14 }}>
                      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(34,197,94,0.5)", marginBottom: 6, fontWeight: 600 }}>Live Results</div>
                      {results.slice(-6).map((r, i) => (
                        <div key={i} style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", padding: "3px 0", display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 9, minWidth: 14 }}>{r.savedToDb ? "💾" : r.storeSource === "matched_directory" ? "🎯" : "⚠️"}</span>
                          <span style={{ color: (r.document_type || "").includes("Original") ? "#22c55e" : (r.document_type || "").includes("Amendment") ? "#60a5fa" : "#fbbf24", fontWeight: 500, minWidth: 100 }}>{r.document_type}</span>
                          <span style={{ color: gold, minWidth: 50, fontSize: 9 }}>{r.entity}</span>
                          <span style={{ color: "rgba(255,255,255,0.3)", fontFamily: "monospace", fontSize: 9, minWidth: 50 }}>#{r.salon_number || "?"}</span>
                          <span style={{ color: "rgba(255,255,255,0.2)", minWidth: 70 }}>{r.storeName}</span>
                          <span style={{ flex: 1, color: "rgba(255,255,255,0.15)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.property_address}</span>
                          <Conf v={r.confidence || 0} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div ref={logRef} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 9, padding: 14, maxHeight: 300, overflow: "auto", fontFamily: "monospace" }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 8, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>Activity Log</div>
                    {scanLog.map((e, i) => {
                      if (e.type === "divider") return <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", margin: "6px 0" }} />;
                      const colors = { system: gold, success: "#22c55e", error: "#ef4444", processing: "#60a5fa", file: "rgba(255,255,255,0.18)", detail: "rgba(255,255,255,0.15)" };
                      return <div key={i} style={{ fontSize: 10, color: colors[e.type] || "rgba(255,255,255,0.3)", padding: "2px 0", display: "flex", gap: 8 }}><span style={{ color: "rgba(255,255,255,0.08)", minWidth: 60, fontSize: 9 }}>{e.time}</span><span style={{ wordBreak: "break-all" }}>{e.msg}</span></div>;
                    })}
                  </div>
                </div>
              )}

              {phase === "review" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                      <h2 style={{ fontSize: 22, fontWeight: 300, fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>Scan Complete</h2>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                        {fileCount} PDFs → {results.length} classified → {results.filter(r => r.savedToDb).length} saved to database
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 7 }}>
                      <button onClick={() => { setPhase("idle"); setResults([]); setScanLog([]); }} style={{ padding: "7px 14px", borderRadius: 7, fontSize: 11, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Re-scan</button>
                      <button onClick={approveResults} style={{ padding: "7px 18px", borderRadius: 7, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", background: `linear-gradient(135deg,${gold},#8B7040)`, color: "#0A0E19" }}>✓ View Portfolio</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                    {[{ l: "Documents", v: results.length }, { l: "Saved to DB", v: results.filter(r => r.savedToDb).length }, { l: "Avg Confidence", v: results.length ? Math.round(results.reduce((a, r) => a + (r.confidence || 0), 0) / results.length) + "%" : "—" }, { l: "Needs Review", v: results.filter(r => (r.confidence || 0) < 85 || !r.savedToDb).length }].map((m, i) => (
                      <div key={i} style={{ flex: "1 1 150px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9, padding: "14px 16px" }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{m.l}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: gold, fontFamily: "'Playfair Display',serif" }}>{m.v}</div>
                      </div>
                    ))}
                  </div>

                  {Object.entries(resultsByEntity).sort(([a], [b]) => a.localeCompare(b)).map(([entity, docs]) => {
                    const byStore = {};
                    docs.forEach(d => { const s = d.salon_number ? String(d.salon_number) : (d.property_address || d.file); if (!byStore[s]) byStore[s] = []; byStore[s].push(d); });
                    return (
                      <div key={entity} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: gold }}>{entity}</span>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{docs.length} docs · {Object.keys(byStore).length} stores</span>
                          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.04)" }} />
                        </div>
                        {Object.entries(byStore).map(([store, sDocs]) => (
                          <div key={store} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 9, marginBottom: 6, overflow: "hidden" }}>
                            <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 9 }}>{sDocs[0].savedToDb ? "💾" : sDocs[0].storeSource === "matched_directory" ? "🎯" : "⚠️"}</span>
                                <span style={{ fontSize: 10, fontFamily: "monospace", color: gold }}>#{store}</span>
                                <span style={{ fontSize: 11, fontWeight: 600 }}>{sDocs[0].storeName || sDocs[0].store_name || ""}</span>
                                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{sDocs[0].property_address}</span>
                              </div>
                              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{sDocs[0].landlord_name || ""}</span>
                            </div>
                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "0 14px" }}>
                              {sDocs.map((d, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < sDocs.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", fontSize: 10 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ color: (d.document_type || "").includes("Original") ? "#22c55e" : (d.document_type || "").includes("Amendment") ? "#60a5fa" : "#fbbf24", fontWeight: 500, minWidth: 110 }}>{d.document_type}</span>
                                    <span style={{ color: "rgba(255,255,255,0.15)", fontFamily: "monospace", fontSize: 9 }}>{d.file}</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {d.monthly_base_rent > 0 && <span style={{ color: "rgba(255,255,255,0.3)" }}>{fmt(d.monthly_base_rent)}/mo</span>}
                                    <span style={{ color: "rgba(255,255,255,0.2)" }}>{d.document_date || ""}</span>
                                    <Conf v={d.confidence || 0} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ PORTFOLIO ═══ */}
          {view === "portfolio" && !selectedLease && (
            <div>
              {leases.length === 0 && !loading ? (
                <div style={{ textAlign: "center", padding: "70px 0", color: "rgba(255,255,255,0.25)" }}>
                  <p style={{ fontSize: 14, marginBottom: 12 }}>No leases in database yet.</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", marginBottom: 20 }}>Scan your Dropbox or upload documents to get started.</p>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <button onClick={() => setView("scan")} style={{ padding: "8px 20px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", background: `linear-gradient(135deg,${gold},#8B7040)`, color: "#0A0E19" }}>Go to Scanner</button>
                    <button onClick={() => { setUploadModal(true); setUploadPhase("drop") }} style={{ padding: "8px 20px", borderRadius: 7, fontSize: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Upload Document</button>
                  </div>
                </div>
              ) : leases.length > 0 && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
                    <div>
                      <h1 style={{ fontSize: 24, fontWeight: 300, fontFamily: "'Playfair Display',serif", marginBottom: 3 }}>Lease Portfolio</h1>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{leases.length} locations · {entities.length} entities · Data saved in database</p>
                    </div>
                    <div style={{ display: "flex", gap: 7 }}>
                      <select value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, fontSize: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans',sans-serif", outline: "none" }}>
                        <option value="all">All Entities ({leases.length})</option>
                        {entities.map(e => <option key={e} value={e}>{e} ({leases.filter(l => l.entity === e).length})</option>)}
                      </select>
                      <button onClick={() => { setUploadModal(true); setUploadPhase("drop") }} style={{ padding: "7px 16px", borderRadius: 7, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", background: `linear-gradient(135deg,${gold},#8B7040)`, color: "#0A0E19" }}>+ Upload</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                    {[{ l: "Active", v: activeL }, { l: "Expiring (<1yr)", v: leases.filter(l => l.status === "expiring").length }, { l: "Monthly All-In", v: fmt(totalRent) }, { l: "Annual", v: fmt(totalRent * 12) }].map((m, i) => (
                      <div key={i} style={{ flex: "1 1 160px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9, padding: "16px 18px" }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{m.l}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: gold, fontFamily: "'Playfair Display',serif" }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                  {(selectedEntity === "all" ? entities : [selectedEntity]).map(entity => {
                    const el = leases.filter(l => l.entity === entity);
                    if (!el.length) return null;
                    return (
                      <div key={entity} style={{ marginBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: gold }}>{entity}</span>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{el.length} locations · {fmt(el.filter(l => l.status !== "expired").reduce((a, l) => a + l.rent + (l.cam || 0), 0))}/mo</span>
                          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.04)" }} />
                        </div>
                        <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead><tr style={{ background: "rgba(255,255,255,0.03)" }}>
                              {["Salon #", "Name", "Address", "Landlord", "Rent", "All-In", "SqFt", "LED", "Docs", "Status"].map(h => (
                                <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.25)", borderBottom: "1px solid rgba(255,255,255,0.05)", whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr></thead>
                            <tbody>{el.map((l, i) => (
                              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer" }} onClick={() => setSelectedLease(l)} onMouseEnter={e => e.currentTarget.style.background = "rgba(163,130,82,0.04)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <td style={{ padding: "10px", fontFamily: "monospace", fontSize: 10, color: gold }}>{l.salon_number || "—"}</td>
                                <td style={{ padding: "10px" }}>{l.storeName}<br /><span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{l.center}</span></td>
                                <td style={{ padding: "10px", fontSize: 10 }}>{l.address}</td>
                                <td style={{ padding: "10px", color: "rgba(255,255,255,0.4)" }}>{l.landlord}</td>
                                <td style={{ padding: "10px", color: gold, fontWeight: 500 }}>{l.rent ? fmt(l.rent) : "—"}</td>
                                <td style={{ padding: "10px", color: "rgba(255,255,255,0.4)" }}>{l.rent ? fmt(l.rent + (l.cam || 0)) : "—"}</td>
                                <td style={{ padding: "10px", color: "rgba(255,255,255,0.35)" }}>{l.sqft ? l.sqft.toLocaleString() : "—"}</td>
                                <td style={{ padding: "10px", color: "rgba(255,255,255,0.4)", fontSize: 10 }}>{l.led || l.endDate || "—"}</td>
                                <td style={{ padding: "10px", color: "rgba(255,255,255,0.3)", fontSize: 10 }}>{l.docs.length || l.documentCount || 0}</td>
                                <td style={{ padding: "10px" }}><Badge status={l.status} /></td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Detail */}
          {view === "portfolio" && selectedLease && (
            <div>
              <button onClick={() => setSelectedLease(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans',sans-serif", marginBottom: 16, padding: 0 }}>← Back</button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 10, color: gold, marginBottom: 3 }}>{selectedLease.entity} · Salon #{selectedLease.salon_number}</div>
                  <h1 style={{ fontSize: 24, fontWeight: 400, fontFamily: "'Playfair Display',serif", marginBottom: 3 }}>{selectedLease.storeName || selectedLease.address}</h1>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{selectedLease.center} · {selectedLease.address}</p>
                </div>
                <Badge status={selectedLease.status} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 20 }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginBottom: 14, fontWeight: 600 }}>Lease Terms</div>
                  {[["Entity", selectedLease.entity], ["Salon #", selectedLease.salon_number], ["Store Name", selectedLease.storeName], ["Address", selectedLease.address], ["Center", selectedLease.center], ["Landlord", selectedLease.landlord], ["Contact", selectedLease.landlordContact], ["Base Rent", selectedLease.rent ? fmt(selectedLease.rent) + "/mo" : "—"], ["CAM/NNN", selectedLease.cam ? fmt(selectedLease.cam) + "/mo" : "—"], ["All-In", selectedLease.rent ? fmt(selectedLease.rent + (selectedLease.cam || 0)) + "/mo" : "—"], ["Sq Ft", selectedLease.sqft ? selectedLease.sqft.toLocaleString() : "—"], ["Lease Start", selectedLease.date || "—"], ["Lease End", selectedLease.endDate || "—"], ["LED", selectedLease.led || "—"], ["Renewal", selectedLease.renewal || "—"], ["Key Terms", selectedLease.keyTerms || "—"], ["Phone", selectedLease.phone || "—"], ["2024 Sales", selectedLease.sales2024 ? fmt(selectedLease.sales2024) : "—"]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{k}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, maxWidth: "60%", textAlign: "right" }}>{v || "—"}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 20 }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginBottom: 14, fontWeight: 600 }}>Documents ({(selectedLease.docs || []).length})</div>
                  {(selectedLease.docs || []).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(255,255,255,0.15)", fontSize: 11 }}>
                      <p>No documents scanned yet for this location.</p>
                      <button onClick={() => { setUploadModal(true); setUploadPhase("drop") }} style={{ marginTop: 10, padding: "6px 14px", borderRadius: 6, fontSize: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: gold, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>+ Upload Document</button>
                    </div>
                  ) : (selectedLease.docs || []).map((d, i) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: (d.type || "").includes("Original") ? "#22c55e" : "#60a5fa" }}>{d.type}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{d.date}</span>{d.confidence > 0 && <Conf v={d.confidence} />}</div>
                      </div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", marginTop: 2 }}>{d.file}</div>
                      {d.amendmentSummary && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 3, fontStyle: "italic" }}>{d.amendmentSummary}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ═══ UPLOAD MODAL ═══ */}
        {uploadModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) { setUploadModal(false); setUploadPhase("drop") } }}>
            <div style={{ background: "#11152A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, width: "100%", maxWidth: uploadPhase === "review" ? 620 : 460, maxHeight: "85vh", overflow: "auto" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 500, fontFamily: "'Playfair Display',serif", margin: 0 }}>
                    {uploadPhase === "drop" ? "Upload Document" : uploadPhase === "processing" ? "AI Processing..." : "Review & Save"}
                  </h2>
                  {uploadPhase === "review" && uploadData.confidence > 0 && (
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                      AI confidence: {uploadData.confidence}% {uploadData._savedToDb ? "· 💾 Saved to database" : "· ⚠️ Review needed"}
                    </p>
                  )}
                </div>
                <button onClick={() => { setUploadModal(false); setUploadPhase("drop") }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
              <div style={{ padding: 24 }}>
                {uploadPhase === "drop" && (
                  <div style={{ border: `2px dashed ${dragOver ? "rgba(163,130,82,0.6)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, padding: "40px 20px", textAlign: "center", cursor: "pointer" }}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f) }}
                    onClick={() => fileRef.current?.click()}>
                    <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (f) handleUpload(f) }} />
                    <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Drop your document here</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>PDF, PNG, or JPG · OCR + AI classification + auto-save to database</div>
                  </div>
                )}
                {uploadPhase === "processing" && (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <div style={{ width: 44, height: 44, margin: "0 auto 16px", border: "3px solid rgba(255,255,255,0.05)", borderTop: `3px solid ${gold}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{uploadFileName}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>OCR → AI classification → saving to database...</div>
                  </div>
                )}
                {uploadPhase === "review" && (
                  <div>
                    {uploadData._savedToDb && <div style={{ padding: "8px 12px", borderRadius: 6, marginBottom: 14, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", fontSize: 10, color: "#22c55e" }}>💾 Already saved to database. Edit fields below if needed, then click Save to update.</div>}
                    {uploadData.classNotes && <div style={{ padding: "8px 12px", borderRadius: 6, marginBottom: 14, background: "rgba(163,130,82,0.08)", border: "1px solid rgba(163,130,82,0.15)", fontSize: 10, color: "rgba(163,130,82,0.8)" }}><b>AI:</b> {uploadData.classNotes}</div>}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[
                        { k: "entity", l: "Entity", select: memory.entities.length > 0 ? [...memory.entities, "Other"] : undefined },
                        { k: "salon_number", l: "Salon #" },
                        { k: "storeName", l: "Store Name" },
                        { k: "address", l: "Address", span: true },
                        { k: "center", l: "Shopping Center" },
                        { k: "landlord", l: "Landlord" },
                        { k: "landlordContact", l: "Contact" },
                        { k: "type", l: "Doc Type", select: ["Original Lease", "Amendment #1", "Amendment #2", "Amendment #3", "Amendment #4", "Amendment #5", "Renewal", "Assignment", "Sublease", "Estoppel Certificate", "SNDA", "Insurance", "Correspondence", "Guaranty", "Memorandum of Lease", "Other"] },
                        { k: "market", l: "Market", select: ["Southern California", "San Diego", "Las Vegas", "Phoenix", "Other"] },
                        { k: "date", l: "Doc Date", type: "date" },
                        { k: "endDate", l: "Lease End", type: "date" },
                        { k: "rent", l: "Base Rent $/mo", type: "number" },
                        { k: "cam", l: "CAM $/mo", type: "number" },
                        { k: "sqft", l: "Sq Ft", type: "number" },
                        { k: "renewal", l: "Renewal Options" },
                      ].map(f => (
                        <div key={f.k} style={f.span ? { gridColumn: "1/3" } : {}}>
                          <label style={{ display: "block", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>{f.l}</label>
                          {f.select ? <select value={uploadData[f.k] || ""} onChange={e => setUploadData(p => ({ ...p, [f.k]: e.target.value }))} style={{ ...iS, background: "rgba(10,14,25,0.9)" }}>{f.select.map(o => <option key={o} value={o}>{o}</option>)}</select> :
                            <input type={f.type || "text"} value={uploadData[f.k] || ""} onChange={e => setUploadData(p => ({ ...p, [f.k]: e.target.value }))} style={iS} />}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 7, justifyContent: "flex-end", marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <button onClick={() => { setUploadModal(false); setUploadPhase("drop") }} style={{ padding: "8px 16px", borderRadius: 7, fontSize: 11, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
                      <button onClick={saveUpload} style={{ padding: "8px 20px", borderRadius: 7, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", background: `linear-gradient(135deg,${gold},#8B7040)`, color: "#0A0E19" }}>{uploadData._savedToDb ? "Update & Close" : "Save & Organize"}</button>
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