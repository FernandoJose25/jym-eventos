'use client';
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import { toast } from 'sonner';

const DEFAULTS = {
  primary:       '#1e3a5f',
  primaryLight:  '#2563eb',
  secondary:     '#d4a017',
  secondaryLight:'#f5c842',
  secondaryDark: '#b8860b',
  dark:          '#0a1628',
  light:         '#f0f4f8',
  text:          '#1a2332',
  surface:       '#ffffff',
  border:        '#e2e8f0',
};

function ColorRow({ label, k, value, hint, onChange }: any) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'0.75rem 0',
                   borderBottom:'1px solid #f1f5f9' }}>
      <div style={{ flex:1 }}>
        <p style={{ fontWeight:600, fontSize:'0.88rem', color:'#0a1628', margin:0 }}>{label}</p>
        {hint && <p style={{ fontSize:'0.72rem', color:'#94a3b8', margin:'2px 0 0' }}>{hint}</p>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <label style={{ position:'relative', cursor:'pointer' }}>
          <div style={{ width:38, height:38, borderRadius:10, background:value||'#000',
                         border:'2px solid #fff', boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
                         transition:'transform .15s' }}
               onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='scale(1.1)'}
               onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform='scale(1)'}/>
          <input type="color" value={value||'#000000'}
                 onChange={e=>onChange(k,e.target.value)}
                 style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}/>
        </label>
        <input type="text" value={value||''}
               onChange={e=>{ if(/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(k,e.target.value); }}
               style={{ width:90, fontFamily:'var(--font-mono)', fontSize:'0.82rem',
                         border:'1px solid #e2e8f0', borderRadius:8, padding:'0.4rem 0.5rem', color:'#1a2332' }}/>
      </div>
    </div>
  );
}

export default function DisenoPage() {
  const [colors,     setColors]     = useState<Record<string,string>>(DEFAULTS);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    getDoc(doc(db, COL.CONFIGURACION, 'estilos')).then(snap => {
      if (snap.exists() && snap.data()?.colors) {
        setColors({ ...DEFAULTS, ...snap.data().colors });
      }
      setLoading(false);
    });
  }, []);

  const updateColor = (k: string, v: string) => {
    setColors(p => ({ ...p, [k]: v }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await setDoc(doc(db, COL.CONFIGURACION, 'estilos'), { colors }, { merge:true });
    setHasChanges(false);
    setSaving(false);
    toast.success('✅ Colores guardados. Los cambios ya están en la web.');
  };

  const handleReset = () => {
    if (!confirm('¿Restablecer los colores a los valores originales?')) return;
    setColors(DEFAULTS);
    setHasChanges(true);
    toast.info('Colores restablecidos. Guarda para aplicar.');
  };

  if (loading) return <div className="skeleton" style={{ height:400, borderRadius:16 }}/>;

  return (
    <div style={{ maxWidth:760, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-playfair)', fontSize:'1.5rem', fontWeight:700, color:'#0a1628', margin:0 }}>Diseño del sitio</h1>
          <p style={{ color:'#64748b', fontSize:'0.82rem', marginTop:4 }}>Cambia los colores de la web pública</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={handleReset} className="btn-outline">Restablecer</button>
          <button onClick={handleSave} disabled={saving||!hasChanges} className="btn-primary"
                  style={{ opacity:saving||!hasChanges?.5:1 }}>
            {saving ? 'Guardando…' : `${hasChanges?'● ':''}Guardar colores`}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12,
                       padding:'0.75rem 1rem', marginBottom:16, display:'flex', gap:8 }}>
          <span>⚠️</span>
          <span style={{ fontSize:'0.82rem', color:'#92400e' }}>Cambios sin guardar. Guarda para que se apliquen en la web.</span>
        </div>
      )}

      <div className="admin-card" style={{ padding:'1.5rem' }}>
        {/* Preview en tiempo real */}
        <div style={{ marginBottom:'1.5rem', padding:'1.25rem', borderRadius:12,
                       background:colors.dark, border:'1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 10px' }}>
            Vista previa en tiempo real
          </p>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:`linear-gradient(135deg,${colors.secondaryDark},${colors.secondaryLight})`,
                           display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem' }}>🎉</div>
            <span style={{ color:'#fff', fontFamily:'var(--font-playfair)', fontWeight:700, fontSize:'1rem' }}>J&M Eventos</span>
            <div style={{ flex:1 }}/>
            <div style={{ padding:'0.4rem 1rem', borderRadius:9999, background:`linear-gradient(135deg,${colors.secondaryDark},${colors.secondaryLight})`,
                           color:colors.dark, fontSize:'0.8rem', fontWeight:700 }}>Cotizar</div>
          </div>
          <div style={{ marginTop:12, display:'flex', gap:8 }}>
            <div style={{ height:32, borderRadius:8, background:colors.primary, flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'0.78rem', fontWeight:600 }}>Botón primario</div>
            <div style={{ height:32, borderRadius:8, background:`linear-gradient(135deg,${colors.secondaryDark},${colors.secondaryLight})`, flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:colors.dark, fontSize:'0.78rem', fontWeight:700 }}>Botón dorado</div>
          </div>
        </div>

        <h3 style={{ fontSize:'0.8rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 4px' }}>
          Azul metálico — Color principal
        </h3>
        <ColorRow label="Primario" k="primary" value={colors.primary} hint="Botones, sidebar, elementos clave" onChange={updateColor}/>
        <ColorRow label="Primario claro (hover)" k="primaryLight" value={colors.primaryLight} hint="Hover de botones y links" onChange={updateColor}/>
        <ColorRow label="Fondo oscuro (navbar/hero)" k="dark" value={colors.dark} hint="Hero, navbar, footer" onChange={updateColor}/>

        <h3 style={{ fontSize:'0.8rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.08em', margin:'20px 0 4px' }}>
          Dorado — Color secundario
        </h3>
        <ColorRow label="Dorado" k="secondary" value={colors.secondary} hint="CTA principal, highlights" onChange={updateColor}/>
        <ColorRow label="Dorado brillante" k="secondaryLight" value={colors.secondaryLight} hint="Hover, textos em en títulos" onChange={updateColor}/>
        <ColorRow label="Dorado oscuro" k="secondaryDark" value={colors.secondaryDark} hint="Gradiente del botón Cotizar" onChange={updateColor}/>

        <h3 style={{ fontSize:'0.8rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.08em', margin:'20px 0 4px' }}>
          Neutros
        </h3>
        <ColorRow label="Fondo claro" k="light" value={colors.light} onChange={updateColor}/>
        <ColorRow label="Texto principal" k="text" value={colors.text} onChange={updateColor}/>
        <ColorRow label="Superficies (cards)" k="surface" value={colors.surface} onChange={updateColor}/>
        <ColorRow label="Bordes" k="border" value={colors.border} onChange={updateColor}/>

        {/* Paleta de swatches */}
        <div style={{ marginTop:20, padding:'1rem', background:'#f8fafc', borderRadius:12 }}>
          <p style={{ fontSize:'0.72rem', color:'#94a3b8', marginBottom:10 }}>Tu paleta completa:</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {Object.entries(colors).map(([k,v]) => (
              <div key={k} style={{ textAlign:'center' }}>
                <div style={{ width:36, height:36, borderRadius:8, background:v, border:'2px solid #fff',
                               boxShadow:'0 1px 4px rgba(0,0,0,0.1)' }}/>
                <p style={{ fontSize:'0.58rem', color:'#94a3b8', marginTop:3 }}>{k}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
