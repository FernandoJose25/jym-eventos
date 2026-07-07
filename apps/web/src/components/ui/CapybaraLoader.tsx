'use client';

export default function CapybaraLoader({ label = 'Cargando J&M Decoraciones y Eventos', inline = false }: { label?: string; inline?: boolean }) {
  if (inline) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <div className="capybaraloader" style={{ transform: 'scale(0.4)', margin: '-3em 0' }}>
          <div className="capybara">
            <div className="capyhead">
              <div className="capyear"><div className="capyear2"></div></div>
              <div className="capyear"></div>
              <div className="capymouth">
                <div className="capylips"></div>
                <div className="capylips"></div>
              </div>
              <div className="capyeye"></div>
              <div className="capyeye"></div>
            </div>
            <div className="capyleg"></div>
            <div className="capyleg2"></div>
            <div className="capyleg2"></div>
            <div className="capy"></div>
          </div>
          <div className="loader">
            <div className="loaderline"></div>
          </div>
        </div>
        {label && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'var(--font-jakarta)', margin: 0 }}>
            {label}
          </p>
        )}
        <style>{CAPYBARA_CSS}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#050d1a,#1e3a5f)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
    }}>
      <div className="capybaraloader">
        <div className="capybara">
          <div className="capyhead">
            <div className="capyear"><div className="capyear2"></div></div>
            <div className="capyear"></div>
            <div className="capymouth">
              <div className="capylips"></div>
              <div className="capylips"></div>
            </div>
            <div className="capyeye"></div>
            <div className="capyeye"></div>
          </div>
          <div className="capyleg"></div>
          <div className="capyleg2"></div>
          <div className="capyleg2"></div>
          <div className="capy"></div>
        </div>
        <div className="loader">
          <div className="loaderline"></div>
        </div>
      </div>

      <p style={{
        color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem',
        letterSpacing: '.14em', textTransform: 'uppercase',
        fontFamily: 'var(--font-jakarta)', margin: 0,
      }}>
        {label}
      </p>

      <style>{CAPYBARA_CSS}</style>
    </div>
  );
}

const CAPYBARA_CSS = `
        .capybaraloader {
          width: 14em; height: 10em; position: relative; z-index: 1;
          --color: rgb(212,160,23); --color2: rgb(139,90,43);
          transform: scale(0.85);
        }
        .capybara { width: 100%; height: 7.5em; position: relative; z-index: 1; }
        .loader { width: 100%; height: 2.5em; position: relative; z-index: 1; overflow: hidden; }
        .capy {
          width: 85%; height: 100%;
          background: linear-gradient(var(--color), 90%, var(--color2));
          border-radius: 45%; position: relative; z-index: 1;
          animation: capyMovebody 1s linear infinite;
        }
        .capyhead {
          width: 7.5em; height: 7em; bottom: 0; right: 0;
          position: absolute; background-color: var(--color); z-index: 3;
          border-radius: 3.5em; box-shadow: -1em 0 var(--color2);
          animation: capyMovebody 1s linear infinite;
        }
        .capyear {
          width: 2em; height: 2em;
          background: linear-gradient(-45deg, var(--color), 90%, var(--color2));
          top: 0; left: 0; border-radius: 100%; position: absolute; overflow: hidden; z-index: 3;
        }
        .capyear:nth-child(2) { left: 5em; background: linear-gradient(25deg, var(--color), 90%, var(--color2)); }
        .capyear2 {
          width: 100%; height: 1em; background-color: var(--color2);
          bottom: 0; left: 0.5em; border-radius: 100%; position: absolute; transform: rotate(-45deg);
        }
        .capymouth {
          width: 3.5em; height: 2em; background-color: var(--color2);
          position: absolute; bottom: 0; left: 2.5em; border-radius: 50%;
          display: flex; justify-content: space-around; align-items: center; padding: 0.5em;
        }
        .capylips {
          width: 0.25em; height: 0.75em; border-radius: 100%;
          transform: rotate(-45deg); background-color: var(--color);
        }
        .capylips:nth-child(2) { transform: rotate(45deg); }
        .capyeye {
          width: 2em; height: 0.5em; background-color: var(--color2);
          position: absolute; bottom: 3.5em; left: 1.5em;
          border-radius: 5em; transform: rotate(45deg);
        }
        .capyeye:nth-child(4) { transform: rotate(-45deg); left: 5.5em; width: 1.75em; }
        .capyleg {
          width: 6em; height: 5em; bottom: 0; left: 0; position: absolute;
          background: linear-gradient(var(--color), 95%, var(--color2));
          z-index: 2; border-radius: 2em; animation: capyMovebody 1s linear infinite;
        }
        .capyleg2 {
          width: 1.75em; height: 3em; bottom: 0; left: 3.25em; position: absolute;
          background: linear-gradient(var(--color), 80%, var(--color2));
          z-index: 2; border-radius: 0.75em; box-shadow: inset 0 -0.5em var(--color2);
          animation: capyMoveleg 1s linear infinite;
        }
        .capyleg2:nth-child(3) {
          width: 1.25em; left: 0.5em; height: 2em;
          animation: capyMoveleg2 1s linear infinite 0.075s;
        }
        .loaderline {
          width: 50em; height: 0.5em;
          border-top: 0.5em dashed var(--color2);
          animation: capyMoveline 10s linear infinite;
        }
        @keyframes capyMoveleg {
          0%   { transform: rotate(-45deg) translateX(-5%); }
          50%  { transform: rotate(45deg) translateX(5%); }
          100% { transform: rotate(-45deg) translateX(-5%); }
        }
        @keyframes capyMoveleg2 {
          0%,100% { transform: rotate(45deg); }
          50%     { transform: rotate(-45deg); }
        }
        @keyframes capyMovebody {
          0%,100% { transform: translateX(0%); }
          50%     { transform: translateX(2%); }
        }
        @keyframes capyMoveline {
          0%   { transform: translateX(0%); opacity: 0%; }
          5%   { opacity: 100%; }
          95%  { opacity: 100%; }
          100% { opacity: 0%; transform: translateX(-70%); }
        }
      `;
