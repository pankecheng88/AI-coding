export default function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5 no-underline">
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="16" cy="16" r="11" stroke="#1e40af" strokeWidth="2.5" />
        <line
          x1="24"
          y1="24"
          x2="32"
          y2="32"
          stroke="#1e40af"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M11 16l3.5 3.5 6-6"
          stroke="#16a34a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-xl font-bold text-blue-900 tracking-wide">
        新闻求真
      </span>
    </a>
  );
}
