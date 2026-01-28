import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Loader2, Trophy } from "lucide-react";
import { Link } from "wouter";

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  displayName: string;
  stlrPoints: number;
  weeklyPnl: number;
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
  if (rank === 1) return "text-yellow-500";
  if (rank === 2) return "text-gray-400";
  if (rank === 3) return "text-amber-600";
  return "text-muted-foreground";
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const isTopThree = entry.rank <= 3;
  const rankColor = getRankColor(entry.rank);
  const pnlColor = entry.weeklyPnl >= 0 ? "text-primary" : "text-destructive";
  
  return (
    <div 
      className="flex items-center gap-4 p-4 hover-elevate rounded-md"
      data-testid={`row-leaderboard-${entry.rank}`}
    >
      <div className="w-12 flex items-center justify-center">
        {isTopThree ? (
          <Trophy className={`w-5 h-5 ${rankColor}`} />
        ) : (
          <span className={`font-mono text-sm ${rankColor}`} data-testid={`text-rank-${entry.rank}`}>
            #{entry.rank}
          </span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${entry.walletAddress}`}>
          <span 
            className="font-medium hover:underline cursor-pointer"
            data-testid={`text-user-${entry.rank}`}
          >
            {entry.displayName}
          </span>
        </Link>
        <p 
          className="text-xs text-muted-foreground font-mono"
          data-testid={`text-address-${entry.rank}`}
        >
          {truncateAddress(entry.walletAddress)}
        </p>
      </div>
      
      <div className="text-right">
        <p 
          className="font-mono font-bold"
          data-testid={`text-stlr-${entry.rank}`}
        >
          {formatNumber(entry.stlrPoints)}
        </p>
        <p className="text-xs text-muted-foreground">STLR</p>
      </div>
      
      <div className="text-right w-24">
        <p 
          className={`font-mono font-medium ${pnlColor}`}
          data-testid={`text-pnl-${entry.rank}`}
        >
          {formatPnl(entry.weeklyPnl)}
        </p>
        <p className="text-xs text-muted-foreground">Weekly PnL</p>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { data: leaderboard, isLoading, error } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 60000,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-display font-bold" data-testid="text-leaderboard-title">
            STLR Leaderboard
          </h1>
        </div>

        <p className="text-muted-foreground mb-8" data-testid="text-leaderboard-description">
          Top traders ranked by their STLR points. Earn points by trading and completing tasks.
        </p>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
        )}

        {error && (
          <Card className="p-8 text-center border-dashed border-2 border-destructive/50 bg-transparent" data-testid="card-error">
            <p className="text-destructive">Failed to load leaderboard. Please try again.</p>
          </Card>
        )}

        {!isLoading && !error && leaderboard && leaderboard.length === 0 && (
          <Card className="p-12 text-center border-dashed border-2 border-border/50 bg-transparent" data-testid="card-empty">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No traders yet</h3>
            <p className="text-muted-foreground mb-6">Be the first to earn STLR points and claim your spot!</p>
            <Link href="/earn">
              <span className="text-primary hover:underline cursor-pointer" data-testid="link-earn">
                Start Earning
              </span>
            </Link>
          </Card>
        )}

        {!isLoading && !error && leaderboard && leaderboard.length > 0 && (
          <Card className="bg-card border-border overflow-hidden" data-testid="card-leaderboard">
            <div className="flex items-center gap-4 p-4 border-b border-border text-sm text-muted-foreground font-medium">
              <div className="w-12 text-center">Rank</div>
              <div className="flex-1">User</div>
              <div className="text-right">STLR Points</div>
              <div className="text-right w-24">Weekly PnL</div>
            </div>
            <div className="divide-y divide-border/50" data-testid="list-leaderboard">
              {leaderboard.map((entry) => (
                <LeaderboardRow key={entry.walletAddress} entry={entry} />
              ))}
            </div>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
