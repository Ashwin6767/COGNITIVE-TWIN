'use client'

export function SuggestionChips({ suggestions, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 mt-4 justify-center">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="px-3 py-1.5 bg-bg-card hover:bg-border rounded-full text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          {s}
        </button>
      ))}
    </div>
  )
}
