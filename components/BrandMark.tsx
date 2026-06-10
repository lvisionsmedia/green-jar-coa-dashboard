type BrandMarkProps = {
  small?: boolean;
};

export function BrandMark({ small = false }: BrandMarkProps) {
  return (
    <span
      className={`brand-mark${small ? " small" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 36 36" role="img">
        <path
          d="M11 7h14l2 4v17a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4V11l2-4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <path
          d="M14 7V4h8v3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M18 26c4-3 6-6 6-10-3 0-5 1-6 3-1-2-3-3-6-3 0 4 2 7 6 10Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
