import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Users, TrendingUp, Activity, DollarSign, Eye, Coins, BarChart3, Target, Percent } from "lucide-react";

interface AdminStats {
  summary: {
    totalUsers: number;
    totalTrades: number;
    openPositions: number;
    closedPositions: number;
    liquidatedPositions: number;
    totalVolume: number;
    totalMarkets: number;
    totalVisits: number;
    uniqueVisitors: number;
    visitsToday: number;
    uniqueVisitorsToday: number;
    totalStlr: number;
    totalRealizedPnl: number;
    avgLeverage: number;
    winRate: number;
    winningTrades: number;
    losingTrades: number;
    openInterest: number;
    avgPositionSize: number;
    dailyTraders: number;
    tradesToday: number;
    platformEdge: number;
    topMarketName: string;
    totalReferrals: number;
    totalReferralStlr: number;
  };
  users: Array<{
    wallet: string;
    balance: number;
    trades: number;
    openPositions: number;
    pnl: number;
    stlr: number;
    joined: string;
  }>;
  recentTrades: Array<{
    id: number;
    wallet: string;
    market: string;
    side: string;
    size: number;
    leverage: number;
    status: string;
    pnl: number;
    date: string;
  }>;
  markets: Array<{
    id: number;
    question: string;
    category: string;
    probability: number;
    volume: number;
    status: string;
  }>;
  referrals: Array<{
    wallet: string;
    referralCode: string;
    referralCount: number;
    referralStlrEarned: number;
    stlr: number;
    balance: number;
  }>;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export default function Admin() {
  const [password, setPassword] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'trades' | 'markets' | 'referrals'>('users');
  
  // Set balance form state
  const [balanceWallet, setBalanceWallet] = useState("");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceMessage, setBalanceMessage] = useState("");
  
  // Set STLR form state
  const [stlrWallet, setStlrWallet] = useState("");
  const [stlrAmount, setStlrAmount] = useState("");
  const [stlrLoading, setStlrLoading] = useState(false);
  const [stlrMessage, setStlrMessage] = useState("");
  
