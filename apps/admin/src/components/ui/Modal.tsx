'use client';
import {
  useState, useEffect, createContext, useContext,
  useCallback, type ReactNode,
} from 'react';
import { createPortal }         from 'react-dom';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db }                   from '@/lib/firebase';

type ModalType = 'confirm'|'hide'|'show'|'delete'|'success'|'error'|'info'|'warning';

interface ModalCfg {
  type:         ModalType;
  title:        string;
  description?: string;
  collection?:  string;
  docId?:       string;
  field?:       string;        // campo a actualizar — default 'visible'
  onConfirm?:   () => Promise<void>|void;
  onCancel?:    () => void;
}

const ModalCtx = createContext<{ open:(c:ModalCfg)=>void; close:()=>void }>({
  open:()=>{}, close:()=>{},
});

export function ModalProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<ModalCfg|null>(null);
  const open  = useCallback((c: ModalCfg) => setCfg(c), []);
  const close = useCallback(() => setCfg(null), []);
  return (
    <ModalCtx.Provider value={{ open, close }}>
      {children}
      {cfg && typeof window !== 'undefined' &&
        createPortal(<ModalRenderer cfg={cfg} onClose={close}/>, document.body)}
    </ModalCtx.Provider>
  );
}

export const useModal = () => useContext(ModalCtx);

const META: Record<ModalType,{ icon:string; btnLabel:string; btnBg:string; btnColor:string }> = {
  confirm: { icon:'❓', btnLabel:'Confirmar',  btnBg:'#1e3a5f', btnColor:'#fff' },
  hide:    { icon:'👁️', btnLabel:'Ocultar',    btnBg:'#d4a017', btnColor:'#0a1628' },
  show:    { icon:'✅', btnLabel:'Mostrar',    btnBg:'#10b981', btnColor:'#fff' },
  delete:  { icon:'🗑️', btnLabel:'Eliminar',   btnBg:'#ef4444', btnColor:'#fff' },
  success: { icon:'✅', btnLabel:'Entendido',  btnBg:'#10b981', btnColor:'#fff' },
  error:   { icon:'❌', btnLabel:'Cerrar',     btnBg:'#64748b', btnColor:'#fff' },
  info:    { icon:'ℹ️', btnLabel:'Entendido',  btnBg:'#1e3a5f', btnColor:'#fff' },
  warning: { icon:'⚠️', btnLabel:'Entendido',  btnBg:'#f59e0b', btnColor:'#0a1628' },
};

