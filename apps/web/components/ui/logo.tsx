interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 32, text: "text-lg" },
  md: { icon: 40, text: "text-xl" },
  lg: { icon: 48, text: "text-2xl" },
};

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const { icon, text } = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#logoGradient)" />
        <path
          d="M9 6h9l5 5v14c0 1-1 2-2 2H9c-1 0-2-1-2-2V8c0-1 1-2 2-2z"
          fill="white"
          opacity="0.95"
        />
        <path
          d="M18 6v5h5"
          fill="none"
          stroke="white"
          strokeWidth="1"
          opacity="0.5"
        />
        <path
          d="M10 14h8M10 18h6"
          stroke="#059669"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="24" cy="24" r="6" fill="white" />
        <path
          d="M24 21v6M21 24h6"
          stroke="#10b981"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <span className={`font-semibold tracking-tight ${text}`}>FileAI</span>
      )}
    </div>
  );
}

export function LogoIcon({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logoIconGradient)" />
      <path
        d="M9 6h9l5 5v14c0 1-1 2-2 2H9c-1 0-2-1-2-2V8c0-1 1-2 2-2z"
        fill="white"
        opacity="0.95"
      />
      <path
        d="M18 6v5h5"
        fill="none"
        stroke="white"
        strokeWidth="1"
        opacity="0.5"
      />
      <path
        d="M10 14h8M10 18h6"
        stroke="#059669"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="6" fill="white" />
      <path
        d="M24 21v6M21 24h6"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
