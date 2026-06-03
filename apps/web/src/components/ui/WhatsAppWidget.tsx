'use client';
import { useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function WhatsAppWidget() {
  useEffect(() => {
    (async () => {
      try {
        const [waSnap, contactoSnap] = await Promise.all([
          getDoc(doc(db, 'site_config', 'whatsapp')),
          getDoc(doc(db, 'site_config', 'contacto')),
        ]);
        const wa      = waSnap.exists()      ? waSnap.data()      : {};
        const contacto = contactoSnap.exists() ? contactoSnap.data() : {};

        const phone        = wa.phoneNumber   || contacto.whatsapp || '51945203708';
        const primaryColor = wa.primaryColor  || '#085E54';
        const logoUrl      = wa.logoUrl       || 'https://res.cloudinary.com/dvcmazqtp/image/upload/v1780101985/logos/feuzcxtlvcwov5fefinu.webp';
        const buttonColor  = wa.buttonColor   || '#1c9247';
        const promptText   = wa.promptText    || '👋 Hola, resuelve la duda que tengas';
        const promptDelay  = wa.promptDelay   ?? 5;
        const popupTitle   = wa.popupTitle    || 'J&M Eventos y Decoraciones';
        const popupSub     = wa.popupSubtitle || 'Usualmente responde en 1 hora';
        const welcomeText  = wa.welcomeText   || '👋 Hola, ¿en qué podemos ayudarte?';
        const customerText = wa.customerText  || 'Hola, quiero cotizar un evento';

        const script = document.createElement('script');
        script.id = 'wbwacw-init';
        script.async = true;

        const baseUrl     = 'https://wacw.whatsbox.io';
        const cacheVar    = '1780102875398';

        (window as any).wbwacw = {
          base_url:      baseUrl,
          cache_variant: cacheVar,
          config: {
            brand: {
              phone_number:  phone,
              primary_color: primaryColor,
              logo_url:      logoUrl,
            },
            button: {
              background_color: buttonColor,
              icon:             'white',
              icon_size:        24,
              padding:          8,
              position:         'bottom-right',
              margin:           { bottom: 15, right: 16, left: 0 },
            },
            prompt: {
              text:  promptText,
              delay: promptDelay,
            },
            popup: {
              title:                 popupTitle,
              subtitle:              popupSub,
              welcome_text:          welcomeText,
              customer_text_default: customerText,
            },
          },
        };

        script.src = `${baseUrl}/init.js?cv=${cacheVar}`;
        const existing = document.getElementById('wbwacw-init');
        if (!existing) document.head.appendChild(script);
      } catch (e) {
        console.error('[WhatsAppWidget]', e);
      }
    })();
  }, []);

  return null;
}
