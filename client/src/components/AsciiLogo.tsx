export function AsciiLogo({ size = "large" }: { size?: "small" | "large" }) {
  const isLarge = size === "large";
  const mutedGreen = '#66ff66';
  
  const colors = {
    S: '#ff6b6b',
    E: '#ffa500', 
    T1: '#ffff66',
    T2: '#66ff66',
    L: '#66b3ff',
    R: '#cc66ff'
  };
  
  if (isLarge) {
    return (
      <div className="font-mono text-center leading-none select-none">
        <pre className="inline-block text-left text-xs sm:text-sm leading-tight whitespace-pre">
          <span style={{ color: colors.S }}>SSSS  </span>
          <span style={{ color: colors.E }}>EEEEE  </span>
          <span style={{ color: colors.T1 }}>TTTTT  </span>
          <span style={{ color: colors.T2 }}>TTTTT  </span>
          <span style={{ color: colors.L }}>L     </span>
          <span style={{ color: colors.R }}>RRRR</span>{"\n"}
          <span style={{ color: colors.S }}>S     </span>
          <span style={{ color: colors.E }}>E        </span>
          <span style={{ color: colors.T1 }}>T      </span>
          <span style={{ color: colors.T2 }}>T    </span>
          <span style={{ color: colors.L }}>L     </span>
          <span style={{ color: colors.R }}>R   R</span>{"\n"}
          <span style={{ color: colors.S }}>SSSS  </span>
          <span style={{ color: colors.E }}>EEE      </span>
          <span style={{ color: colors.T1 }}>T      </span>
          <span style={{ color: colors.T2 }}>T    </span>
          <span style={{ color: colors.L }}>L     </span>
          <span style={{ color: colors.R }}>RRRR</span>{"\n"}
          <span style={{ color: colors.S }}>    S </span>
          <span style={{ color: colors.E }}>E        </span>
          <span style={{ color: colors.T1 }}>T      </span>
          <span style={{ color: colors.T2 }}>T    </span>
          <span style={{ color: colors.L }}>L     </span>
          <span style={{ color: colors.R }}>R  R</span>{"\n"}
          <span style={{ color: colors.S }}>SSSS  </span>
          <span style={{ color: colors.E }}>EEEEE    </span>
          <span style={{ color: colors.T1 }}>T      </span>
          <span style={{ color: colors.T2 }}>T    </span>
          <span style={{ color: colors.L }}>LLLLL </span>
          <span style={{ color: colors.R }}>R   R</span>
        </pre>
        <div className="mt-4 text-sm" style={{ color: mutedGreen }}>
          Leveraged Event Contracts on Hyperliquid
        </div>
        <div className="mt-1 text-xs" style={{ color: mutedGreen, opacity: 0.8 }}>
          Up to 50x on real-world outcomes
        </div>
      </div>
    );
  }

  return (
    <div className="font-mono flex items-center select-none">
      <span className="text-lg font-bold tracking-wider">
        <span style={{ color: colors.S }}>S</span>
        <span style={{ color: colors.E }}>E</span>
        <span style={{ color: colors.T1 }}>T</span>
        <span style={{ color: colors.T2 }}>T</span>
        <span style={{ color: colors.L }}>L</span>
        <span style={{ color: colors.R }}>R</span>
      </span>
    </div>
  );
}

export function TerminalFrame({ title, children }: { title?: string; children: React.ReactNode }) {
  const mutedGreen = '#66ff66';
  const topBorder = title 
    ? `┌─[ ${title} ]${'─'.repeat(Math.max(0, 60 - title.length))}┐`
    : `┌${'─'.repeat(66)}┐`;
  
  return (
    <div className="font-mono text-sm" style={{ color: mutedGreen }}>
      <div className="whitespace-pre">{topBorder}</div>
      <div className="border-l border-r px-2 py-1" style={{ borderColor: mutedGreen }}>
        {children}
      </div>
      <div className="whitespace-pre">└{'─'.repeat(66)}┘</div>
    </div>
  );
}

export function BlinkingCursor() {
  return <span className="blink">_</span>;
}

export function TerminalPrompt({ children }: { children: React.ReactNode }) {
  const mutedGreen = '#66ff66';
  return (
    <span style={{ color: mutedGreen }}>
      <span className="opacity-70">&gt; </span>
      {children}
      <BlinkingCursor />
    </span>
  );
}
