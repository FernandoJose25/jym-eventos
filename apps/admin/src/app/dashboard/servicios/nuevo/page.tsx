'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
import ImageUploader from '@/components/ui/ImageUploader';
import IconPicker from '@/components/ui/IconPicker';
import Link from 'next/link';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import { authHeaders } from '@/lib/get-token';
import { SERVICE_ICONS, isIconKey } from '@/lib/serviceIcons';

export default function NuevoServicioPage() {
  const router     = useRouter();
  const [saving,     setSaving]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiDetail,   setAiDetail]   = useState<any>(null);
  const [form,       setForm]       = useState({
    title:     '',
    slug:      '',
    icon:      'party',
    desc:      '',
    order:     10,
    mediaSrc:   '',
    mediaType:  'image',
    mediaSound: false,
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleGenerate = async () => {
    if (!form.title.trim()) { toast.error('Escribe el nombre del servicio primero'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-servicio', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ nombre: form.title.trim() }),
      });
      const ai = await res.json();
      if (ai.error) throw new Error(ai.error);

      set('desc', ai.descripcion || '');
      setAiDetail({
        hero_desc:  ai.descripcion  || '',
        longDescH2: ai.detalleH2   || '',
        longDesc:   ai.parrafo1    || '',
        longDesc2:  ai.parrafo2    || '',
        includes: (ai.cards || []).map((c: any) => ({
          icon: c.icono, title: c.titulo, desc: c.descripcion, visible: true,
        })),
        ctaH2: ai.ctaH2          || '',
        ctaP:  ai.ctaDescripcion  || '',
        btn1Text: `Cotizar ${form.title.trim()}`,
      });
      toast.success('✨ Contenido generado. Revisa y guarda.');
    } catch (e: any) {
      toast.error(`Error generando: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('El nombre del servicio es requerido'); return; }
    setSaving(true);
    try {
      const slug    = form.slug?.trim() || slugify(form.title);
      const link    = `servicios/${slug}.html`;
      const docId   = slug;
      await setDoc(doc(db, COL.SERVICIOS, docId), {
        title:     form.title.trim(),
        icon:      form.icon,
        desc:      form.desc,
        link,
        order:     Number(form.order) || 10,
        visible:   true,
        mediaSrc:   form.mediaSrc,
        mediaType:  form.mediaType,
        mediaSound: form.mediaSound,
        ...(aiDetail ? { detail: aiDetail } : {}),
        createdAt: new Date().toISOString(),
      });
      toast.success(`Servicio "${form.title}" creado correctamente`);
      router.push('/dashboard/servicios');
    } catch (e: any) {
      toast.error(`Error: ${e?.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth:700, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Link href="/dashboard/servicios"
                style={{ color:'#64748b', textDecoration:'none', display:'flex', alignItems:'center', gap:4, fontSize:'0.82rem' }}>
            <ArrowLeft size={14}/> Servicios
          </Link>
          <span style={{ color:'#cbd5e1' }}>/</span>
          <h1 style={{ fontFamily:'var(--font-playfair)', fontSize:'1.3rem', fontWeight:700, color:'#0a1628', margin:0 }}>
            Nuevo Servicio
          </h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary"
                style={{ display:'flex', alignItems:'center', gap:8, opacity:saving?.6:1 }}>
          <Save size={15}/> {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <div className="admin-card" style={{ padding:'1.75rem', display:'flex', flexDirection:'column', gap:24 }}>

        {/* Nombre */}
        <div>
          <label style={{ fontSize:'0.82rem', fontWeight:700, color:'#334155', display:'block', marginBottom:8 }}>
            Nombre del servicio *
          </label>
          <div style={{ display:'flex', gap:8 }}>
            <input type="text" value={form.title} onChange={e=>set('title',e.target.value)}
                   placeholder="Ej: Shows Infantiles, Hora Loca, Catering…" className="admin-input" style={{ flex:1, fontSize:'0.95rem', padding:'0.7rem 0.9rem' }}/>
            <button type="button" onClick={handleGenerate} disabled={generating || !form.title.trim()}
                    title="Generar contenido completo con IA"
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'0 1rem', background: aiDetail ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:'0.85rem', cursor:'pointer', whiteSpace:'nowrap', opacity:(generating || !form.title.trim()) ? 0.5 : 1, flexShrink:0 }}>
              <Sparkles size={14}/> {generating ? 'Generando…' : aiDetail ? '✓ Generado' : 'IA'}
            </button>
          </div>
          {aiDetail && (
            <p style={{ fontSize:'0.8rem', color:'#059669', marginTop:8, display:'flex', alignItems:'center', gap:4 }}>
              ✨ Contenido de IA listo — se guardará junto con el servicio
            </p>
          )}
        </div>

        {/* URL pública */}
        <div>
          <label style={{ fontSize:'0.82rem', fontWeight:700, color:'#334155', display:'block', marginBottom:8 }}>
            URL pública
          </label>
          <div style={{ display:'flex', alignItems:'center', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden' }}>
            <span style={{ padding:'0.7rem 0.9rem', background:'#f1f5f9', color:'#64748b', fontSize:'0.88rem', borderRight:'1px solid #e2e8f0', whiteSpace:'nowrap', flexShrink:0 }}>
              /servicios/
            </span>
            <input
              type="text"
              value={form.slug}
              onChange={e=>set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-'))}
              className="admin-input"
              style={{ border:'none', borderRadius:0, background:'transparent', flex:1, fontSize:'0.95rem', padding:'0.7rem 0.9rem' }}
              placeholder={form.title ? slugify(form.title) : 'bm-vogue'}
            />
          </div>
          <p style={{ fontSize:'0.78rem', color:'#94a3b8', marginTop:6 }}>
            Se genera del nombre si se deja vacío · URL final: <strong style={{ color:'#475569' }}>/servicios/{form.slug || (form.title ? slugify(form.title) : '…')}</strong>
          </p>
        </div>

        <div className="cfg-3col" style={{ gap:18 }}>
          {/* Ícono */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize:'0.82rem', fontWeight:700, color:'#334155', display:'block', marginBottom:8 }}>
              Ícono
            </label>
            <IconPicker value={form.icon} onChange={v=>set('icon',v)} />
          </div>
          {/* Orden + Preview */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div>
              <label style={{ fontSize:'0.82rem', fontWeight:700, color:'#334155', display:'block', marginBottom:8 }}>
                Orden en navbar
              </label>
              <input type="number" value={form.order} onChange={e=>set('order',+e.target.value)} className="admin-input" style={{ fontSize:'0.95rem', padding:'0.7rem 0.9rem' }}/>
            </div>
            <div>
              <label style={{ fontSize:'0.82rem', fontWeight:700, color:'#334155', display:'block', marginBottom:8 }}>
                Vista previa navbar
              </label>
              <div style={{ background:'#0a1628', borderRadius:8, padding:'0.7rem 1rem', display:'flex', alignItems:'center', gap:8 }}>
                {isIconKey(form.icon)
                  ? (() => { const Icon = SERVICE_ICONS[form.icon]; return <Icon size={18} color="#f5c842" />; })()
                  : <span style={{ fontSize:'1.2rem' }}>{form.icon||'🎉'}</span>}
                <span style={{ color:'#f5c842', fontSize:'0.88rem', fontWeight:600 }}>{form.title||'Nombre'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label style={{ fontSize:'0.82rem', fontWeight:700, color:'#334155', display:'block', marginBottom:8 }}>
            Descripción corta
          </label>
          <textarea rows={3} value={form.desc} onChange={e=>set('desc',e.target.value)}
                    placeholder="Breve descripción que aparece en la tarjeta de servicios…"
                    className="admin-input" style={{ resize:'vertical', fontSize:'0.95rem', padding:'0.7rem 0.9rem', lineHeight:1.5 }}/>
        </div>

        {/* Media */}
        <ImageUploader
          label="Imagen o Video de portada (máx 200MB)"
          folder="servicios"
          acceptVideo={true}
          soundEnabled={form.mediaSound}
          onSound={v=>set('mediaSound',v)}
          previewAspect={4/3} previewLabel="Tarjeta de servicio (paisaje)"
          onComplete={(url, _fp, type) => { set('mediaSrc', url); set('mediaType', type||'image'); }}
        />

        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'0.875rem 1rem' }}>
          <p style={{ fontSize:'0.82rem', color:'#166534', margin:0, lineHeight:1.55 }}>
            💡 El servicio aparece en el navbar de inmediato. Para secciones avanzadas (galería, testimonios) edítalas después desde "Contenido del servicio".
          </p>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <Link href="/dashboard/servicios" className="btn-outline" style={{ textDecoration:'none' }}>Cancelar</Link>
          <button onClick={handleSave} disabled={saving} className="btn-gold" style={{ opacity:saving?.6:1 }}>
            <Save size={15}/> {saving ? 'Guardando…' : '✅ Crear Servicio'}
          </button>
        </div>
      </div>
    </div>
  );
}
