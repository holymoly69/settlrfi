import { X, Clock } from "lucide-react";

interface CreateMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
}

export function CreateMarketModal({ isOpen, onClose }: CreateMarketModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="w-full max-w-md font-mono relative"
        style={{ backgroundColor: '#000000', border: '1px solid #66ff66' }}
      >
        <div className="absolute top-0 left-0 text-xs select-none" style={{ color: '#66ff66' }}>┌</div>
        <div className="absolute top-0 right-0 text-xs select-none" style={{ color: '#66ff66' }}>┐</div>
        <div className="absolute bottom-0 left-0 text-xs select-none" style={{ color: '#66ff66' }}>└</div>
        <div className="absolute bottom-0 right-0 text-xs select-none" style={{ color: '#66ff66' }}>┘</div>

        <div 
          className="flex items-center justify-between px-3 sm:px-4 py-3"
          style={{ borderBottom: '1px solid #66ff66', backgroundColor: '#000000' }}
        >
          <span style={{ color: '#66ff66' }} className="text-sm font-bold">
            CREATE NEW MARKET
          </span>
          <button 
            onClick={onClose}
            className="transition-colors p-2 -mr-2"
            style={{ color: '#ff6666' }}
            data-testid="button-close-create-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ border: '2px solid #ffaa00', backgroundColor: 'rgba(255, 170, 0, 0.1)' }}
          >
            <Clock className="w-8 h-8" style={{ color: '#ffaa00' }} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-bold" style={{ color: '#ffaa00' }}>
              COMING SOON
            </h3>
            <p className="text-sm" style={{ color: '#888888' }}>
              Permissionless market creation is currently disabled.
            </p>
            <p className="text-xs" style={{ color: '#666666' }}>
              Stay tuned for updates on when this feature will be available.
            </p>
          </div>

          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 font-mono text-sm font-semibold transition-all"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #66ff66',
              color: '#66ff66'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#66ff66';
              e.currentTarget.style.color = '#000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#66ff66';
            }}
            data-testid="button-close-coming-soon"
          >
            {'> got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
