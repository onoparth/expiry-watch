import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Apple, ArrowDownRight, Bot, CalendarDays, Check,
  ChevronDown, CircleHelp, Clock3, LayoutDashboard, Leaf, MessageCircle,
  Package, Plus, Send, Settings2, ShieldCheck, Sparkles, Trash2, X
} from "lucide-react";

const starterItems = [
  { id: crypto.randomUUID(), name: "Whole milk", category: "Dairy", quantity: "1 carton", expiryDate: dateAfter(2), notes: "" },
  { id: crypto.randomUUID(), name: "Greek yogurt", category: "Dairy", quantity: "2 cups", expiryDate: dateAfter(5), notes: "" },
  { id: crypto.randomUUID(), name: "Brown bread", category: "Bakery", quantity: "1 loaf", expiryDate: dateAfter(7), notes: "" },
  { id: crypto.randomUUID(), name: "Tomatoes", category: "Produce", quantity: "6 pieces", expiryDate: dateAfter(10), notes: "" }
];
function dateAfter(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function daysLeft(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const expiry = new Date(`${date}T00:00:00`);
  return Math.ceil((expiry - today) / 86400000);
}
function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function statusFor(date) {
  const days = daysLeft(date);
  if (days < 0) return { label: "Expired", kind: "expired" };
  if (days === 0) return { label: "Expires today", kind: "today" };
  if (days <= 3) return { label: `${days} day${days === 1 ? "" : "s"} left`, kind: "urgent" };
  if (days <= 7) return { label: `${days} days left`, kind: "soon" };
  return { label: "Fresh", kind: "fresh" };
}
const initialMessages = [{
  role: "assistant",
  text: "Hi! I'm EXPI, your expiry assistant. Ask me what's expiring first, how to organize your stock, or how to reduce waste. I can answer using the products in your inventory."
}];

export default function App() {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem("expiry-watch-items");
      return saved ? JSON.parse(saved) : starterItems;
    } catch { return starterItems; }
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [aiReady, setAiReady] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Food", quantity: "1", expiryDate: dateAfter(7), notes: "" });
  const chatEnd = useRef(null);

  useEffect(() => { localStorage.setItem("expiry-watch-items", JSON.stringify(items)); }, [items]);
  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(d => setAiReady(d.aiConfigured)).catch(() => setAiReady(false));
  }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  const sorted = useMemo(() => [...items].sort((a,b) => a.expiryDate.localeCompare(b.expiryDate)), [items]);
  const expired = items.filter(x => daysLeft(x.expiryDate) < 0).length;
  const urgent = items.filter(x => daysLeft(x.expiryDate) >= 0 && daysLeft(x.expiryDate) <= 3).length;
  const week = items.filter(x => daysLeft(x.expiryDate) >= 0 && daysLeft(x.expiryDate) <= 7).length;
  const visibleItems = sorted.filter(x => {
    const matches = `${x.name} ${x.category}`.toLowerCase().includes(query.toLowerCase());
    const d = daysLeft(x.expiryDate);
    const matchesFilter = filter === "All" || (filter === "Expired" && d < 0) ||
      (filter === "Expiring soon" && d >= 0 && d <= 7) || (filter === "Fresh" && d > 7);
    return matches && matchesFilter;
  });

  function addItem(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.expiryDate) return;
    setItems(prev => [...prev, { ...form, id: crypto.randomUUID() }]);
    setForm({ name: "", category: "Food", quantity: "1", expiryDate: dateAfter(7), notes: "" });
    setShowAdd(false);
  }
  function removeItem(id) { setItems(prev => prev.filter(x => x.id !== id)); }
  function addSample() {
    setItems(prev => [...prev, { id: crypto.randomUUID(), name: "Fresh spinach", category: "Produce", quantity: "1 bunch", expiryDate: dateAfter(3), notes: "Demo item" }]);
  }
  async function sendMessage(text = chatInput) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const next = [...messages, { role: "user", text: trimmed }];
    setMessages(next); setChatInput(""); setSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          inventory: items,
          history: messages.slice(-8)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      setMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `I couldn't connect right now. ${err.message}` }]);
    } finally { setSending(false); }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-icon"><Leaf size={20}/></div><div><b>expiry<span>watch</span></b><small>SMART INVENTORY</small></div></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          <button className={activeTab === "overview" ? "nav-item active" : "nav-item"} onClick={() => setActiveTab("overview")}><LayoutDashboard size={18}/> Overview</button>
          <button className={activeTab === "inventory" ? "nav-item active" : "nav-item"} onClick={() => setActiveTab("inventory")}><Package size={18}/> My inventory <span className="nav-count">{items.length}</span></button>
          <button className={activeTab === "assistant" ? "nav-item active" : "nav-item"} onClick={() => setActiveTab("assistant")}><MessageCircle size={18}/> EXPI assistant <span className="online-dot"/></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="tip-card"><Sparkles size={17}/><b>Small steps, less waste.</b><p>Check your expiry list regularly and use older products first.</p></div>
          <div className="profile"><div className="avatar">EW</div><div><b>My household</b><small>Personal workspace</small></div><Settings2 size={17}/></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> {activeTab === "overview" ? "Overview" : activeTab === "inventory" ? "My inventory" : "EXPI assistant"}</div><div className="top-actions"><span className="date-label"><CalendarDays size={15}/>{new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}</span><div className="avatar small">EW</div></div></header>
        <div className="content">
          {activeTab !== "assistant" ? <>
            <div className="page-heading"><div><div className="eyebrow">YOUR HOUSEHOLD, IN CONTROL</div><h1>{activeTab === "overview" ? "Good to see you." : "Your inventory"}</h1><p>Keep track of what you have. Use it before it expires.</p></div><button className="primary-btn" onClick={() => setShowAdd(true)}><Plus size={17}/> Add product</button></div>
            {activeTab === "overview" && <>
              <section className="stat-grid">
                <Stat icon={<Package/>} label="Total products" value={items.length} note="In your inventory" tone="green"/>
                <Stat icon={<Clock3/>} label="Expiring this week" value={week} note="Next 7 days" tone="amber"/>
                <Stat icon={<AlertTriangle/>} label="Needs attention" value={urgent + expired} note={`${expired} already expired`} tone="red"/>
              </section>
              <section className="overview-grid">
                <div className="panel inventory-panel">
                  <div className="panel-head"><div><h2>Expiry timeline</h2><p>Your next products to check</p></div><button className="text-btn" onClick={() => setActiveTab("inventory")}>View all <ArrowDownRight size={15}/></button></div>
                  {sorted.length ? <div className="product-list">{sorted.slice(0,5).map(item => <ProductRow key={item.id} item={item} onDelete={removeItem}/>)}</div> : <EmptyState onAdd={() => setShowAdd(true)}/>}
                </div>
                <div className="panel assistant-promo">
                  <div className="assistant-orb"><Bot size={28}/><span/></div><div className="eyebrow light">YOUR AI COMPANION</div><h2>Meet EXPI.</h2><p>Your personal assistant for smarter storage, less waste, and a more organized home.</p><button className="light-btn" onClick={() => setActiveTab("assistant")}>Chat with EXPI <MessageCircle size={16}/></button>
                  <div className="promo-foot"><span><span className="online-dot"/> Ready to help</span><Sparkles size={15}/></div>
                </div>
              </section>
              <div className="bottom-note"><ShieldCheck size={17}/><span>Expiry Watch helps you track dates. Always follow product labels and safe storage guidance.</span></div>
            </>}
            {activeTab === "inventory" && <section className="panel full-panel"><div className="toolbar"><div className="searchbox"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products..."/></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Expiring soon</option><option>Expired</option><option>Fresh</option></select></div>{visibleItems.length ? <div className="product-list">{visibleItems.map(item=><ProductRow key={item.id} item={item} onDelete={removeItem}/>)}</div> : <EmptyState onAdd={() => setShowAdd(true)}/>}</section>}
          </> : <ChatPanel messages={messages} input={chatInput} setInput={setChatInput} send={sendMessage} sending={sending} aiReady={aiReady} chatEnd={chatEnd} items={items}/>}
        </div>
      </main>

      {showAdd && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAdd(false)}}><form className="modal" onSubmit={addItem}><div className="modal-head"><div><div className="eyebrow">INVENTORY</div><h2>Add a product</h2></div><button type="button" className="icon-btn" onClick={()=>setShowAdd(false)}><X size={19}/></button></div><label>Product name<input autoFocus required placeholder="e.g. Almond milk" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><div className="form-row"><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{["Food","Dairy","Produce","Bakery","Medicine","Cosmetics","Household","Other"].map(x=><option key={x}>{x}</option>)}</select></label><label>Quantity<input value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} placeholder="e.g. 2 packs"/></label></div><label>Expiry date<input required type="date" value={form.expiryDate} onChange={e=>setForm({...form,expiryDate:e.target.value})}/></label><label>Notes <span className="optional">(optional)</span><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Storage location, brand, etc."/></label><div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setShowAdd(false)}>Cancel</button><button className="primary-btn" type="submit"><Plus size={16}/> Save product</button></div></form></div>}
    </div>
  );
}

