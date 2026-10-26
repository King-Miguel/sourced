/** Thin wrapper around the Material Symbols icon font loaded in layout.tsx. */
export function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined select-none ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}
