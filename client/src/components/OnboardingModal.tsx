import { useState, useEffect } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "settlr_onboarding_seen";

interface OnboardingModalProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export function OnboardingModal({ forceShow = false, onClose }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setIsOpen(true);
      return;
    }
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setIsOpen(true);
    }
  }, [forceShow]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
    onClose?.();
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slides = [
    // Slide 1: Welcome
    {
      content: (
        <div className="text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: '#66ff66' }}>
            WELCOME TO SETTLR
          </h2>
          <p style={{ color: '#66ff66' }}>
            Leveraged perpetual contracts on real-world events
          </p>
        </div>
      ),
    },
    // Slide 2: Core Trading
    {
      content: (
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-center" style={{ color: '#66ff66' }}>
            TRADE SINGLE EVENTS
          </h2>
          <div className="space-y-2 text-sm sm:text-base" style={{ color: '#66ff66' }}>
            <p>Bet on outcomes with up to 50x leverage</p>
            <ul className="space-y-1 pl-4">
              <li>- Politics, Crypto prices, Sports, Macro</li>
              <li>- Perpetual style: no expiry</li>
              <li>- Prices track real probabilities ($0.00 - $1.00)</li>
            </ul>
            <p className="pt-2" style={{ color: '#444444' }}>View markets in the table below</p>
          </div>
        </div>
      ),
    },
    // Slide 3: Combos
    {
      content: (
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-center" style={{ color: '#66ff66' }}>
            STRUCTURED COMBOS
          </h2>
          <div className="space-y-2 text-sm sm:text-base" style={{ color: '#66ff66' }}>
            <p>Pre-curated multi-leg parlays</p>
            <ul className="space-y-1 pl-4">
              <li>- All-or-nothing payout</li>
              <li>- Higher multipliers (e.g., 4x-10x+)</li>
            </ul>
            <p className="pt-2" style={{ color: '#444444' }}>Trade them like any other market</p>
          </div>
        </div>
      ),
    },
    // Slide 4: Custom Combos
    {
      content: (
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-center" style={{ color: '#66ff66' }}>
            BUILD CUSTOM COMBOS
          </h2>
          <div className="space-y-2 text-sm sm:text-base" style={{ color: '#66ff66' }}>
            <p>Create your own parlays</p>
            <ul className="space-y-1 pl-4">
              <li>- Select any markets + YES/NO per leg</li>
              <li>- Real-time multiplier calculation</li>
              <li>- Becomes a new tradable perpetual</li>
            </ul>
            <p className="pt-2" style={{ color: '#444444' }}>Share and trade your creations</p>
          </div>
        </div>
      ),
    },
    // Slide 5: Cross-Margin Trading
    {
      content: (
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-center" style={{ color: '#66ff66' }}>
            CROSS-MARGIN TRADING
          </h2>
          <div className="space-y-2 text-sm sm:text-base" style={{ color: '#66ff66' }}>
            <p>Your balance backs all positions</p>
            <ul className="space-y-1 pl-4">
              <li>- Shared collateral across trades</li>
              <li>- Profits offset losses in real-time</li>
              <li>- Max leverage up to 50x</li>
            </ul>
            <p className="pt-2" style={{ color: '#88ffff' }}>
              View your portfolio at <span style={{ color: '#cc66ff' }}>&gt; positions</span>
            </p>
          </div>
        </div>
      ),
    },
    // Slide 6: Market Resolution
    {
      content: (
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-center" style={{ color: '#66ff66' }}>
            MARKET RESOLUTION
          </h2>
          <div className="space-y-2 text-sm sm:text-base" style={{ color: '#66ff66' }}>
            <p>Events resolved via UMA optimistic oracle</p>
            <ul className="space-y-1 pl-4">
              <li>- Creator/admin proposes outcome</li>
              <li>- Challenge window (future)</li>
              <li>- Settles positions at $1 or $0</li>
            </ul>
            <p className="pt-2" style={{ color: '#444444' }}>
              Resolved markets show [SETTLED] badge
            </p>
          </div>
        </div>
      ),
    },
    // Slide 7: Earn STLR Tokens
    {
      content: (
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-center" style={{ color: '#66ff66' }}>
            EARN STLR TOKENS
          </h2>
          <div className="space-y-2 text-sm sm:text-base" style={{ color: '#66ff66' }}>
            <p>Pre-launch points for future airdrop</p>
            <p className="pt-2">Unlock the Earn page by:</p>
            <ul className="space-y-1 pl-4">
              <li>- Connecting HyperEVM wallet</li>
              <li>- Following @settlrtrade on X</li>
              <li>- Joining t.me/settlrtrade</li>
              <li>- Making your first paper trade</li>
            </ul>
            <p className="pt-2">Earn more weekly:</p>
            <p style={{ color: '#88ffff' }}>Earn STLR per +$10,000 paper PnL</p>
            <p className="pt-2" style={{ color: '#444444' }}>
              Points reset weekly - trade consistently!
            </p>
          </div>
        </div>
      ),
    },
    // Slide 8: Final
    {
      content: (
        <div className="space-y-4 text-center">
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#66ff66' }}>
            START TRADING NOW
          </h2>
          <div className="space-y-2 text-sm sm:text-base" style={{ color: '#66ff66' }}>
            <p>All execution on Hyperliquid</p>
            <p style={{ color: '#444444' }}>Fast, onchain, non-custodial</p>
            <p className="pt-4 font-bold">Connect wallet to begin</p>
          </div>
        </div>
      ),
    },
  ];

  if (!isOpen) return null;

  const progressDots = slides.map((_, i) => (
    <span key={i} style={{ color: i === currentSlide ? '#66ff66' : '#444444' }}>
      {i === currentSlide ? '[*]' : '[ ]'}
    </span>
  ));

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
    >
      {/* Terminal typing background */}
      <div className="matrix-bg">
        <span className="matrix-string">$ init_protocol --leverage=50x</span>
        <span className="matrix-string">connecting to hyperliquid...</span>
        <span className="matrix-string">0x7f3a...9c2d balance: 10000</span>
        <span className="matrix-string">market_feed: streaming</span>
        <span className="matrix-string">{">"} position.open YES @0.65</span>
        <span className="matrix-string">oracle: UMA verified</span>
        <span className="matrix-string">combo_payout: 4.55x multiplier</span>
        <span className="matrix-string">settlement: pending...</span>
      </div>
      
      <div 
        className="relative z-10 w-full max-w-lg font-mono"
        style={{ backgroundColor: '#000000', border: '1px solid #66ff66' }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-3 sm:px-4 py-2"
          style={{ borderBottom: '1px solid #66ff66' }}
        >
          <span style={{ color: '#444444' }} className="text-xs">
            [{currentSlide + 1}/{slides.length}]
          </span>
          <span style={{ color: '#66ff66' }} className="text-xs sm:text-sm font-bold">
            SETTLR ONBOARDING
          </span>
          <button 
            onClick={handleClose}
            className="transition-colors p-2 -mr-2"
            style={{ color: '#ff6666' }}
            data-testid="button-close-onboarding"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[280px] flex items-center justify-center">
          {slides[currentSlide].content}
        </div>

        {/* Progress */}
        <div className="flex justify-center gap-1 pb-2 text-xs">
          {progressDots}
        </div>

        {/* Navigation */}
        <div 
          className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 gap-2"
          style={{ borderTop: '1px solid #66ff66' }}
        >
          <button
            onClick={prevSlide}
            className="text-sm transition-colors cursor-pointer py-2 px-3"
            style={{ 
              color: currentSlide > 0 ? '#66ff66' : '#333333',
              visibility: currentSlide > 0 ? 'visible' : 'hidden'
            }}
            disabled={currentSlide === 0}
            data-testid="button-prev-slide"
          >
            {"<"} prev
          </button>

          <button
            onClick={handleClose}
            className="text-sm transition-colors cursor-pointer py-2 px-3"
            style={{ color: '#ff6666' }}
            data-testid="button-skip-onboarding"
          >
            skip
          </button>

          {currentSlide < slides.length - 1 ? (
            <button
              onClick={nextSlide}
              className="text-sm transition-colors cursor-pointer py-2 px-3"
              style={{ color: '#66ff66' }}
              data-testid="button-next-slide"
            >
              next {">"}
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="text-sm font-bold transition-colors cursor-pointer py-2 px-3"
              style={{ color: '#66ff66' }}
              data-testid="button-got-it"
            >
              got it {">"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Help button to re-trigger onboarding
export function OnboardingHelpButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 sm:bottom-4 right-4 z-40 w-8 h-8 flex items-center justify-center font-mono text-sm transition-all"
        style={{ 
          backgroundColor: '#000000', 
          border: '1px solid #444444',
          color: '#444444'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#66ff66';
          e.currentTarget.style.color = '#66ff66';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#444444';
          e.currentTarget.style.color = '#444444';
        }}
        data-testid="button-help"
      >
        ?
      </button>
      {showModal && (
        <OnboardingModal forceShow={true} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
