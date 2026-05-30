'use client';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth, COL } from '@/lib/firebase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Pencil, Check, X, KeyRound } from 'lucide-react';
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
  const [editingNombre, setEditingNombre] = useState<string|null>(null);
  const [editNombreVal, setEditNombreVal] = useState('');

  useEffect(() => onSnapshot(collection(db, COL.USUARIOS),
    snap => { setUsuarios(snap.docs.map(d=>d.data()) as Usuario[]); setLoading(false); }
  ), []);

  const handleRolChange = async (uid: string, rol: RolUsuario) => {
    if (!isAdmin) { toast.error('Solo el admin puede cambiar roles'); return; }
    if (uid === me?.uid) { toast.error('No puedes cambiar tu propio rol'); return; }
    await updateDoc(doc(db, COL.USUARIOS, uid), { rol });
    toast.success('Rol actualizado');
  };

  const handleToggleActivo = async (u: Usuario) => {
    if (u.uid === me?.uid) { toast.error('No puedes desactivarte a ti mismo'); return; }
    await updateDoc(doc(db, COL.USUARIOS, u.uid), { activo: !u.activo });
    toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado');
  };

  const startEditNombre = (u: Usuario) => {
    setEditingNombre(u.uid);
    setEditNombreVal(u.nombre);
  };

  const saveNombre = async (uid: string) => {
    if (!editNombreVal.trim()) { toast.error('El nombre no puede estar vacío'); return; }
    await updateDoc(doc(db, COL.USUARIOS, uid), { nombre: editNombreVal.trim() });
    toast.success('Nombre actualizado');
    setEditingNombre(null);
  };

  const [editingCreds, setEditingCreds] = useState(false);
  const [creds, setCreds] = useState({ currentPass:'', newEmail:'', newPass:'' });
  const [savingCreds, setSavingCreds] = useState(false);

  const handleSaveCreds = async () => {
    if (!creds.currentPass) { toast.error('Ingresa tu contraseña actual'); return; }
    if (!creds.newEmail && !creds.newPass) { toast.error('Ingresa un nuevo correo o contraseña'); return; }
    setSavingCreds(true);
    try {
      const user = auth.currentUser!;
      const credential = EmailAuthProvider.credential(user.email!, creds.currentPass);
      await reauthenticateWithCredential(user, credential);
      if (creds.newEmail && creds.newEmail !== user.email) {
        await updateEmail(user, creds.newEmail);
        await updateDoc(doc(db, COL.USUARIOS, user.uid), { email: creds.newEmail });
        toast.success('Correo actualizado');
      }
      if (creds.newPass) {
        await updatePassword(user, creds.newPass);
        toast.success('Contraseña actualizada');
      }
      setEditingCreds(false);
      setCreds({ currentPass:'', newEmail:'', newPass:'' });
    } catch(e:any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') toast.error('Contraseña actual incorrecta');
      else toast.error(e?.message || 'Error al actualizar');
    } finally { setSavingCreds(false); }
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
            <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Creado</th></tr></thead>
            <tbody>
              {usuarios.map(u => {
                const meta = ROL_DESC[u.rol];
                const isMe = u.uid === me?.uid;
                const isEditing = editingNombre === u.uid;
                return (
                  <tr key={u.uid} style={{ opacity: u.activo === false ? 0.5 : 1 }}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:'linear-gradient(135deg,#1e3a5f,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'0.9rem' }}>
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          {isEditing ? (
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <input
                                autoFocus
                                value={editNombreVal}
                                onChange={e=>setEditNombreVal(e.target.value)}
                                onKeyDown={e=>{ if(e.key==='Enter') saveNombre(u.uid); if(e.key==='Escape') setEditingNombre(null); }}
                                style={{ fontSize:'0.82rem', border:'1px solid #2563eb', borderRadius:6, padding:'2px 6px', width:130 }}
                              />
                              <button onClick={()=>saveNombre(u.uid)} style={{ background:'none', border:'none', cursor:'pointer', color:'#16a34a', padding:2 }}><Check size={14}/></button>
                              <button onClick={()=>setEditingNombre(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', padding:2 }}><X size={14}/></button>
                            </div>
                          ) : (
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <p style={{ fontWeight:600, fontSize:'0.85rem', color:'#0a1628', margin:0 }}>
                                {u.nombre} {isMe && <span style={{ fontSize:'0.72rem', color:'#2563eb', fontWeight:500 }}>(tú)</span>}
                              </p>
                              <button onClick={()=>startEditNombre(u)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:2 }} title="Editar nombre">
                                <Pencil size={12}/>
                              </button>
                              {isMe && (
                                <button onClick={()=>setEditingCreds(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:2 }} title="Cambiar correo / contraseña">
                                  <KeyRound size={12}/>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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
                    <td>
                      {isMe ? (
                        <span style={{ fontSize:'0.75rem', color:'#16a34a', fontWeight:600 }}>Activo</span>
                      ) : (
                        <button
                          onClick={()=>handleToggleActivo(u)}
                          style={{
                            fontSize:'0.72rem', fontWeight:700, padding:'3px 10px', borderRadius:9999, cursor:'pointer', border:'none',
                            background: u.activo !== false ? '#dcfce7' : '#fee2e2',
                            color:      u.activo !== false ? '#16a34a'  : '#dc2626',
                          }}
                        >
                          {u.activo !== false ? 'Activo' : 'Inactivo'}
                        </button>
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

      {/* Modal cambiar credenciales propias */}
      {editingCreds && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="admin-card" style={{ padding:'2rem', width:'100%', maxWidth:420, margin:'1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:'1rem', fontWeight:700, color:'#0a1628', margin:0 }}>Mis credenciales</h3>
              <button onClick={()=>{ setEditingCreds(false); setCreds({ currentPass:'', newEmail:'', newPass:'' }); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}><X size={18}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { label:'Contraseña actual *', key:'currentPass', type:'password', ph:'Tu contraseña actual' },
                { label:'Nuevo correo (opcional)', key:'newEmail', type:'email', ph: auth.currentUser?.email || '' },
                { label:'Nueva contraseña (opcional)', key:'newPass', type:'password', ph:'Mín. 6 caracteres' },
              ].map(({ label, key, type, ph }) => (
                <div key={key}>
                  <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#64748b', display:'block', marginBottom:6 }}>{label}</label>
                  <input type={type} value={(creds as any)[key]} onChange={e=>setCreds(p=>({...p,[key]:e.target.value}))} placeholder={ph} className="admin-input"/>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={()=>{ setEditingCreds(false); setCreds({ currentPass:'', newEmail:'', newPass:'' }); }} className="btn-outline">Cancelar</button>
              <button onClick={handleSaveCreds} disabled={savingCreds} className="btn-gold" style={{ opacity:savingCreds?0.6:1 }}>
                {savingCreds ? 'Guardando…' : '✅ Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