function ModalRenderer({ cfg, onClose }: { cfg: ModalCfg; onClose: ()=>void }) {
  const [loading,   setLoading]   = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const meta = META[cfg.type];

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key==='Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleMain = async () => {
    // Toggle visible (hide/show)
    if (cfg.type === 'hide' || cfg.type === 'show') {
      if (!cfg.collection || !cfg.docId) { onClose(); return; }
      setLoading(true);
      try {
        const field = cfg.field || 'visible';
        await updateDoc(doc(db, cfg.collection, cfg.docId), {
          [field]: cfg.type === 'show',
        });
      } catch(e) { console.error(e); }
      setLoading(false);
      onClose();
      return;
    }

    // Delete con doble confirmación
    if (cfg.type === 'delete') {
      if (!confirmed) { setConfirmed(true); return; }
      if (!cfg.onConfirm) { onClose(); return; }
      setLoading(true);
      try { await cfg.onConfirm(); onClose(); }
      catch { setLoading(false); }
      return;
    }

    // Otros (confirm, info, etc.)
    if (!cfg.onConfirm) { onClose(); return; }
    setLoading(true);
    try { await cfg.onConfirm(); onClose(); }
    catch { setLoading(false); }
  };

  const showCancel = !['success','error','info'].includes(cfg.type);

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:9999, display:'flex',
               alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position:'absolute', inset:0, background:'rgba(10,22,40,0.6)', backdropFilter:'blur(6px)' }}/>
      <div style={{
        position:'relative', background:'#fff', borderRadius:24,
        maxWidth:420, width:'100%', overflow:'hidden',
        boxShadow:'0 32px 64px rgba(10,22,40,0.25)',
        animation:'cardIn .35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{ height:4, background:`linear-gradient(90deg,${meta.btnBg},${meta.btnBg}88)` }}/>
        <div style={{ padding:'1.75rem 1.75rem 1.5rem' }}>
          <div style={{ width:56, height:56, borderRadius:16, margin:'0 auto 1rem',
                         background:`${meta.btnBg}15`, display:'flex', alignItems:'center',
                         justifyContent:'center', fontSize:'1.75rem' }}>
            {meta.icon}
          </div>
          <h3 style={{ fontFamily:'var(--font-playfair)', textAlign:'center', fontSize:'1.1rem',
                        fontWeight:700, color:'#0a1628', margin:'0 0 0.5rem' }}>
            {cfg.title}
          </h3>
          {cfg.description && (
            <p style={{ textAlign:'center', fontSize:'0.85rem', color:'#64748b',
                         lineHeight:1.6, margin:'0 0 1rem' }}>
              {cfg.description}
            </p>
          )}

          {cfg.type==='hide' && (
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10,
                           padding:'0.75rem 1rem', marginBottom:'1rem' }}>
              <p style={{ fontSize:'0.78rem', color:'#92400e', margin:0, lineHeight:1.5 }}>
                💡 El contenido <strong>no se elimina</strong>. Puedes volver a mostrarlo cuando quieras.
              </p>
            </div>
          )}

          {cfg.type==='delete' && !confirmed && (
            <div style={{ background:'#fff1f2', border:'1px solid #fecaca', borderRadius:10,
                           padding:'0.75rem 1rem', marginBottom:'1rem' }}>
              <p style={{ fontSize:'0.78rem', color:'#9f1239', margin:0 }}>
                ⚠️ Esta acción <strong>no se puede deshacer</strong>.
              </p>
            </div>
          )}
          {cfg.type==='delete' && confirmed && (
            <div style={{ background:'#fef2f2', border:'2px solid #ef4444', borderRadius:10,
                           padding:'0.75rem 1rem', marginBottom:'1rem' }}>
              <p style={{ fontSize:'0.82rem', color:'#991b1b', fontWeight:700, textAlign:'center', margin:0 }}>
                ¿CONFIRMAS la eliminación definitiva?
              </p>
            </div>
          )}

          <div style={{ display:'flex', gap:10 }}>
            {showCancel && (
              <button
                onClick={()=>{ cfg.onCancel?.(); onClose(); }}
                style={{ flex:1, padding:'0.75rem', border:'1px solid #e2e8f0', borderRadius:12,
                          background:'#fff', color:'#64748b', fontSize:'0.85rem', fontWeight:600,
                          cursor:'pointer', fontFamily:'var(--font-jakarta)' }}
              >
                Cancelar
              </button>
            )}
            <button
              onClick={handleMain}
              disabled={loading}
              style={{ flex:1, padding:'0.75rem', border:'none', borderRadius:12, cursor:'pointer',
                        background:meta.btnBg, color:meta.btnColor, fontSize:'0.85rem', fontWeight:700,
                        fontFamily:'var(--font-jakarta)', display:'flex', alignItems:'center',
                        justifyContent:'center', gap:8, opacity:loading?.7:1 }}
            >
              {loading
                ? <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.35)',
                                  borderTopColor:meta.btnColor==='#fff'?'#fff':'#0a1628',
                                  borderRadius:'50%', animation:'spin .7s linear infinite',
                                  display:'inline-block' }}/>
                : cfg.type==='hide'   ? '🙈 Ocultar en la web'
                : cfg.type==='show'   ? '👁️ Mostrar en la web'
                : cfg.type==='delete' && confirmed ? '⚠️ Sí, eliminar definitivamente'
                : meta.btnLabel
              }
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes cardIn{from{opacity:0;transform:scale(0.93) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
