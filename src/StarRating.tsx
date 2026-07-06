interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: number
}

const STAR_VALUES = [1, 2, 3, 4, 5]

function StarRating({ value, onChange, size = 20 }: StarRatingProps) {
  const interactive = Boolean(onChange)

  return (
    <div className={interactive ? 'star-rating interactive' : 'star-rating'} style={{ fontSize: size }}>
      {STAR_VALUES.map((n) =>
        interactive ? (
          <button
            key={n}
            type="button"
            className={n <= value ? 'star filled' : 'star'}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => onChange?.(n)}
          >
            ★
          </button>
        ) : (
          <span key={n} className={n <= value ? 'star filled' : 'star'}>
            ★
          </span>
        ),
      )}
    </div>
  )
}

export default StarRating
