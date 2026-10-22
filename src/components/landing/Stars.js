// Five stars, filled up to `value` (supports halves, e.g. 4.5)
export default function Stars({ value = 0, size = 18 }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className="ckl-stars" role="img" aria-label={`Rated ${rating} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <span key={i} className="ckl-star" style={{ width: size, height: size }}>
            <svg viewBox="0 0 20 20" aria-hidden="true" className="ckl-star__empty">
              <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.8L10 14.9l-5.21 2.62 1-5.8-4.21-4.1 5.82-.85L10 1.5z" />
            </svg>
            <span className="ckl-star__fill" style={{ width: `${fill * 100}%` }}>
              <svg viewBox="0 0 20 20" aria-hidden="true" style={{ width: size, height: size }}>
                <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.8L10 14.9l-5.21 2.62 1-5.8-4.21-4.1 5.82-.85L10 1.5z" />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}
