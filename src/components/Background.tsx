/** Deterministic pseudo-random stars, so server and client render the same sky. */
const STARS = Array.from({ length: 90 }, (_, i) => {
  const rand = (salt: number) => {
    const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  return {
    x: (rand(1) * 100).toFixed(2),
    y: (rand(2) * 100).toFixed(2),
    r: (0.5 + rand(3) * 1.1).toFixed(2),
    o: (0.25 + rand(4) * 0.6).toFixed(2),
    twinkle: rand(5) > 0.7,
    delay: (rand(6) * 6).toFixed(1),
  };
});

export function Background() {
  return (
    <div className="aurora" aria-hidden="true">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <svg className="starfield" width="100%" height="100%">
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.r}
            opacity={s.o}
            className={s.twinkle ? "twinkle" : undefined}
            style={s.twinkle ? { animationDelay: `${s.delay}s` } : undefined}
          />
        ))}
      </svg>
    </div>
  );
}
