export default function Logo({ size = 40, showText = true, textColor = "text-blood-700" }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Blood drop shape */}
        <defs>
          <linearGradient id="dropGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#dc2626" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Drop */}
        <path
          d="M24 4 C24 4, 10 20, 10 30 C10 38, 16 44, 24 44 C32 44, 38 38, 38 30 C38 20, 24 4, 24 4 Z"
          fill="url(#dropGradient)"
          filter="url(#dropShadow)"
        />

        {/* Highlight on drop */}
        <ellipse cx="19" cy="26" rx="3" ry="5" fill="white" fillOpacity="0.35" />

        {/* Heartbeat / pulse line inside */}
        <path
          d="M14 30 L18 30 L20 25 L23 35 L26 28 L28 30 L34 30"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {showText && (
        <span className={`text-2xl font-black tracking-tight ${textColor}`}>
          Jeevansh
        </span>
      )}
    </div>
  );
}