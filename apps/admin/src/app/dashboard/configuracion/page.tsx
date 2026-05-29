'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  doc, getDoc, setDoc, collection, query, orderBy,
  onSnapshot, deleteDoc, updateDoc,
} from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import { toast } from 'sonner';
import ImageUploader from '@/components/ui/ImageUploader';
import { useModal } from '@/components/ui/Modal';
import EditModal from '@/components/ui/EditModal';
import { Eye, EyeOff, Trash2, Edit2, Plus } from 'lucide-react';

/* ─────────────────────────────────────────────────────
   DEFAULT ITEMS
───────────────────────────────────────────────────── */
const DEFAULT_WHY_ITEMS = [
  { icon:'🏆', title:'Experiencia Comprobada', desc:'Más de 10 años organizando eventos exitosos.', visible:true },
  { icon:'🎨', title:'Diseño Personalizado',   desc:'Cada evento es único y a tu medida.', visible:true },
  { icon:'⏰', title:'Puntualidad Garantizada', desc:'Siempre a tiempo, siempre listos.', visible:true },
  { icon:'💎', title:'Materiales Premium',      desc:'Calidad garantizada en cada detalle.', visible:true },
  { icon:'📸', title:'Momentos Memorables',     desc:'Experiencias que duran toda la vida.', visible:true },
  { icon:'🤝', title:'Atención Personalizada',  desc:'Disponibles antes, durante y después.', visible:true },
];

/* ─────────────────────────────────────────────────────
   Label helper
───────────────────────────────────────────────────── */
const lbl = (text: string) => (
  <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#64748b', display:'block', marginBottom:6 }}>
    {text}
  </label>
);

