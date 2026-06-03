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
                   background:'#0d0d0d' }}>

      {stage === 'success' ? (
        <form className="uv-form">
          <p id="uv-heading" style={{ textAlign:'center', color:'#fff' }}>✅ ¡Acceso concedido!</p>
          <p style={{ textAlign:'center', color:'rgba(255,255,255,0.5)', fontSize:'0.85rem' }}>Redirigiendo...</p>
        </form>
      ) : (
        <form className="uv-form" onSubmit={handleSubmit}>
          <p id="uv-heading">Login</p>

          <div className="uv-field">
            <svg className="uv-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914z"/>
            </svg>
            <input
              autoComplete="email"
              placeholder="Correo electrónico"
              className="uv-input-field"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="uv-field">
            <svg className="uv-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            </svg>
            <input
              placeholder="Contraseña"
              className="uv-input-field"
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.35)',
                           borderRadius:10, padding:'0.5rem 0.875rem', color:'#fca5a5', fontSize:'0.82rem',
                           textAlign:'center' }}>
              ⚠️ {error}
            </div>
          )}

          <div className="uv-btn">
            <button type="submit" className="uv-button1" disabled={stage === 'loading'}>
              {stage === 'loading'
                ? <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)',
                                  borderTopColor:'#fff', borderRadius:'50%', animation:'uv-spin .7s linear infinite',
                                  display:'inline-block' }}/>
                : 'Login'}
            </button>
          </div>
        </form>
      )}

      <style>{`
        .uv-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-left: 2em;
          padding-right: 2em;
          padding-bottom: 0.4em;
          background-color: #171717;
          border-radius: 25px;
          transition: .4s ease-in-out;
          min-width: 280px;
        }
        .uv-form:hover {
          transform: scale(1.05);
          border: 1px solid black;
        }
        #uv-heading {
          text-align: center;
          margin: 2em;
          color: rgb(255, 255, 255);
          font-size: 1.2em;
        }
        .uv-field {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5em;
          border-radius: 25px;
          padding: 0.6em;
          border: none;
          outline: none;
          color: white;
          background-color: #171717;
          box-shadow: inset 2px 5px 10px rgb(5, 5, 5);
        }
        .uv-input-icon {
          height: 1.3em;
          width: 1.3em;
          fill: white;
          flex-shrink: 0;
        }
        .uv-input-field {
          background: none;
          border: none;
          outline: none;
          width: 100%;
          color: #d3d3d3;
          font-family: inherit;
        }
        .uv-input-field::placeholder {
          color: rgba(255,255,255,0.3);
        }
        .uv-btn {
          display: flex;
          justify-content: center;
          flex-direction: row;
          margin-top: 2.5em;
          margin-bottom: 3em;
        }
        .uv-button1 {
          padding: 0.5em 2em;
          border-radius: 5px;
          border: none;
          outline: none;
          transition: .4s ease-in-out;
          background-color: #252525;
          color: white;
          cursor: pointer;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 120px;
          min-height: 36px;
        }
        .uv-button1:hover {
          background-color: black;
          color: white;
        }
        .uv-button1:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        @keyframes uv-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
