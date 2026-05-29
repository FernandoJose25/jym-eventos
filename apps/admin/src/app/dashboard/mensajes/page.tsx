'use client';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import { formatDate, exportCSV, buildWhatsAppUrl } from '@/lib/utils';
import { toast } from 'sonner';
import type { Mensaje } from '@/types';

const ESTADOS: Record<string,{ label:string; bg:string; color:string }> = {
  'pendiente':   { label:'Nuevo',     bg:'#f0fdf4', color:'#166534' },
  'en-revision': { label:'Revisando', bg:'#fffbeb', color:'#92400e' },
  'cotizado':    { label:'Cotizado',  bg:'#eff6ff', color:'#1e40af' },
  'cerrado':     { label:'Cerrado',   bg:'#f8fafc', color:'#475569' },
};

export default function MensajesPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [selected, setSelected] = useState<Mensaje|null>(null);
  const [filtro,   setFiltro]   = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => onSnapshot(
    query(collection(db, COL.MENSAJES), orderBy('fechaEnvio','desc')),
    snap => { setMensajes(snap.docs.map(d=>({id:d.id,...d.data()})) as Mensaje[]); setLoading(false); }
  ), []);

  const handleSelect = async (msg: Mensaje) => {
    setSelected(msg);
    if (!msg.leido && msg.id) {
      await updateDoc(doc(db, COL.MENSAJES, msg.id), { leido:true });
    }
  };

  const handleEstado = async (id: string, estado: string) => {
    await updateDoc(doc(db, COL.MENSAJES, id), { estado });
    setSelected(prev => prev?.id===id ? {...prev, estado:estado as any} : prev);
    toast.success(`Estado: "${ESTADOS[estado]?.label||estado}"`);
  };

  const noLeidos  = mensajes.filter(m=>!m.leido).length;
  const filtrados = mensajes.filter(m => {
    const ok1 = filtro==='todos' || m.estado===filtro;
    const ok2 = !busqueda || [m.nombre, m.correo, m.telefono, m.tipoEvento]
                              .some(f=>f?.toLowerCase().includes(busqueda.toLowerCase()));
    return ok1 && ok2;
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, height:'calc(100vh - 120px)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <h1 style={{ fontFamily:'var(--font-playfair)', fontSize:'1.5rem', fontWeight:700, color:'#0a1628', margin:0 }}>Mensajes</h1>
          {noLeidos > 0 && (
            <span style={{ background:'#ef4444', color:'#fff', fontSize:'0.7rem', fontWeight:700, padding:'2px 8px', borderRadius:999 }}>
              {noLeidos} nuevo{noLeidos>1?'s':''}
            </span>
          )}
        </div>
        <button onClick={()=>exportCSV(mensajes, `jym-mensajes-${new Date().toISOString().slice(0,10)}.csv`)}
                className="btn-outline" style={{ display:'flex', alignItems:'center', gap:6 }}>
          ⬇️ Exportar CSV
        </button>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        <input type="search" placeholder="Buscar nombre, correo, teléfono..." value={busqueda}
               onChange={e=>setBusqueda(e.target.value)} className="admin-input" style={{ flex:1, minWidth:200 }}/>
        {(['todos','pendiente','en-revision','cotizado','cerrado'] as const).map(f=>(
          <button key={f} onClick={()=>setFiltro(f)}
                  style={{ padding:'0.5rem 1rem', borderRadius:10, fontSize:'0.78rem', fontWeight:600,
                            cursor:'pointer', border:'none', fontFamily:'var(--font-jakarta)',
                            background:filtro===f?'#1e3a5f':'#f1f5f9',
                            color:filtro===f?'#fff':'#64748b' }}>
            {f==='todos' ? `Todos (${mensajes.length})` : ESTADOS[f]?.label}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', gap:16, flex:1, minHeight:0 }}>
        {/* Lista */}
        <div style={{ width:300, flexShrink:0, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
          {loading && [...Array(5)].map((_,i)=>(
            <div key={i} className="skeleton" style={{ height:72, borderRadius:12 }}/>
          ))}
          {!loading && filtrados.length === 0 && (
            <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
              <p style={{ fontSize:'2rem', marginBottom:8 }}>📭</p>
              <p style={{ color:'#94a3b8', fontSize:'0.85rem' }}>
                {busqueda||filtro!=='todos' ? 'Sin resultados' : 'Sin mensajes aún'}
              </p>
            </div>
          )}
          {filtrados.map(msg => {
            const est = ESTADOS[msg.estado] || ESTADOS['pendiente'];
            const isActive = selected?.id === msg.id;
            return (
              <button key={msg.id} onClick={()=>handleSelect(msg)}
                      style={{ width:'100%', textAlign:'left', padding:'0.875rem 1rem', borderRadius:14, cursor:'pointer',
                                background:isActive?'#eff6ff':'#fff',
                                border:`1px solid ${isActive?'#93c5fd':'#e2e8f0'}`,
                                transition:'all .15s',
                                boxShadow:isActive?'0 2px 12px rgba(30,58,95,0.12)':'none',
                                fontFamily:'var(--font-jakarta)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                                 background:'linear-gradient(135deg,#1e3a5f,#2563eb)',
                                 display:'flex', alignItems:'center', justifyContent:'center',
                                 color:'#fff', fontWeight:700, fontSize:'0.9rem' }}>
                    {(msg.nombre||'?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      {!msg.leido && <span style={{ width:7, height:7, borderRadius:'50%', background:'#2563eb', flexShrink:0 }}/>}
                      <p style={{ fontWeight:600, fontSize:'0.83rem', color:'#0a1628', margin:0,
                                   overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {msg.nombre}
                      </p>
                    </div>
                    <p style={{ fontSize:'0.73rem', color:'#64748b', margin:0,
                                 overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {msg.tipoEvento||'Sin especificar'}
                    </p>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
                      <span style={{ fontSize:'0.65rem', fontWeight:600, padding:'1px 7px', borderRadius:999,
                                      background:est.bg, color:est.color }}>
                        {est.label}
                      </span>
                      <span style={{ fontSize:'0.65rem', color:'#94a3b8' }}>
                        {new Date(msg.fechaEnvio).toLocaleDateString('es-PE',{day:'2-digit',month:'short'})}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detalle */}
        <div style={{ flex:1, background:'#fff', borderRadius:20, border:'1px solid #e2e8f0',
                       overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {!selected ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, color:'#94a3b8' }}>
              <p style={{ fontSize:'3rem' }}>💬</p>
              <p style={{ fontSize:'0.85rem' }}>Selecciona un mensaje</p>
            </div>
          ) : (
            <>
              <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <h2 style={{ fontFamily:'var(--font-playfair)', fontSize:'1.2rem', fontWeight:700, color:'#0a1628', margin:'0 0 4px' }}>
                    {selected.nombre}
                  </h2>
                  <p style={{ fontSize:'0.78rem', color:'#94a3b8', margin:0 }}>{formatDate(selected.fechaEnvio)}</p>
                </div>
                <select value={selected.estado}
                        onChange={e=>selected.id&&handleEstado(selected.id,e.target.value)}
                        style={{ border:'1px solid #e2e8f0', borderRadius:10, padding:'0.4rem 0.75rem',
                                  fontSize:'0.8rem', color:'#1a2332', background:'#fff', cursor:'pointer',
                                  fontFamily:'var(--font-jakarta)' }}>
                  <option value="pendiente">Nuevo</option>
                  <option value="en-revision">Revisando</option>
                  <option value="cotizado">Cotizado</option>
                  <option value="cerrado">Cerrado</option>
                </select>
              </div>

              <div style={{ padding:'1.25rem 1.5rem', flex:1, overflowY:'auto' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                  {[
                    ['📱 Teléfono',       selected.telefono],
                    ['✉️ Correo',          selected.correo],
                    ['📍 Distrito',        selected.distrito],
                    ['🎉 Tipo de evento',  selected.tipoEvento],
                    ['📅 Fecha del evento',selected.fechaEvento],
                    ['👥 Invitados',       selected.invitados],
                    ['💰 Presupuesto',     selected.presupuesto],
                  ].map(([lbl, val]) => val ? (
                    <div key={lbl as string}>
                      <p style={{ fontSize:'0.7rem', color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 4px' }}>{lbl}</p>
                      <p style={{ fontSize:'0.88rem', color:'#0a1628', fontWeight:500, margin:0 }}>{val}</p>
                    </div>
                  ) : null)}
                </div>
                {selected.mensaje && (
                  <div style={{ background:'#f8fafc', borderRadius:12, padding:'1rem', border:'1px solid #e2e8f0' }}>
                    <p style={{ fontSize:'0.7rem', color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 6px' }}>💬 Mensaje</p>
                    <p style={{ fontSize:'0.88rem', color:'#334155', lineHeight:1.6, margin:0 }}>{selected.mensaje}</p>
                  </div>
                )}
              </div>

              <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid #f1f5f9', display:'flex', gap:10 }}>
                <a href={buildWhatsAppUrl(selected.telefono, selected.nombre, selected.tipoEvento)}
                   target="_blank" rel="noopener noreferrer"
                   style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                             background:'#25d366', color:'#fff', borderRadius:12, padding:'0.7rem',
                             textDecoration:'none', fontSize:'0.85rem', fontWeight:700 }}>
                  💬 Responder por WhatsApp
                </a>
                <a href={`mailto:${selected.correo}?subject=Tu%20consulta%20en%20J%26M%20Eventos`}
                   style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                             background:'#f1f5f9', borderRadius:12, padding:'0.7rem 1rem',
                             textDecoration:'none', fontSize:'0.85rem', color:'#475569', fontWeight:600 }}>
                  ✉️
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
