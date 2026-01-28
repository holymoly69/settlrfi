import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BscNavbar } from "@/components/bsc/BscNavbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Users, TrendingUp, TrendingDown, ArrowRight, Trophy, Wallet, User, Check, AlertCircle, Copy, Link2, Gift } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ActivityItem {
  id: number;
  timestamp: string;
  type: "trade";
  side: "YES" | "NO";
  size: number;
  price: number;
  user: {
    address: string;
    displayName: string;
  };
  market: {
    id: number;
    question: string;
  };
}

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  displayName: string;
  stlrPoints: number;
  weeklyPnl: number;
}

interface ProfileData {
  walletAddress: string;
  displayName: string;
  createdAt: string | null;
}

function formatSize(size: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(size);
}

function formatRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "recently";
  }
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}${formatNumber(pnl)}`;
}

function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getRankColor(rank: number): string {
  if (rank === 1) return "#ffd700";
  if (rank === 2) return "#c0c0c0";
  if (rank === 3) return "#cd7f32";
  return "#666666";
}

function ProfileSection({ walletAddress }: { walletAddress: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/profile", walletAddress],
    enabled: !!walletAddress,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (displayName: string) => {
      const response = await apiRequest("POST", "/api/profile", { displayName });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile", walletAddress] });
      setIsEditing(false);
      setNewUsername("");
      setError(null);
      toast({
        title: "Username updated",
        description: "Your new username is now visible to other traders.",
      });
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to update username");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newUsername.length < 3 || newUsername.length > 20) {
      setError("Username must be 3-20 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      setError("Only letters, numbers, and underscores allowed");
      return;
    }

    updateProfileMutation.mutate(newUsername);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#f0b90b' }} />
      </div>
    );
  }

  return (
    <Card className="p-4 mb-6 bg-card" style={{ borderColor: '#f0b90b' }}>
      <div className="flex items-center gap-3 mb-3">
        <User className="w-5 h-5" style={{ color: '#f0b90b' }} />
        <h2 className="text-lg font-medium" style={{ color: '#f0b90b' }}>Your Profile</h2>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs mb-1" style={{ color: '#666666' }}>Username</p>
            <p className="font-mono text-sm" style={{ color: '#ffffff' }} data-testid="text-current-username">
              {profile?.displayName || truncateAddress(walletAddress)}
            </p>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(true);
                setNewUsername(profile?.displayName || "");
              }}
              className="font-mono"
              style={{ borderColor: '#f0b90b', color: '#f0b90b' }}
              data-testid="button-edit-username"
            >
              &gt; edit
            </Button>
          )}
        </div>

        {isEditing && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter username"
                className="font-mono bg-black text-white"
                style={{ borderColor: '#444444' }}
                maxLength={20}
                data-testid="input-new-username"
              />
              <p className="text-xs mt-1" style={{ color: '#666666' }}>
                3-20 characters. Letters, numbers, underscores only.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm" style={{ color: '#ff6666' }}>
                <AlertCircle className="w-4 h-4" />
                <span data-testid="text-username-error">{error}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={updateProfileMutation.isPending}
                className="font-mono"
                style={{ backgroundColor: '#f0b90b', color: '#000000' }}
                data-testid="button-save-username"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    save
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setNewUsername("");
                  setError(null);
                }}
                className="font-mono"
                style={{ color: '#666666' }}
                data-testid="button-cancel-username"
              >
                cancel
              </Button>
            </div>
          </form>
        )}

        <div>
          <p className="text-xs mb-1" style={{ color: '#666666' }}>Wallet</p>
          <p className="font-mono text-xs" style={{ color: '#444444' }} data-testid="text-wallet-address">
            {walletAddress}
          </p>
        </div>
      </div>
    </Card>
  );
}

interface ReferralStats {
  referralCode: string;
  referralCount: number;
  referralStlrEarned: number;
  isOnboarded: boolean;
}

function ReferralSection() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: stats, isLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/referral/stats"],
  });

  const copyReferralLink = async () => {
    if (!stats?.referralCode) return;
    
    const referralUrl = `${window.location.origin}/bsc?ref=${stats.referralCode}`;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share with friends to earn STLR",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#f0b90b' }} />
      </div>
    );
  }

  if (!stats?.isOnboarded) {
    return (
      <Card className="p-4 mb-6 bg-card" style={{ borderColor: '#444444' }}>
        <div className="flex items-center gap-3 mb-3">
          <Gift className="w-5 h-5" style={{ color: '#888888' }} />
          <h2 className="text-lg font-medium" style={{ color: '#888888' }}>Referral Program</h2>
        </div>
        <p className="text-sm" style={{ color: '#666666' }}>
          Complete onboarding to unlock your referral link and earn STLR for every friend you bring!
        </p>
        <div className="mt-3 text-xs" style={{ color: '#444444' }}>
          Requirements: Follow X, Join Telegram, Make first trade
        </div>
      </Card>
    );
  }

  const referralUrl = `${window.location.origin}/bsc?ref=${stats.referralCode}`;

  return (
    <Card className="p-4 mb-6 bg-card" style={{ borderColor: '#f0b90b' }}>
      <div className="flex items-center gap-3 mb-3">
        <Link2 className="w-5 h-5" style={{ color: '#88ffff' }} />
        <h2 className="text-lg font-medium" style={{ color: '#88ffff' }}>Referral Program</h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-xs mb-2" style={{ color: '#666666' }}>Your Referral Link</p>
          <div className="flex items-center gap-2">
            <div 
              className="flex-1 px-3 py-2 rounded-md font-mono text-xs truncate"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid #444444', color: '#ffffff' }}
              data-testid="text-referral-link"
            >
              {referralUrl}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyReferralLink}
              className="font-mono shrink-0"
              style={{ borderColor: '#88ffff', color: '#88ffff' }}
              data-testid="button-copy-referral"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-xs mb-1" style={{ color: '#666666' }}>Referrals</p>
            <p className="font-mono text-lg font-bold" style={{ color: '#f0b90b' }} data-testid="text-referral-count">
              {stats.referralCount}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs mb-1" style={{ color: '#666666' }}>STLR Earned</p>
            <p className="font-mono text-lg font-bold" style={{ color: '#88ffff' }} data-testid="text-referral-stlr">
              {formatNumber(stats.referralStlrEarned)}
            </p>
          </div>
        </div>

        <div className="text-xs" style={{ color: '#666666' }}>
          Earn 1,000 STLR for each friend who completes onboarding + 5% of all STLR they earn!
        </div>
      </div>
    </Card>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const isTopThree = entry.rank <= 3;
  const rankColor = getRankColor(entry.rank);
  const pnlColor = entry.weeklyPnl >= 0 ? "#66ff66" : "#ff6666";
  
  return (
    <div 
      className="flex items-center gap-2 p-3 hover-elevate rounded-md font-mono"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      data-testid={`row-leaderboard-${entry.rank}`}
    >
      <div className="w-10 flex-shrink-0 flex items-center justify-center">
        {isTopThree ? (
          <Trophy className="w-4 h-4" style={{ color: rankColor }} />
        ) : (
          <span className="text-sm" style={{ color: rankColor }} data-testid={`text-rank-${entry.rank}`}>
            #{entry.rank}
          </span>
        )}
      </div>
      
      <div className="w-32 flex-shrink-0 overflow-hidden">
        <Link href={`/bsc/profile/${entry.walletAddress}`}>
          <span 
            className="text-sm hover:underline cursor-pointer truncate block"
            style={{ color: '#f0b90b' }}
            data-testid={`text-user-${entry.rank}`}
          >
            {entry.displayName}
          </span>
        </Link>
        <p 
          className="text-xs truncate"
          style={{ color: '#444444' }}
          data-testid={`text-address-${entry.rank}`}
        >
          {truncateAddress(entry.walletAddress)}
        </p>
      </div>
      
      <div className="flex-1 text-right">
        <p 
          className="font-bold text-sm"
          style={{ color: '#f0b90b' }}
          data-testid={`text-stlr-${entry.rank}`}
        >
          {formatNumber(entry.stlrPoints)}
        </p>
        <p className="text-xs" style={{ color: '#444444' }}>STLR</p>
      </div>
      
      <div className="text-right w-28 flex-shrink-0">
        <p 
          className="font-medium text-sm"
          style={{ color: pnlColor }}
          data-testid={`text-pnl-${entry.rank}`}
        >
          {formatPnl(entry.weeklyPnl)}
        </p>
        <p className="text-xs" style={{ color: '#444444' }}>Weekly PnL</p>
      </div>
    </div>
  );
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const isLong = item.side === "YES";
  
  return (
    <Card 
      className="p-4 bg-card hover-elevate"
      style={{ borderColor: '#f0b90b' }}
      data-testid={`card-activity-${item.id}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                className="font-mono text-sm text-muted-foreground"
                data-testid={`text-user-${item.id}`}
              >
                {item.user.displayName}
              </span>
              <span className="text-muted-foreground text-sm">went</span>
              <span 
                className={`font-bold font-mono ${isLong ? "text-primary" : "text-destructive"}`}
                data-testid={`text-side-${item.id}`}
              >
                {isLong ? "LONG" : "SHORT"}
              </span>
              <span 
                className="font-mono font-bold"
                data-testid={`text-size-${item.id}`}
              >
                {formatSize(item.size)}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <span className="text-muted-foreground text-sm">on</span>
              <Link href={`/bsc/market/${item.market.id}`}>
                <span 
                  className="text-sm font-medium hover:underline cursor-pointer truncate max-w-[300px] inline-block"
                  data-testid={`link-market-${item.id}`}
                >
                  '{item.market.question}'
                </span>
              </Link>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1">
              {isLong ? (
                <TrendingUp className="w-4 h-4 text-primary" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              <span 
                className="font-mono text-sm"
                data-testid={`text-price-${item.id}`}
              >
                @ {item.price}%
              </span>
            </div>
            <span 
              className="text-xs text-muted-foreground"
              data-testid={`text-time-${item.id}`}
            >
              {formatRelativeTime(item.timestamp)}
            </span>
          </div>
        </div>
        
        <Link href={`/bsc/market/${item.market.id}`}>
          <div 
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            data-testid={`link-view-market-${item.id}`}
          >
            View market <ArrowRight className="w-3 h-3" />
          </div>
        </Link>
      </div>
    </Card>
  );
}

