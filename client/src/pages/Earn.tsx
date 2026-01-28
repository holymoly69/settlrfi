import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Check, X, Loader2 } from "lucide-react";

interface EarnStatus {
  walletAddress: string;
  stlrPoints: number;
  weeklyPnl: number;
  weekStart: string;
  twitterFollowed: boolean;
  telegramJoined: boolean;
  firstTradeDone: boolean;
  comboTradeDone: boolean;
  isUnlocked: boolean;
  referralCode: string | null;
  referralCount: number;
  referralStlrEarned: number;
}

export default function Earn() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [claimingTask, setClaimingTask] = useState<string | null>(null);

  const { data: earnStatus, isLoading } = useQuery<EarnStatus>({
    queryKey: ["/api/earn/status"],
    enabled: isAuthenticated,
  });

  const claimSocialMutation = useMutation({
    mutationFn: async (task: "twitter" | "telegram") => {
      const res = await apiRequest("POST", "/api/earn/social", { task });
      return res.json();
    },
    onSuccess: (data: { pointsAwarded: number; task: string }) => {
      toast({
        title: "Task Completed!",
        description: `+${data.pointsAwarded} STLR awarded`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/earn/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      // Also invalidate cache on error to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/earn/status"] });
    },
    onSettled: () => {
      setClaimingTask(null);
    },
  });


  const handleClaimSocial = async (task: "twitter" | "telegram", url: string) => {
    window.open(url, "_blank");
    setClaimingTask(task);
    setTimeout(() => {
      claimSocialMutation.mutate(task);
    }, 2000);
  };

  const TaskItem = ({ 
    completed, 
    label, 
    points,
    action,
    loading,
  }: { 
    completed: boolean; 
    label: string; 
    points: number;
    action?: () => void;
    loading?: boolean;
  }) => (
    <div 
      className="flex items-center justify-between py-2 px-3 font-mono text-sm"
      style={{ borderBottom: '1px solid #333' }}
    >
      <div className="flex items-center gap-3">
        {completed ? (
          <Check className="w-4 h-4" style={{ color: '#66ff66' }} />
        ) : (
          <X className="w-4 h-4" style={{ color: '#444444' }} />
        )}
        <span style={{ color: completed ? '#66ff66' : '#888888' }}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span style={{ color: '#88ffff', fontWeight: 'bold' }}>+{points}</span>
        {!completed && action && (
          <button
            onClick={action}
            disabled={loading}
            className="px-3 py-1 text-xs font-mono transition-all"
            style={{ 
              border: '1px solid #66ff66',
              color: '#66ff66',
              backgroundColor: 'transparent',
            }}
            data-testid={`button-claim-${label.toLowerCase().replace(/\s/g, '-')}`}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Claim"}
          </button>
        )}
        {completed && (
          <span style={{ color: '#444444' }} className="text-xs">Done</span>
        )}
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div 
            className="font-mono p-6"
            style={{ border: '1px solid #66ff66', backgroundColor: '#000' }}
          >
            <div 
              className="px-4 py-3 text-center mb-6"
              style={{ borderBottom: '1px solid #66ff66' }}
            >
              <span style={{ color: '#ffaa00' }}>EARN STLR</span>
              <span style={{ color: '#444444' }}> (LOCKED)</span>
            </div>
            
            <p className="text-center text-sm" style={{ color: '#888888' }}>
              Connect your wallet to access the Earn page
            </p>
            
            <div className="mt-6 text-xs space-y-2" style={{ color: '#444444' }}>
              <p>Unlock rewards by:</p>
              <ul className="pl-4 space-y-1">
                <li>- Following @settlrtrade on X</li>
                <li>- Joining t.me/settlrtrade</li>
                <li>- Making your first paper trade</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="flex items-center justify-center gap-3 font-mono" style={{ color: '#66ff66' }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading earn status...
          </div>
        </div>
      </div>
    );
  }

  const isUnlocked = earnStatus?.isUnlocked;
  const progress = [
    earnStatus?.twitterFollowed,
    earnStatus?.telegramJoined,
    earnStatus?.firstTradeDone,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {!isUnlocked ? (
          <div className="relative pt-6 pb-6">
            {/* Margin text - typed left to right in fixed positions */}
            <div className="earn-border-text">
              <span 
                className="earn-margin-text" 
                style={{ 
                  top: '0', 
                  left: '10px', 
                  color: '#66ff66',
                  '--chars': '18ch',
                  '--duration': '1.8s',
                  '--steps': '18',
                  '--delay': '0.2s'
                } as React.CSSProperties}
              >$ stlr_earn --check</span>
              <span 
                className="earn-margin-text" 
                style={{ 
                  bottom: '0', 
                  right: '10px', 
                  left: 'auto', 
                  top: 'auto', 
                  color: '#88ffff',
                  '--chars': `${String(earnStatus?.stlrPoints || 0).length + 8}ch`,
                  '--duration': '1.2s',
                  '--steps': String(earnStatus?.stlrPoints || 0).length + 8,
                  '--delay': '0.8s'
                } as React.CSSProperties}
              >points: {earnStatus?.stlrPoints || 0}</span>
            </div>
            
            <div 
              className="font-mono"
              style={{ border: '1px solid #66ff66', backgroundColor: '#000' }}
            >
              <div 
                className="px-4 py-3 text-center"
                style={{ borderBottom: '1px solid #66ff66' }}
              >
                <span style={{ color: '#ffaa00' }}>EARN STLR</span>
                <span style={{ color: '#444444' }}> (LOCKED)</span>
              </div>
              
              <div className="p-6">
              <p className="text-sm mb-6" style={{ color: '#888888' }}>
                Complete tasks to unlock full earning features:
              </p>
              
              <div className="space-y-1">
                <TaskItem 
                  completed={true} 
                  label="Connect Wallet" 
                  points={0}
                />
                <TaskItem 
                  completed={earnStatus?.twitterFollowed || false}
                  label="Follow @settlrtrade"
                  points={1000}
                  action={() => handleClaimSocial("twitter", "https://x.com/settlrtrade")}
                  loading={claimingTask === "twitter"}
                />
                <TaskItem 
                  completed={earnStatus?.telegramJoined || false}
                  label="Join Telegram"
                  points={1000}
                  action={() => handleClaimSocial("telegram", "https://t.me/settlrtrade")}
                  loading={claimingTask === "telegram"}
                />
                <TaskItem 
                  completed={earnStatus?.firstTradeDone || false}
                  label="Make first paper trade"
                  points={500}
                />
              </div>

              <div className="mt-6 pt-4" style={{ borderTop: '1px solid #333' }}>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: '#888888' }}>Progress:</span>
                  <span style={{ color: '#66ff66' }}>{progress}/3 tasks</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span style={{ color: '#888888' }}>Current STLR:</span>
                  <span style={{ color: '#88ffff', fontWeight: 'bold' }} data-testid="text-stlr-balance">
                    {(earnStatus?.stlrPoints || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            </div>
          </div>
        ) : (
          <div className="relative pt-6 pb-6">
            {/* Margin text - typed left to right in fixed positions */}
            <div className="earn-border-text">
              <span 
                className="earn-margin-text" 
                style={{ 
                  top: '0', 
                  left: '10px', 
                  color: '#66ff66',
                  '--chars': '20ch',
                  '--duration': '2s',
                  '--steps': '20',
                  '--delay': '0.2s'
                } as React.CSSProperties}
              >$ stlr_balance --user</span>
              <span 
                className="earn-margin-text" 
                style={{ 
                  bottom: '0', 
                  right: '10px', 
                  left: 'auto', 
                  top: 'auto', 
                  color: '#88ffff',
                  '--chars': '16ch',
                  '--duration': '1.6s',
                  '--steps': '16',
                  '--delay': '0.8s'
                } as React.CSSProperties}
              >status: UNLOCKED</span>
            </div>
            
            <div 
              className="font-mono"
              style={{ border: '1px solid #66ff66', backgroundColor: '#000' }}
            >
              <div 
                className="px-4 py-3 text-center"
                style={{ borderBottom: '1px solid #66ff66' }}
              >
                <span style={{ color: '#66ff66' }}>YOUR STLR BALANCE</span>
              </div>
              
              <div className="p-6">
              <div className="text-center mb-8">
                <div className="text-4xl font-bold mb-2" style={{ color: '#88ffff' }} data-testid="text-stlr-balance-large">
                  {(earnStatus?.stlrPoints || 0).toLocaleString()}
                </div>
                <div className="text-sm" style={{ color: '#888888' }}>STLR Tokens</div>
              </div>

              <div className="mb-6">
                <div className="text-sm mb-3" style={{ color: '#ffaa00' }}>Completed:</div>
                <div className="space-y-2 pl-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4" style={{ color: '#66ff66' }} />
                    <span style={{ color: '#66ff66' }}>X Follow</span>
                    <span style={{ color: '#444444' }}>(+1,000)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4" style={{ color: '#66ff66' }} />
                    <span style={{ color: '#66ff66' }}>Telegram</span>
                    <span style={{ color: '#444444' }}>(+1,000)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4" style={{ color: '#66ff66' }} />
                    <span style={{ color: '#66ff66' }}>First Trade</span>
                    <span style={{ color: '#444444' }}>(+500)</span>
                  </div>
                </div>
              </div>

              {/* Referral Earnings Section */}
              {(earnStatus?.referralCount || 0) > 0 && (
                <div 
                  className="mb-6 p-4"
                  style={{ border: '1px solid #88ffff', backgroundColor: 'rgba(136, 255, 255, 0.05)' }}
                >
                  <div className="text-sm mb-3" style={{ color: '#88ffff' }}>Referral Earnings:</div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm" style={{ color: '#888888' }}>Friends referred:</span>
                    <span className="font-bold" style={{ color: '#66ff66' }} data-testid="text-referral-count-earn">
                      {earnStatus?.referralCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#888888' }}>STLR from referrals:</span>
                    <span className="font-bold" style={{ color: '#88ffff' }} data-testid="text-referral-stlr-earn">
                      +{(earnStatus?.referralStlrEarned || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs mt-2" style={{ color: '#666666' }}>
                    1,000 STLR per referred friend + 5% of their earnings
                  </div>
                </div>
              )}

              <div 
                className="p-4"
                style={{ border: '1px solid #333', backgroundColor: '#0a0a0a' }}
              >
                <div className="text-sm mb-2" style={{ color: '#ffaa00' }}>
                  Challenge: Trade a Combo
                </div>
                
                <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #333' }}>
                  <div className="flex items-center gap-3">
                    {earnStatus?.comboTradeDone ? (
                      <Check className="w-5 h-5" style={{ color: '#66ff66' }} />
                    ) : (
                      <X className="w-5 h-5" style={{ color: '#444444' }} />
                    )}
                    <span style={{ color: earnStatus?.comboTradeDone ? '#66ff66' : '#888888' }}>
                      Make your first combo trade
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ color: '#88ffff', fontWeight: 'bold' }}>+1,000</span>
                    {earnStatus?.comboTradeDone ? (
                      <span style={{ color: '#444444' }} className="text-xs">Done</span>
                    ) : (
                      <a
                        href="/combos"
                        className="px-3 py-1 text-xs font-mono transition-all"
                        style={{ 
                          border: '1px solid #66ff66',
                          color: '#66ff66',
                          backgroundColor: 'transparent',
                          textDecoration: 'none',
                        }}
                        data-testid="link-trade-combo"
                      >
                        Trade
                      </a>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 text-xs space-y-2" style={{ color: '#666666' }}>
                  <p style={{ color: '#888888' }}>What are Combos?</p>
                  <p>Combos are time-locked parlay positions. Set your stake, leverage (1-50x), lock date, and go long or short on combined market outcomes.</p>
                  <p>Positions automatically settle at the lock date based on probability movement - no liquidations!</p>
                </div>
              </div>

              <div className="mt-6 pt-4" style={{ borderTop: '1px solid #333' }}>
                <div className="text-xs space-y-2" style={{ color: '#888888' }}>
                  <p style={{ color: '#ffaa00' }}>Weekly Reset Info:</p>
                  <ul className="pl-3 space-y-1">
                    <li>- Balances reset to $10,000 every Monday</li>
                    <li>- Weekly PnL challenges reset every Monday</li>
                    <li>- Earned STLR tokens remain forever</li>
                  </ul>
                </div>
              </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
