import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, ExternalLink } from "lucide-react";
import { activeChain, VAULT_ADDRESS } from "@/lib/wagmi";
import clsx from "clsx";

interface DepositWithdrawDialogProps {
  trigger?: React.ReactNode;
}

export function DepositWithdrawDialog({ trigger }: DepositWithdrawDialogProps) {
  const [open, setOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  const { 
    address, 
    isConnected, 
    isConnecting, 
    isCorrectChain,
    hypeBalance, 
    vaultBalance, 
    hasMetaMask,
    connect, 
    deposit, 
    withdraw,
    switchToHyperEvm,
  } = useWallet();
  
  const { toast } = useToast();

  const isVaultDeployed = VAULT_ADDRESS !== '0x0000000000000000000000000000000000000000';

  const handleConnect = async () => {
    try {
      await connect();
      toast({
        title: "Wallet Connected",
        description: "Successfully connected to MetaMask",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive",
      });
      return;
    }

    setIsDepositing(true);
    try {
      await deposit(depositAmount);
      toast({
        title: "Deposit Successful",
        description: `Successfully deposited ${depositAmount} HYPE to Settlr`,
      });
      setDepositAmount("");
    } catch (error) {
      toast({
        title: "Deposit Failed",
        description: error instanceof Error ? error.message : "Failed to deposit",
        variant: "destructive",
      });
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(withdrawAmount) > parseFloat(vaultBalance)) {
      toast({
        title: "Insufficient Balance",
        description: "Withdrawal amount exceeds your vault balance",
        variant: "destructive",
      });
      return;
    }

    setIsWithdrawing(true);
    try {
      await withdraw(withdrawAmount);
      toast({
        title: "Withdrawal Successful",
        description: `Successfully withdrew ${withdrawAmount} HYPE from Settlr`,
      });
      setWithdrawAmount("");
    } catch (error) {
      toast({
        title: "Withdrawal Failed",
        description: error instanceof Error ? error.message : "Failed to withdraw",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2" data-testid="button-open-deposit-withdraw">
            <Wallet className="h-4 w-4" />
            Deposit / Withdraw
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Deposit & Withdraw
          </DialogTitle>
        </DialogHeader>

        {!hasMetaMask ? (
          <div className="py-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">MetaMask Required</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Please install MetaMask to deposit and withdraw HYPE tokens.
              </p>
            </div>
            <Button asChild>
              <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">
                Install MetaMask
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        ) : !isConnected ? (
          <div className="py-8 text-center space-y-4">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Connect Your Wallet</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Connect MetaMask to deposit HYPE tokens to Settlr
              </p>
            </div>
            <Button onClick={handleConnect} disabled={isConnecting} data-testid="button-connect-metamask">
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4 mr-2" />
              )}
              {isConnecting ? "Connecting..." : "Connect MetaMask"}
            </Button>
          </div>
        ) : !isCorrectChain ? (
          <div className="py-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Wrong Network</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Please switch to {activeChain.name} to continue
              </p>
            </div>
            <Button onClick={switchToHyperEvm} data-testid="button-switch-network">
              Switch to {activeChain.name}
            </Button>
          </div>
        ) : !isVaultDeployed ? (
          <div className="py-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Coming Soon</h3>
              <p className="text-sm text-muted-foreground mt-2">
                The Settlr vault contract is being deployed to HyperEVM. 
                Check back soon to deposit real HYPE tokens!
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Connected: {formatAddress(address || "")}
              </p>
            </div>
            <Badge variant="secondary">Testnet Mode</Badge>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Connected Wallet</span>
                <Badge variant="outline" className="font-mono">
                  {formatAddress(address || "")}
                </Badge>
              </div>
            </Card>

            <Tabs defaultValue="deposit" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="deposit" className="gap-2" data-testid="tab-deposit">
                  <ArrowDownToLine className="h-4 w-4" />
                  Deposit
                </TabsTrigger>
                <TabsTrigger value="withdraw" className="gap-2" data-testid="tab-withdraw">
                  <ArrowUpFromLine className="h-4 w-4" />
                  Withdraw
                </TabsTrigger>
              </TabsList>

              <TabsContent value="deposit" className="space-y-4 mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Wallet Balance</span>
                  <span className="font-mono font-medium">{parseFloat(hypeBalance).toFixed(4)} HYPE</span>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="deposit-amount">Deposit Amount</Label>
                  <div className="flex gap-2">
                    <Input
                      id="deposit-amount"
                      type="number"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="font-mono"
                      data-testid="input-deposit-amount"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDepositAmount(hypeBalance)}
                      data-testid="button-max-deposit"
                    >
                      MAX
                    </Button>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleDeposit}
                  disabled={isDepositing || isWithdrawing || !depositAmount || parseFloat(depositAmount) <= 0}
                  data-testid="button-confirm-deposit"
                >
                  {isDepositing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="h-4 w-4 mr-2" />
                  )}
                  {isDepositing ? "Depositing..." : "Deposit HYPE"}
                </Button>
              </TabsContent>

              <TabsContent value="withdraw" className="space-y-4 mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Settlr Balance</span>
                  <span className="font-mono font-medium">{parseFloat(vaultBalance).toFixed(4)} HYPE</span>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Withdraw Amount</Label>
                  <div className="flex gap-2">
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="font-mono"
                      data-testid="input-withdraw-amount"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWithdrawAmount(vaultBalance)}
                      data-testid="button-max-withdraw"
                    >
                      MAX
                    </Button>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  variant="destructive"
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || isDepositing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  data-testid="button-confirm-withdraw"
                >
                  {isWithdrawing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowUpFromLine className="h-4 w-4 mr-2" />
                  )}
                  {isWithdrawing ? "Withdrawing..." : "Withdraw HYPE"}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
