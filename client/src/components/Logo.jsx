// A two-tone capsule: the whole product is about what's inside the pack, and when it stops being good.
export default function Logo({ size = 30, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <g transform="rotate(-40 16 16)">
        <rect x="2" y="9.5" width="28" height="13" rx="6.5" fill="#ffffff" />
        <path d="M16 9.5h7.5a6.5 6.5 0 0 1 0 13H16z" fill="#4fc9ad" />
      </g>
    </svg>
  );
}
