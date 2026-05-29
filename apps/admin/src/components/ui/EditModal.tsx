'use client';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';

interface EditModalProps {
  open: boolean;
  title: string;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  children?: ReactNode;
}

export default function EditModal({ open, title, onSave, onCancel, saving = false, children }: EditModalProps) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, onCancel]);

  if (!open || typeof window === 'undefined') return null;

  return createPortal(
    <div
      style={{ position:'fixed', inset:0, zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ position:'absolute', inset:0, background:'rgba(10,22,40,0.65)', backdropFilter:'blur(6px)' }}/>
      <div style={{
        position:'relative', background:'#fff', borderRadius:20, width:'100%', maxWidth:560,
        boxShadow:'0 32px 64px rgba(10,22,40,0.25)', animation:'emCardIn .3s ease',
        maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        <div style={{ height:3, background:'linear-gradient(90deg,#1e3a5f,#2563eb,#d4a017)' }}/>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.25rem 1.5rem', borderBottom:'1px solid #f1f5f9', flexShrink:0 }}>
          <h3 style={{ fontFamily:'var(--font-playfair)', fontWeight:700, fontSize:'1.05rem', color:'#0a1628', margin:0 }}>{title}</h3>
          <button onClick={onCancel} style={{ background:'rgba(100,116,139,.1)', border:'none', cursor:'pointer', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b' }}>
            <X size={16}/>
          </button>
        </div>
        <div style={{ padding:'1.5rem', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:14 }}>
          {children}
        </div>
        <div style={{ display:'flex', gap:10, padding:'1rem 1.5rem', borderTop:'1px solid #f1f5f9', flexShrink:0 }}>
          <button onClick={onCancel}
            style={{ flex:1, padding:'0.7rem', border:'1px solid #e2e8f0', borderRadius:12, background:'#fff', color:'#64748b', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-jakarta)' }}>
            Cancelar
          </button>
          <button onClick={onSave} disabled={saving}
            style={{ flex:1.5, padding:'0.7rem', border:'none', borderRadius:12, background:'linear-gradient(135deg,#1e3a5f,#2563eb)', color:'#fff', fontSize:'0.85rem', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-jakarta)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:saving?0.6:1 }}>
            {saving
              ? <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.35)', borderTopColor:'#fff', borderRadius:'50%', animation:'emSpin .7s linear infinite', display:'inline-block' }}/>
              : <Check size={16}/>
            }
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes emCardIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes emSpin{to{transform:rotate(360deg)}}
      `}</style>
    </div>,
    document.body
  );
}
