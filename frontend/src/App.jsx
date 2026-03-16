import { useState, useEffect, useCallback } from "react";

const API_BASE = "https://irac-backend-lspi.onrender.com";

async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API Error");
  return data;
}

const C = {
  bg: "#0A0F1E", card: "#111827", cardBorder: "#1E2D40",
  accent: "#00D4AA", accentDim: "#00D4AA1A",
  danger: "#FF4757", dangerDim: "#FF47571A",
  warn: "#FFB800", warnDim: "#FFB8001A",
  text: "#E8F0FE", textDim: "#6B7FA3",
};

const groupColors = {
  "4A":"#00B4D8","3A":"#F77F00","2B":"#E63946","6":"#57CC99",
  "5":"#80B918","28":"#9B5DE5","15":"#F15BB5","22A":"#FEE440",
  "23":"#00BBF9","21A":"#FB5607","7C":"#8338EC","9B":"#3A86FF",
  "14":"#FF006E","1A":"#FFBE0B",
};
const gColor = (gid) => groupColors[gid] || C.accent;

const inp = {
  width:"100%", padding:"13px 16px", background:"#161f30",
  border:`1.5px solid ${C.cardBorder}`, borderRadius:12,
  color:C.text, fontSize:15, outline:"none", boxSizing:"border-box",
  fontFamily:"inherit",
};

function LoadingDots() {
  return <div style={{textAlign:"center",padding:60,color:C.textDim,fontSize:14}}>กำลังโหลด...</div>;
}

