export default function ContentLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
      {/* Logo with left-to-right reveal */}
      <div className="relative overflow-hidden" style={{ width: 160, height: 32 }}>
        {/* Dimmed base logo */}
        <img
          src="/logo.png"
          alt="Softwind"
          width={160}
          height={32}
          style={{ opacity: 0.12, objectFit: 'contain', width: '100%', height: '100%' }}
        />
        {/* Animated reveal overlay */}
        <img
          src="/logo.png"
          alt=""
          width={160}
          height={32}
          style={{
            objectFit: 'contain',
            width: '100%',
            height: '100%',
            position: 'absolute',
            inset: 0,
            animation: 'logo-reveal 1.8s ease-in-out infinite',
          }}
        />
      </div>

      {/* Text */}
      <p
        className="text-neutral-600 text-xs tracking-wide"
        style={{ animation: 'fade-in 0.6s ease forwards' }}
      >
        Trayendo el contenido de tu web...
      </p>

      <style>{`
        @keyframes logo-reveal {
          0%   { clip-path: inset(0 100% 0 0); }
          60%  { clip-path: inset(0 0% 0 0); }
          80%  { clip-path: inset(0 0% 0 0); opacity: 1; }
          100% { clip-path: inset(0 0% 0 0); opacity: 0; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