/* ─────────────────────────────────────────────────────
   F — Field (outside component to avoid remounts)
───────────────────────────────────────────────────── */
function F({ label: lb, fieldKey, type = 'text', placeholder = '', rows = 3, value, onChange }: {
  label: string; fieldKey: string; type?: string; placeholder?: string; rows?: number;
  value: string; onChange: (k:string, v:string) => void;
}) {
  return (
    <div>
      {lbl(lb)}
      {type === 'textarea'
        ? <textarea rows={rows} value={value} onChange={e => onChange(fieldKey, e.target.value)}
            placeholder={placeholder} className="admin-input" style={{ resize:'vertical' }}/>
        : <input type={type} value={value} onChange={e => onChange(fieldKey, e.target.value)}
            placeholder={placeholder} className="admin-input"/>
      }
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   ItemCard — row with Edit / Hide / Delete
───────────────────────────────────────────────────── */
function ItemCard({ item, onEdit, onToggle, onDelete }: {
  item: any; onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) {
  const hidden = item.visible === false;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, background:'#f8fafc', borderRadius:10, padding:'0.875rem 1rem', border:'1px solid #e2e8f0', opacity:hidden?0.55:1, transition:'opacity .2s' }}>
      {(item.icon || item.logo) && (
        <span style={{ fontSize:'1.4rem', width:32, textAlign:'center', flexShrink:0 }}>{item.icon || item.logo}</span>
      )}
      {item.logoUrl && !item.icon && !item.logo && (
        <img src={item.logoUrl} alt={item.name||''} style={{ width:40, height:40, objectFit:'contain', borderRadius:6, flexShrink:0 }}/>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        {(item.title || item.label || item.name) && (
          <p style={{ fontWeight:600, fontSize:'0.88rem', color:'#0a1628', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {item.title || item.label || item.name}
            {item.year && <span style={{ color:'#94a3b8', fontWeight:400, marginLeft:4 }}>({item.year})</span>}
          </p>
        )}
        {(item.desc || item.text) && (
          <p style={{ fontSize:'0.78rem', color:'#64748b', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {item.desc || item.text}
          </p>
        )}
      </div>
      {hidden && <span style={{ fontSize:'0.65rem', background:'#f1f5f9', color:'#94a3b8', borderRadius:4, padding:'2px 6px', flexShrink:0 }}>Oculto</span>}
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        <button onClick={onEdit} title="Editar"
          style={{ background:'none', border:'1px solid #bfdbfe', borderRadius:8, padding:'6px', cursor:'pointer', color:'#2563eb', display:'flex', alignItems:'center' }}><Edit2 size={14}/></button>
        <button onClick={onToggle} title={hidden?'Mostrar':'Ocultar'}
          style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center' }}>{hidden?<Eye size={14}/>:<EyeOff size={14}/>}</button>
        <button onClick={onDelete} title="Eliminar"
          style={{ background:'none', border:'1px solid #fecaca', borderRadius:8, padding:'6px', cursor:'pointer', color:'#ef4444', display:'flex', alignItems:'center' }}><Trash2 size={14}/></button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   StatCard — for Stats & Nosotros stats
───────────────────────────────────────────────────── */
function StatCard({ num, label, secondary, index, onEdit }: {
  num: string; label: string; secondary?: string; index: number; onEdit: () => void;
}) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, background:'#f8fafc', borderRadius:10, padding:'0.875rem 1rem', border:'1px solid #e2e8f0' }}>
      <div style={{ width:52, height:52, borderRadius:12, background:'linear-gradient(135deg,#1e3a5f,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', color:'#f5c842', fontWeight:800, fontSize:'1rem', flexShrink:0, textAlign:'center', padding:'0 4px' }}>
        {num || `#${index}`}
      </div>
      <div style={{ flex:1 }}>
        <p style={{ fontWeight:600, fontSize:'0.9rem', color:'#0a1628', margin:'0 0 2px' }}>{label || <span style={{ color:'#94a3b8' }}>Sin etiqueta</span>}</p>
        {secondary && <p style={{ fontSize:'0.78rem', color:'#64748b', margin:0 }}>{secondary}</p>}
      </div>
      <button onClick={onEdit} title="Editar"
        style={{ background:'none', border:'1px solid #bfdbfe', borderRadius:8, padding:'6px 10px', cursor:'pointer', color:'#2563eb', display:'flex', alignItems:'center', gap:6, fontSize:'0.78rem', fontWeight:500 }}>
        <Edit2 size={13}/> Editar
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Section types
───────────────────────────────────────────────────── */
type Section = 'hero' | 'stats' | 'about' | 'nosotros' | 'why-us' | 'brands' | 'contacto' | 'navbar' | 'testimonios';

const SECTIONS: { id:Section; icon:string; label:string }[] = [
  { id:'hero',        icon:'🖼️',  label:'Hero / Portada' },
  { id:'stats',       icon:'📊',  label:'Estadísticas' },
  { id:'about',       icon:'👥',  label:'Quiénes Somos' },
  { id:'nosotros',    icon:'🏠',  label:'Nosotros' },
  { id:'why-us',      icon:'✨',  label:'¿Por qué elegirnos?' },
  { id:'brands',      icon:'🏢',  label:'Empresas / Marcas' },
  { id:'contacto',    icon:'📞',  label:'Contacto y Redes' },
  { id:'navbar',      icon:'🧭',  label:'Navbar / Logo' },
  { id:'testimonios', icon:'⭐',  label:'Testimonios' },
];

/* ─────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────── */
export default function ConfiguracionPage() {
  const [section, setSection] = useState<Section>('hero');
  const [data,    setData]    = useState<Record<string,any>>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  /* Testimonios */
  const [testimonios, setTestimonios] = useState<any[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [testModal,   setTestModal]   = useState<{ id:string|null; form:any } | null>(null);

  /* Generic list modal (why-us items, hitos, valores, misionCards, brands) */
  const [editModal, setEditModal] = useState<{
    listKey: string;
    index: number|null;
    form: any;
  } | null>(null);

  /* Stats modal (main stats + nosotros stats) */
  const [statsModal, setStatsModal] = useState<{
    type: 'main' | 'nosotros';
    n: number; // 1–4
    form: Record<string,string>;
  } | null>(null);

  const { open } = useModal();

  /* ── Load section doc ── */
  useEffect(() => {
    if (section === 'testimonios') { setLoading(false); return; }
    setLoading(true);
    setData({}); // clear stale data
    getDoc(doc(db, COL.CONFIGURACION, section)).then(snap => {
      const loaded: Record<string,any> = snap.exists() ? snap.data() : {};
      /* Always initialise why-us items so partial saves don't lose defaults */
      if (section === 'why-us' && (!loaded.items || loaded.items.length === 0)) {
        loaded.items = DEFAULT_WHY_ITEMS;
      }
      setData(loaded);
      setLoading(false);
    });
  }, [section]);

  /* ── Load testimonios ── */
  useEffect(() => {
    if (section !== 'testimonios') return;
    setTestLoading(true);
    return onSnapshot(
      query(collection(db, COL.TESTIMONIOS), orderBy('order','asc')),
      snap => { setTestimonios(snap.docs.map(d=>({id:d.id,...d.data()}))); setTestLoading(false); }
    );
  }, [section]);

  /* ── Setters ── */
  const set = useCallback((k: string, v: any) => setData(p => ({ ...p, [k]: v })), []);
  const handleField = useCallback((k: string, v: string) => set(k, v), [set]);

  /* ── Save section ── */
  const handleSave = async () => {
    setSaving(true);
    await setDoc(doc(db, COL.CONFIGURACION, section), data, { merge:true });
    setSaving(false);
    toast.success('✅ Guardado. Los cambios ya están en la web.');
  };

  /* ─────────────────────────────────────────────────────
     Generic list helpers
  ───────────────────────────────────────────────────── */
  const getList = (key: string) => data[key] || [];

  const openEdit = (listKey: string, idx: number) =>
    setEditModal({ listKey, index:idx, form:{ ...getList(listKey)[idx] } });

  const openAdd = (listKey: string, def: any) =>
    setEditModal({ listKey, index:null, form:{ ...def, visible:true } });

  const saveFromModal = () => {
    if (!editModal) return;
    const { listKey, index, form } = editModal;
    const items = [...getList(listKey)];
    if (index === null) items.push(form); else items[index] = form;
    set(listKey, items);
    setEditModal(null);
  };

  const toggleVisible = (listKey: string, i: number) => {
    const items = [...getList(listKey)];
    items[i] = { ...items[i], visible: items[i].visible === false };
    set(listKey, items);
  };

  const deleteItem = (listKey: string, i: number) => open({
    type:'delete', title:'Eliminar elemento', description:'Esta acción no se puede deshacer.',
    onConfirm: async () => set(listKey, getList(listKey).filter((_:any, j:number) => j !== i)),
  });

  const setMF = (k: string, v: any) =>
    setEditModal(p => p ? { ...p, form:{ ...p.form, [k]:v } } : null);

  /* ─────────────────────────────────────────────────────
     Stats modal helpers
  ───────────────────────────────────────────────────── */
  const openStatsEdit = (type: 'main'|'nosotros', n: number) => {
    const p = type === 'main' ? 's' : 'sn';
    setStatsModal({
      type, n,
      form: {
        num:   data[`${p}${n}num`]   || '',
        label: data[`${p}${n}label`] || '',
        ...(type === 'main'
          ? { sub: data[`s${n}sub`] || '' }
          : { icon: data[`sn${n}icon`] || '' }),
      },
    });
  };

  const saveStatsModal = () => {
    if (!statsModal) return;
    const { type, n, form } = statsModal;
    const p = type === 'main' ? 's' : 'sn';
    set(`${p}${n}num`,   form.num);
    set(`${p}${n}label`, form.label);
    if (type === 'main') set(`s${n}sub`, form.sub || '');
    else                  set(`sn${n}icon`, form.icon || '');
    setStatsModal(null);
  };

  const setSMF = (k: string, v: string) =>
    setStatsModal(p => p ? { ...p, form:{ ...p.form, [k]:v } } : null);

  /* ─────────────────────────────────────────────────────
     Modal fields renderer (generic lists)
  ───────────────────────────────────────────────────── */
  const renderModalFields = () => {
    if (!editModal) return null;
    const { listKey, form } = editModal;

    const mi = (lb: string, k: string, ph = '', emoji = false) => (
      <div key={k}>
        {lbl(lb)}
        <input type="text" value={form[k]||''} onChange={e=>setMF(k,e.target.value)}
               placeholder={ph} className="admin-input"
               style={emoji ? { textAlign:'center', fontSize:'1.4rem', padding:'0.35rem', width:60 } : {}}/>
      </div>
    );
    const mt = (lb: string, k: string, ph = '', rows = 3) => (
      <div key={k}>
        {lbl(lb)}
        <textarea rows={rows} value={form[k]||''} onChange={e=>setMF(k,e.target.value)}
                  placeholder={ph} className="admin-input" style={{ resize:'vertical' }}/>
      </div>
    );
    const mv = () => (
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'0.75rem 1rem', background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0' }}>
        <span style={{ fontSize:'0.84rem', color:'#475569', flex:1 }}>Visible en la web</span>
        <button type="button" onClick={() => setMF('visible', form.visible === false)}
                style={{ width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', position:'relative',
                          background: form.visible !== false ? '#10b981' : '#e2e8f0', transition:'background .2s' }}>
          <div style={{ width:20, height:20, borderRadius:10, background:'#fff', position:'absolute', top:2,
                         left: form.visible !== false ? 22 : 2, transition:'left .2s' }}/>
        </button>
      </div>
    );

    switch (listKey) {
      case 'items':
        return (<>
          <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
            {mi('Ícono','icon','🏆',true)}
            <div style={{ flex:1 }}>{mi('Título','title','Experiencia Comprobada')}</div>
          </div>
          {mt('Descripción','desc','Más de 10 años...',2)}
          {mv()}
        </>);
      case 'hitos':
        return (<>
          <div style={{ display:'grid', gridTemplateColumns:'90px 1fr', gap:12 }}>
            {mi('Año','year','2014')}
            {mi('Título del hito','label','El Comienzo')}
          </div>
          {mt('Descripción','desc','Cómo comenzó todo...',2)}
          {mv()}
        </>);
      case 'valores':
        return (<>
          <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
            {mi('Ícono','icon','❤️',true)}
            <div style={{ flex:1 }}>{mi('Título','title','Pasión')}</div>
          </div>
          {mt('Descripción','desc','Descripción del valor...',2)}
          {mi('Gradiente CSS (ej: #f59e0b,#d97706)','gradient','#f59e0b,#d97706')}
          {mv()}
        </>);
      case 'misionCards':
        return (<>
          <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
            {mi('Ícono','icon','🎭',true)}
            <div style={{ flex:1 }}>{mi('Título','title','Título')}</div>
          </div>
          {mt('Descripción','desc','Descripción...',2)}
          {mv()}
        </>);
      case 'brands':
        return (<>
          <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
            {mi('Logo emoji','logo','🏢',true)}
            <div style={{ flex:1 }}>{mi('Nombre empresa','name','Nombre de la empresa')}</div>
          </div>
          <ImageUploader label="Logo imagen (opcional)" folder="brands" acceptVideo={false}
            value={form.logoUrl}
            onComplete={(url) => setMF('logoUrl', url)}/>
          {mv()}
        </>);
      default:
        return null;
    }
  };

  /* ─────────────────────────────────────────────────────
     Testimonios CRUD
  ───────────────────────────────────────────────────── */
  const saveTestimonio = async () => {
    if (!testModal) return;
    const { id, form } = testModal;
    if (!form.name?.trim() || !form.text?.trim()) { toast.error('Nombre y testimonio son obligatorios'); return; }
    if (id) {
      await updateDoc(doc(db, COL.TESTIMONIOS, id), {
        name:form.name, role:form.role||'Cliente', text:form.text, stars:form.stars||5,
        ...(form.avatar ? { avatar:form.avatar, focalX:form.focalX??0.5, focalY:form.focalY??0.5 } : {}),
      });
      toast.success('Testimonio actualizado');
    } else {
      const nid = `${Date.now()}`;
      await setDoc(doc(db, COL.TESTIMONIOS, nid), {
        name:form.name, role:form.role||'Cliente', text:form.text,
        stars:form.stars||5, avatar:form.avatar||'',
        focalX:form.focalX??0.5, focalY:form.focalY??0.5,
        order:testimonios.length+1, visible:true, createdAt:new Date().toISOString(),
      });
      toast.success('Testimonio agregado');
    }
    setTestModal(null);
  };

  const toggleTestVisible = (item: any) => open({
    type: item.visible ? 'hide' : 'show',
    title: item.visible ? 'Ocultar testimonio' : 'Mostrar testimonio',
    description: item.visible ? 'Dejará de verse en la web.' : 'Volverá a aparecer en la web.',
    collection: COL.TESTIMONIOS, docId: item.id, field: 'visible',
  });

  const deleteTestimonio = (item: any) => open({
    type:'delete', title:`Eliminar testimonio de "${item.name}"`,
    description:'Esta acción no se puede deshacer.',
    onConfirm: async () => { await deleteDoc(doc(db, COL.TESTIMONIOS, item.id)); toast.success('Eliminado'); },
  });

  /* ─────────────────────────────────────────────────────
     List section header helper
  ───────────────────────────────────────────────────── */
  const ListHeader = ({ lb, count, listKey, def }: { lb:string; count:number; listKey:string; def:any }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
      {lbl(`${lb} (${count})`)}
      <button onClick={() => openAdd(listKey, def)} className="btn-outline" style={{ fontSize:'0.75rem', padding:'0.3rem 0.75rem' }}>+ Agregar</button>
    </div>
  );

  /* ─────────────────────────────────────────────────────
     Sidebar button
  ───────────────────────────────────────────────────── */
  const SideBtn = ({ s }: { s:typeof SECTIONS[0] }) => (
    <button onClick={() => setSection(s.id)}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'0.65rem 0.875rem',
                      borderRadius:10, border: section===s.id ? '1px solid rgba(30,58,95,.2)' : '1px solid transparent',
                      cursor:'pointer', marginBottom:3, textAlign:'left', fontFamily:'var(--font-jakarta)',
                      fontSize:'0.82rem', fontWeight: section===s.id ? 600 : 400,
                      background: section===s.id ? 'rgba(30,58,95,.08)' : 'transparent',
                      color: section===s.id ? '#1e3a5f' : '#64748b' }}>
      <span>{s.icon}</span><span>{s.label}</span>
    </button>
  );

  /* ═══════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════ */
  return (
    <div style={{ maxWidth:960, margin:'0 auto' }}>

      {/* Page header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-playfair)', fontSize:'1.5rem', fontWeight:700, color:'#0a1628', margin:0 }}>Configuración</h1>
          <p style={{ color:'#64748b', fontSize:'0.82rem', marginTop:4 }}>Todos los cambios se sincronizan con la web pública</p>
        </div>
        {section !== 'testimonios' && (
          <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ opacity:saving?0.6:1 }}>
            {saving ? 'Guardando…' : '💾 Guardar sección'}
          </button>
        )}
      </div>

      <div style={{ display:'flex', gap:20 }}>

        {/* Left sidebar */}
        <div style={{ width:200, flexShrink:0 }}>
          {SECTIONS.map(s => <SideBtn key={s.id} s={s}/>)}
        </div>

        {/* Content panel */}
        <div className="admin-card" style={{ flex:1, padding:'1.5rem' }}>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height:52, borderRadius:8 }}/>)}
            </div>
          ) : (
            <>
              {/* ══════════ HERO ══════════ */}
              {section === 'hero' && (
                <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <F label="Eyebrow (texto sobre el H1)" fieldKey="eyebrow" value={data.eyebrow||''} onChange={handleField} placeholder="Organizamos tu momento especial"/>
                  <F label='H1 — usa <em>texto</em> para color dorado' fieldKey="h1" value={data.h1||''} onChange={handleField} placeholder='Eventos que dejan <em>huella</em>'/>
                  <F label="Descripción" fieldKey="desc" value={data.desc||''} onChange={handleField} type="textarea" rows={3} placeholder="Somos expertos en transformar cada celebración..."/>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    <F label="Texto botón 1" fieldKey="btn1Text" value={data.btn1Text||''} onChange={handleField} placeholder="Ver Servicios"/>
                    <F label="URL botón 1"   fieldKey="btn1Link" value={data.btn1Link||''} onChange={handleField} placeholder="/#servicios"/>
                    <F label="Texto botón 2" fieldKey="btn2Text" value={data.btn2Text||''} onChange={handleField} placeholder="Cotizar por WhatsApp"/>
                    <F label="URL botón 2"   fieldKey="btn2Link" value={data.btn2Link||''} onChange={handleField} placeholder="https://wa.me/51945203708"/>
                  </div>
                  <ImageUploader label="Imagen/Video de fondo (máx 200MB)" folder="configuracion/hero"
                    value={data.bgImage} focal={{ x:data.bgFocalX??0.5, y:data.bgFocalY??0.4 }} acceptVideo={true}
                    soundEnabled={!!data.bgVideoSound} onSound={v=>set('bgVideoSound',v)}
                    onComplete={(url,fp,type)=>{ set('bgImage',url); set('bgFocalX',fp.x); set('bgFocalY',fp.y); set('bgMediaType',type||'image'); }}/>
                </div>
              )}

              {/* ══════════ STATS ══════════ */}
              {section === 'stats' && (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'0.75rem 1rem' }}>
                    <p style={{ fontSize:'0.8rem', color:'#166534', margin:0 }}>💡 Haz clic en "Editar" para modificar cada contador. Los cambios se guardan al presionar "Guardar sección".</p>
                  </div>
                  {[1,2,3,4].map(n => (
                    <StatCard key={n} index={n}
                      num={data[`s${n}num`]||''}
                      label={data[`s${n}label`]||''}
                      secondary={data[`s${n}sub`]||''}
                      onEdit={() => openStatsEdit('main', n)}/>
                  ))}
                </div>
              )}

              {/* ══════════ ABOUT ══════════ */}
              {section === 'about' && (
                <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <F label="Badge / etiqueta" fieldKey="label" value={data.label||''} onChange={handleField} placeholder="Quiénes Somos"/>
                  <F label="Título H2" fieldKey="h2" value={data.h2||''} onChange={handleField} placeholder="Tu Evento en Manos de Expertos"/>
                  <F label="Párrafo 1" fieldKey="p1" value={data.p1||''} onChange={handleField} type="textarea" rows={3} placeholder="Somos una empresa especializada en..."/>
                  <F label="Párrafo 2" fieldKey="p2" value={data.p2||''} onChange={handleField} type="textarea" rows={3} placeholder="Con más de una década de experiencia..."/>
                  <F label="Párrafo 3" fieldKey="p3" value={data.p3||''} onChange={handleField} type="textarea" rows={3} placeholder="Nuestro compromiso con la calidad..."/>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    <F label="Número del badge (ej: +10)" fieldKey="badgeNum" value={data.badgeNum||''} onChange={handleField} placeholder="+10"/>
                    <F label="Texto del badge" fieldKey="badgeTxt" value={data.badgeTxt||''} onChange={handleField} placeholder="Años de Experiencia"/>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                    <ImageUploader label="Imagen / Video principal" folder="configuracion/about"
                      value={data.img1} focal={{ x:0.5, y:0.4 }} acceptVideo={true}
                      soundEnabled={!!data.img1Sound} onSound={v=>set('img1Sound',v)}
                      onComplete={(url,fp,type)=>{ set('img1',url); set('img1Pos',`${fp.x*100}% ${fp.y*100}%`); set('img1Type',type||'image'); }}/>
                    <ImageUploader label="Imagen / Video secundaria" folder="configuracion/about"
                      value={data.img2} focal={{ x:0.5, y:0.4 }} acceptVideo={true}
                      soundEnabled={!!data.img2Sound} onSound={v=>set('img2Sound',v)}
                      onComplete={(url,fp,type)=>{ set('img2',url); set('img2Pos',`${fp.x*100}% ${fp.y*100}%`); set('img2Type',type||'image'); }}/>
                  </div>
                </div>
              )}

              {/* ══════════ NOSOTROS ══════════ */}
              {section === 'nosotros' && (
                <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

                  {/* Hero */}
                  <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:'1rem 1.25rem' }}>
                    <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 6px' }}>Hero</legend>
                    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                      <F label="Badge" fieldKey="heroBadge" value={data.heroBadge||''} onChange={handleField} placeholder="Sechura, Piura · Desde 2014"/>
                      <F label="Título línea 1" fieldKey="heroTitle1" value={data.heroTitle1||''} onChange={handleField} placeholder="Somos los que"/>
                      <F label="Título destacado (dorado)" fieldKey="heroHighlight" value={data.heroHighlight||''} onChange={handleField} placeholder="hacen magia"/>
                      <F label="Título línea 3" fieldKey="heroTitle3" value={data.heroTitle3||''} onChange={handleField} placeholder="en tu fiesta"/>
                      <F label="Descripción" fieldKey="heroDesc" value={data.heroDesc||''} onChange={handleField} type="textarea" rows={2} placeholder="Más de una década transformando celebraciones…"/>
                    </div>
                  </fieldset>

                  {/* Stats */}
                  <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:'1rem 1.25rem' }}>
                    <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 6px' }}>Estadísticas (4 cards)</legend>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {[1,2,3,4].map(n => (
                        <StatCard key={n} index={n}
                          num={data[`sn${n}num`]||''}
                          label={data[`sn${n}label`]||''}
                          secondary={data[`sn${n}icon`]||''}
                          onEdit={() => openStatsEdit('nosotros', n)}/>
                      ))}
                    </div>
                  </fieldset>

                  {/* Historia */}
                  <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:'1rem 1.25rem' }}>
                    <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 6px' }}>Historia / Timeline</legend>
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        <F label="Subtítulo sección" fieldKey="histSubtitle" value={data.histSubtitle||''} onChange={handleField} placeholder="Nuestra trayectoria"/>
                        <F label="H2 (parte dorada)" fieldKey="histH2Gold" value={data.histH2Gold||''} onChange={handleField} placeholder="construyendo magia"/>
                      </div>
                      <F label="Descripción" fieldKey="histDesc" value={data.histDesc||''} onChange={handleField} type="textarea" rows={2} placeholder="Desde nuestros inicios en 2014..."/>
                      <ListHeader lb="Hitos" count={(data.hitos||[]).length} listKey="hitos" def={{ year:'', label:'', desc:'' }}/>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {(data.hitos||[]).map((h:any, i:number) => (
                          <ItemCard key={i} item={h}
                            onEdit={() => openEdit('hitos',i)}
                            onToggle={() => toggleVisible('hitos',i)}
                            onDelete={() => deleteItem('hitos',i)}/>
                        ))}
                      </div>
                    </div>
                  </fieldset>

                  {/* Valores */}
                  <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:'1rem 1.25rem' }}>
                    <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 6px' }}>Valores</legend>
                    <ListHeader lb="Cards de valores" count={(data.valores||[]).length} listKey="valores" def={{ icon:'✨', title:'', desc:'', gradient:'#f59e0b,#d97706' }}/>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {(data.valores||[]).map((v:any, i:number) => (
                        <ItemCard key={i} item={v}
                          onEdit={() => openEdit('valores',i)}
                          onToggle={() => toggleVisible('valores',i)}
                          onDelete={() => deleteItem('valores',i)}/>
                      ))}
                    </div>
                  </fieldset>

                  {/* Misión */}
                  <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:'1rem 1.25rem' }}>
                    <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 6px' }}>Misión</legend>
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      <F label="Subtítulo" fieldKey="misionSubtitle" value={data.misionSubtitle||''} onChange={handleField} placeholder="Por qué existimos"/>
                      <F label="H2" fieldKey="misionH2" value={data.misionH2||''} onChange={handleField} placeholder="Creamos recuerdos que duran toda la vida"/>
                      <F label="Párrafo 1" fieldKey="misionP1" value={data.misionP1||''} onChange={handleField} type="textarea" rows={3} placeholder="Nuestra misión es..."/>
                      <F label="Párrafo 2" fieldKey="misionP2" value={data.misionP2||''} onChange={handleField} type="textarea" rows={3} placeholder="Creemos que cada celebración..."/>
                      <ListHeader lb="Feature cards" count={(data.misionCards||[]).length} listKey="misionCards" def={{ icon:'🎭', title:'', desc:'' }}/>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {(data.misionCards||[]).map((c:any, i:number) => (
                          <ItemCard key={i} item={c}
                            onEdit={() => openEdit('misionCards',i)}
                            onToggle={() => toggleVisible('misionCards',i)}
                            onDelete={() => deleteItem('misionCards',i)}/>
                        ))}
                      </div>
                    </div>
                  </fieldset>

                  {/* CTA */}
                  <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:'1rem 1.25rem' }}>
                    <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 6px' }}>CTA Final</legend>
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      <F label="Badge" fieldKey="ctaBadge" value={data.ctaBadge||''} onChange={handleField} placeholder="¿Lista tu celebración?"/>
                      <F label="Título H2" fieldKey="ctaH2" value={data.ctaH2||''} onChange={handleField} placeholder="Tu evento soñado comienza aquí"/>
                      <F label="Descripción" fieldKey="ctaDesc" value={data.ctaDesc||''} onChange={handleField} type="textarea" rows={2} placeholder="Contáctanos y hagamos realidad tu evento soñado..."/>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        <F label="Texto botón 1" fieldKey="ctaBtn1" value={data.ctaBtn1||''} onChange={handleField} placeholder="✨ Empezar a planear"/>
                        <F label="URL botón 1"   fieldKey="ctaBtn1Url" value={data.ctaBtn1Url||''} onChange={handleField} placeholder="/contacto"/>
                        <F label="Texto botón 2" fieldKey="ctaBtn2" value={data.ctaBtn2||''} onChange={handleField} placeholder="💬 Hablar por WhatsApp"/>
                        <F label="URL botón 2"   fieldKey="ctaBtn2Url" value={data.ctaBtn2Url||''} onChange={handleField} placeholder="https://wa.me/51945203708"/>
                      </div>
                    </div>
                  </fieldset>
                </div>
              )}

              {/* ══════════ WHY US ══════════ */}
              {section === 'why-us' && (
                <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <F label='Título H2 (usa <em>texto</em> para dorado)' fieldKey="h2" value={data.h2||''} onChange={handleField} placeholder='¿Por qué <em>elegirnos</em>?'/>
                  <F label="Descripción" fieldKey="desc" value={data.desc||''} onChange={handleField} placeholder="Más de una década transformando celebraciones en Sechura."/>

                  {/* Restore defaults button */}
                  {(data.items||[]).length < 6 && (
                    <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'0.75rem 1rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                      <p style={{ fontSize:'0.82rem', color:'#92400e', margin:0 }}>
                        💡 Se detectaron {(data.items||[]).length} de 6 elementos. ¿Restaurar los 6 originales?
                      </p>
                      <button
                        onClick={() => open({
                          type:'confirm', title:'Restaurar 6 puntos originales',
                          description:'Se reemplazarán los elementos actuales por los 6 puntos por defecto. Después podrás editarlos.',
                          onConfirm: async () => { set('items', DEFAULT_WHY_ITEMS); },
                        })}
                        className="btn-outline" style={{ fontSize:'0.78rem', padding:'0.35rem 0.875rem', whiteSpace:'nowrap' }}>
                        🔄 Restaurar defaults
                      </button>
                    </div>
                  )}

                  <div>
                    <ListHeader lb="Puntos / Cards" count={(data.items||[]).length} listKey="items" def={{ icon:'✨', title:'', desc:'' }}/>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {(data.items||[]).map((item:any, i:number) => (
                        <ItemCard key={i} item={item}
                          onEdit={() => openEdit('items',i)}
                          onToggle={() => toggleVisible('items',i)}
                          onDelete={() => deleteItem('items',i)}/>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ BRANDS ══════════ */}
              {section === 'brands' && (
                <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <F label="Título de la sección" fieldKey="h2" value={data.h2||''} onChange={handleField} placeholder="Empresas que confían en nosotros"/>
                  <ListHeader lb="Empresas / Marcas" count={(data.brands||[]).length} listKey="brands" def={{ name:'', logo:'🏢', logoUrl:'', visible:true }}/>
                  {(data.brands||[]).length === 0 && (
                    <p style={{ color:'#94a3b8', fontSize:'0.82rem', textAlign:'center', padding:'2rem', background:'#f8fafc', borderRadius:10, border:'1px dashed #e2e8f0' }}>
                      No hay marcas. Haz clic en "+ Agregar" para añadir una empresa.
                    </p>
                  )}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {(data.brands||[]).map((b:any, i:number) => (
                      <ItemCard key={i} item={b}
                        onEdit={() => openEdit('brands',i)}
                        onToggle={() => toggleVisible('brands',i)}
                        onDelete={() => deleteItem('brands',i)}/>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════ CONTACTO ══════════ */}
              {section === 'contacto' && (
                <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'0.75rem 1rem' }}>
                    <p style={{ fontSize:'0.8rem', color:'#1e40af', margin:0 }}>📞 Esta información aparece en la sección de contacto de la web y en el footer.</p>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    <F label="Teléfono (mostrar)" fieldKey="telefono" value={data.telefono||''} onChange={handleField} placeholder="+51 945 203 708"/>
                    <F label="WhatsApp (solo números)" fieldKey="whatsapp" value={data.whatsapp||''} onChange={handleField} placeholder="51945203708"/>
                    <F label="Correo electrónico" fieldKey="email" value={data.email||''} onChange={handleField} type="email" placeholder="jm@gmail.com"/>
                    <F label="Dirección" fieldKey="direccion" value={data.direccion||''} onChange={handleField} placeholder="Sechura, Piura, Perú"/>
                    <F label="Horario de atención" fieldKey="horario" value={data.horario||''} onChange={handleField} placeholder="Lunes a Domingo — 9am a 8pm"/>
                  </div>
                  <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:'1rem 1.25rem' }}>
                    <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 6px' }}>Redes Sociales</legend>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                      <F label="Instagram URL" fieldKey="instagram" value={data.instagram||''} onChange={handleField} placeholder="https://instagram.com/jymeventos"/>
                      <F label="Facebook URL" fieldKey="facebook" value={data.facebook||''} onChange={handleField} placeholder="https://facebook.com/jymeventos"/>
                      <F label="TikTok URL" fieldKey="tiktok" value={data.tiktok||''} onChange={handleField} placeholder="https://tiktok.com/@jymeventos"/>
                      <F label="YouTube URL (opcional)" fieldKey="youtube" value={data.youtube||''} onChange={handleField} placeholder="https://youtube.com/@jymeventos"/>
                    </div>
                  </fieldset>
                  <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:'1rem 1.25rem' }}>
                    <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 6px' }}>Ubicación en Google Maps</legend>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                      <F label="Latitud" fieldKey="mapsLat" value={data.mapsLat||''} onChange={handleField} placeholder="-5.5566"/>
                      <F label="Longitud" fieldKey="mapsLng" value={data.mapsLng||''} onChange={handleField} placeholder="-80.8234"/>
                    </div>
                  </fieldset>
                </div>
              )}

              {/* ══════════ NAVBAR ══════════ */}
              {section === 'navbar' && (
                <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <F label="Nombre en el navbar" fieldKey="nombre" value={data.nombre||''} onChange={handleField} placeholder="J&M Eventos"/>
                  <F label="Tagline" fieldKey="tagline" value={data.tagline||''} onChange={handleField} placeholder="Decoraciones y Eventos"/>
                  <ImageUploader label="Logo (se muestra en navbar y footer — máx 200MB)" folder="logos"
                    value={data.logo} focal={{ x:0.5, y:0.5 }} acceptVideo={false}
                    onComplete={(url) => set('logo',url)}/>
                  {data.logo && (
                    <div style={{ background:'#0a1628', borderRadius:12, padding:'1rem 1.5rem', display:'flex', alignItems:'center', gap:12 }}>
                      <img src={data.logo} alt="Logo preview" style={{ height:48, objectFit:'contain' }}/>
                      <div>
                        <p style={{ color:'#fff', fontFamily:'var(--font-playfair)', fontWeight:700, fontSize:'1rem', margin:0 }}>{data.nombre||'J&M Eventos'}</p>
                        <p style={{ color:'rgba(255,255,255,.5)', fontSize:'0.7rem', margin:0 }}>{data.tagline||'Decoraciones y Eventos'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════ TESTIMONIOS ══════════ */}
              {section === 'testimonios' && (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <p style={{ fontSize:'0.82rem', color:'#64748b', margin:0 }}>{testimonios.filter(t=>t.visible).length} visibles de {testimonios.length}</p>
                    <button onClick={() => setTestModal({ id:null, form:{ stars:5 } })} className="btn-primary">
                      <Plus size={16}/> Nuevo testimonio
                    </button>
                  </div>

                  {testLoading
                    ? [...Array(3)].map((_,i) => <div key={i} className="skeleton" style={{ height:80, borderRadius:12 }}/>)
                    : testimonios.length === 0
                    ? (
                      <div style={{ textAlign:'center', padding:'3rem', background:'#f8fafc', borderRadius:12, border:'1px dashed #e2e8f0' }}>
                        <p style={{ fontSize:'2rem', marginBottom:8 }}>⭐</p>
                        <p style={{ color:'#64748b' }}>No hay testimonios aún. Haz clic en "Nuevo testimonio".</p>
                      </div>
                    ) : testimonios.map(item => (
                      <div key={item.id} className="admin-card"
                           style={{ padding:'1rem 1.25rem', display:'flex', gap:12, alignItems:'flex-start', opacity:item.visible?1:0.65 }}>
                        <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, overflow:'hidden', background:'linear-gradient(135deg,#1e3a5f,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700 }}>
                          {item.avatar
                            ? <img src={item.avatar} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:`${(item.focalX??0.5)*100}% ${(item.focalY??0.5)*100}%` }}/>
                            : (item.name||'?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                            <p style={{ fontWeight:700, fontSize:'0.88rem', color:'#0a1628', margin:0 }}>{item.name}</p>
                            <span style={{ fontSize:'0.72rem', color:'#64748b' }}>{item.role}</span>
                            <span style={{ color:'#f59e0b', fontSize:'0.85rem' }}>{'★'.repeat(item.stars||5)}</span>
                            {!item.visible && <span style={{ fontSize:'0.65rem', background:'#f1f5f9', color:'#94a3b8', borderRadius:4, padding:'1px 5px' }}>Oculto</span>}
                          </div>
                          <p style={{ fontSize:'0.82rem', color:'#475569', margin:0, lineHeight:1.5 }}>"{item.text}"</p>
                        </div>
                        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                          <button onClick={() => setTestModal({ id:item.id, form:{ name:item.name, role:item.role, text:item.text, stars:item.stars||5, avatar:item.avatar||'', focalX:item.focalX??0.5, focalY:item.focalY??0.5 } })}
                                  style={{ background:'none', border:'1px solid #bfdbfe', borderRadius:8, padding:'6px', cursor:'pointer', color:'#2563eb', display:'flex', alignItems:'center' }}><Edit2 size={14}/></button>
                          <button onClick={() => toggleTestVisible(item)}
                                  style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center' }}>{item.visible?<EyeOff size={14}/>:<Eye size={14}/>}</button>
                          <button onClick={() => deleteTestimonio(item)}
                                  style={{ background:'none', border:'1px solid #fecaca', borderRadius:8, padding:'6px', cursor:'pointer', color:'#ef4444', display:'flex', alignItems:'center' }}><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          MODAL — generic list items
      ════════════════════════════════════════════════ */}
      <EditModal
        open={!!editModal}
        title={
          editModal?.index === null ? 'Agregar elemento'
          : editModal?.listKey === 'items'      ? 'Editar tarjeta'
          : editModal?.listKey === 'hitos'      ? 'Editar hito'
          : editModal?.listKey === 'valores'    ? 'Editar valor'
          : editModal?.listKey === 'misionCards'? 'Editar card de misión'
          : editModal?.listKey === 'brands'     ? 'Editar marca'
          : 'Editar'
        }
        onSave={saveFromModal}
        onCancel={() => setEditModal(null)}
      >
        {renderModalFields()}
      </EditModal>

      {/* ════════════════════════════════════════════════
          MODAL — stats
      ════════════════════════════════════════════════ */}
      <EditModal
        open={!!statsModal}
        title={statsModal ? `Editar estadística #${statsModal.n}` : ''}
        onSave={saveStatsModal}
        onCancel={() => setStatsModal(null)}
      >
        {statsModal && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              {lbl('Número / Valor (ej: +500, 10+)')}
              <input type="text" value={statsModal.form.num||''} onChange={e=>setSMF('num',e.target.value)}
                     placeholder={statsModal.type === 'main' ? '+500' : '+100'} className="admin-input"/>
            </div>
            <div>
              {lbl('Etiqueta')}
              <input type="text" value={statsModal.form.label||''} onChange={e=>setSMF('label',e.target.value)}
                     placeholder={statsModal.type === 'main' ? 'Fiestas exitosas' : 'Eventos realizados'} className="admin-input"/>
            </div>
            {statsModal.type === 'main' && (
              <div>
                {lbl('Subtexto descriptivo')}
                <input type="text" value={statsModal.form.sub||''} onChange={e=>setSMF('sub',e.target.value)}
                       placeholder="Celebraciones realizadas con éxito" className="admin-input"/>
              </div>
            )}
            {statsModal.type === 'nosotros' && (
              <div>
                {lbl('Ícono emoji')}
                <input type="text" value={statsModal.form.icon||''} onChange={e=>setSMF('icon',e.target.value)}
                       className="admin-input" style={{ textAlign:'center', fontSize:'1.4rem', padding:'0.35rem', width:70 }} placeholder="🎉"/>
              </div>
            )}
          </div>
        )}
      </EditModal>

      {/* ════════════════════════════════════════════════
          MODAL — testimonio (add / edit)
      ════════════════════════════════════════════════ */}
      <EditModal
        open={!!testModal}
        title={testModal?.id ? 'Editar testimonio' : 'Nuevo testimonio'}
        onSave={saveTestimonio}
        onCancel={() => setTestModal(null)}
      >
        {testModal && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                {lbl('Nombre *')}
                <input type="text" value={testModal.form.name||''} onChange={e=>setTestModal(p=>p?{...p,form:{...p.form,name:e.target.value}}:null)}
                       placeholder="Ej: María García" className="admin-input"/>
              </div>
              <div>
                {lbl('Rol / Evento')}
                <input type="text" value={testModal.form.role||''} onChange={e=>setTestModal(p=>p?{...p,form:{...p.form,role:e.target.value}}:null)}
                       placeholder="Ej: Mamá de Valentina" className="admin-input"/>
              </div>
            </div>
            <div>
              {lbl('Testimonio *')}
              <textarea rows={4} value={testModal.form.text||''} onChange={e=>setTestModal(p=>p?{...p,form:{...p.form,text:e.target.value}}:null)}
                        placeholder="Escribe el texto del testimonio…" className="admin-input" style={{ resize:'vertical' }}/>
            </div>
            <div>
              {lbl('Estrellas')}
              <div style={{ display:'flex', gap:4 }}>
                {[1,2,3,4,5].map(n=>(
                  <button key={n} type="button"
                          onClick={() => setTestModal(p=>p?{...p,form:{...p.form,stars:n}}:null)}
                          style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.5rem', padding:0, color:(testModal.form.stars||5)>=n?'#f59e0b':'#e2e8f0' }}>★</button>
                ))}
              </div>
            </div>
            {/* Always allow changing avatar (add & edit) */}
            <ImageUploader
              label={testModal.id ? 'Cambiar foto del cliente (opcional)' : 'Foto del cliente (opcional)'}
              folder="testimonios" acceptVideo={false}
              value={testModal.form.avatar||undefined}
              onComplete={(url,fp) => setTestModal(p=>p?{...p,form:{...p.form,avatar:url,focalX:fp.x,focalY:fp.y}}:null)}/>
          </div>
        )}
      </EditModal>

    </div>
  );
}
