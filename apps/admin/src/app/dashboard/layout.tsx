'use client';
// RUTA: apps/admin/src/app/dashboard/layout.tsx
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import {
  LayoutDashboard, Image, MessageSquare,
  Palette, Users, LogOut, Menu, X,
  ChevronRight, Briefcase, Bell, ChevronDown, Layers, Globe, BarChart2, Camera, Share2,
  PartyPopper,
} from 'lucide-react';
import { SERVICE_ICONS } from '@/lib/serviceIcons';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', group: 'principal' },
  { href: '/dashboard/servicios', icon: Briefcase, label: 'Servicios', group: 'contenido' },
  { href: '/dashboard/galeria', icon: Image, label: 'Galería', group: 'contenido' },
  { href: '/dashboard/camara-invitado', icon: Camera, label: 'Cámara Invitado', group: 'contenido' },
  { href: '/dashboard/redes-sociales', icon: Share2, label: 'Redes Sociales', group: 'contenido' },
  { href: '/dashboard/analiticas', icon: BarChart2, label: 'Métricas', group: 'contenido' },
  { href: '/dashboard/mensajes', icon: MessageSquare, label: 'Mensajes', group: 'clientes', badge: true },
  { href: '/dashboard/diseno', icon: Palette, label: 'Diseño', group: 'sistema' },
  { href: '/dashboard/configuracion', icon: Globe, label: 'Configuración', group: 'sistema' },
  { href: '/dashboard/usuarios', icon: Users, label: 'Usuarios', group: 'sistema' },
];

