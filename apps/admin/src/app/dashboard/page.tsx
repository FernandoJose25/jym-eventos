'use client';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import Link from 'next/link';
import type { Mensaje } from '@/types';

interface Stats {
  mensajesTotal: number;
  mensajesNoLeidos: number;
  mensajesPendientes: number;
  servicios: number;
  galeria: number;
  testimonios: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    mensajesTotal: 0, mensajesNoLeidos: 0, mensajesPendientes: 0,
    servicios: 0, galeria: 0, testimonios: 0,
  });
  const [recientes, setRecientes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(collection(db, COL.MENSAJES), snap => {
      const docs = snap.docs.map(d => d.data() as Mensaje);
      setStats(prev => ({
        ...prev,
        mensajesTotal:     docs.length,
        mensajesNoLeidos:  docs.filter(m => !m.leido).length,
        mensajesPendientes:docs.filter(m => m.estado === 'pendiente').length,
      }));
      setLoading(false);
    }));

    unsubs.push(onSnapshot(collection(db, COL.SERVICIOS),   snap => setStats(p => ({ ...p, servicios:   snap.size }))));
    unsubs.push(onSnapshot(collection(db, COL.GALERIA),     snap => setStats(p => ({ ...p, galeria:     snap.size }))));
    unsubs.push(onSnapshot(collection(db, COL.TESTIMONIOS), snap => setStats(p => ({ ...p, testimonios: snap.size }))));

    unsubs.push(onSnapshot(
      query(collection(db, COL.MENSAJES), orderBy('fechaEnvio', 'desc'), limit(5)),
      snap => setRecientes(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Mensaje))
    ));

    return () => unsubs.forEach(u => u());
  }, []);

  const cards = [
    { label: 'Mensajes nuevos', value: stats.mensajesNoLeidos, icon: '✉️', color: '#2563eb', bg: '#eff6ff', href: '/dashboard/mensajes' },
    { label: 'Pendientes',      value: stats.mensajesPendientes, icon: '⏳', color: '#d97706', bg: '#fffbeb', href: '/dashboard/mensajes' },
    { label: 'Servicios',       value: stats.servicios,       icon: '🎉', color: '#7c3aed', bg: '#f5f3ff', href: '/dashboard/servicios' },
    { label: 'Galería',         value: stats.galeria,         icon: '🖼️', color: '#0891b2', bg: '#ecfeff', href: '/dashboard/galeria' },
    { label: 'Testimonios',     value: stats.testimonios,     icon: '⭐', color: '#b45309', bg: '#fefce8', href: '/dashboard/testimonios' },
    { label: 'Total mensajes',  value: stats.mensajesTotal,   icon: '📬', color: '#166534', bg: '#f0fdf4', href: '/dashboard/mensajes' },
  ];

  const estadoStyles: Record<string, { label: string; bg: string; color: string }> = {
    'pendiente':   { label: 'Nuevo',     bg: '#f0fdf4', color: '#166534' },
    'en-revision': { label: 'Revisando', bg: '#fffbeb', color: '#92400e' },
    'cotizado':    { label: 'Cotizado',  bg: '#eff6ff', color: '#1e40af' },
    'cerrado':     { label: 'Cerrado',   bg: '#f8fafc', color: '#475569' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 className="page-h1" style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.75rem', fontWeight: 700, color: '#0a1628', margin: 0 }}>
          Panel de Control
        </h1>
        <p className="page-h1-sub" style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0', fontFamily: 'var(--font-jakarta)' }}>
          Resumen general de J&M Eventos
        </p>
      </div>

      {/* Stats grid */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
        {cards.map(card => (
          <Link key={card.label} href={card.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff', borderRadius: 16, padding: '1.1rem 1.25rem',
              border: '1px solid #e2e8f0', cursor: 'pointer',
              transition: 'box-shadow .15s, transform .15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: 10 }}>
                {card.icon}
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, color: card.color, margin: 0, lineHeight: 1 }}>
                {loading ? '—' : card.value}
              </p>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '4px 0 0', fontFamily: 'var(--font-jakarta)' }}>
                {card.label}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent messages */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', fontWeight: 700, color: '#0a1628', margin: 0 }}>
            Mensajes recientes
          </h2>
          <Link href="/dashboard/mensajes" style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', fontFamily: 'var(--font-jakarta)', fontWeight: 600 }}>
            Ver todos →
          </Link>
        </div>
        <div>
          {loading && [...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 60, margin: '8px 16px', borderRadius: 10 }} />
          ))}
          {!loading && recientes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8', fontSize: '0.88rem' }}>
              📭 Sin mensajes aún
            </div>
          )}
          {recientes.map((msg, i) => {
            const est = estadoStyles[msg.estado] || estadoStyles['pendiente'];
            return (
              <Link key={msg.id} href="/dashboard/mensajes" style={{ textDecoration: 'none' }}>
                <div className="msg-row" style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '0.875rem 1.5rem',
                  borderBottom: i < recientes.length - 1 ? '1px solid #f8fafc' : 'none',
                  cursor: 'pointer',
                  transition: 'background .1s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(135deg,#1e3a5f,#2563eb)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                  }}>
                    {(msg.nombre || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {!msg.leido && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />}
                      <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0a1628', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {msg.nombre}
                      </p>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {msg.tipoEvento || 'Sin especificar'} · {msg.distrito || ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: est.bg, color: est.color }}>
                      {est.label}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                      {new Date(msg.fechaEnvio).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick links */}
      <div className="quick-links-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {[
          { label: 'Gestionar servicios', icon: '🎉', href: '/dashboard/servicios' },
          { label: 'Galería de fotos',    icon: '🖼️', href: '/dashboard/galeria' },
          { label: 'Testimonios',         icon: '⭐', href: '/dashboard/testimonios' },
          { label: 'Configuración web',   icon: '⚙️', href: '/dashboard/configuracion' },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#f8fafc', borderRadius: 14, padding: '1rem 1.25rem',
              border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', transition: 'background .1s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f1f5f9'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'}
            >
              <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', fontFamily: 'var(--font-jakarta)' }}>
                {item.label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