function Stat({icon,label,value,note,tone}) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>; }
function ProductRow({item,onDelete}) {
  const status=statusFor(item.expiryDate);
  return <div className="product-row"><div className="product-icon"><Apple size={19}/></div><div className="product-info"><b>{item.name}</b><small>{item.category} · {item.quantity}</small></div><div className="product-date"><b>{formatDate(item.expiryDate)}</b><small>Expiry date</small></div><span className={`status ${status.kind}`}>{status.label}</span><button className="delete-btn" title="Delete product" onClick={()=>onDelete(item.id)}><Trash2 size={16}/></button></div>;
}
function EmptyState({onAdd}) { return <div className="empty"><Package size={28}/><b>No products found</b><p>Add your first product to start tracking expiry dates.</p><button className="secondary-btn" onClick={onAdd}>Add a product</button></div>; }
function ChatPanel({messages,input,setInput,send,sending,aiReady,chatEnd,items}) {
  const prompts=["What expires first?","What should I use this week?","How can I reduce food waste?","Give me storage tips."];
  return <div className="chat-page"><div className="chat-heading"><div><div className="eyebrow">YOUR PERSONAL INVENTORY COMPANION</div><h1>Ask EXPI anything.</h1><p>Helpful answers based on what's in your inventory.</p></div><div className="ai-status"><span className="online-dot"/>{aiReady?"AI connected":"Setup needed"}</div></div>
    <div className="chat-layout"><div className="chat-main"><div className="chat-top"><div className="chat-avatar"><Bot size={21}/></div><div><b>EXPI AI</b><small>{aiReady?"Gemini-powered assistant":"Gemini connection required"}</small></div><span className="chat-top-right"><ShieldCheck size={15}/> Inventory-aware</span></div>
      <div className="messages">{messages.map((m,i)=><div key={i} className={`message ${m.role}`}><div className="message-avatar">{m.role==="assistant"?<Bot size={17}/>: "You"}</div><div className="message-body"><div className="message-name">{m.role==="assistant"?"EXPI":"YOU"}</div><div className="bubble">{m.text}</div></div></div>)}{sending&&<div className="message assistant"><div className="message-avatar"><Bot size={17}/></div><div className="message-body"><div className="message-name">EXPI</div><div className="bubble typing"><i/><i/><i/></div></div></div>}<div ref={chatEnd}/></div>
      <div className="suggestions">{prompts.map(p=><button key={p} onClick={()=>send(p)} disabled={sending}>{p}</button>)}</div>
      <form className="chat-compose" onSubmit={e=>{e.preventDefault();send()}}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about your products..." disabled={sending}/><button disabled={!input.trim()||sending}><Send size={17}/></button></form>
      <div className="chat-disclaimer">EXPI can make mistakes. Check product labels and official storage instructions.</div>
    </div>
    <aside className="chat-side"><div className="side-card"><div className="side-title"><Package size={17}/> Your inventory</div><div className="side-number">{items.length}<small> products tracked</small></div><div className="side-items">{[...items].sort((a,b)=>a.expiryDate.localeCompare(b.expiryDate)).slice(0,4).map(x=><div key={x.id}><span>{x.name}</span><b>{statusFor(x.expiryDate).label}</b></div>)}</div><div className="side-foot">EXPI uses this list to personalize its answers.</div></div><div className="side-card prompt-card"><div className="side-title"><Sparkles size={17}/> Try asking</div><button onClick={()=>send("Which items should I prioritize using?")}>Which items should I prioritize?</button><button onClick={()=>send("How should I organize my fridge?")}>How should I organize my fridge?</button><button onClick={()=>send("What does best before mean?")}>What does “best before” mean?</button></div></aside></div>
  </div>;
}
