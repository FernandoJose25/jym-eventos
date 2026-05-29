'use client';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth, COL } from '@/lib/firebase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Plus } from 'lucide-react';
import type { Usuario, RolUsuario } from '@/types';

const ROL_DESC: Record<RolUsuario,{ label:string; desc:string; bg:string; color:string }> = {
  admin:  { label:'Admin',  desc:'Acceso total', bg:'#f5f3ff', color:'#7c3aed' },
  editor: { label:'Editor', desc:'Edita contenido', bg:'#eff6ff', color:'#1e40af' },
  lector: { label:'Lector', desc:'Solo lectura', bg:'#f8fafc', color:'#475569' },
};

export default function UsuariosPage() {
  const { profile:me, isAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [adding,   setAdding]   = useState(false);
  const [newUser,  setNewUser]  = useState({ email:'', nombre:'', rol:'editor' as RolUsuario, pass:'' });
  const [saving,   setSaving]   = useState(false);

  useEffect(() => onSnapshot(collection(db, COL.USUARIOS),
    snap => { setUsuarios(snap.docs.map(d=>d.data()) as Usuario[]); setLoading(false); }
  ), []);

  const handleRolChange = async (uid: string, rol: RolUsuario) => {
    if (!isAdmin) { toast.error('Solo el admin puede cambiar roles'); return; }
    if (uid === me?.uid) { toast.error('No puedes cambiar tu propio rol'); return; }
    await updateDoc(doc(db, COL.USUARIOS, uid), { rol });
    toast.success('Rol actualizado');
  };

  const handleAdd = async () => {
    if (!newUser.email||!newUser.nombre||!newUser.pass) { toast.error('Completa todos los campos'); return; }
    setSaving(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, newUser.email, newUser.pass);
      await setDoc(doc(db, COL.USUARIOS, cred.user.uid), {
        uid: cred.user.uid, email:newUser.email, nombre:newUser.nombre,
        rol:newUser.rol, activo:true, creadoEn:new Date().toISOString(),
      });
      toast.success(`"${newUser.nombre}" creado correctamente`);
      setAdding(false);
      setNewUser({ email:'', nombre:'', rol:'editor', pass:'' });
    } catch(e:any) { toast.error(e?.message||'Error al crear usuario'); }
    finally { setSaving(false); }
  };

  if (!isAdmin) return (
    <div style={{ textAlign:'center', padding:'4rem' }}>
      <p style={{ fontSize:'3rem', marginBottom:12 }}>🔒</p>
      <p style={{ color:'#64748b' }}>Solo el administrador puede gestionar usuarios.</p>
    </div>
  );

  return (
    <div style={{ maxWidth:760, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-playfair)', fontSize:'1.5rem', fontWeight:700, color:'#0a1628', margin:0 }}>Usuarios</h1>
          <p style={{ color:'#64748b', fontSize:'0.82rem', marginTop:4 }}>{usuarios.length} usuario{usuarios.length!==1?'s':''}</p>
        </div>
        <button onClick={()=>setAdding(a=>!a)} className="btn-primary"><Plus size={16}/> Nuevo</button>
      </div>

      {adding && (
        <div className="admin-card" style={{ padding:'1.5rem', marginBottom:20 }}>
          <h3 style={{ fontSize:'0.9rem', fontWeight:700, color:'#0a1628', margin:'0 0 16px' }}>Nuevo usuario</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {[
              { label:'Nombre', key:'nombre', type:'text',     ph:'Ej: Ana García' },
              { label:'Correo', key:'email',  type:'email',    ph:'correo@ejemplo.com' },
              { label:'Contraseña (mín. 6)', key:'pass', type:'password', ph:'••••••' },
            ].map(({ label, key, type, ph }) => (
              <div key={key}>
                <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#64748b', display:'block', marginBottom:6 }}>{label}</label>
                <input type={type} value={(newUser as any)[key]} onChange={e=>setNewUser(p=>({...p,[key]:e.target.value}))} placeholder={ph} className="admin-input"/>
              </div>
            ))}
            <div>
              <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#64748b', display:'block', marginBottom:6 }}>Rol</label>
              <select value={newUser.rol} onChange={e=>setNewUser(p=>({...p,rol:e.target.value as RolUsuario}))} className="admin-input">
                <option value="editor">Editor</option>
                <option value="lector">Lector</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <button onClick={()=>setAdding(false)} className="btn-outline">Cancelar</button>
            <button onClick={handleAdd} disabled={saving} className="btn-gold" style={{ opacity:saving?.6:1 }}>
              {saving ? 'Creando…' : '✅ Crear usuario'}
            </button>
          </div>
        </div>
      )}

      <div className="admin-card" style={{ overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:10 }}>
            {[...Array(3)].map((_,i)=><div key={i} className="skeleton" style={{ height:64, borderRadius:8 }}/>)}
          </div>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Creado</th></tr></thead>
            <tbody>
              {usuarios.map(u => {
                const meta = ROL_DESC[u.rol];
                const isMe = u.uid === me?.uid;
                return (
                  <tr key={u.uid}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:'linear-gradient(135deg,#1e3a5f,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'0.9rem' }}>
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <p style={{ fontWeight:600, fontSize:'0.85rem', color:'#0a1628', margin:0 }}>
                          {u.nombre} {isMe && <span style={{ fontSize:'0.72rem', color:'#2563eb', fontWeight:500 }}>(tú)</span>}
                        </p>
                      </div>
                    </td>
                    <td><span style={{ fontSize:'0.82rem', color:'#475569' }}>{u.email}</span></td>
                    <td>
                      {isMe || !isAdmin ? (
                        <span className="badge" style={{ background:meta.bg, color:meta.color, border:`1px solid ${meta.color}30` }}>{meta.label}</span>
                      ) : (
                        <select value={u.rol} onChange={e=>handleRolChange(u.uid,e.target.value as RolUsuario)}
                                style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:'4px 8px', fontSize:'0.78rem', color:'#1a2332', background:'#fff', cursor:'pointer' }}>
                          <option value="admin">Administrador</option>
                          <option value="editor">Editor</option>
                          <option value="lector">Lector</option>
                        </select>
                      )}
                    </td>
                    <td><span style={{ fontSize:'0.75rem', color:'#94a3b8' }}>
                      {new Date(u.creadoEn).toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'2-digit'})}
                    </span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
