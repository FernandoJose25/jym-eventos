'use client';
import { useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Tamaño aproximado del botón flotante del widget (icon_size 24 + padding 8 en
// cada lado + borde). Se usa solo para reservar el espacio visual y evitar que
// el widget de terceros provoque Cumulative Layout Shift al insertarse.
const WIDGET_BUTTON_SIZE = 56;
const WIDGET_MARGIN_BOTTOM = 15;
const WIDGET_MARGIN_RIGHT = 16;

export default function WhatsAppWidget() {
  useEffect(() => {
    let loaded = false;

    // `triggeredByInteraction` decide si mostramos el globo de saludo
    // automático. Si el usuario ya interactuó con la página (scroll, tap,
    // clic, tecla), el cambio de diseño que provoca el globo queda dentro de
    // los 500ms posteriores a esa interacción, que es justo la ventana que
    // Google excluye al calcular Cumulative Layout Shift. Si nadie interactuó
    // (poco frecuente) cargamos igual el botón por accesibilidad, pero sin el
    // globo automático, para no sumar CLS de la nada.
    const loadWidget = (triggeredByInteraction: boolean) => {
      if (loaded) return;
      loaded = true;

      (async () => {
        try {
          const [waSnap, contactoSnap] = await Promise.all([
            getDoc(doc(db, 'site_config', 'whatsapp')),
            getDoc(doc(db, 'site_config', 'contacto')),
          ]);
          const wa = waSnap.exists() ? waSnap.data() : {};
          const contacto = contactoSnap.exists() ? contactoSnap.data() : {};

          const phone = wa.phoneNumber || contacto.whatsapp || '51945203708';
          const primaryColor = wa.primaryColor || '#085E54';
          const logoUrl = wa.logoUrl || 'https://res.cloudinary.com/dvcmazqtp/image/upload/v1780101985/logos/feuzcxtlvcwov5fefinu.webp';
          const buttonColor = wa.buttonColor || '#1c9247';
          const promptText = wa.promptText || '👋 Hola, resuelve la duda que tengas';
          // Con interacción: el globo aparece casi de inmediato (pegado a la
          // acción del usuario). Sin interacción: delay altísimo para que en
          // la práctica nunca aparezca solo.
          const promptDelay = triggeredByInteraction ? (wa.promptDelay ?? 1) : 999999;
          const popupTitle = wa.popupTitle || 'J&M Decoraciones y Eventos';
          const popupSub = wa.popupSubtitle || 'Usualmente responde en 1 hora';
          const welcomeText = wa.welcomeText || '👋 Hola, ¿en qué podemos ayudarte?';
          const customerText = wa.customerText || 'Hola, quiero cotizar un evento';

          const script = document.createElement('script');
          script.id = 'wbwacw-init';
          script.async = true;

          const baseUrl = 'https://wacw.whatsbox.io';
          const cacheVar = '1780102875398';

          (window as any).wbwacw = {
            base_url: baseUrl,
            cache_variant: cacheVar,
            config: {
              brand: {
                phone_number: phone,
                primary_color: primaryColor,
                logo_url: logoUrl,
              },
              button: {
                background_color: buttonColor,
                icon: 'white',
                icon_size: 24,
                padding: 8,
                position: 'bottom-right',
                margin: { bottom: WIDGET_MARGIN_BOTTOM, right: WIDGET_MARGIN_RIGHT, left: 0 },
              },
              prompt: {
                text: promptText,
                delay: promptDelay,
              },
              popup: {
                title: popupTitle,
                subtitle: popupSub,
                welcome_text: welcomeText,
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
    };

    const onInteraction = () => loadWidget(true);
    const interactionEvents: (keyof WindowEventMap)[] = ['scroll', 'pointerdown', 'touchstart', 'keydown'];
    interactionEvents.forEach(evt => window.addEventListener(evt, onInteraction, { once: true, passive: true }));

    // Respaldo: si el usuario se queda quieto y nunca interactúa, igual
    // mostramos el botón (para que WhatsApp siga siendo accesible), pero sin
    // el globo automático.
    const fallback = setTimeout(() => loadWidget(false), 8000);

    return () => {
      interactionEvents.forEach(evt => window.removeEventListener(evt, onInteraction));
      clearTimeout(fallback);
    };
  }, []);

  // Placeholder invisible que reserva el espacio exacto del botón flotante
  // (misma posición y margen que configuramos arriba) desde el primer
  // render. Así, cuando el widget real se inserte encima, no "empuja" nada
  // más en la página y no debería sumar layout shift adicional.
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        bottom: WIDGET_MARGIN_BOTTOM,
        right: WIDGET_MARGIN_RIGHT,
        width: WIDGET_BUTTON_SIZE,
        height: WIDGET_BUTTON_SIZE,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}