  // Clipboard toast
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Invalid password");
        setStats(null);
      } else {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      setError("Failed to fetch stats");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (stats) {
      // Auto-refresh every 5 seconds for live monitoring
      const interval = setInterval(fetchStats, 5000);
      return () => clearInterval(interval);
    }
  }, [stats, password]);

  const handleSetBalance = async () => {
    if (!balanceWallet || !balanceAmount) {
      setBalanceMessage("Please enter wallet address and balance amount");
      return;
    }
    
    setBalanceLoading(true);
    setBalanceMessage("");
    
    try {
      const res = await fetch("/api/admin/set-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          password, 
          walletAddress: balanceWallet, 
          balance: parseFloat(balanceAmount) 
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setBalanceMessage(data.message);
        setBalanceWallet("");
        setBalanceAmount("");
        fetchStats(); // Refresh stats
      } else {
        setBalanceMessage(data.message || "Failed to set balance");
      }
    } catch {
      setBalanceMessage("Error setting balance");
    }
    
    setBalanceLoading(false);
  };

  const handleSetStlr = async () => {
    if (!stlrWallet || !stlrAmount) {
      setStlrMessage("Please enter wallet address and STLR amount");
      return;
    }
    
    setStlrLoading(true);
    setStlrMessage("");
    
    try {
      const res = await fetch("/api/admin/set-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          password, 
          walletAddress: stlrWallet, 
          stlrPoints: parseInt(stlrAmount)
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStlrMessage(data.message || `STLR set to ${stlrAmount}`);
        setStlrWallet("");
        setStlrAmount("");
        fetchStats();
      } else {
        setStlrMessage(data.message || "Failed to set STLR");
      }
    } catch {
      setStlrMessage("Error setting STLR");
    }
    
    setStlrLoading(false);
  };

  const copyWalletToClipboard = async (wallet: string) => {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopiedWallet(wallet);
      setTimeout(() => setCopiedWallet(null), 2000);
    } catch {
      console.error("Failed to copy wallet");
    }
  };

  if (!stats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black border border-[#66ff66]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#66ff66] font-mono">
              <Lock className="w-5 h-5" />
              ADMIN ACCESS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black border-[#66ff66]/30 text-[#66ff66] font-mono"
              data-testid="input-admin-password"
              onKeyDown={(e) => e.key === "Enter" && fetchStats()}
            />
            {error && <p className="text-red-500 font-mono text-sm">{error}</p>}
            <Button
              onClick={fetchStats}
              disabled={loading || !password}
              className="w-full bg-[#66ff66]/20 text-[#66ff66] border border-[#66ff66]/50 font-mono"
              data-testid="button-admin-login"
            >
              {loading ? "LOADING..." : "ACCESS DASHBOARD"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-2 md:p-4 font-mono">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-lg md:text-2xl text-[#66ff66]">SETTLR ADMIN</h1>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStats}
              className="text-[#66ff66]/70"
              data-testid="button-refresh-stats"
            >
              REFRESH
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (confirm("Fix excessive balances (>$5M → $10k) and STLR (>5M → 1M)?")) {
                  const res = await fetch("/api/admin/reset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password, action: "fix_corrupted" }),
                  });
                  const data = await res.json();
                  alert(data.message || data.error);
                  fetchStats();
                }
              }}
              className="text-[#ffaa00] border border-[#ffaa00]/50"
              data-testid="button-fix-corrupted"
            >
              FIX CORRUPTED
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (confirm("DANGER: This will close ALL user-made markets and force-close all positions in them. Users will receive margin refunds. Continue?")) {
                  const res = await fetch("/api/admin/close-user-markets", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    alert(`Closed ${data.marketsDeleted} markets, ${data.positionsClosed} positions. Refunded $${data.totalRefunded} to ${data.affectedUsers} users.`);
                  } else {
                    alert(data.message || "Failed to close markets");
                  }
                  fetchStats();
                }
              }}
              className="text-red-500 border border-red-500/50"
              data-testid="button-close-user-markets"
            >
              CLOSE USER MARKETS
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStats(null)}
              className="text-[#66ff66]/70"
              data-testid="button-admin-logout"
            >
              LOGOUT
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <Card className="bg-black border border-[#88ffff]/30">
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#88ffff] text-sm">SET BALANCE:</span>
                <Input
                  placeholder="Wallet address (0x...)"
                  value={balanceWallet}
                  onChange={(e) => setBalanceWallet(e.target.value)}
                  className="flex-1 min-w-[150px] bg-black border-[#88ffff]/30 text-[#88ffff] font-mono text-sm"
                  data-testid="input-balance-wallet"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="w-28 bg-black border-[#88ffff]/30 text-[#88ffff] font-mono text-sm"
                  data-testid="input-balance-amount"
                />
                <Button
                  size="sm"
                  onClick={handleSetBalance}
                  disabled={balanceLoading}
                  className="bg-[#88ffff]/20 text-[#88ffff] border border-[#88ffff]/50"
                  data-testid="button-set-balance"
                >
                  {balanceLoading ? "..." : "SET"}
                </Button>
                {balanceMessage && (
                  <span className={`text-sm ${balanceMessage.includes("Failed") || balanceMessage.includes("Error") ? "text-red-500" : "text-green-500"}`}>
                    {balanceMessage}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-black border border-[#ffaa00]/30">
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#ffaa00] text-sm">SET STLR:</span>
                <Input
                  placeholder="Wallet address (0x...)"
                  value={stlrWallet}
                  onChange={(e) => setStlrWallet(e.target.value)}
                  className="flex-1 min-w-[150px] bg-black border-[#ffaa00]/30 text-[#ffaa00] font-mono text-sm"
                  data-testid="input-stlr-wallet"
                />
                <Input
                  type="number"
                  placeholder="STLR"
                  value={stlrAmount}
                  onChange={(e) => setStlrAmount(e.target.value)}
                  className="w-28 bg-black border-[#ffaa00]/30 text-[#ffaa00] font-mono text-sm"
                  data-testid="input-stlr-amount"
                />
                <Button
                  size="sm"
                  onClick={handleSetStlr}
                  disabled={stlrLoading}
                  className="bg-[#ffaa00]/20 text-[#ffaa00] border border-[#ffaa00]/50"
                  data-testid="button-set-stlr"
                >
                  {stlrLoading ? "..." : "SET"}
                </Button>
                {stlrMessage && (
                  <span className={`text-sm ${stlrMessage.includes("Failed") || stlrMessage.includes("Error") ? "text-red-500" : "text-green-500"}`}>
                    {stlrMessage}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {copiedWallet && (
          <div className="fixed bottom-4 right-4 bg-[#66ff66] text-black px-4 py-2 rounded font-mono text-sm z-50">
            Copied: {copiedWallet.slice(0, 10)}...
          </div>
        )}

        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <Card className="bg-black border border-[#66ff66]/30">
            <CardContent className="p-2 md:p-4 text-center">
              <Users className="w-4 h-4 md:w-6 md:h-6 text-[#66ff66] mx-auto mb-1" />
              <p className="text-lg md:text-2xl text-[#88ffff]" data-testid="stat-total-users">{stats.summary.totalUsers}</p>
              <p className="text-[10px] md:text-xs text-[#66ff66]/70">USERS</p>
            </CardContent>
          </Card>
          <Card className="bg-black border border-[#66ff66]/30">
            <CardContent className="p-2 md:p-4 text-center">
              <Eye className="w-4 h-4 md:w-6 md:h-6 text-[#66ff66] mx-auto mb-1" />
              <p className="text-lg md:text-2xl text-[#88ffff]">{formatNumber(stats.summary.uniqueVisitors)}</p>
              <p className="text-[10px] md:text-xs text-[#66ff66]/70">VISITORS</p>
            </CardContent>
          </Card>
          <Card className="bg-black border border-[#66ff66]/30">
            <CardContent className="p-2 md:p-4 text-center">
              <Activity className="w-4 h-4 md:w-6 md:h-6 text-[#66ff66] mx-auto mb-1" />
              <p className="text-lg md:text-2xl text-[#88ffff]" data-testid="stat-total-trades">{stats.summary.totalTrades}</p>
              <p className="text-[10px] md:text-xs text-[#66ff66]/70">TRADES</p>
            </CardContent>
          </Card>
          <Card className="bg-black border border-[#66ff66]/30">
            <CardContent className="p-2 md:p-4 text-center">
              <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-[#66ff66] mx-auto mb-1" />
              <p className="text-lg md:text-2xl text-[#88ffff]">{stats.summary.openPositions}</p>
              <p className="text-[10px] md:text-xs text-[#66ff66]/70">OPEN</p>
            </CardContent>
          </Card>
          <Card className="bg-black border border-[#66ff66]/30">
            <CardContent className="p-2 md:p-4 text-center">
              <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-[#66ff66] mx-auto mb-1" />
              <p className="text-lg md:text-2xl text-[#88ffff]">${formatNumber(stats.summary.totalVolume)}</p>
              <p className="text-[10px] md:text-xs text-[#66ff66]/70">VOLUME</p>
            </CardContent>
          </Card>
          <Card className="bg-black border border-[#66ff66]/30">
            <CardContent className="p-2 md:p-4 text-center">
              <Coins className="w-4 h-4 md:w-6 md:h-6 text-[#ffaa00] mx-auto mb-1" />
              <p className="text-lg md:text-2xl text-[#ffaa00]">{formatNumber(stats.summary.totalStlr)}</p>
              <p className="text-[10px] md:text-xs text-[#66ff66]/70">STLR</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-center text-xs">
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded">
            <span className="text-[#88ffff]">{stats.summary.visitsToday}</span>
            <span className="text-[#66ff66]/50 ml-1">visits today</span>
          </div>
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded">
            <span className="text-[#88ffff]">{stats.summary.uniqueVisitorsToday}</span>
            <span className="text-[#66ff66]/50 ml-1">unique today</span>
          </div>
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded">
            <span className="text-[#88ffff]">{stats.summary.closedPositions}</span>
            <span className="text-[#66ff66]/50 ml-1">closed</span>
          </div>
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded">
            <span className="text-red-500">{stats.summary.liquidatedPositions}</span>
            <span className="text-[#66ff66]/50 ml-1">liquidated</span>
          </div>
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded">
            <span className="text-[#88ffff]">{stats.summary.avgLeverage}x</span>
            <span className="text-[#66ff66]/50 ml-1">avg leverage</span>
          </div>
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded">
            <span className={stats.summary.totalRealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}>
              {stats.summary.totalRealizedPnl >= 0 ? '+' : ''}{formatNumber(stats.summary.totalRealizedPnl)}
            </span>
            <span className="text-[#66ff66]/50 ml-1">realized PnL</span>
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded">
            <span className="text-green-500">{stats.summary.winningTrades}</span>
            <span className="text-[#66ff66]/50 ml-1">wins</span>
          </div>
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded">
            <span className="text-red-500">{stats.summary.losingTrades}</span>
            <span className="text-[#66ff66]/50 ml-1">losses</span>
          </div>
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded">
            <span className="text-[#88ffff]">{stats.summary.winRate}%</span>
            <span className="text-[#66ff66]/50 ml-1">win rate</span>
          </div>
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded">
            <span className="text-[#88ffff]">${formatNumber(stats.summary.openInterest)}</span>
            <span className="text-[#66ff66]/50 ml-1">open interest</span>
          </div>
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded">
            <span className="text-[#88ffff]">{stats.summary.dailyTraders}</span>
            <span className="text-[#66ff66]/50 ml-1">traders today</span>
          </div>
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded">
            <span className={stats.summary.platformEdge >= 0 ? 'text-green-500' : 'text-red-500'}>
              {stats.summary.platformEdge >= 0 ? '+' : ''}${formatNumber(stats.summary.platformEdge)}
            </span>
            <span className="text-[#66ff66]/50 ml-1">platform edge</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded">
            <span className="text-[#88ffff]">${stats.summary.avgPositionSize}</span>
            <span className="text-[#66ff66]/50 ml-1">avg size</span>
          </div>
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded">
            <span className="text-[#88ffff]">{stats.summary.tradesToday}</span>
            <span className="text-[#66ff66]/50 ml-1">trades today</span>
          </div>
          <div className="bg-black/50 border border-[#66ff66]/20 p-2 rounded col-span-2">
            <span className="text-[#ffaa00]">{stats.summary.topMarketName}</span>
            <span className="text-[#66ff66]/50 ml-1">top market</span>
          </div>
        </div>

        <div className="flex gap-2 border-b border-[#66ff66]/20 pb-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('users')}
            className={activeTab === 'users' ? 'text-[#66ff66] bg-[#66ff66]/10' : 'text-[#66ff66]/50'}
          >
            <Users className="w-4 h-4 mr-1" /> Users ({stats.users.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('trades')}
            className={activeTab === 'trades' ? 'text-[#66ff66] bg-[#66ff66]/10' : 'text-[#66ff66]/50'}
          >
            <Activity className="w-4 h-4 mr-1" /> Trades
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('markets')}
            className={activeTab === 'markets' ? 'text-[#66ff66] bg-[#66ff66]/10' : 'text-[#66ff66]/50'}
          >
            <BarChart3 className="w-4 h-4 mr-1" /> Markets ({stats.summary.totalMarkets})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('referrals')}
            className={activeTab === 'referrals' ? 'text-[#88ffff] bg-[#88ffff]/10' : 'text-[#88ffff]/50'}
            data-testid="button-tab-referrals"
          >
            <Target className="w-4 h-4 mr-1" /> Referrals ({stats.referrals?.length || 0})
          </Button>
        </div>

        {activeTab === 'users' && (
          <Card className="bg-black border border-[#66ff66]/30">
            <CardContent className="p-2 md:p-4">
              <p className="text-[#66ff66]/70 text-sm mb-2">
                Total: {stats.summary.totalUsers} users | Use summary stats above for overview
              </p>
              <p className="text-[#66ff66]/50 text-xs">
                Individual wallet list removed for performance. Use Set Balance/STLR forms below for specific wallets.
              </p>
            </CardContent>
          </Card>
        )}

        {activeTab === 'trades' && (
          <Card className="bg-black border border-[#66ff66]/30">
            <CardContent className="p-2 md:p-4">
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="text-[#66ff66]/70 border-b border-[#66ff66]/20 sticky top-0 bg-black">
                    <tr>
                      <th className="text-left py-2">WALLET</th>
                      <th className="text-left">MARKET</th>
                      <th className="text-right">SIZE</th>
                      <th className="text-right hidden md:table-cell">LEV</th>
                      <th className="text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#88ffff]">
                    {stats.recentTrades.map((t, i) => (
                      <tr key={i} className="border-b border-[#66ff66]/10">
                        <td className="py-2 text-[#66ff66]">{t.wallet}</td>
                        <td className="text-[#88ffff]/70 max-w-[100px] md:max-w-none truncate">{t.market}</td>
                        <td className="text-right">${formatNumber(t.size)}</td>
                        <td className="text-right hidden md:table-cell">{t.leverage}x</td>
                        <td className={`text-right ${
                          t.status === 'open' ? 'text-[#ffaa00]' : 
                          t.status === 'closed' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {t.status.toUpperCase()}
                        </td>
                      </tr>
                    ))}
                    {stats.recentTrades.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-[#66ff66]/50">No trades yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'markets' && (
          <Card className="bg-black border border-[#66ff66]/30">
            <CardContent className="p-2 md:p-4">
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="text-[#66ff66]/70 border-b border-[#66ff66]/20 sticky top-0 bg-black">
                    <tr>
                      <th className="text-left py-2">ID</th>
                      <th className="text-left">MARKET</th>
                      <th className="text-right hidden md:table-cell">CAT</th>
                      <th className="text-right">PROB</th>
                      <th className="text-right hidden md:table-cell">VOL</th>
                      <th className="text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#88ffff]">
                    {stats.markets.map((m) => (
                      <tr key={m.id} className="border-b border-[#66ff66]/10">
                        <td className="py-2 text-[#66ff66]">{m.id}</td>
                        <td className="max-w-[150px] md:max-w-none truncate">{m.question}</td>
                        <td className="text-right hidden md:table-cell text-[#ffaa00]">{m.category}</td>
                        <td className="text-right">{m.probability}%</td>
                        <td className="text-right hidden md:table-cell">${formatNumber(m.volume || 0)}</td>
                        <td className={`text-right ${m.status === 'active' ? 'text-green-500' : 'text-[#66ff66]/50'}`}>
                          {m.status?.toUpperCase()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'referrals' && (
          <Card className="bg-black border border-[#88ffff]/30">
            <CardContent className="p-2 md:p-4">
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div className="bg-black/50 border border-[#88ffff]/20 p-3 rounded text-center">
                  <span className="text-2xl text-[#88ffff]">{stats.summary.totalReferrals || 0}</span>
                  <p className="text-xs text-[#66ff66]/50 mt-1">Total Referrals</p>
                </div>
                <div className="bg-black/50 border border-[#88ffff]/20 p-3 rounded text-center">
                  <span className="text-2xl text-[#ffaa00]">{formatNumber(stats.summary.totalReferralStlr || 0)}</span>
                  <p className="text-xs text-[#66ff66]/50 mt-1">STLR Earned via Referrals</p>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="text-[#88ffff]/70 border-b border-[#88ffff]/20 sticky top-0 bg-black">
                    <tr>
                      <th className="text-left py-2">WALLET</th>
                      <th className="text-left hidden md:table-cell">REF CODE</th>
                      <th className="text-right">REFS</th>
                      <th className="text-right">REF STLR</th>
                      <th className="text-right hidden md:table-cell">TOTAL STLR</th>
                      <th className="text-right hidden lg:table-cell">BALANCE</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#88ffff]">
                    {stats.referrals?.map((r, i) => (
                      <tr key={i} className="border-b border-[#88ffff]/10" data-testid={`row-referral-${i}`}>
                        <td 
                          className="py-2 text-[#66ff66] cursor-pointer hover:text-[#88ffff] transition-colors"
                          onClick={() => r.wallet && copyWalletToClipboard(r.wallet)}
                          title={r.wallet || 'No wallet'}
                          data-testid={`referral-wallet-copy-${i}`}
                        >
                          {r.wallet?.slice(0, 10)}...
                        </td>
                        <td className="hidden md:table-cell text-[#ffaa00] font-mono">{r.referralCode}</td>
                        <td className="text-right text-[#88ffff]">{r.referralCount}</td>
                        <td className="text-right text-[#ffaa00]">+{formatNumber(r.referralStlrEarned)}</td>
                        <td className="text-right hidden md:table-cell">{formatNumber(r.stlr)}</td>
                        <td className="text-right hidden lg:table-cell">${formatNumber(r.balance)}</td>
                      </tr>
                    ))}
                    {(!stats.referrals || stats.referrals.length === 0) && (
                      <tr><td colSpan={6} className="text-center py-8 text-[#88ffff]/50">No referrals yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
