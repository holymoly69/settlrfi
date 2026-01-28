import { useOrdersByMarket, useCancelOrder } from "@/hooks/use-markets";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Loader2, X, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PendingOrdersPanelProps {
  marketId: number;
}

export function PendingOrdersPanel({ marketId }: PendingOrdersPanelProps) {
  const { isAuthenticated } = useAuth();
  const { data: orders, isLoading } = useOrdersByMarket(marketId);
  const cancelMutation = useCancelOrder();
  const { toast } = useToast();

  if (!isAuthenticated) {
    return null;
  }

  const handleCancel = async (orderId: number) => {
    try {
      await cancelMutation.mutateAsync({ orderId, marketId });
      toast({
        title: "Order Cancelled",
        description: "Your order has been cancelled successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Cancel Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#ffaa00";
      case "active": return "#66ff66";
      case "partial": return "#88ffff";
      case "filled": return "#66ff66";
      case "cancelled": return "#666666";
      case "expired": return "#ff6666";
      default: return "#888888";
    }
  };

  const getSideColor = (side: string) => {
    return side === "YES" ? "#66ff66" : "#ff6666";
  };

  const canCancel = (status: string) => {
    return status === "pending" || status === "active" || status === "partial";
  };

  const formatOrderType = (type: string) => {
    return type.toUpperCase();
  };

  return (
    <div 
      className="font-mono"
      style={{ backgroundColor: '#000000', border: '1px solid #444444' }}
    >
      <div className="p-3 border-b" style={{ borderColor: '#444444' }}>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4" style={{ color: '#66ff66' }} />
          <span style={{ color: '#66ff66' }} className="text-sm font-bold">YOUR ORDERS</span>
        </div>
      </div>

      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#66ff66' }} />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-6">
            <p style={{ color: '#444444' }} className="text-sm">No orders for this market</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div 
              className="grid grid-cols-6 gap-2 text-xs pb-2 border-b"
              style={{ borderColor: '#333333', color: '#666666' }}
            >
              <span>TYPE</span>
              <span>SIDE</span>
              <span className="text-right">SIZE</span>
              <span className="text-center">STATUS</span>
              <span className="text-right">CREATED</span>
              <span></span>
            </div>
            
            {orders.map((order) => (
              <div 
                key={order.id}
                className="grid grid-cols-6 gap-2 text-xs py-2 border-b items-center"
                style={{ borderColor: '#222222' }}
                data-testid={`row-order-${order.id}`}
              >
                <span style={{ color: '#888888' }}>
                  {formatOrderType(order.orderType)}
                </span>
                <span 
                  className="font-bold"
                  style={{ color: getSideColor(order.side) }}
                >
                  {order.side}
                </span>
                <span className="text-right" style={{ color: '#cccccc' }}>
                  ${order.totalSize.toLocaleString()}
                  {order.filledSize > 0 && (
                    <span style={{ color: '#666666' }}>
                      {" "}({order.filledSize}/{order.totalSize})
                    </span>
                  )}
                </span>
                <span 
                  className="text-center uppercase text-[10px]"
                  style={{ color: getStatusColor(order.status) }}
                >
                  {order.status}
                </span>
                <span className="text-right" style={{ color: '#666666' }}>
                  {order.createdAt ? format(new Date(order.createdAt), 'HH:mm') : '-'}
                </span>
                <div className="flex justify-end">
                  {canCancel(order.status) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCancel(order.id)}
                      disabled={cancelMutation.isPending}
                      className="h-6 w-6"
                      style={{ color: '#ff6666' }}
                      data-testid={`button-cancel-order-${order.id}`}
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
