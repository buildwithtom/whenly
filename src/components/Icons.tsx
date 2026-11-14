import {
  House,
  Heart,
  Users,
  Guitar,
  Wrench,
  User,
  Shapes,
  type LucideProps,
} from "lucide-react";
export function CategoryIcon({
  name,
  ...props
}: LucideProps & { name: string }) {
  const Icon =
    (
      { House, Heart, Users, Guitar, Wrench, User, Shapes } as Record<
        string,
        typeof House
      >
    )[name] || Shapes;
  return <Icon {...props} />;
}
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      whenly<span>.</span>
    </span>
  );
}
export function MemoryIllustration() {
  return (
    <svg
      className="memory-illustration"
      viewBox="0 0 420 310"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="222"
        cy="275"
        rx="140"
        ry="12"
        fill="var(--illustration-shadow)"
      />
      <path
        d="M95 206C40 141 71 71 144 62C209 12 303 51 331 117C385 156 343 249 282 260H155C124 258 102 240 95 206Z"
        fill="var(--illustration-blob)"
      />
      <path
        d="M66 127L77 132M90 89L96 99M329 79L320 91M350 112L337 118"
        stroke="var(--sage)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <g transform="rotate(-11 205 166)">
        <rect
          x="124"
          y="76"
          width="157"
          height="182"
          rx="17"
          fill="var(--illustration-paper)"
          stroke="var(--illustration-line)"
          strokeWidth="1.5"
        />
        <path
          d="M147 228H255M147 238H211"
          stroke="var(--illustration-line)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle
          cx="203"
          cy="151"
          r="49"
          fill="var(--illustration-clock)"
          stroke="var(--sage)"
          strokeWidth="2"
        />
        <path
          d="M203 118V151L225 164"
          stroke="var(--ink)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="203" cy="151" r="4" fill="var(--ink)" />
        <path
          d="M203 108V112M203 190V194M160 151H164M242 151H246"
          stroke="var(--sage)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <g transform="rotate(10 292 218)">
        <rect
          x="257"
          y="185"
          width="78"
          height="69"
          rx="13"
          fill="var(--illustration-paper)"
          stroke="var(--illustration-line)"
          strokeWidth="1.5"
        />
        <path
          d="M279 219L290 230L312 208"
          stroke="var(--sage-dark)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <path
        d="M99 245C93 213 101 187 109 169M101 217C82 216 78 205 80 193C94 193 102 201 101 217ZM103 199C119 193 126 182 121 172C109 174 103 186 103 199Z"
        fill="var(--illustration-leaf)"
      />
      <path
        d="M99 245C95 216 101 190 109 172"
        stroke="var(--sage-dark)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M299 89L302 79L306 89L316 92L306 96L302 106L299 96L289 92Z"
        fill="var(--sage)"
      />
      <circle cx="145" cy="46" r="4" fill="var(--sage)" />
      <circle cx="356" cy="194" r="3" fill="var(--sage)" />
    </svg>
  );
}
