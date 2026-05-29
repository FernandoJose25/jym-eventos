'use client';
import { useState, useEffect } from 'react';
import { useRouter }           from 'next/navigation';
import { useAuth }             from '@/hooks/useAuth';

type Stage = 'form' | 'loading' | 'success';

export default function LoginPage() {
  const router  = useRouter();
  const { signIn, user, loading } = useAuth();
  const [stage,  setStage]  = useState<Stage>('form');
  const [email,  setEmail]  = useState('');
  const [pass,   setPass]   = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pass) { setError('Completa todos los campos'); return; }
    setError(''); setStage('loading');
    try {
      await signIn(email, pass);
      setStage('success');
      setTimeout(() => router.push('/dashboard'), 900);
    } catch {
      setStage('form');
      setError('Correo o contraseña incorrectos');
    }
  };

  if (loading) return null;

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
                   position:'relative', overflow:'hidden', padding:16,
                   background:'linear-gradient(135deg,#050d1a 0%,#0a1628 30%,#1e3a5f 65%,#d4a017 100%)' }}>

      {/* Rings */}
      {[700,480,280].map(s=>(
        <div key={s} style={{ position:'absolute', borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)',
                               width:s, height:s, top:'50%', left:'50%', transform:'translate(-50%,-50%)',
                               pointerEvents:'none', animation:'ring 4s ease-in-out infinite' }}/>
      ))}

      <div style={{ position:'relative', zIndex:10, width:'100%', maxWidth:420,
                     animation:'cardIn .6s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{ background:'rgba(255,255,255,0.06)', backdropFilter:'blur(28px)',
                       border:'1px solid rgba(255,255,255,0.12)', borderRadius:28,
                       boxShadow:'0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
                       padding:'2.5rem 2rem 2rem' }}>

          {/* Logo */}
          <div style={{ textAlign:'center', marginBottom:'2rem' }}>
            <div style={{ width:56, height:56, borderRadius:16, margin:'0 auto 12px',
                           background:'linear-gradient(135deg,#1e3a5f,#d4a017)',
                           display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem',
                           boxShadow:'0 4px 16px rgba(30,58,95,0.4)' }}>🎪</div>
            <h2 style={{ fontFamily:'var(--font-playfair)', color:'#fff', fontSize:'1.35rem', fontWeight:700, margin:0 }}>
              J&M Eventos
            </h2>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.8rem', marginTop:4 }}>
              Panel Administrativo
            </p>
          </div>

          {stage === 'success' ? (
            <div style={{ textAlign:'center', padding:'1rem 0' }}>
              <div style={{ fontSize:'3rem', marginBottom:12 }}>✅</div>
              <p style={{ color:'#fff', fontWeight:600 }}>¡Acceso concedido!</p>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.85rem' }}>Redirigiendo...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase',
                                  letterSpacing:'.1em', color:'rgba(255,255,255,0.5)', marginBottom:6 }}>
                  Correo
                </label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                       placeholder="tu@correo.com" autoComplete="email"
                       style={{ width:'100%', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.12)',
                                 borderRadius:12, color:'#fff', fontSize:'0.9rem', padding:'0.7rem 1rem',
                                 outline:'none', fontFamily:'var(--font-jakarta)', boxSizing:'border-box' }}
                       onFocus={e=>{e.target.style.borderColor='#d4a017';e.target.style.boxShadow='0 0 0 3px rgba(212,160,23,0.2)';}}
                       onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.12)';e.target.style.boxShadow='none';}}/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase',
                                  letterSpacing:'.1em', color:'rgba(255,255,255,0.5)', marginBottom:6 }}>
                  Contraseña
                </label>
                <div style={{ position:'relative' }}>
                  <input type={showPw?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)}
                         placeholder="••••••••" autoComplete="current-password"
                         style={{ width:'100%', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.12)',
                                   borderRadius:12, color:'#fff', fontSize:'0.9rem', padding:'0.7rem 2.75rem 0.7rem 1rem',
                                   outline:'none', fontFamily:'var(--font-jakarta)', boxSizing:'border-box' }}
                         onFocus={e=>{e.target.style.borderColor='#d4a017';e.target.style.boxShadow='0 0 0 3px rgba(212,160,23,0.2)';}}
                         onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.12)';e.target.style.boxShadow='none';}}/>
                  <button type="button" onClick={()=>setShowPw(v=>!v)}
                          style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                                    background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', fontSize:'1rem' }}>
                    {showPw?'🙈':'👁️'}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.35)',
                               borderRadius:10, padding:'0.6rem 0.875rem', color:'#fca5a5', fontSize:'0.82rem' }}>
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" disabled={stage==='loading'}
                      style={{ width:'100%', padding:'0.875rem', border:'none', borderRadius:14, cursor:'pointer',
                                fontSize:'0.95rem', fontWeight:700, fontFamily:'var(--font-jakarta)',
                                background:'linear-gradient(135deg,#1e3a5f 0%,#2563eb 50%,#d4a017 100%)',
                                color:'#fff', boxShadow:'0 4px 20px rgba(30,58,95,0.45)',
                                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                                opacity:stage==='loading'?.7:1 }}>
                {stage==='loading'
                  ? <span style={{ width:18, height:18, border:'2px solid rgba(255,255,255,0.3)',
                                    borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite',
                                    display:'inline-block' }}/>
                  : 'Ingresar al Panel'}
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        input::placeholder{color:rgba(255,255,255,0.25)}
        @keyframes ring{0%,100%{opacity:.06}50%{opacity:.18}}
        @keyframes cardIn{from{opacity:0;transform:translateY(28px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