export default function BscSocial() {
  const [activeTab, setActiveTab] = useState<"activity" | "leaderboard">("activity");
  const { isAuthenticated, connect, isConnecting, user } = useAuth();
  
  const { data: feed, isLoading: feedLoading, error: feedError } = useQuery<ActivityItem[]>({
    queryKey: ["/api/activity/feed"],
    refetchInterval: 30000,
  });

  const { data: leaderboard, isLoading: leaderboardLoading, error: leaderboardError } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 60000,
  });

  return (
    <div className="min-h-screen flex flex-col font-mono" style={{ backgroundColor: '#000000' }}>
      <BscNavbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6" style={{ color: '#f0b90b' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#f0b90b' }} data-testid="text-social-title">
            Social
          </h1>
        </div>

        {!isAuthenticated && (
          <div 
            className="p-4 mb-6 rounded-md flex items-center justify-between gap-4"
            style={{ border: '1px solid #f0b90b', backgroundColor: 'rgba(240, 185, 11, 0.05)' }}
            data-testid="connect-wallet-prompt"
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5" style={{ color: '#f0b90b' }} />
              <div>
                <p className="text-sm" style={{ color: '#f0b90b' }}>Connect your wallet to join the community</p>
                <p className="text-xs" style={{ color: '#666666' }}>Start trading and earn STLR points</p>
              </div>
            </div>
            <button
              onClick={() => connect()}
              disabled={isConnecting}
              className="px-4 py-2 text-sm transition-all"
              style={{
                backgroundColor: '#f0b90b',
                color: '#000000',
                border: '1px solid #f0b90b'
              }}
              data-testid="button-connect-social"
            >
              {isConnecting ? "Connecting..." : "> connect wallet"}
            </button>
          </div>
        )}

        {isAuthenticated && user?.walletAddress && (
          <ProfileSection walletAddress={user.walletAddress} />
        )}

        {isAuthenticated && (
          <ReferralSection />
        )}

        <div className="flex gap-4 mb-6" data-testid="tabs-social">
          <button
            onClick={() => setActiveTab("activity")}
            className="px-4 py-2 text-sm transition-all"
            style={{
              backgroundColor: activeTab === "activity" ? '#f0b90b' : 'transparent',
              color: activeTab === "activity" ? '#000000' : '#f0b90b',
              border: '1px solid #f0b90b'
            }}
            data-testid="tab-activity"
          >
            &gt; Activity Feed
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className="px-4 py-2 text-sm transition-all"
            style={{
              backgroundColor: activeTab === "leaderboard" ? '#f0b90b' : 'transparent',
              color: activeTab === "leaderboard" ? '#000000' : '#f0b90b',
              border: '1px solid #f0b90b'
            }}
            data-testid="tab-leaderboard"
          >
            &gt; STLR Leaderboard
          </button>
        </div>

        {activeTab === "activity" && (
          <>
            <p className="text-sm mb-6" style={{ color: '#666666' }} data-testid="text-social-description">
              See what traders are doing across all markets in real-time.
            </p>

            {feedLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#f0b90b' }} />
              </div>
            )}

            {feedError && (
              <div 
                className="p-6 text-center border-dashed border-2 rounded-md"
                style={{ borderColor: '#ff6666', backgroundColor: 'transparent' }}
                data-testid="card-error"
              >
                <p style={{ color: '#ff6666' }}>Failed to load activity feed. Please try again.</p>
              </div>
            )}

            {!feedLoading && !feedError && feed && feed.length === 0 && (
              <div 
                className="p-8 text-center border-dashed border-2 rounded-md"
                style={{ borderColor: '#444444', backgroundColor: 'transparent' }}
                data-testid="card-empty"
              >
                <div 
                  className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(240, 185, 11, 0.1)' }}
                >
                  <Users className="w-6 h-6" style={{ color: '#f0b90b' }} />
                </div>
                <h3 className="text-lg font-medium mb-1" style={{ color: '#f0b90b' }}>No activity yet</h3>
                <p className="mb-4" style={{ color: '#666666' }}>Be the first to make a trade and show up here!</p>
                <Link href="/bsc">
                  <span className="hover:underline cursor-pointer" style={{ color: '#f0b90b' }} data-testid="link-explore">
                    &gt; Explore Markets
                  </span>
                </Link>
              </div>
            )}

            {!feedLoading && !feedError && feed && feed.length > 0 && (
              <div className="space-y-3" data-testid="list-activity">
                {feed.map((item) => (
                  <ActivityCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "leaderboard" && (
          <>
            <p className="text-sm mb-6" style={{ color: '#666666' }} data-testid="text-leaderboard-description">
              Top traders ranked by their STLR points. Earn points by trading and completing tasks.
            </p>

            {leaderboardLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#f0b90b' }} />
              </div>
            )}

            {leaderboardError && (
              <div 
                className="p-6 text-center border-dashed border-2 rounded-md"
                style={{ borderColor: '#ff6666', backgroundColor: 'transparent' }}
              >
                <p style={{ color: '#ff6666' }}>Failed to load leaderboard. Please try again.</p>
              </div>
            )}

            {!leaderboardLoading && !leaderboardError && leaderboard && leaderboard.length > 0 && (
              <div className="space-y-2" data-testid="list-leaderboard">
                {leaderboard.map((entry) => (
                  <LeaderboardRow key={entry.rank} entry={entry} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
