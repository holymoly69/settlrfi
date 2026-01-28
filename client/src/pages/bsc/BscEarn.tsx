import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BscNavbar } from "@/components/bsc/BscNavbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Check, X, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface EarnStatus {
  walletAddress: string;
  stlrPoints: number;
  weeklyPnl: number;
  weekStart: string;
  twitterFollowed: boolean;
  telegramJoined: boolean;
  firstTradeDone: boolean;
  isUnlocked: boolean;
  referralCode: string | null;
  referralCount: number;
  referralStlrEarned: number;
}

export default function BscEarn() {
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
        <span style={{ color: completed ? '#f0b90b' : '#888888' }}>
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
              border: '1px solid #f0b90b',
              color: '#f0b90b',
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
      <div className="min-h-screen bg-background flex flex-col">
        <BscNavbar />
        <div className="flex-1 max-w-2xl mx-auto px-4 py-12">
          <div 
            className="font-mono p-6"
            style={{ border: '1px solid #f0b90b', backgroundColor: '#000' }}
          >
            <div 
              className="px-4 py-3 text-center mb-6"
              style={{ borderBottom: '1px solid #f0b90b' }}
            >
              <span style={{ color: '#ff6600' }}>EARN STLR</span>
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

        <footer className="border-t py-6 font-mono" style={{ borderColor: '#f0b90b', background: '#000000' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs" style={{ color: '#f0b90b', opacity: 0.7 }}>
                Powered by <span className="font-semibold" style={{ color: '#f0b90b' }}>BNB Smart Chain</span>
              </p>
              <div className="flex items-center gap-4 text-xs" style={{ color: '#f0b90b', opacity: 0.7 }}>
                <Link href="/bsc/docs">
                  <span className="cursor-pointer hover:opacity-100">Docs</span>
                </Link>
                <span>Discord</span>
                <span>Twitter</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <BscNavbar />
        <div className="flex-1 max-w-2xl mx-auto px-4 py-12">
          <div className="flex items-center justify-center gap-3 font-mono" style={{ color: '#f0b90b' }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading earn status...
          </div>
        </div>

        <footer className="border-t py-6 font-mono" style={{ borderColor: '#f0b90b', background: '#000000' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs" style={{ color: '#f0b90b', opacity: 0.7 }}>
                Powered by <span className="font-semibold" style={{ color: '#f0b90b' }}>BNB Smart Chain</span>
              </p>
              <div className="flex items-center gap-4 text-xs" style={{ color: '#f0b90b', opacity: 0.7 }}>
                <Link href="/bsc/docs">
                  <span className="cursor-pointer hover:opacity-100">Docs</span>
                </Link>
                <span>Discord</span>
                <span>Twitter</span>
              </div>
            </div>
          </div>
        </footer>
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
    <div className="min-h-screen bg-background flex flex-col">
      <BscNavbar />
      
      <div className="flex-1 max-w-2xl mx-auto px-4 py-8">
        {!isUnlocked ? (
          <div className="relative pt-6 pb-6">
            <div className="earn-border-text">
              <span 
                className="earn-margin-text" 
                style={{ 
                  top: '0', 
                  left: '10px', 
                  color: '#f0b90b',
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
              style={{ border: '1px solid #f0b90b', backgroundColor: '#000' }}
            >
              <div 
                className="px-4 py-3 text-center"
                style={{ borderBottom: '1px solid #f0b90b' }}
              >
                <span style={{ color: '#ff6600' }}>EARN STLR</span>
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
                  <span style={{ color: '#f0b90b' }}>{progress}/3 tasks</span>
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
            <div className="earn-border-text">
              <span 
                className="earn-margin-text" 
                style={{ 
                  top: '0', 
                  left: '10px', 
                  color: '#f0b90b',
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
              style={{ border: '1px solid #f0b90b', backgroundColor: '#000' }}
            >
              <div 
                className="px-4 py-3 text-center"
                style={{ borderBottom: '1px solid #f0b90b' }}
              >
                <span style={{ color: '#f0b90b' }}>YOUR STLR BALANCE</span>
              </div>
              
              <div className="p-6">
              <div className="text-center mb-8">
                <div className="text-4xl font-bold mb-2" style={{ color: '#88ffff' }} data-testid="text-stlr-balance-large">
                  {(earnStatus?.stlrPoints || 0).toLocaleString()}
                </div>
                <div className="text-sm" style={{ color: '#888888' }}>STLR Tokens</div>
              </div>

              <div className="mb-6">
                <div className="text-sm mb-3" style={{ color: '#ff6600' }}>Completed:</div>
                <div className="space-y-2 pl-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4" style={{ color: '#66ff66' }} />
                    <span style={{ color: '#f0b90b' }}>X Follow</span>
                    <span style={{ color: '#444444' }}>(+1,000)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4" style={{ color: '#66ff66' }} />
                    <span style={{ color: '#f0b90b' }}>Telegram</span>
                    <span style={{ color: '#444444' }}>(+1,000)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4" style={{ color: '#66ff66' }} />
                    <span style={{ color: '#f0b90b' }}>First Trade</span>
                    <span style={{ color: '#444444' }}>(+500)</span>
                  </div>
                </div>
              </div>

              {(earnStatus?.referralCount || 0) > 0 && (
                <div 
                  className="mb-6 p-4"
                  style={{ border: '1px solid #88ffff', backgroundColor: 'rgba(136, 255, 255, 0.05)' }}
                >
                  <div className="text-sm mb-3" style={{ color: '#88ffff' }}>Referral Earnings:</div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm" style={{ color: '#888888' }}>Friends referred:</span>
                    <span className="font-bold" style={{ color: '#f0b90b' }} data-testid="text-referral-count-earn">
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
                <div className="text-sm mb-2" style={{ color: '#ff6600' }}>
                  Weekly Challenge (resets Monday):
                </div>
                <div className="text-sm mb-4" style={{ color: '#888888' }}>
                  Earn STLR for every +$10,000 paper PnL (diminishing returns)
                </div>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm" style={{ color: '#888888' }}>Current week PnL:</span>
                  <span 
                    className="font-bold text-lg"
                    style={{ color: (earnStatus?.weeklyPnl || 0) >= 0 ? '#66ff66' : '#ff6666' }}
                    data-testid="text-weekly-pnl"
                  >
                    {(earnStatus?.weeklyPnl || 0) >= 0 ? '+' : ''}${(earnStatus?.weeklyPnl || 0).toLocaleString()}
                  </span>
                </div>

                {(() => {
                  const weeklyPnl = earnStatus?.weeklyPnl || 0;
                  const currentStlr = earnStatus?.stlrPoints || 0;
                  const milestonesHit = Math.floor(weeklyPnl / 10000);
                  const nextMilestone = (milestonesHit + 1) * 10000;
                  const progressToNext = weeklyPnl - (milestonesHit * 10000);
                  const progressPercent = (progressToNext / 10000) * 100;
                  
                  const getStlrReward = (stlrAtTime: number) => {
                    if (stlrAtTime >= 250000) return 1;
                    const decayFactor = 1 + (stlrAtTime / 2500);
                    return Math.max(1, Math.floor(1000 / decayFactor));
                  };
                  
                  const currentRewardRate = getStlrReward(currentStlr);
                  
                  return (
                    <>
                      {milestonesHit > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: '#66ff66' }}>
                              <Check className="w-4 h-4 inline mr-2" />
                              {milestonesHit} milestone{milestonesHit > 1 ? 's' : ''} hit this week
                            </span>
                            <span style={{ color: '#88ffff', fontWeight: 'bold' }}>
                              ${(milestonesHit * 10000).toLocaleString()} PnL
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs mb-3 p-2" style={{ backgroundColor: '#111', border: '1px solid #333' }}>
                        <div className="flex items-center justify-between">
                          <span style={{ color: '#888888' }}>Your current rate:</span>
                          <span style={{ color: currentStlr >= 250000 ? '#ff6666' : '#88ffff', fontWeight: 'bold' }}>
                            {currentRewardRate} STLR per $10k profit
                          </span>
                        </div>
                        {currentStlr >= 250000 && (
                          <div className="text-xs mt-1" style={{ color: '#ff6666' }}>
                            (Max tier reached - 250k+ STLR)
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs mb-2" style={{ color: '#888888' }}>
                        Next milestone: <span style={{ color: '#ff6600' }}>${nextMilestone.toLocaleString()}</span>
                        {' '}(+{currentRewardRate} STLR)
                      </div>
                      <div 
                        className="h-2"
                        style={{ backgroundColor: '#333' }}
                      >
                        <div 
                          className="h-full transition-all"
                          style={{ 
                            width: `${Math.min(100, progressPercent)}%`,
                            backgroundColor: '#f0b90b',
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-1" style={{ color: '#444444' }}>
                        <span>${(milestonesHit * 10000).toLocaleString()}</span>
                        <span>${nextMilestone.toLocaleString()}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="mt-6 pt-4" style={{ borderTop: '1px solid #333' }}>
                <div className="text-xs space-y-2" style={{ color: '#888888' }}>
                  <p style={{ color: '#ff6600' }}>Weekly Reset Info:</p>
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

      <Footer />
    </div>
  );
}