function Badge({ gid }) {
  const color = gColor(gid);
  return (
    <span style={{display:"inline-block",padding:"3px 10px",background:color+"22",color,
      border:`1px solid ${color}55`,borderRadius:20,fontSize:11,fontWeight:700}}>
      กลุ่ม {gid}
    </span>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [form, setForm] = useState({ username:"", password:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true); setError("");
    try {
      const data = await api("/auth/login", { method:"POST", body:form });
      onLogin(data.token, data.user);
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
      minHeight:"100vh",background:C.bg,padding:24,fontFamily:"'IBM Plex Sans Thai','Sarabun',sans-serif"}}>
      <div style={{width:"100%",maxWidth:400,display:"flex",flexDirection:"column",gap:20}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:52,marginBottom:12}}>🌿</div>
          <div style={{fontSize:28,fontWeight:900,color:C.text,letterSpacing:-0.5}}>IRAC Reference</div>
          <div style={{fontSize:13,color:C.textDim,marginTop:6}}>ระบบอ้างอิงกลุ่มสารกำจัดแมลง</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <input style={inp} placeholder="ชื่อผู้ใช้" value={form.username}
            onChange={e=>setForm(p=>({...p,username:e.target.value}))}/>
          <input style={inp} type="password" placeholder="รหัสผ่าน" value={form.password}
            onChange={e=>setForm(p=>({...p,password:e.target.value}))}
            onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
          {error && <div style={{background:C.dangerDim,color:C.danger,padding:"10px 14px",borderRadius:10,fontSize:13}}>
            ⚠️ {error}
          </div>}
          <button style={{padding:"14px",background:C.accent,color:"#000",fontWeight:800,
            fontSize:16,border:"none",borderRadius:12,cursor:"pointer",fontFamily:"inherit"}}
            onClick={handleLogin} disabled={loading}>
            {loading?"กำลังเข้าสู่ระบบ...":"เข้าสู่ระบบ"}
          </button>
        </div>
        <div style={{textAlign:"center",fontSize:12,color:C.textDim}}>
          demo: admin / admin1234 &nbsp;|&nbsp; user / user1234
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ───────────────────────────────────────────────────────────────
function Sidebar({ tab, setTab, setSelectedPest, user, onLogout }) {
  const items = [
    { id:"pests",    icon:"🦟", label:"แมลงศัตรูพืช" },
    { id:"products", icon:"🧴", label:"สินค้าการค้า" },
    { id:"history",  icon:"📋", label:"ประวัติการใช้งาน" },
  ];
  return (
    <div style={{width:220,minHeight:"100vh",background:C.card,borderRight:`1px solid ${C.cardBorder}`,
      display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,bottom:0,zIndex:100}}>
      <div style={{padding:"22px 20px 18px",borderBottom:`1px solid ${C.cardBorder}`}}>
        <div style={{fontSize:22,marginBottom:4}}>🌿</div>
        <div style={{fontSize:15,fontWeight:900,color:C.text}}>IRAC Reference</div>
        <div style={{fontSize:11,color:C.textDim,marginTop:2}}>ระบบสารกำจัดแมลง</div>
      </div>
      <div style={{flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",gap:4}}>
        {items.map(n=>{
          const active = tab===n.id;
          return (
            <button key={n.id} onClick={()=>{ setTab(n.id); setSelectedPest(null); }}
              style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",
                borderRadius:10,border:"none",cursor:"pointer",textAlign:"left",width:"100%",
                fontSize:14,fontFamily:"inherit",transition:"all 0.15s",
                background: active ? C.accentDim : "transparent",
                color: active ? C.accent : C.textDim,
                fontWeight: active ? 700 : 400}}>
              <span style={{fontSize:18}}>{n.icon}</span>{n.label}
            </button>
          );
        })}
      </div>
      <div style={{padding:"14px 16px",borderTop:`1px solid ${C.cardBorder}`,
        display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:C.text}}>{user?.username}</div>
          <div style={{fontSize:11,color:C.textDim}}>{user?.role}</div>
        </div>
        <button onClick={onLogout}
          style={{padding:"6px 12px",background:C.dangerDim,color:C.danger,fontWeight:700,
            fontSize:12,border:`1px solid ${C.danger}44`,borderRadius:8,cursor:"pointer",fontFamily:"inherit"}}>
          ออก
        </button>
      </div>
    </div>
  );
}

// ─── PEST LIST ─────────────────────────────────────────────────────────────
function PestListScreen({ token, onSelect }) {
  const [pests, setPests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ api("/pests",{token}).then(setPests).finally(()=>setLoading(false)); },[token]);

  const typeLabel = { insect:"🦟 แมลง", mite:"🕷️ ไร" };
  const filtered = pests.filter(p=>p.pest_name.includes(search));
  const grouped = filtered.reduce((acc,p)=>{ (acc[p.pest_type]=acc[p.pest_type]||[]).push(p); return acc; },{});

  return (
    <div style={{padding:"24px 28px 40px"}}>
      <input style={{...inp,marginBottom:20}} placeholder="🔍 ค้นหาแมลง / ศัตรูพืช"
        value={search} onChange={e=>setSearch(e.target.value)}/>
      {loading ? <LoadingDots/> : Object.entries(grouped).map(([type,list])=>(
        <div key={type}>
          <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:1.5,
            textTransform:"uppercase",marginBottom:12,marginTop:20}}>
            {typeLabel[type]||type}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
            {list.map(p=>(
              <div key={p.pest_id} onClick={()=>onSelect(p)}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"16px 20px",background:C.card,border:`1px solid ${C.cardBorder}`,
                  borderRadius:14,cursor:"pointer",transition:"border-color 0.2s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.cardBorder}>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:C.text}}>{p.pest_name}</div>
                  {p.scientific_name&&<div style={{fontSize:12,color:C.textDim,fontStyle:"italic"}}>{p.scientific_name}</div>}
                </div>
                <span style={{color:C.textDim,fontSize:20}}>›</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PEST DETAIL — แสดงสารทุกตัวพร้อมป้าย ✅ แนะนำ / 🚫 ห้ามใช้ ─────────
function PestDetailScreen({ token, pest, onBack, onLogUsage }) {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // โหลดข้อมูลแมลง + สารทั้งหมด
      const pestData = await api(`/pests/${pest.pest_id}`, { token });
      const allIngredients = pestData.ingredients || [];

      // นับจำนวนสารในแต่ละกลุ่ม → กลุ่มที่มีสารเดียวคือ "ห้ามซ้ำ" น้อย
      // logic: กลุ่มที่มีหลายตัวเลือก = แนะนำ, กลุ่มที่มีตัวเดียว = ระวัง
      // แต่ที่ชัดเจนกว่า: เรียกทุก rotation ของทุก gid ที่มี
      const gids = [...new Set(allIngredients.map(i => i.g_id))];

      // สร้าง map: gid → forbidden (กลุ่มเดียวกัน = ห้าม, กลุ่มอื่น = แนะนำ)
      // แต่ไม่ต้อง call API ซ้ำ — คิดจาก logic ตรงๆ:
      // - ถ้าสารอยู่คนละกลุ่มกัน = หมุนเวียนได้
      // - ถ้าสารอยู่กลุ่มเดียวกัน = ห้ามใช้ต่อเนื่อง

      // group ทุกสารตาม gid
      const byGroup = allIngredients.reduce((acc, ing) => {
        (acc[ing.g_id] = acc[ing.g_id] || []).push(ing);
        return acc;
      }, {});

      setIngredients({ all: allIngredients, byGroup, gids });
      setLoading(false);
    }
    load();
  }, [pest.pest_id, token]);

  if (loading) return <div style={{padding:28}}><LoadingDots/></div>;

  const { all, byGroup, gids } = ingredients;

  return (
    <div style={{padding:"24px 28px 40px"}}>
      <button onClick={onBack}
        style={{padding:"8px 16px",background:"transparent",color:C.accent,fontWeight:600,
          fontSize:13,border:`1px solid ${C.accent}55`,borderRadius:8,cursor:"pointer",
          marginBottom:20,fontFamily:"inherit"}}>
        ← กลับ
      </button>

      {/* Pest header */}
      <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,
        padding:"20px 24px",marginBottom:28}}>
        <div style={{fontSize:24,fontWeight:900,color:C.text}}>{pest.pest_name}</div>
        {pest.scientific_name&&<div style={{fontSize:13,color:C.textDim,fontStyle:"italic",marginTop:4}}>{pest.scientific_name}</div>}
        <div style={{marginTop:12,fontSize:13,color:C.textDim}}>
          พบสาร <b style={{color:C.text}}>{all.length} ชนิด</b> ใน <b style={{color:C.text}}>{gids.length} กลุ่ม IRAC</b>
        </div>
      </div>

      {/* คำอธิบาย */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:28}}>
        <div style={{background:C.accentDim,border:`1px solid ${C.accent}33`,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>✅</span>
          <div>
            <div style={{fontWeight:700,color:C.accent,fontSize:13}}>สารแนะนำ</div>
            <div style={{fontSize:12,color:C.textDim}}>ใช้หมุนเวียนสลับกันได้ (ต่างกลุ่ม)</div>
          </div>
        </div>
        <div style={{background:C.dangerDim,border:`1px solid ${C.danger}33`,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>🚫</span>
          <div>
            <div style={{fontWeight:700,color:C.danger,fontSize:13}}>ห้ามใช้ต่อเนื่อง</div>
            <div style={{fontSize:12,color:C.textDim}}>สารในกลุ่มเดียวกัน ทำให้ดื้อยา</div>
          </div>
        </div>
      </div>

      {/* แสดงแต่ละกลุ่ม */}
      {Object.entries(byGroup).map(([gid, groupIngs]) => {
        const color = gColor(gid);
        // สารในกลุ่มอื่นทั้งหมด = แนะนำให้ใช้สลับกัน
        const otherGroups = Object.entries(byGroup).filter(([g]) => g !== gid);

        return (
          <div key={gid} style={{marginBottom:32}}>
            {/* Group header */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,
              padding:"12px 18px",background:color+"11",border:`1px solid ${color}33`,borderRadius:12}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:color,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:15,color}}>กลุ่ม {gid}</div>
                <div style={{fontSize:12,color:C.textDim,marginTop:1}}>{groupIngs[0]?.g_name}</div>
              </div>
              <div style={{background:C.dangerDim,border:`1px solid ${C.danger}44`,borderRadius:8,
                padding:"5px 12px",fontSize:12,fontWeight:700,color:C.danger}}>
                🚫 ห้ามใช้ต่อเนื่องในกลุ่มนี้
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {/* ซ้าย: สารในกลุ่มนี้ = ห้ามใช้ซ้ำ */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.danger,letterSpacing:1,
                  textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                  <span>🚫</span> สารในกลุ่มนี้ — ห้ามใช้ต่อเนื่อง
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {groupIngs.map(ing => {
                    const note = ing.ai_notes||"";
                    const thaiName = note.match(/thai_name=([^;]+)/)?.[1]||"";
                    const noteText = note.match(/note=(.+)/)?.[1]||"";
                    return (
                      <div key={ing.c_id} style={{background:C.card,border:`1.5px solid ${C.danger}44`,
                        borderLeft:`3px solid ${C.danger}`,borderRadius:12,padding:14}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:14,color:C.text}}>{ing.c_name}</div>
                            {thaiName&&<div style={{fontSize:12,color:C.textDim}}>{thaiName}</div>}
                          </div>
                          <span style={{background:C.dangerDim,color:C.danger,fontSize:10,fontWeight:700,
                            padding:"2px 8px",borderRadius:20,border:`1px solid ${C.danger}44`,flexShrink:0}}>
                            ห้ามใช้ซ้ำ
                          </span>
                        </div>
                        {noteText&&<div style={{fontSize:12,color:C.textDim,marginTop:6,lineHeight:1.5}}>📌 {noteText}</div>}
                        <button onClick={()=>onLogUsage({pest,ingredient:ing})}
                          style={{width:"100%",padding:"7px",background:"#161f30",color:C.textDim,fontWeight:600,
                            fontSize:12,border:`1px solid ${C.cardBorder}`,borderRadius:8,cursor:"pointer",
                            fontFamily:"inherit",marginTop:10}}>
                          + บันทึกการใช้
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ขวา: สารในกลุ่มอื่น = แนะนำให้ใช้สลับ */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.accent,letterSpacing:1,
                  textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                  <span>✅</span> สารแนะนำ — ใช้สลับแทนกลุ่มนี้
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {otherGroups.flatMap(([g, ings]) =>
                    ings.map(ing => {
                      const note = ing.ai_notes||"";
                      const thaiName = note.match(/thai_name=([^;]+)/)?.[1]||"";
                      const noteText = note.match(/note=(.+)/)?.[1]||"";
                      const c = gColor(g);
                      return (
                        <div key={ing.c_id} style={{background:C.card,border:`1.5px solid ${C.accent}44`,
                          borderLeft:`3px solid ${C.accent}`,borderRadius:12,padding:14}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:700,fontSize:14,color:C.text}}>{ing.c_name}</div>
                              {thaiName&&<div style={{fontSize:12,color:C.textDim}}>{thaiName}</div>}
                            </div>
                            <span style={{background:c+"22",color:c,fontSize:10,fontWeight:700,
                              padding:"2px 8px",borderRadius:20,border:`1px solid ${c}44`,flexShrink:0}}>
                              กลุ่ม {g}
                            </span>
                          </div>
                          {noteText&&<div style={{fontSize:12,color:C.textDim,marginTop:6,lineHeight:1.5}}>📌 {noteText}</div>}
                          <button onClick={()=>onLogUsage({pest,ingredient:ing})}
                            style={{width:"100%",padding:"7px",background:C.accent,color:"#000",fontWeight:700,
                              fontSize:12,border:"none",borderRadius:8,cursor:"pointer",
                              fontFamily:"inherit",marginTop:10}}>
                            + บันทึกการใช้
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── HISTORY ───────────────────────────────────────────────────────────────
function HistoryScreen({ token }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(()=>{
    api("/history",{token}).then(setHistory).finally(()=>setLoading(false));
  },[token]);
  useEffect(()=>{ load(); },[load]);
  async function del(id) {
    await api(`/history/${id}`,{method:"DELETE",token});
    setHistory(h=>h.filter(x=>x.id!==id));
  }
  return (
    <div style={{padding:"24px 28px 40px"}}>
      <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:1.5,
        textTransform:"uppercase",marginBottom:20}}>ประวัติการใช้งานล่าสุด</div>
      {loading ? <LoadingDots/> : history.length===0 ? (
        <div style={{textAlign:"center",color:C.textDim,padding:60}}>
          <div style={{fontSize:40,marginBottom:8}}>📋</div>
          <div>ยังไม่มีประวัติการใช้งาน</div>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
          {history.map(h=>(
            <div key={h.id} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:C.text}}>{h.ingredient_name}</div>
                  <div style={{fontSize:12,color:C.textDim,marginTop:2}}>แมลง: {h.pest_name}</div>
                  <div style={{marginTop:6}}><Badge gid={h.g_id}/></div>
                  {h.note&&<div style={{fontSize:12,color:C.textDim,marginTop:8}}>📝 {h.note}</div>}
                  <div style={{fontSize:11,color:C.textDim,marginTop:6}}>
                    🕒 {new Date(h.used_at).toLocaleString("th-TH")}
                  </div>
                </div>
                <button onClick={()=>del(h.id)}
                  style={{padding:"6px 12px",background:C.dangerDim,color:C.danger,fontWeight:700,
                    fontSize:12,border:`1px solid ${C.danger}44`,borderRadius:8,cursor:"pointer",
                    flexShrink:0,fontFamily:"inherit"}}>ลบ</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PRODUCTS ──────────────────────────────────────────────────────────────
function ProductsScreen({ token }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ api("/products",{token}).then(setProducts).finally(()=>setLoading(false)); },[token]);
  const filtered = products.filter(p=>
    p.p_name.includes(search)||p.c_name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div style={{padding:"24px 28px 40px"}}>
      <input style={{...inp,marginBottom:20}} placeholder="🔍 ค้นหาสินค้าหรือสารออกฤทธิ์"
        value={search} onChange={e=>setSearch(e.target.value)}/>
      <div style={{fontSize:11,fontWeight:700,color:C.textDim,letterSpacing:1.5,
        textTransform:"uppercase",marginBottom:16}}>
        สินค้าการค้า ({filtered.length} รายการ)
      </div>
      {loading ? <LoadingDots/> : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
          {filtered.map(p=>(
            <div key={p.p_id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"16px 18px",background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:14}}>
              <div>
                <div style={{fontWeight:700,color:C.text}}>{p.p_name}</div>
                <div style={{fontSize:12,color:C.textDim,marginTop:2}}>สาร: {p.c_name}</div>
              </div>
              <Badge gid={p.g_id}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LOG MODAL ─────────────────────────────────────────────────────────────
function LogModal({ token, data, onClose }) {
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  async function save() {
    await api("/history",{ method:"POST", token, body:{
      pest_id:data.pest.pest_id, pest_name:data.pest.pest_name,
      ingredient_id:data.ingredient.c_id, ingredient_name:data.ingredient.c_name,
      g_id:data.ingredient.g_id, note,
    }});
    setDone(true); setTimeout(onClose,1200);
  }
  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:200,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:"'IBM Plex Sans Thai','Sarabun',sans-serif"}}>
      <div style={{background:C.card,borderRadius:20,padding:28,width:"100%",maxWidth:440,
        boxSizing:"border-box",border:`1px solid ${C.cardBorder}`}}>
        {done ? (
          <div style={{textAlign:"center",padding:20}}>
            <div style={{fontSize:48}}>✅</div>
            <div style={{fontWeight:700,marginTop:10,color:C.accent,fontSize:18}}>บันทึกสำเร็จ!</div>
          </div>
        ) : <>
          <div style={{fontWeight:800,fontSize:18,color:C.text,marginBottom:4}}>บันทึกการใช้งาน</div>
          <div style={{fontSize:13,color:C.textDim,marginBottom:16}}>
            {data.ingredient.c_name} → {data.pest.pest_name}
          </div>
          <textarea style={{...inp,minHeight:90,resize:"none"}}
            placeholder="หมายเหตุ (ไม่บังคับ)" value={note} onChange={e=>setNote(e.target.value)}/>
          <div style={{display:"flex",gap:10,marginTop:14}}>
            <button onClick={onClose}
              style={{flex:1,padding:13,background:C.dangerDim,color:C.danger,fontWeight:700,
                fontSize:14,border:`1px solid ${C.danger}44`,borderRadius:10,cursor:"pointer",fontFamily:"inherit"}}>
              ยกเลิก
            </button>
            <button onClick={save}
              style={{flex:2,padding:13,background:C.accent,color:"#000",fontWeight:800,
                fontSize:14,border:"none",borderRadius:10,cursor:"pointer",fontFamily:"inherit"}}>
              💾 บันทึก
            </button>
          </div>
        </>}
      </div>
    </div>
  );
}

// ─── APP ROOT ──────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("pests");
  const [selectedPest, setSelectedPest] = useState(null);
  const [logData, setLogData] = useState(null);

  if (!token) return <LoginScreen onLogin={(t,u)=>{ setToken(t); setUser(u); }}/>;

  const pageTitle = {
    pests: selectedPest ? `🌿 ${selectedPest.pest_name}` : "🌿 เลือกแมลงศัตรูพืช",
    products: "🧴 สินค้าการค้า",
    history: "📋 ประวัติการใช้งาน",
  };

  return (
    <div style={{display:"flex",background:C.bg,minHeight:"100vh",
      fontFamily:"'IBM Plex Sans Thai','Sarabun',sans-serif",color:C.text}}>
      <Sidebar tab={tab} setTab={setTab} setSelectedPest={setSelectedPest}
        user={user} onLogout={()=>{ setToken(null); setUser(null); setTab("pests"); }}/>
      <div style={{marginLeft:220,flex:1,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <div style={{display:"flex",alignItems:"center",padding:"18px 28px",
          background:C.card,borderBottom:`1px solid ${C.cardBorder}`,
          position:"sticky",top:0,zIndex:90}}>
          <div style={{fontSize:20,fontWeight:800,color:C.text}}>{pageTitle[tab]}</div>
        </div>
        <div style={{flex:1}}>
          {tab==="pests"&&!selectedPest&&<PestListScreen token={token} onSelect={setSelectedPest}/>}
          {tab==="pests"&&selectedPest&&(
            <PestDetailScreen token={token} pest={selectedPest}
              onBack={()=>setSelectedPest(null)} onLogUsage={setLogData}/>
          )}
          {tab==="products"&&<ProductsScreen token={token}/>}
          {tab==="history"&&<HistoryScreen token={token} key={String(logData)}/>}
        </div>
      </div>
      {logData&&<LogModal token={token} data={logData}
        onClose={()=>{ setLogData(null); setTab("history"); }}/>}
    </div>
  );
}
