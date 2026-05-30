'use client';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import { toast } from 'sonner';
import { useModal } from '@/components/ui/Modal';
import ImageUploader from '@/components/ui/ImageUploader';
import { Plus, Eye, EyeOff, Trash2 } from 'lucide-react';

export default function TestimoniosPage() {
  const [items,   setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [form,    setForm]    = useState<any>({ stars:5, visible:true });
  const { open } = useModal();

  useEffect(() => onSnapshot(
    query(collection(db, COL.TESTIMONIOS), orderBy('order','asc')),
    snap => { setItems(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); }
  ), []);

  const handleSave = async () => {
    if (!form.name || !form.text) { toast.error('Nombre y testimonio son obligatorios'); return; }
    const id = `${Date.now()}`;
    await setDoc(doc(db, COL.TESTIMONIOS, id), {
      name:      form.name,
      role:      form.role || 'Cliente',
      text:      form.text,
      stars:     form.stars || 5,
      avatar:    form.avatar || '',
      focalX:    form.focalX ?? 0.5,
      focalY:    form.focalY ?? 0.5,
      order:     items.length + 1,
      visible:   true,
      createdAt: new Date().toISOString(),
    });
    toast.success('¡Testimonio agregado correctamente!');
    setAdding(false);
    setForm({ stars:5, visible:true });
  };

  const toggleVisible = (item: any) => open({
    type:        item.visible ? 'hide' : 'show',
    title:       item.visible ? 'Ocultar testimonio' : 'Mostrar testimonio',
    description: item.visible
      ? 'El testimonio dejará de verse en la web.'
      : 'El testimonio volverá a aparecer en la web.',
    collection:  COL.TESTIMONIOS,
    docId:       item.id,
    field:       'visible',
  });

  const handleDelete = (item: any) => open({
    type:       'delete',
    title:      `Eliminar testimonio de "${item.name}"`,
    description:'Esta acción no se puede deshacer.',
    onConfirm:  async () => {
      await deleteDoc(doc(db, COL.TESTIMONIOS, item.id));
      toast.success('Testimonio eliminado');
    },
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-playfair)', fontSize:'1.5rem', fontWeight:700, color:'#0a1628', margin:0 }}>Testimonios</h1>
          <p style={{ color:'#64748b', fontSize:'0.82rem', marginTop:4 }}>
            {items.filter(i=>i.visible).length} visibles
          </p>
        </div>
        <button onClick={()=>setAdding(a=>!a)} className="btn-primary">
          <Plus size={16}/> Nuevo testimonio
        </button>
      </div>

      {adding && (
        <div className="admin-card" style={{ padding:'1.5rem', animation:'slideUp .3s ease' }}>
          <h3 style={{ fontSize:'0.9rem', fontWeight:700, color:'#0a1628', margin:'0 0 16px' }}>Nuevo testimonio</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label:'Nombre *', key:'name', placeholder:'Ej: María García' },
                { label:'Rol / Evento', key:'role', placeholder:'Ej: Mamá de Valentina · Quinceañero' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#64748b', display:'block', marginBottom:6 }}>{label}</label>
                  <input type="text" value={form[key]||''} onChange={e=>setForm((p:any)=>({...p,[key]:e.target.value}))}
                         placeholder={placeholder} className="admin-input"/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#64748b', display:'block', marginBottom:6 }}>Testimonio *</label>
                <textarea rows={4} value={form.text||''} onChange={e=>setForm((p:any)=>({...p,text:e.target.value}))}
                          placeholder="Escribe el texto del testimonio…" className="admin-input" style={{ resize:'vertical' }}/>
              </div>
              <div>
                <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#64748b', display:'block', marginBottom:6 }}>Estrellas</label>
                <div style={{ display:'flex', gap:4 }}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} type="button" onClick={()=>setForm((p:any)=>({...p,stars:n}))}
                            style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.5rem', padding:0,
                                      color:(form.stars||5)>=n?'#f59e0b':'#e2e8f0', transition:'color .1s' }}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <ImageUploader
              label="Foto del cliente (opcional, máx 200MB)"
              folder="testimonios"
              acceptVideo={false}
              previewAspect={1} previewLabel="Avatar circular en testimonio"
              onComplete={(url, fp) => setForm((p:any) => ({ ...p, avatar:url, focalX:fp.x, focalY:fp.y }))}
            />
          </div>
          <div style={{ display:'flex', gap:10, marginTop:20 }}>
            <button onClick={()=>setAdding(false)} className="btn-outline">Cancelar</button>
            <button onClick={handleSave} className="btn-gold">✅ Guardar testimonio</button>
          </div>
        </div>
      )}

      {loading
        ? [...Array(4)].map((_,i)=><div key={i} className="skeleton" style={{ height:80, borderRadius:12 }}/>)
        : items.length === 0 ? (
          <div style={{ textAlign:'center', padding:'4rem', background:'#fff', borderRadius:16, border:'1px solid #e2e8f0' }}>
            <p style={{ fontSize:'3rem', marginBottom:12 }}>⭐</p>
            <p style={{ color:'#64748b' }}>No hay testimonios aún.</p>
          </div>
        ) : items.map(item => (
          <div key={item.id} className="admin-card"
               style={{ padding:'1rem 1.25rem', display:'flex', gap:12, alignItems:'flex-start', opacity:item.visible?1:.7 }}>
            <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, overflow:'hidden',
                           background:'linear-gradient(135deg,#1e3a5f,#2563eb)',
                           display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700 }}>
              {item.avatar
                ? <img src={item.avatar} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover',
                                                                     objectPosition:`${(item.focalX??0.5)*100}% ${(item.focalY??0.5)*100}%` }}/>
                : (item.name||'?').charAt(0).toUpperCase()
              }
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <p style={{ fontWeight:700, fontSize:'0.88rem', color:'#0a1628', margin:0 }}>{item.name}</p>
                <span style={{ fontSize:'0.72rem', color:'#64748b' }}>{item.role}</span>
                <span style={{ color:'#f59e0b', fontSize:'0.85rem' }}>{'★'.repeat(item.stars||5)}</span>
              </div>
              <p style={{ fontSize:'0.82rem', color:'#475569', margin:0, lineHeight:1.5 }}>"{item.text}"</p>
            </div>
            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
              <button onClick={()=>toggleVisible(item)}
                      style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center' }}>
                {item.visible ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
              <button onClick={()=>handleDelete(item)}
                      style={{ background:'none', border:'1px solid #fecaca', borderRadius:8, padding:'6px', cursor:'pointer', color:'#ef4444', display:'flex', alignItems:'center' }}>
                <Trash2 size={14}/>
              </button>
            </div>
          </div>
        ))
      }
    </div>
  );
}
