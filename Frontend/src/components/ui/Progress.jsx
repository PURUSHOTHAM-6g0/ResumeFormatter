export function Progress({ value = 0, className = "" }) {
  // Ensure value is between 0 and 100
  const normalizedValue = Math.min(Math.max(value, 0), 100)

  return (
    <div
      className={`w-full bg-gray-200 rounded-full overflow-hidden h-2 ${className}`}
      role="progressbar"
      aria-valuenow={normalizedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progress: ${normalizedValue}%`}
    >
      <div
        className="bg-blue-600 h-full transition-all duration-300 ease-out"
        style={{ width: `${normalizedValue}%` }}
      />
    </div>
  )
}
