'use client';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AboutSection from '@/components/sections/AboutSection';
import CapybaraLoader from '@/components/ui/CapybaraLoader';

export default function SobreNosotrosPage() {
  const [data,   setData]   = useState<Record<string,any> | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'site_config', 'about'))
      .then(snap => setData(snap.exists() ? snap.data() : {}))
      .catch(() => setData({}))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return <CapybaraLoader />;

  return (
    <main style={{ paddingTop: '5rem' }}>
      <AboutSection data={data ?? {}} />
    </main>
  );
}
