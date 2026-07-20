'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db, COL } from '@/lib/firebase';
import { subDays, startOfDay, addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  MessageSquare, Briefcase, Image as ImageIcon, Star,
  TrendingUp, Bell, RefreshCw, ExternalLink, AlertCircle, BarChart2,
  Smartphone, Globe, Compass, Clock,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
type Period = '7d' | '30d' | '90d';
interface Msg {
  id: string; fechaEnvio: string; estado: string;
  tipoEvento?: string; distrito?: string; leido: boolean;
}

/* ─── Constants ─────────────────────────────────────────── */
const STATUS: Record<string, { label: string; color: string }> = {
  pendiente:     { label: 'Pendiente',    color: '#f59e0b' },
  'en-revision': { label: 'En revisión',  color: '#3b82f6' },
  cotizado:      { label: 'Cotizado',     color: '#10b981' },
  cerrado:       { label: 'Cerrado',      color: '#6b7280' },
};

const CHANNEL_COLORS: Record<string, string> = {
  'Facebook':          '#1877f2',
  'Instagram':         '#e1306c',
  'TikTok':            '#000000',
  'WhatsApp':          '#25d366',
  'Google (búsqueda)': '#ea4335',
  'Direct':            '#64748b',
  'Directo':           '#64748b',
  'Organic Search':    '#ea4335',
  'Referral':          '#8b5cf6',
  'Paid Social':       '#f59e0b',
  'Email':             '#0ea5e9',
};
const channelColor = (name: string) => CHANNEL_COLORS[name] ?? '#6366f1';

/* ─── Helper: period → days ──────────────────────────────── */
const toDays = (p: Period) => p === '7d' ? 7 : p === '30d' ? 30 : 90;

/* ─── Sub-components ────────────────────────────────────── */

function SummaryCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="admin-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color="#fff" />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, margin: '0 0 4px' }}>{label}</p>
        <p style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0a1628', lineHeight: 1, margin: '0 0 4px' }}>{value}</p>
        {sub && <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>{sub}</p>}
      </div>
    </div>
  );
}

