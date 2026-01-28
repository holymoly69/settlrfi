import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { usePositions } from "@/hooks/use-markets";
import { AsciiLogo } from "@/components/AsciiLogo";
import { Loader2, Menu, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated, connect, isConnecting, logout } = useAuth();
  const { data: positions } = usePositions();
  const openPositionCount = positions?.filter((p) => p.status === "open").length || 0;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  const handleConnect = () => {
    connect(undefined, {
      onError: (error: Error) => {
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect wallet. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const isActive = (path: string) => location === path;

  const formatBalance = (balance: string | undefined) => {
    if (!balance) return "$0.00";
    const num = parseFloat(balance);
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(num);
  };

  const formatAddress = (address: string | undefined) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const navItems = [
    { path: "/", label: "markets", testId: "link-markets" },
    { path: "/combos", label: "combos", testId: "link-combos" },
    { path: "/social", label: "social", testId: "link-social" },
    { path: "/portfolio", label: "positions", testId: "link-portfolio", showBadge: true },
    { path: "/earn", label: "earn", testId: "link-earn", highlightCyan: true },
  ];

  return (
    <>
      <nav 
        className="border-b sticky top-0 z-50 font-mono"
        style={{ 
          backgroundColor: '#000000', 
          borderColor: '#444444' 
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center">
                <AsciiLogo size="small" />
              </Link>

              <div className="hidden sm:flex items-center gap-6">
                {navItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <span 
                      className="cursor-pointer transition-all relative"
                      style={{ 
                        color: isActive(item.path) 
                          ? (item.highlightCyan ? '#88ffff' : '#66ff66')
                          : (item.highlightCyan ? 'rgba(136, 255, 255, 0.6)' : 'rgba(102, 255, 102, 0.5)')
                      }}
                      data-testid={item.testId}
                    >
                      <span style={{ color: '#444444' }}>&gt; </span>
                      {item.label}
                      {item.showBadge && openPositionCount > 0 && (
                        <span 
                          className="ml-1 text-xs"
                          style={{ color: '#66ff66' }}
                          data-testid="badge-open-positions"
                        >
                          [{openPositionCount}]
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end font-mono">
                    <span 
                      className="text-sm font-bold"
                      style={{ color: '#66ff66' }}
                      data-testid="text-balance"
                    >
                      {formatBalance(user?.balance)}
                    </span>
                    <span 
                      className="text-xs"
                      style={{ color: '#444444' }}
                      data-testid="text-wallet-address"
                    >
                      {formatAddress(user?.walletAddress)}
                    </span>
                  </div>
                  <button 
                    onClick={() => logout()}
                    className="font-mono text-sm transition-colors px-3 py-1.5 border"
                    style={{ 
                      color: '#66ff66',
                      borderColor: '#444444',
                      backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#ff6666';
                      e.currentTarget.style.color = '#ff6666';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#444444';
                      e.currentTarget.style.color = '#66ff66';
                    }}
                    data-testid="button-logout"
                  >
                    &gt; logout
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="font-mono text-sm transition-all px-4 py-2 border disabled:opacity-50"
                  style={{ 
                    color: '#66ff66',
                    borderColor: '#66ff66',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isConnecting) {
                      e.currentTarget.style.backgroundColor = '#66ff66';
                      e.currentTarget.style.color = '#000000';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#66ff66';
                  }}
                  data-testid="button-connect-wallet"
                >
                  {isConnecting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      connecting...
                    </span>
                  ) : (
                    "> connect wallet"
                  )}
                </button>
              )}

              <button
                className="sm:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{ color: '#66ff66' }}
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div 
            className="sm:hidden border-t font-mono"
            style={{ backgroundColor: '#000000', borderColor: '#444444' }}
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <div 
                    className="py-2 cursor-pointer"
                    style={{ 
                      color: isActive(item.path) 
                        ? (item.highlightCyan ? '#88ffff' : '#66ff66')
                        : (item.highlightCyan ? 'rgba(136, 255, 255, 0.6)' : 'rgba(102, 255, 102, 0.5)')
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`mobile-${item.testId}`}
                  >
                    <span style={{ color: '#444444' }}>&gt; </span>
                    {item.label}
                    {item.showBadge && openPositionCount > 0 && (
                      <span className="ml-1 text-xs" style={{ color: '#66ff66' }}>
                        [{openPositionCount}]
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              <Link href="/docs">
                <div 
                  className="py-2 cursor-pointer"
                  style={{ 
                    color: isActive('/docs') ? '#88ffff' : 'rgba(136, 255, 255, 0.6)'
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid="mobile-link-docs"
                >
                  <span style={{ color: '#444444' }}>&gt; </span>
                  docs
                </div>
              </Link>
            </div>
          </div>
        )}
      </nav>

      <div 
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t font-mono"
        style={{ backgroundColor: '#000000', borderColor: '#444444' }}
      >
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <button 
                className="flex flex-col items-center justify-center gap-1 px-3 py-2 relative"
                style={{ 
                  color: isActive(item.path) 
                    ? (item.highlightCyan ? '#88ffff' : '#66ff66')
                    : (item.highlightCyan ? 'rgba(136, 255, 255, 0.6)' : 'rgba(102, 255, 102, 0.5)')
                }}
                data-testid={`mobile-nav-${item.label}`}
              >
                <span className="text-xs">&gt;{item.label}</span>
                {item.showBadge && openPositionCount > 0 && (
                  <span 
                    className="absolute top-0 right-1 text-[9px]"
                    style={{ color: '#66ff66' }}
                  >
                    [{openPositionCount}]
                  </span>
                )}
              </button>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
