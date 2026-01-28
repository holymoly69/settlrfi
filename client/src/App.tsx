import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MarketStreamProvider } from "@/hooks/use-market-stream";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Markets from "@/pages/Markets";
import MarketDetail from "@/pages/MarketDetail";
import ComboDetail from "@/pages/ComboDetail";
import CustomComboDetail from "@/pages/CustomComboDetail";
import Combos from "@/pages/Combos";
import Portfolio from "@/pages/Portfolio";
import Profile from "@/pages/Profile";
import Earn from "@/pages/Earn";
import MMTools from "@/pages/MMTools";
import Admin from "@/pages/Admin";
import Docs from "@/pages/Docs";
import Social from "@/pages/Social";
import { OnboardingModal, OnboardingHelpButton } from "@/components/OnboardingModal";
import { SettlrektOverlay } from "@/components/SettlrektOverlay";
import BscHome from "@/pages/bsc/BscHome";
import BscDocs from "@/pages/bsc/BscDocs";
import BscMarketDetail from "@/pages/bsc/BscMarketDetail";
import BscCombos from "@/pages/bsc/BscCombos";
import BscSocial from "@/pages/bsc/BscSocial";
import BscPortfolio from "@/pages/bsc/BscPortfolio";
import BscEarn from "@/pages/bsc/BscEarn";
import BscDevDocs from "@/pages/bsc/BscDevDocs";

function getVisitorId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem('settlr_visitor_id');
  if (!id) {
    id = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('settlr_visitor_id', id);
  }
  return id;
}

function trackVisit(path: string) {
  if (typeof window === 'undefined') return;
  fetch('/api/track-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId: getVisitorId(), path }),
  }).catch(() => {});
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/markets" component={Markets} />
      <Route path="/market/:id" component={MarketDetail} />
      <Route path="/combos" component={Combos} />
      <Route path="/social" component={Social} />
      <Route path="/leaderboard">
        <Redirect to="/social" />
      </Route>
      <Route path="/combo/:id" component={ComboDetail} />
      <Route path="/custom-combo/:id" component={CustomComboDetail} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/profile" component={Profile} />
      <Route path="/earn" component={Earn} />
      <Route path="/mm" component={MMTools} />
      <Route path="/admin" component={Admin} />
      <Route path="/docs" component={Docs} />
      
      {/* BSC Routes - Separate from main Hyperliquid site */}
      <Route path="/bsc" component={BscHome} />
      <Route path="/bsc/docs" component={BscDocs} />
      <Route path="/bsc/devdocs" component={BscDevDocs} />
      <Route path="/bsc/market/:id" component={BscMarketDetail} />
      <Route path="/bsc/combos" component={BscCombos} />
      <Route path="/bsc/social" component={BscSocial} />
      <Route path="/bsc/portfolio" component={BscPortfolio} />
      <Route path="/bsc/earn" component={BscEarn} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  
  useEffect(() => {
    trackVisit(location);
  }, [location]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MarketStreamProvider>
          <Toaster />
          <Router />
          <OnboardingModal />
          <OnboardingHelpButton />
          <SettlrektOverlay />
        </MarketStreamProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