function HBarList({ data, color = '#2563eb' }: {
  data: { name: string; value: number }[]; color?: string;
}) {
  const max = data[0]?.value || 1;
  if (data.length === 0) return (
    <p style={{ color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>
      Sin datos en este período
    </p>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map(d => (
        <div key={d.name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{d.name}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0a1628', flexShrink: 0 }}>{d.value}</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: '#f1f5f9' }}>
            <div style={{ height: '100%', borderRadius: 999, background: color, width: `${(d.value / max) * 100}%`, transition: 'width .5s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="admin-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#0a1628' }}>{title}</p>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0a1628', borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 20px rgba(0,0,0,.3)' }}>
      <p style={{ color: '#94a3b8', fontSize: '0.72rem', margin: '0 0 2px' }}>{label}</p>
      <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>{payload[0].value} mensajes</p>
    </div>
  );
};

/* ─── Main Page ─────────────────────────────────────────── */
export default function AnaliticasPage() {
  const [period, setPeriod] = useState<Period>('7d');

  /* ── Firebase: todos los mensajes ── */
  const [msgs, setMsgs]         = useState<Msg[]>([]);
  const [msgsLoad, setMsgsLoad] = useState(true);

  useEffect(() => {
    setMsgsLoad(true);
    return onSnapshot(
      query(collection(db, COL.MENSAJES), orderBy('fechaEnvio', 'asc')),
      snap => { setMsgs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Msg))); setMsgsLoad(false); }
    );
  }, []);

  /* ── Firebase: inventario ── */
  const [svcTotal,  setSvcTotal]  = useState(0);
  const [svcActive, setSvcActive] = useState(0);
  const [galTotal,  setGalTotal]  = useState(0);
  const [galVis,    setGalVis]    = useState(0);
  const [tesTotal,  setTesTotal]  = useState(0);
  const [tesVis,    setTesVis]    = useState(0);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, COL.SERVICIOS)),                                    s => setSvcTotal(s.size));
    const u2 = onSnapshot(query(collection(db, COL.SERVICIOS),   where('visible','==',true)),      s => setSvcActive(s.size));
    const u3 = onSnapshot(query(collection(db, COL.GALERIA)),                                      s => setGalTotal(s.size));
    const u4 = onSnapshot(query(collection(db, COL.GALERIA),     where('visible','==',true)),      s => setGalVis(s.size));
    const u5 = onSnapshot(query(collection(db, COL.TESTIMONIOS)),                                  s => setTesTotal(s.size));
    const u6 = onSnapshot(query(collection(db, COL.TESTIMONIOS), where('visible','==',true)),      s => setTesVis(s.size));
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, []);

  /* ── Google Analytics 4: tráfico web real (páginas, dispositivos, navegadores, origen) ── */
  const [ga,     setGa]     = useState<any>(null);
  const [gaLoad, setGaLoad] = useState(true);

  const fetchGa = useCallback(async (p: Period) => {
    setGaLoad(true);
    try {
      const res = await fetch(`/api/ga4-analytics?period=${p}`);
      setGa(await res.json());
    } catch { setGa({ configured: false }); }
    setGaLoad(false);
  }, []);

  useEffect(() => { fetchGa(period); }, [period, fetchGa]);

  /* ── Datos derivados ── */
  const days   = toDays(period);
  const cutoff = useMemo(() => subDays(new Date(), days).toISOString(), [days]);

  const filtered = useMemo(() => msgs.filter(m => m.fechaEnvio >= cutoff), [msgs, cutoff]);

  const totalMsgs  = filtered.length;
  const unreadMsgs = filtered.filter(m => !m.leido).length;
  const todayMsgs  = useMemo(() => filtered.filter(m => m.fechaEnvio >= startOfDay(new Date()).toISOString()).length, [filtered]);
  const cotizados  = filtered.filter(m => m.estado === 'cotizado' || m.estado === 'cerrado').length;
  const tasa       = totalMsgs > 0 ? Math.round((cotizados / totalMsgs) * 100) : 0;

  /* Chart: mensajes por día */
  const dayData = useMemo(() => Array.from({ length: days }, (_, i) => {
    const d  = subDays(new Date(), days - 1 - i);
    const d0 = startOfDay(d).toISOString();
    const d1 = startOfDay(addDays(d, 1)).toISOString();
    return {
      label: format(d, days <= 7 ? 'EEE d' : 'dd/MM', { locale: es }),
      count: filtered.filter(m => m.fechaEnvio >= d0 && m.fechaEnvio < d1).length,
    };
  }), [filtered, days]);

  /* Chart: por estado */
  const statusData = useMemo(() =>
    Object.entries(STATUS)
      .map(([k, s]) => ({ name: s.label, value: filtered.filter(m => m.estado === k).length, color: s.color }))
      .filter(d => d.value > 0)
  , [filtered]);

  /* Top tipos de evento */
  const topTypes = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.forEach(m => m.tipoEvento && (c[m.tipoEvento] = (c[m.tipoEvento] || 0) + 1));
    return Object.entries(c).sort(([, a], [, b]) => b - a).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  /* Top distritos */
  const topDist = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.forEach(m => m.distrito && (c[m.distrito] = (c[m.distrito] || 0) + 1));
    return Object.entries(c).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  /* ── Render helpers ── */
  const PBtn = ({ p, label }: { p: Period; label: string }) => (
    <button onClick={() => setPeriod(p)}
            style={{ padding: '0.4rem 0.875rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                     fontFamily: 'var(--font-jakarta)', fontSize: '0.78rem', fontWeight: period === p ? 700 : 400,
                     background: period === p ? '#1e3a5f' : '#f1f5f9',
                     color: period === p ? '#f5c842' : '#64748b', transition: 'all .15s' }}>
      {label}
    </button>
  );

  /* ─── RENDER ─────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', fontWeight: 700, color: '#0a1628', margin: 0 }}>Métricas</h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 4 }}>Actividad del negocio en tiempo real · Firebase + Google Analytics</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <PBtn p="7d"  label="7 días"  />
          <PBtn p="30d" label="30 días" />
          <PBtn p="90d" label="90 días" />
        </div>
      </div>

      {/* Google Analytics 4: tráfico real del sitio */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#0a1628' }}>Tráfico web — Google Analytics</p>
          {ga?.configured && !ga?.error && (
            <button onClick={() => fetchGa(period)}
                    style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 7, padding: '4px 10px',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-jakarta)' }}>
              <RefreshCw size={12} /> Actualizar
            </button>
          )}
        </div>

        {gaLoad ? (
          <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />

        ) : !ga?.configured ? (
          /* ── Setup guide ── */
          <div className="admin-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertCircle size={22} color="#f5c842" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0a1628', margin: '0 0 6px' }}>Conectar Google Analytics</p>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 14px' }}>
                  El sitio ya envía datos a Google Analytics (GA4). Para mostrarlos aquí falta dar acceso de lectura a la misma cuenta de servicio que ya usa Firebase Admin, y añadir el ID de la propiedad en Vercel (Settings → Environment Variables):
                </p>
                <div style={{ background: '#0a1628', borderRadius: 10, padding: '0.875rem 1.1rem', fontFamily: 'monospace', fontSize: '0.78rem', color: '#a3e635', marginBottom: 14, lineHeight: 1.8 }}>
                  <div>GA4_PROPERTY_ID = <span style={{ color: '#fde68a' }}>123456789</span></div>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 6px' }}>
                  Pasos: 1) En Google Analytics → Administrar → Detalles de la propiedad, copia el <strong style={{ color: '#475569' }}>ID de propiedad</strong>.
                </p>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 14px' }}>
                  2) En esa misma propiedad → Administración de acceso, agrega como <strong style={{ color: '#475569' }}>Viewer</strong> el correo de la cuenta de servicio que aparece en <code>FIREBASE_ADMIN_CLIENT_EMAIL</code>.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer"
                     style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.45rem 0.875rem',
                               background: '#1e3a5f', color: '#f5c842', borderRadius: 8, fontSize: '0.78rem',
                               fontWeight: 600, textDecoration: 'none' }}>
                    <ExternalLink size={12} /> Abrir Google Analytics
                  </a>
                </div>
              </div>
            </div>
          </div>

        ) : ga?.error ? (
          <div className="admin-card" style={{ padding: '1.25rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p style={{ fontSize: '0.82rem', color: '#dc2626', margin: 0 }}>
              ⚠️ Error al consultar Google Analytics: {ga.message || 'Verifica GA4_PROPERTY_ID y que la cuenta de servicio tenga acceso de Viewer a la propiedad.'}
            </p>
          </div>

        ) : (() => {
          const { totals, byDay, byPage, byDevice, byBrowser, byChannel } = ga;
          const minutes = Math.floor((totals?.avgDuration ?? 0) / 60);
          const seconds = Math.round((totals?.avgDuration ?? 0) % 60);

          const dayChartData = (byDay ?? []).map((d: any) => ({
            label: /^\d{8}$/.test(d.date) ? format(new Date(`${d.date.slice(0,4)}-${d.date.slice(4,6)}-${d.date.slice(6,8)}`), days <= 7 ? 'EEE d' : 'dd/MM', { locale: es }) : d.date,
            value: d.value,
          }));

          const pageData    = (byPage ?? []).map((p: any) => ({ name: p.name, value: p.value }));
          const deviceLabels: Record<string, string> = { mobile: 'Celular', desktop: 'Computadora', tablet: 'Tablet' };
          const deviceData   = (byDevice ?? []).map((d: any) => ({ name: deviceLabels[d.name] ?? d.name, value: d.value }));
          const browserData  = (byBrowser ?? []).map((b: any) => ({ name: b.name, value: b.value }));
          const channelData  = (byChannel ?? []).map((c: any) => ({ name: c.name, value: c.value, color: channelColor(c.name) }));

          return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
              <SummaryCard icon={Globe}      label="Vistas de página"   value={(totals?.pageViews ?? 0).toLocaleString('es-PE')} color="#6366f1" />
              <SummaryCard icon={Smartphone} label="Visitantes únicos"  value={(totals?.users ?? 0).toLocaleString('es-PE')}     color="#0ea5e9" />
              <SummaryCard icon={Compass}    label="Sesiones"           value={(totals?.sessions ?? 0).toLocaleString('es-PE')} color="#10b981" />
              <SummaryCard icon={Clock}      label="Duración promedio"  value={`${minutes}m ${seconds}s`}                        color="#d97706" />
            </div>

            {/* Gráfico vistas por día */}
            {dayChartData.length > 0 && dayChartData.some((d: any) => d.value > 0) && (
              <ChartCard title="Vistas de página por día">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dayChartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                           interval={days <= 7 ? 0 : days <= 30 ? 4 : 8} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#0a1628', border: 'none', borderRadius: 10, color: '#fff', fontSize: '0.78rem' }}
                             formatter={(v: any) => [v, 'Vistas']} />
                    <Bar dataKey="value" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* De dónde viene el tráfico — Facebook, Instagram, TikTok, Google, directo... */}
            <ChartCard title="De dónde llegan tus visitantes">
              {channelData.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>
                  Sin datos en este período
                </p>
              ) : (
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={channelData} cx="50%" cy="50%" innerRadius={44} outerRadius={80}
                           dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                        {channelData.map((d: any, i: number) => <Cell key={i} fill={d.color} stroke="none" />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#0a1628', border: 'none', borderRadius: 10, color: '#fff', fontSize: '0.78rem' }}
                        formatter={(v: any, name: any) => [`${v} sesiones`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 160 }}>
                    {channelData.map((d: any) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.78rem', color: '#475569' }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0a1628' }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ChartCard>

            {/* Grid de stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
              <ChartCard title="Apartados más visitados">
                {pageData.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>Sin datos en este período</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pageData.slice(0, 8).map((p: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, width: 18, flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontSize: '0.78rem', color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>{p.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>
              <ChartCard title="Dispositivos">
                <HBarList data={deviceData} color="#8b5cf6" />
              </ChartCard>
              <ChartCard title="Navegadores">
                <HBarList data={browserData.slice(0, 6)} color="#f59e0b" />
              </ChartCard>
            </div>
          </div>
          );
        })()}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <SummaryCard icon={MessageSquare} label="Mensajes totales"  value={msgsLoad ? '…' : totalMsgs}    sub={`últimos ${days} días`}        color="#1e3a5f" />
        <SummaryCard icon={Bell}          label="Sin leer"           value={msgsLoad ? '…' : unreadMsgs}   sub="requieren atención"            color="#dc2626" />
        <SummaryCard icon={TrendingUp}    label="Mensajes hoy"       value={msgsLoad ? '…' : todayMsgs}    sub="recibidos hoy"                 color="#059669" />
        <SummaryCard icon={BarChart2}     label="Tasa de gestión"    value={msgsLoad ? '…' : `${tasa}%`}   sub={`${cotizados} cotizados/cerrados`} color="#d97706" />
      </div>

      {/* Charts row 1 */}
      <div className="charts-2col">

        {/* Bar chart: mensajes por día */}
        <ChartCard title={`Mensajes por día — ${days === 7 ? 'última semana' : `últimos ${days} días`}`}>
          {msgsLoad ? (
            <div className="skeleton" style={{ height: 210, borderRadius: 8 }} />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={dayData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                       interval={days <= 7 ? 0 : days <= 30 ? 4 : 8} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.06)' }} />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Donut: por estado */}
        <ChartCard title="Por estado">
          {msgsLoad ? (
            <div className="skeleton" style={{ height: 210, borderRadius: 8 }} />
          ) : statusData.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center', padding: '3.5rem 0', margin: 0 }}>Sin mensajes</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={42} outerRadius={66}
                       dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0a1628', border: 'none', borderRadius: 10, color: '#fff', fontSize: '0.78rem' }}
                    formatter={(v: any, name: any) => [v, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {statusData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', color: '#475569' }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0a1628' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="charts-equal">
        <ChartCard title="Tipos de evento solicitados">
          {msgsLoad
            ? <div className="skeleton" style={{ height: 180, borderRadius: 8 }} />
            : <HBarList data={topTypes} color="#8b5cf6" />}
        </ChartCard>
        <ChartCard title="Distritos de procedencia">
          {msgsLoad
            ? <div className="skeleton" style={{ height: 180, borderRadius: 8 }} />
            : <HBarList data={topDist} color="#10b981" />}
        </ChartCard>
      </div>

      {/* Inventario */}
      <div>
        <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '0.88rem', color: '#0a1628' }}>Inventario del contenido</p>
        <div className="charts-3col">
          {([
            { icon: Briefcase,  label: 'Servicios',   active: svcActive, total: svcTotal, color: '#1e3a5f' },
            { icon: ImageIcon,  label: 'Galería',      active: galVis,   total: galTotal, color: '#7c3aed' },
            { icon: Star,       label: 'Testimonios', active: tesVis,   total: tesTotal, color: '#f59e0b' },
          ] as const).map(({ icon: Icon, label, active, total, color }) => (
            <div key={label} className="admin-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color="#fff" />
                </div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: '#0a1628' }}>{label}</p>
              </div>
              <p style={{ margin: '0 0 2px', fontSize: '2rem', fontWeight: 800, color: '#0a1628', lineHeight: 1 }}>{active}</p>
              <p style={{ margin: '0 0 10px', fontSize: '0.72rem', color: '#64748b' }}>visibles de {total}</p>
              <div style={{ height: 5, borderRadius: 999, background: '#f1f5f9' }}>
                <div style={{ height: '100%', borderRadius: 999, background: color, width: `${total ? (active / total) * 100 : 0}%`, transition: 'width .5s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
