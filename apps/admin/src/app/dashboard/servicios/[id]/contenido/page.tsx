'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import { toast } from 'sonner';
import ImageUploader from '@/components/ui/ImageUploader';
import { useModal } from '@/components/ui/Modal';
import EditModal from '@/components/ui/EditModal';
import { Eye, EyeOff, Trash2, Edit2, ArrowLeft, Save, Sparkles } from 'lucide-react';
import { authHeaders } from '@/lib/get-token';
import IconPicker from '@/components/ui/IconPicker';
import { SERVICE_ICONS, isIconKey } from '@/lib/serviceIcons';

/* ── Label helper ── */
const lbl = (text: string) => (
  <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#64748b', display:'block', marginBottom:6 }}>
    {text}
  </label>
);

/* ── ItemCard ── */
function ItemCard({ item, onEdit, onToggle, onDelete }: {
  item: any; onEdit: () => void; onToggle?: () => void; onDelete: () => void;
}) {
  const hidden = item.visible === false;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, background:'#f8fafc', borderRadius:10, padding:'0.875rem 1rem', border:'1px solid #e2e8f0', opacity:hidden?0.55:1 }}>
      {item.icon && <span style={{ fontSize:'1.4rem', width:32, textAlign:'center', flexShrink:0 }}>{item.icon}</span>}
      <div style={{ flex:1, minWidth:0 }}>
        {item.title && <p style={{ fontWeight:600, fontSize:'0.88rem', color:'#0a1628', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</p>}
        {item.desc && <p style={{ fontSize:'0.78rem', color:'#64748b', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.desc}</p>}
      </div>
      {hidden && <span style={{ fontSize:'0.65rem', background:'#f1f5f9', color:'#94a3b8', borderRadius:4, padding:'2px 6px', flexShrink:0 }}>Oculto</span>}
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        <button onClick={onEdit} title="Editar" style={{ background:'none', border:'1px solid #bfdbfe', borderRadius:8, padding:'6px', cursor:'pointer', color:'#2563eb', display:'flex', alignItems:'center' }}><Edit2 size={14}/></button>
        {onToggle && <button onClick={onToggle} title={hidden?'Mostrar':'Ocultar'} style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center' }}>{hidden?<Eye size={14}/>:<EyeOff size={14}/>}</button>}
        <button onClick={onDelete} title="Eliminar" style={{ background:'none', border:'1px solid #fecaca', borderRadius:8, padding:'6px', cursor:'pointer', color:'#ef4444', display:'flex', alignItems:'center' }}><Trash2 size={14}/></button>
      </div>
    </div>
  );
}

/* ── Field input/textarea ── */
function F({ label: lb, field, value, onChange, type = 'text', placeholder = '', rows = 3 }: {
  label: string; field: string; value: string; onChange: (k:string, v:string) => void;
  type?: string; placeholder?: string; rows?: number;
}) {
  return (
    <div>
      {lbl(lb)}
      {type === 'textarea'
        ? <textarea rows={rows} value={value} onChange={e => onChange(field, e.target.value)} placeholder={placeholder} className="admin-input" style={{ resize:'vertical' }}/>
        : <input type={type} value={value} onChange={e => onChange(field, e.target.value)} placeholder={placeholder} className="admin-input"/>
      }
    </div>
  );
}

export default function ServiceContentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { open } = useModal();

  const [srvData,    setSrvData]    = useState<any>({});
  const [saving,     setSaving]     = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);

  /* Includes modal */
  const [inclModal, setInclModal] = useState<{ index:number|null; form:any } | null>(null);
  /* Stats modal */
  const [statModal, setStatModal] = useState<{ index:number|null; form:any } | null>(null);
  /* Opciones modal (grid de estilos/variantes, ej. temáticas, personajes) */
  const [opcModal, setOpcModal] = useState<{ index:number|null; form:any } | null>(null);
  /* Pasos modal (timeline "cómo trabajamos") */
  const [pasoModal, setPasoModal] = useState<{ index:number|null; form:any } | null>(null);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, COL.SERVICIOS, id)).then(snap => {
      if (snap.exists()) setSrvData(snap.data());
      setLoading(false);
    });
  }, [id]);

  const set = useCallback((k: string, v: any) => setSrvData((p: any) => ({ ...p, [k]: v })), []);
  const setDetail = useCallback((k: string, v: any) => setSrvData((p: any) => ({ ...p, detail: { ...(p.detail||{}), [k]: v } })), []);

  const CAMPOS_EN_DETAIL = new Set([
    'eyebrow', 'hero_desc', 'categoryLabel', 'titleAccentWord',
    'longDescH2', 'longDesc', 'longDesc2', 'includes', 'stats',
    'testimonialName', 'testimonialRating', 'testimonialLocation',
    'ctaH2', 'ctaP', 'btn1Text', 'opciones', 'opcionesEyebrow', 'opcionesTitulo',
    'pasos', 'pasosEyebrow', 'pasosTitulo',
  ]);

  const handleGenerate = async () => {
    if (!srvData.title) { toast.error('El servicio necesita un título'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-servicio', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          nombre: srvData.title,
          instrucciones: srvData.aiInstrucciones || '',
          contenidoActual: { desc: srvData.desc || '', ...(srvData.detail || {}) },
        }),
      });
      const ai = await res.json();
      if (ai.error) throw new Error(ai.error);

      const campos = ai.campos || {};
      const nCampos = Object.keys(campos).length;
      if (nCampos === 0) {
        toast.success(ai.resumen || 'No había nada que completar o modificar.');
        return;
      }

      setSrvData((p: any) => {
        const next = { ...p, detail: { ...(p.detail || {}) } };
        for (const [k, v] of Object.entries(campos)) {
          if (CAMPOS_EN_DETAIL.has(k)) next.detail[k] = v;
          else next[k] = v;
        }
        return next;
      });
      toast.success(`✨ ${ai.resumen || `${nCampos} campo(s) actualizados.`} Revisa y guarda.`);
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await updateDoc(doc(db, COL.SERVICIOS, id), srvData);
    setSaving(false);
    toast.success('✅ Servicio actualizado. Los cambios ya están en la web.');
  };

  /* ── Includes helpers ── */
  const includes: any[] = srvData.detail?.includes || [];

  const openInclEdit = (index: number) => setInclModal({ index, form: { ...includes[index] } });
  const openInclAdd  = () => setInclModal({ index:null, form:{ icon:'✅', title:'', desc:'', visible:true } });

  const saveIncl = () => {
    if (!inclModal) return;
    const { index, form } = inclModal;
    const next = [...includes];
    if (index === null) next.push(form); else next[index] = form;
    setDetail('includes', next);
    setInclModal(null);
  };

  const toggleIncl = (i: number) => {
    const next = [...includes];
    next[i] = { ...next[i], visible: next[i].visible === false };
    setDetail('includes', next);
  };

  const deleteIncl = (i: number) => open({
    type:'delete', title:'Eliminar elemento',
    description:'Esta acción no se puede deshacer.',
    onConfirm: async () => setDetail('includes', includes.filter((_: any, j: number) => j !== i)),
  });

  const setInclField = (k: string, v: any) =>
    setInclModal(p => p ? { ...p, form: { ...p.form, [k]: v } } : null);

  /* ── Stats helpers (fila de estadísticas del hero) ── */
  const stats: any[] = srvData.detail?.stats || [];

  const openStatEdit = (index: number) => setStatModal({ index, form: { ...stats[index] } });
  const openStatAdd  = () => setStatModal({ index:null, form:{ value:'', label:'' } });

  const saveStat = () => {
    if (!statModal) return;
    const { index, form } = statModal;
    const next = [...stats];
    if (index === null) next.push(form); else next[index] = form;
    setDetail('stats', next);
    setStatModal(null);
  };

  const deleteStat = (i: number) => open({
    type:'delete', title:'Eliminar estadística',
    description:'Esta acción no se puede deshacer.',
    onConfirm: async () => setDetail('stats', stats.filter((_: any, j: number) => j !== i)),
  });

  const setStatField = (k: string, v: any) =>
    setStatModal(p => p ? { ...p, form: { ...p.form, [k]: v } } : null);

  /* ── Opciones helpers (grid de estilos/variantes propias del servicio) ── */
  const opciones: any[] = srvData.detail?.opciones || [];

  const openOpcEdit = (index: number) => setOpcModal({ index, form: { ...opciones[index] } });
  const openOpcAdd  = () => setOpcModal({ index:null, form:{ icon:'✨', title:'', desc:'' } });

  const saveOpc = () => {
    if (!opcModal) return;
    const { index, form } = opcModal;
    const next = [...opciones];
    if (index === null) next.push(form); else next[index] = form;
    setDetail('opciones', next);
    setOpcModal(null);
  };

  const deleteOpc = (i: number) => open({
    type:'delete', title:'Eliminar opción',
    description:'Esta acción no se puede deshacer.',
    onConfirm: async () => setDetail('opciones', opciones.filter((_: any, j: number) => j !== i)),
  });

  const setOpcField = (k: string, v: any) =>
    setOpcModal(p => p ? { ...p, form: { ...p.form, [k]: v } } : null);

  /* ── Pasos helpers (timeline "cómo trabajamos", máx 4) ── */
  const pasos: any[] = srvData.detail?.pasos || [];
  const renumerar = (arr: any[]) => arr.map((p, i) => ({ ...p, num: i + 1 }));

  const openPasoEdit = (index: number) => setPasoModal({ index, form: { ...pasos[index] } });
  const openPasoAdd  = () => setPasoModal({ index:null, form:{ title:'', desc:'' } });

  const savePaso = () => {
    if (!pasoModal) return;
    const { index, form } = pasoModal;
    const next = [...pasos];
    if (index === null) next.push(form); else next[index] = form;
    setDetail('pasos', renumerar(next.slice(0, 4)));
    setPasoModal(null);
  };

  const deletePaso = (i: number) => open({
    type:'delete', title:'Eliminar paso',
    description:'Esta acción no se puede deshacer.',
    onConfirm: async () => setDetail('pasos', renumerar(pasos.filter((_: any, j: number) => j !== i))),
  });

  const setPasoField = (k: string, v: any) =>
    setPasoModal(p => p ? { ...p, form: { ...p.form, [k]: v } } : null);

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:900, margin:'0 auto' }}>
      {[...Array(5)].map((_,i) => <div key={i} className="skeleton" style={{ height:64, borderRadius:12 }}/>)}
    </div>
  );

  return (
    <div style={{ maxWidth:900, margin:'0 auto', width:'100%', minWidth:0, boxSizing:'border-box' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap', width:'100%' }}>
        <button onClick={() => router.back()}
          style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'0.5rem 0.875rem', cursor:'pointer', color:'#64748b', fontSize:'0.82rem', fontWeight:500, flexShrink:0 }}>
          <ArrowLeft size={15}/> Volver
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {isIconKey(srvData.icon)
              ? (() => { const Icon = SERVICE_ICONS[srvData.icon]; return <Icon size={22} color="#1e3a5f" style={{ flexShrink:0 }} />; })()
              : <span style={{ fontSize:'1.5rem', flexShrink:0 }}>{srvData.icon||'🎉'}</span>}
            <div style={{ minWidth:0 }}>
              <h1 style={{ fontFamily:'var(--font-playfair)', fontSize:'1.2rem', fontWeight:700, color:'#0a1628', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{srvData.title||'Servicio'}</h1>
              <p style={{ color:'#64748b', fontSize:'0.75rem', margin:0 }}>Editando contenido del servicio</p>
            </div>
          </div>
        </div>
        <div className="srv-header-actions" style={{ display:'flex', gap:10, alignItems:'flex-start', flexWrap:'wrap', width:'100%' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 200px', minWidth:0 }}>
            <textarea
              rows={2}
              value={srvData.aiInstrucciones || ''}
              onChange={e => set('aiInstrucciones', e.target.value)}
              placeholder="Vacío = completa solo lo que falta. O pide algo puntual: 'mejora el párrafo principal', 'agrega una estadística de bodas', 'regenera todo'…"
              className="admin-input"
              style={{ width:'100%', resize:'vertical', fontSize:'0.78rem', minHeight:52 }}
            />
          </div>
          <button onClick={handleGenerate} disabled={generating}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'0.6rem 1.1rem', background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:'0.82rem', cursor:'pointer', opacity:generating?0.6:1, fontFamily:'var(--font-jakarta)', flexShrink:0 }}>
            <Sparkles size={15}/> {generating ? 'Generando…' : '✨ IA'}
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'0.6rem 1.25rem', background:'linear-gradient(135deg,#1e3a5f,#2563eb)', color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:'0.85rem', cursor:'pointer', opacity:saving?0.6:1, fontFamily:'var(--font-jakarta)', flexShrink:0 }}>
            <Save size={16}/> {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* Info básica */}
        <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'1.25rem 1.5rem' }}>
          <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 8px' }}>Info básica</legend>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              {lbl('Icono')}
              <IconPicker value={srvData.icon||''} onChange={v => set('icon', v)} />
            </div>
            <F label="Título" field="title" value={srvData.title||''} onChange={set} placeholder="Shows Infantiles"/>
            <F label="Descripción corta" field="desc" value={srvData.desc||''} onChange={set} type="textarea" rows={2} placeholder="Espectáculos llenos de magia, música y diversión..."/>
          </div>
        </fieldset>

        {/* Página del servicio */}
        <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'1.25rem 1.5rem' }}>
          <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 8px' }}>Página del servicio</legend>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <F label="Descripción héroe (subtítulo de la página)" field="hero_desc"
               value={srvData.detail?.hero_desc||''} onChange={(k,v)=>setDetail(k,v)} type="textarea" rows={2}
               placeholder="Espectáculos llenos de magia, música y diversión con personajes favoritos de los niños."/>
            <F label="Título H2" field="longDescH2"
               value={srvData.detail?.longDescH2||''} onChange={(k,v)=>setDetail(k,v)}
               placeholder="Diversión sin Límites para los Más Pequeños"/>
            <F label="Párrafo principal" field="longDesc"
               value={srvData.detail?.longDesc||''} onChange={(k,v)=>setDetail(k,v)} type="textarea" rows={4}
               placeholder="Nuestros shows infantiles son espectáculos diseñados para hacer de cada cumpleaños..."/>
            <F label="Características (una por línea)" field="longDesc2"
               value={srvData.detail?.longDesc2||''} onChange={(k,v)=>setDetail(k,v)} type="textarea" rows={5}
               placeholder={"Personajes temáticos: Superhéroes, princesas...\nMúsica en vivo / DJ\nLluvia de serpentinas"}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <F label="Categoría (badge superior)" field="categoryLabel"
                 value={srvData.detail?.categoryLabel||''} onChange={(k,v)=>setDetail(k,v)}
                 placeholder="Celebraciones · Bodas"/>
              <F label="Palabra a resaltar en el título" field="titleAccentWord"
                 value={srvData.detail?.titleAccentWord||''} onChange={(k,v)=>setDetail(k,v)}
                 placeholder="solo cabo suelto"/>
            </div>
          </div>
        </fieldset>

        {/* Testimonio flotante sobre el hero */}
        <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'1.25rem 1.5rem' }}>
          <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 8px' }}>Testimonio flotante (hero)</legend>
          <p style={{ fontSize:'0.78rem', color:'#64748b', margin:'0 0 12px' }}>
            Si se completa, reemplaza la tarjeta genérica sobre la imagen/video del hero por una tarjeta de testimonio con rating.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <F label="Nombre / lugar del cliente" field="testimonialName"
                 value={srvData.detail?.testimonialName||''} onChange={(k,v)=>setDetail(k,v)}
                 placeholder="Salón Los Almendros"/>
              <F label="Calificación" field="testimonialRating"
                 value={srvData.detail?.testimonialRating||''} onChange={(k,v)=>setDetail(k,v)}
                 placeholder="4.9"/>
            </div>
            <F label="Ubicación" field="testimonialLocation"
               value={srvData.detail?.testimonialLocation||''} onChange={(k,v)=>setDetail(k,v)}
               placeholder="Sechura, Piura"/>
          </div>
        </fieldset>

        {/* Stats en fila del hero */}
        <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'1.25rem 1.5rem' }}>
          <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 8px' }}>Estadísticas del hero</legend>
          <p style={{ fontSize:'0.78rem', color:'#64748b', margin:'0 0 12px' }}>
            Si agregas estadísticas aquí, reemplazan los contadores genéricos (+200 Eventos, +5 Años…) por estas, específicas del servicio.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button onClick={openStatAdd} className="btn-outline" style={{ fontSize:'0.78rem', padding:'0.35rem 0.875rem' }}>+ Agregar estadística</button>
            </div>
            {stats.length === 0 && (
              <p style={{ color:'#94a3b8', fontSize:'0.82rem', textAlign:'center', padding:'1.5rem', background:'#f8fafc', borderRadius:10, border:'1px dashed #e2e8f0' }}>
                Sin estadísticas propias. Se muestran las genéricas.
              </p>
            )}
            {stats.map((s: any, i: number) => (
              <ItemCard key={i} item={{ title: s.value, desc: s.label }}
                onEdit={() => openStatEdit(i)}
                onDelete={() => deleteStat(i)}/>
            ))}
          </div>
        </fieldset>

        {/* ¿Qué incluye? */}
        <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'1.25rem 1.5rem' }}>
          <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 8px' }}>¿Qué incluye? (cards)</legend>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button onClick={openInclAdd} className="btn-outline" style={{ fontSize:'0.78rem', padding:'0.35rem 0.875rem' }}>+ Agregar card</button>
            </div>
            {includes.length === 0 && (
              <p style={{ color:'#94a3b8', fontSize:'0.82rem', textAlign:'center', padding:'1.5rem', background:'#f8fafc', borderRadius:10, border:'1px dashed #e2e8f0' }}>
                No hay elementos. Haz clic en "+ Agregar card".
              </p>
            )}
            {includes.map((inc: any, i: number) => (
              <ItemCard key={i} item={inc}
                onEdit={() => openInclEdit(i)}
                onToggle={() => toggleIncl(i)}
                onDelete={() => deleteIncl(i)}/>
            ))}
          </div>
        </fieldset>

        {/* Opciones — grid de estilos/variantes (temáticas, personajes, etc.) */}
        <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'1.25rem 1.5rem' }}>
          <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 8px' }}>Opciones / Estilos (grid)</legend>
          <p style={{ fontSize:'0.78rem', color:'#64748b', margin:'0 0 12px' }}>
            Opcional. Solo si este servicio tiene variantes reales para elegir (ej. temáticas, personajes, tipos de animación). Si lo dejas vacío, esta sección no se muestra en la web.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <F label="Texto pequeño (eyebrow)" field="opcionesEyebrow"
                 value={srvData.detail?.opcionesEyebrow||''} onChange={(k,v)=>setDetail(k,v)}
                 placeholder="Estilos disponibles"/>
              <F label="Título de la sección" field="opcionesTitulo"
                 value={srvData.detail?.opcionesTitulo||''} onChange={(k,v)=>setDetail(k,v)}
                 placeholder="Temáticas Más Populares"/>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button onClick={openOpcAdd} className="btn-outline" style={{ fontSize:'0.78rem', padding:'0.35rem 0.875rem' }}>+ Agregar opción</button>
            </div>
            {opciones.length === 0 && (
              <p style={{ color:'#94a3b8', fontSize:'0.82rem', textAlign:'center', padding:'1.5rem', background:'#f8fafc', borderRadius:10, border:'1px dashed #e2e8f0' }}>
                Sin opciones. Esta sección no aparecerá en la web hasta que agregues al menos una.
              </p>
            )}
            {opciones.map((o: any, i: number) => (
              <ItemCard key={i} item={o}
                onEdit={() => openOpcEdit(i)}
                onDelete={() => deleteOpc(i)}/>
            ))}
          </div>
        </fieldset>

        {/* Pasos — timeline "cómo trabajamos" */}
        <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'1.25rem 1.5rem' }}>
          <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 8px' }}>Nuestro Proceso (timeline, máx. 4 pasos)</legend>
          <p style={{ fontSize:'0.78rem', color:'#64748b', margin:'0 0 12px' }}>
            Opcional. Si lo dejas vacío, esta sección no se muestra en la web.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <F label="Texto pequeño (eyebrow)" field="pasosEyebrow"
                 value={srvData.detail?.pasosEyebrow||''} onChange={(k,v)=>setDetail(k,v)}
                 placeholder="Nuestro Proceso"/>
              <F label="Título de la sección" field="pasosTitulo"
                 value={srvData.detail?.pasosTitulo||''} onChange={(k,v)=>setDetail(k,v)}
                 placeholder="Cómo Trabajamos Contigo"/>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button onClick={openPasoAdd} disabled={pasos.length >= 4} className="btn-outline" style={{ fontSize:'0.78rem', padding:'0.35rem 0.875rem', opacity: pasos.length >= 4 ? 0.5 : 1 }}>+ Agregar paso</button>
            </div>
            {pasos.length === 0 && (
              <p style={{ color:'#94a3b8', fontSize:'0.82rem', textAlign:'center', padding:'1.5rem', background:'#f8fafc', borderRadius:10, border:'1px dashed #e2e8f0' }}>
                Sin pasos. Esta sección no aparecerá en la web hasta que agregues al menos uno.
              </p>
            )}
            {pasos.map((p: any, i: number) => (
              <ItemCard key={i} item={{ icon: String(p.num ?? i + 1), title: p.title, desc: p.desc }}
                onEdit={() => openPasoEdit(i)}
                onDelete={() => deletePaso(i)}/>
            ))}
          </div>
        </fieldset>

        {/* CTA */}
        <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'1.25rem 1.5rem' }}>
          <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 8px' }}>CTA final de la página</legend>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <F label="Título H2 del CTA" field="ctaH2"
               value={srvData.detail?.ctaH2||''} onChange={(k,v)=>setDetail(k,v)}
               placeholder="Hagamos un Show Increíble"/>
            <F label="Párrafo del CTA" field="ctaP"
               value={srvData.detail?.ctaP||''} onChange={(k,v)=>setDetail(k,v)} type="textarea" rows={2}
               placeholder="Contáctanos hoy y haremos de tu evento algo mágico..."/>
            <F label="Texto del botón cotizar" field="btn1Text"
               value={srvData.detail?.btn1Text||''} onChange={(k,v)=>setDetail(k,v)}
               placeholder="Cotizar Show"/>
          </div>
        </fieldset>

        {/* Media — tarjeta inicio */}
        <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'1.25rem 1.5rem' }}>
          <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 8px' }}>Imagen / Video — Tarjeta del Inicio</legend>
          <p style={{ fontSize:'0.78rem', color:'#64748b', margin:'0 0 12px' }}>
            Aparece en la cuadrícula de servicios de la página principal.
          </p>
          <ImageUploader label="Tarjeta inicio" folder={`servicios/${id}`}
            value={srvData.mediaSrc} focal={{ x:srvData.mediaFocalX??0.5, y:srvData.mediaFocalY??0.4 }}
            acceptVideo={true} soundEnabled={!!srvData.mediaSound} onSound={v=>set('mediaSound',v)}
            previewAspect={4/3} previewLabel="Tarjeta de servicio (paisaje)"
            onComplete={(url,fp,type)=>{ set('mediaSrc',url); set('mediaFocalX',fp.x); set('mediaFocalY',fp.y); set('mediaType',type||'image'); }}/>
        </fieldset>

        {/* Media — hero página de detalle */}
        <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'1.25rem 1.5rem' }}>
          <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 8px' }}>Imagen / Video — Hero de la Página del Servicio</legend>
          <p style={{ fontSize:'0.78rem', color:'#64748b', margin:'0 0 12px' }}>
            Aparece en el panel derecho cuando alguien abre la página individual del servicio. Si está vacío, usa la imagen de la tarjeta.
          </p>
          <ImageUploader label="Hero página detalle" folder={`servicios/${id}/hero`}
            value={srvData.heroMediaSrc} focal={{ x:srvData.heroFocalX??0.5, y:srvData.heroFocalY??0.4 }}
            acceptVideo={true} soundEnabled={false}
            previewAspect={2/3} previewLabel="Panel hero derecho (retrato)"
            onComplete={(url,fp,type)=>{ set('heroMediaSrc',url); set('heroFocalX',fp.x); set('heroFocalY',fp.y); set('heroMediaType',type||'image'); }}/>
          <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, fontSize:'0.8rem', color:'#334155', fontWeight:600, cursor:'pointer' }}>
            <input type="checkbox" checked={srvData.heroMediaFit === 'contain'}
              onChange={e => set('heroMediaFit', e.target.checked ? 'contain' : 'cover')} />
            🖼️ Ajustar sin recortar (usar para logos o diseños que no deben cortarse en el panel vertical)
          </label>
        </fieldset>

        {/* Media — fondo sección "¿Qué incluye?" */}
        <fieldset style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'1.25rem 1.5rem' }}>
          <legend style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#1e3a5f', padding:'0 8px' }}>Imagen / Video — Fondo "¿Qué incluye?"</legend>
          <p style={{ fontSize:'0.78rem', color:'#64748b', margin:'0 0 12px' }}>
            Fondo de la sección con la tarjeta de elementos incluidos. Si está vacío, usa la imagen del hero.
          </p>
          <ImageUploader label="Fondo sección incluye" folder={`servicios/${id}/includes`}
            value={srvData.includesMediaSrc} focal={{ x:srvData.includesFocalX??0.5, y:srvData.includesFocalY??0.4 }}
            acceptVideo={true} soundEnabled={false}
            previewAspect={16/9} previewLabel="Fondo de sección (panorámico)"
            onComplete={(url,fp,type)=>{ set('includesMediaSrc',url); set('includesFocalX',fp.x); set('includesFocalY',fp.y); set('includesMediaType',type||'image'); }}/>
        </fieldset>

      </div>

      {/* Modal includes */}
      <EditModal
        open={!!inclModal}
        title={inclModal?.index === null ? 'Agregar elemento' : 'Editar elemento incluido'}
        onSave={saveIncl}
        onCancel={() => setInclModal(null)}
      >
        {inclModal && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
              <div>
                {lbl('Ícono')}
                <input type="text" value={inclModal.form.icon||''} onChange={e=>setInclField('icon',e.target.value)}
                       className="admin-input" style={{ width:60, textAlign:'center', fontSize:'1.4rem', padding:'0.35rem' }} placeholder="✅"/>
              </div>
              <div style={{ flex:1 }}>
                {lbl('Título')}
                <input type="text" value={inclModal.form.title||''} onChange={e=>setInclField('title',e.target.value)}
                       className="admin-input" placeholder="Ej: Animadores profesionales"/>
              </div>
            </div>
            <div>
              {lbl('Descripción')}
              <textarea rows={3} value={inclModal.form.desc||''} onChange={e=>setInclField('desc',e.target.value)}
                        className="admin-input" style={{ resize:'vertical' }} placeholder="Descripción del elemento..."/>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'0.75rem 1rem', background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0' }}>
              <span style={{ fontSize:'0.84rem', color:'#475569', flex:1 }}>Visible en la web</span>
              <button type="button" onClick={() => setInclField('visible', inclModal.form.visible === false)}
                      style={{ width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', position:'relative',
                                background: inclModal.form.visible !== false ? '#10b981' : '#e2e8f0', transition:'background .2s' }}>
                <div style={{ width:20, height:20, borderRadius:10, background:'#fff', position:'absolute', top:2,
                               left: inclModal.form.visible !== false ? 22 : 2, transition:'left .2s' }}/>
              </button>
            </div>
          </div>
        )}
      </EditModal>

      {/* Modal stats */}
      <EditModal
        open={!!statModal}
        title={statModal?.index === null ? 'Agregar estadística' : 'Editar estadística'}
        onSave={saveStat}
        onCancel={() => setStatModal(null)}
      >
        {statModal && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              {lbl('Valor')}
              <input type="text" value={statModal.form.value||''} onChange={e=>setStatField('value',e.target.value)}
                     className="admin-input" placeholder="+80"/>
            </div>
            <div>
              {lbl('Etiqueta')}
              <input type="text" value={statModal.form.label||''} onChange={e=>setStatField('label',e.target.value)}
                     className="admin-input" placeholder="Bodas decoradas"/>
            </div>
          </div>
        )}
      </EditModal>

      {/* Modal opciones */}
      <EditModal
        open={!!opcModal}
        title={opcModal?.index === null ? 'Agregar opción' : 'Editar opción'}
        onSave={saveOpc}
        onCancel={() => setOpcModal(null)}
      >
        {opcModal && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
              <div>
                {lbl('Ícono')}
                <input type="text" value={opcModal.form.icon||''} onChange={e=>setOpcField('icon',e.target.value)}
                       className="admin-input" style={{ width:60, textAlign:'center', fontSize:'1.4rem', padding:'0.35rem' }} placeholder="✨"/>
              </div>
              <div style={{ flex:1 }}>
                {lbl('Título')}
                <input type="text" value={opcModal.form.title||''} onChange={e=>setOpcField('title',e.target.value)}
                       className="admin-input" placeholder="Ej: Princesas y Fantasía"/>
              </div>
            </div>
            <div>
              {lbl('Descripción')}
              <textarea rows={3} value={opcModal.form.desc||''} onChange={e=>setOpcField('desc',e.target.value)}
                        className="admin-input" style={{ resize:'vertical' }} placeholder="Descripción breve de la opción..."/>
            </div>
          </div>
        )}
      </EditModal>

      {/* Modal pasos */}
      <EditModal
        open={!!pasoModal}
        title={pasoModal?.index === null ? 'Agregar paso' : 'Editar paso'}
        onSave={savePaso}
        onCancel={() => setPasoModal(null)}
      >
        {pasoModal && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              {lbl('Título')}
              <input type="text" value={pasoModal.form.title||''} onChange={e=>setPasoField('title',e.target.value)}
                     className="admin-input" placeholder="Ej: Consulta Inicial"/>
            </div>
            <div>
              {lbl('Descripción')}
              <textarea rows={3} value={pasoModal.form.desc||''} onChange={e=>setPasoField('desc',e.target.value)}
                        className="admin-input" style={{ resize:'vertical' }} placeholder="Descripción breve del paso..."/>
            </div>
          </div>
        )}
      </EditModal>
    </div>
  );
}
