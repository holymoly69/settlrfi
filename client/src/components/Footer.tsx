import { useLocation } from "wouter";

export function Footer() {
  const [location] = useLocation();
  const isBsc = location.startsWith('/bsc');
  const accentColor = isBsc ? '#f0b90b' : '#66ff66';
  const poweredBy = isBsc ? 'BNB Smart Chain' : 'HyperEVM';

  return (
    <footer 
      className="border-t py-6 font-mono" 
      style={{ borderColor: accentColor, background: '#000000' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs" style={{ color: accentColor, opacity: 0.7 }}>
            Powered by <span className="font-semibold" style={{ color: accentColor }}>{poweredBy}</span>
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: accentColor, opacity: 0.7 }}>
            <a 
              href="https://settlr.finance/docs" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-100 transition-opacity cursor-pointer"
              data-testid="link-docs"
            >
              Docs
            </a>
            <a 
              href="https://x.com/SettlrTrade" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-100 transition-opacity cursor-pointer"
              data-testid="link-twitter"
            >
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