const GROUPS: Record<string, string> = {
  principal: 'Principal', contenido: 'Contenido', clientes: 'Clientes', sistema: 'Sistema',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sideOpen, setSideOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sideOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sideOpen]);
  const [unread, setUnread] = useState(0);
  const [srvOpen, setSrvOpen] = useState(false);
  const [srvList, setSrvList] = useState<{ id: string; title: string; icon: string }[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, COL.MENSAJES), where('leido', '==', false)),
      snap => setUnread(snap.size)
    );
  }, [user]);

  useEffect(() => {
    if (!srvOpen || srvList.length > 0) return;
    getDocs(query(collection(db, COL.SERVICIOS), orderBy('order', 'asc'))).then(snap =>
      setSrvList(snap.docs.map(d => ({ id: d.id, title: (d.data() as any).title || '', icon: (d.data() as any).icon || 'party' })))
    );
  }, [srvOpen, srvList.length]);

  if (loading || !user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1628' }}>
      <div style={{
        width: 40, height: 40, border: '3px solid rgba(212,160,23,0.3)', borderTopColor: '#d4a017',
        borderRadius: '50%', animation: 'spin .8s linear infinite'
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const SideContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#b8860b,#f5c842)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
            boxShadow: '0 4px 12px rgba(212,160,23,0.35)', flexShrink: 0
          }}>🎉</div>
          <div>
            <p style={{ color: '#fff', fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2, margin: 0 }}>J&M Decoraciones y Eventos</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', margin: 0 }}>Panel Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
        {Object.entries(GROUPS).map(([group, label]) => {
          const items = NAV.filter(n => n.group === group);
          return (
            <div key={group} style={{ marginBottom: '1.25rem' }}>
              <p style={{
                fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em',
                color: 'rgba(255,255,255,0.3)', padding: '0 0.5rem', marginBottom: '0.3rem'
              }}>
                {label}
              </p>
              {items.map(({ href, icon: Icon, label: lbl, badge }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                return (
                  <Link key={href} href={href} onClick={() => setSideOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '0.55rem 0.75rem',
                      borderRadius: 10, marginBottom: 2, textDecoration: 'none', transition: 'all .15s',
                      background: active ? 'linear-gradient(135deg,rgba(30,58,95,.8),rgba(37,99,235,.4))' : 'transparent',
                      border: active ? '1px solid rgba(212,160,23,.3)' : '1px solid transparent',
                      color: active ? '#f5c842' : 'rgba(255,255,255,.65)'
                    }}>
                    <Icon size={15} />
                    <span style={{ fontSize: '0.83rem', fontWeight: active ? 600 : 400, flex: 1 }}>{lbl}</span>
                    {badge && unread > 0 && (
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: 999 }}>
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                    {active && <ChevronRight size={11} style={{ opacity: .6 }} />}
                  </Link>
                );
              })}
              {/* Dropdown "Contenido de Servicios" en grupo contenido */}
              {group === 'contenido' && (
                <div style={{ marginTop: 2 }}>
                  <button
                    onClick={() => setSrvOpen(o => !o)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0.55rem 0.75rem',
                      borderRadius: 10, marginBottom: 2, border: srvOpen ? '1px solid rgba(212,160,23,.3)' : '1px solid transparent',
                      cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font-jakarta)',
                      background: srvOpen ? 'linear-gradient(135deg,rgba(30,58,95,.8),rgba(37,99,235,.4))' : 'transparent',
                      color: srvOpen ? '#f5c842' : 'rgba(255,255,255,.65)'
                    }}>
                    <Layers size={15} />
                    <span style={{ fontSize: '0.83rem', fontWeight: srvOpen ? 600 : 400, flex: 1, textAlign: 'left' }}>Cont. Servicios</span>
                    <ChevronDown size={12} style={{ transition: 'transform .2s', transform: srvOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>
                  {srvOpen && (
                    <div style={{ paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 4 }}>
                      {srvList.length === 0 && (
                        <p style={{ color: 'rgba(255,255,255,.3)', fontSize: '0.72rem', padding: '0.35rem 0.75rem', margin: 0 }}>Cargando…</p>
                      )}
                      {srvList.map(s => {
                        const SrvIcon = SERVICE_ICONS[s.icon] || PartyPopper;
                        return (
                          <Link key={s.id}
                            href={`/dashboard/servicios/${s.id}/contenido`}
                            onClick={() => setSideOpen(false)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '0.4rem 0.75rem',
                              borderRadius: 8, textDecoration: 'none', color: 'rgba(255,255,255,.5)',
                              fontSize: '0.78rem', transition: 'color .15s'
                            }}>
                            <SrvIcon size={14} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '0.875rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#1e3a5f,#2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            fontWeight: 700, fontSize: '0.88rem', flexShrink: 0
          }}>
            {profile?.nombre?.charAt(0).toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              color: '#fff', fontSize: '0.8rem', fontWeight: 600, margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {profile?.nombre || user.email}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', margin: 0 }}>{profile?.rol || 'lector'}</p>
          </div>
        </div>
        <button onClick={signOut}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '0.45rem 0.75rem',
            borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#fca5a5', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-jakarta)'
          }}>
          <LogOut size={13} /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4f8' }}>

      {/* Sidebar desktop */}
      <aside style={{
        width: 'var(--jym-sidebar-w)', flexShrink: 0, background: '#0a1628',
        borderRight: '1px solid rgba(255,255,255,0.06)'
      }}
        className="sidebar-desktop">
        <SideContent />
      </aside>

      {/* Mobile overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 40,
        visibility: sideOpen ? 'visible' : 'hidden',
        pointerEvents: sideOpen ? 'auto' : 'none'
      }}
        className="sidebar-mobile">
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
          opacity: sideOpen ? 1 : 0, transition: 'opacity .3s'
        }}
          onClick={() => setSideOpen(false)} />
        <aside style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, background: '#0a1628',
          display: 'flex', flexDirection: 'column',
          transform: sideOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.4)'
        }}>
          <button onClick={() => setSideOpen(false)}
            style={{
              position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: 7, width: 32, height: 32, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              zIndex: 10, flexShrink: 0
            }}>
            <X size={15} />
          </button>
          <SideContent />
        </aside>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Topbar */}
        <header className="dash-topbar" style={{
          height: 'var(--jym-topbar-h)', background: '#fff', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: 12,
          position: 'sticky', top: 0, zIndex: 30, boxShadow: '0 1px 8px rgba(10,22,40,0.06)'
        }}>
          <button onClick={() => setSideOpen(true)} className="hamburger-btn"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
            <Menu size={20} />
          </button>
          <p className="topbar-label" style={{ flex: 1, fontSize: '0.82rem', color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {NAV.find(n => n.href === pathname || (n.href !== '/dashboard' && pathname.startsWith(n.href)))?.label || 'Dashboard'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {unread > 0 && (
              <Link href="/dashboard/mensajes"
                style={{ position: 'relative', color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', padding: 6, minWidth: 32, minHeight: 32 }}>
                <Bell size={17} />
                <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
              </Link>
            )}
            <a href="https://jmdecoracionesyeventos.com" target="_blank" rel="noopener noreferrer"
              className="topbar-web-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.875rem',
                background: 'linear-gradient(135deg,#b8860b,#f5c842)', borderRadius: 8,
                color: '#0a1628', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(212,160,23,.3)', whiteSpace: 'nowrap'
              }}>
              ↗ Ver web
            </a>
            <div className="topbar-avatar" style={{
              width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#1e3a5f,#2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              fontWeight: 700, fontSize: '0.88rem', boxShadow: '0 2px 8px rgba(30,58,95,.3)', flexShrink: 0
            }}>
              {profile?.nombre?.charAt(0).toUpperCase() || '?'}
            </div>
          </div>
        </header>

        <main className="dash-main" style={{ flex: 1, padding: '1.5rem', maxWidth: 1400, width: '100%', margin: '0 auto', boxSizing: 'border-box', overflowX: 'hidden', minWidth: 0 }}>
          {children}
        </main>
      </div>

      <style>{`
        .sidebar-desktop{display:flex;flex-direction:column}
        .hamburger-btn{display:none}
        .sidebar-mobile{display:none}
        @media(max-width:1023px){
          .sidebar-desktop{display:none!important}
          .hamburger-btn{display:flex!important;min-width:44px;min-height:44px;align-items:center;justify-content:center}
          .sidebar-mobile{display:block!important}
          .dash-main{padding:1rem!important}
          .dash-topbar{padding:0 1rem!important}
        }
        @media(max-width:640px){
          .dash-main{padding:0.625rem!important}
          .dash-topbar{padding:0 0.625rem!important;gap:6px!important;height:56px!important}
          .topbar-label{display:none!important}
          .topbar-web-btn{display:none!important}
          .topbar-avatar{width:30px!important;height:30px!important;font-size:0.78rem!important}
        }
      `}</style>
    </div>
  );
}
