import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, CreditCard, Sparkles, CheckCircle, Printer, DoorOpen } from 'lucide-react';
import { API_BASE_URL } from '../context/AuthContext';

const SimulatedCheckout = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const razorpayOrderId = searchParams.get('razorpay_order_id');
  const amount = searchParams.get('amount');

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [method, setMethod] = useState('UPI');

  const retryTimeoutRef = React.useRef(null);

  // Load order details on mount
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return;
      try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/receipt`);
        if (response.ok) {
          const data = await response.json();
          setReceipt(data);
          if (data.status === 'paid') {
            setPaymentSuccess(true);
          }
          setLoading(false); // Success! Hide loading skeleton
        } else {
          throw new Error('Failed to fetch invoice');
        }
      } catch (err) {
        console.error('Failed to fetch invoice:', err);
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(fetchOrderDetails, 3000);
      }
    };
    fetchOrderDetails();
    return () => { if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current); };
  }, [orderId]);

  const handleSimulatePayment = async () => {
    setProcessing(true);
    const mockPaymentId = `pay_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/simulate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_payment_id: mockPaymentId,
          method,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReceipt(data.order);
        setPaymentSuccess(true);
      } else {
        const errData = await response.json();
        alert(errData.error || 'Simulated transaction rejected.');
      }
    } catch (err) {
      console.error(err);
      alert('Transaction failed to broadcast.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!orderId || !receipt) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center p-6 glass-card max-w-sm">
          <p className="text-sm font-bold text-slate-400">Invalid digital payment link details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 animated-bg">
      
      <div className="max-w-md w-full relative z-10 animate-fade-in flex flex-col gap-6">
        
        {/* Padlock Security Badge */}
        {!paymentSuccess && (
          <div className="flex items-center justify-center gap-2 text-xs font-black text-white/95 uppercase tracking-widest bg-slate-900/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 self-center">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Secure Checkout Gateway</span>
          </div>
        )}

        {/* Dynamic Card styling: switches to dark green base once PAID is confirmed! */}
        <div className={`glass-panel rounded-3xl p-6 border transition-all duration-500 shadow-2xl relative overflow-hidden ${
          paymentSuccess 
            ? 'bg-emerald-600/[0.97] dark:bg-emerald-950/95 text-white border-emerald-500/30' 
            : 'bg-white/80 dark:bg-slate-900/80 border-white/20'
        }`}>
          
          {/* Glowing particle graphics for successful transaction checkouts */}
          {paymentSuccess && (
            <div className="absolute top-0 right-0 p-8 text-emerald-400 opacity-20 pointer-events-none">
              <Sparkles size={120} />
            </div>
          )}

          {/* Invoice Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-200 dark:border-slate-800/80 flex flex-col items-center">
            <h1 className="text-xl font-black font-sans tracking-wide">Tasty Bites</h1>
            <p className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${paymentSuccess ? 'text-emerald-200' : 'text-slate-500'}`}>
              Invoice Receipt
            </p>

            {paymentSuccess ? (
              <div className="mt-4 flex flex-col items-center gap-1.5 animate-bounce">
                <CheckCircle size={44} className="text-emerald-100" />
                <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-emerald-700 shadow-md shadow-emerald-700/10">
                  PAID SUCCESSFUL
                </span>
              </div>
            ) : (
              <span className="mt-3 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-sm shadow-rose-500/10">
                Awaiting Checkout Payment
              </span>
            )}
          </div>

          {/* Invoice Body particulars */}
          <div className="py-4 flex flex-col gap-3.5 text-xs font-semibold">
            <div className="flex justify-between">
              <span className={paymentSuccess ? 'text-emerald-200' : 'text-slate-400'}>Customer:</span>
              <span className="font-bold">{receipt.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className={paymentSuccess ? 'text-emerald-200' : 'text-slate-400'}>Table Code:</span>
              <span className="font-bold">Table {receipt.table_number}</span>
            </div>
            <div className="flex justify-between">
              <span className={paymentSuccess ? 'text-emerald-200' : 'text-slate-400'}>Receipt Ref:</span>
              <span className="font-mono text-[10px]">{receipt.id.substring(0, 13).toUpperCase()}</span>
            </div>
            {receipt.payment && (
              <div className="flex justify-between">
                <span className={paymentSuccess ? 'text-emerald-200' : 'text-slate-400'}>Transaction ID:</span>
                <span className="font-mono text-[10px]">{receipt.payment.razorpay_payment_id}</span>
              </div>
            )}

            {/* Receipt Particulars breakdown list */}
            <div className={`mt-2 py-3 border-y border-dashed text-[11px] flex flex-col gap-2 ${
              paymentSuccess ? 'border-emerald-500/20' : 'border-slate-200 dark:border-slate-800'
            }`}>
              {receipt.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.menu_item_name} <span className="font-black">x{item.quantity}</span></span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Calculations breakdown */}
            <div className="flex flex-col gap-1.5 pt-2">
              <div className="flex justify-between text-[11px]">
                <span className={paymentSuccess ? 'text-emerald-200' : 'text-slate-400'}>Subtotal Amount:</span>
                <span>₹{parseFloat(receipt.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className={paymentSuccess ? 'text-emerald-200' : 'text-slate-400'}>GST Taxes (5%):</span>
                <span>₹{parseFloat(receipt.tax_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-dashed border-slate-200/20">
                <span>Grand Total Billed:</span>
                <span className={paymentSuccess ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}>
                  ₹{parseFloat(receipt.grand_total).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Checkout transaction selectors & simulated success button */}
          {!paymentSuccess ? (
            <div className="mt-4 pt-4 border-t border-slate-105 dark:border-slate-850 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Select Payment Method:</span>
                <div className="grid grid-cols-3 gap-2">
                  {['UPI', 'Card', 'NetBanking'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        method === m
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-850'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSimulatePayment}
                disabled={processing}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs tracking-wider shadow-lg active:scale-97 transition-all flex items-center justify-center gap-2"
              >
                {processing ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                ) : (
                  <>
                    <CreditCard size={15} />
                    <span>AUTHORIZE SIMULATED PAYMENT SUCCESS</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            // Exit Pass verification section with BARCODE layout!
            <div className="mt-6 pt-6 border-t border-dashed border-emerald-500/20 flex flex-col items-center gap-4 text-center">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-100 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                <DoorOpen size={14} className="animate-pulse" />
                <span>EXPRESS ENTRANCE / EXIT PASS</span>
              </div>
              
              {/* Graphical QR Code component */}
              <div className="bg-white p-4 rounded-2xl border border-emerald-500/30 flex flex-col items-center gap-2 shadow">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/checkout/simulated?order_id=' + receipt.id)}`} 
                  alt="Exit Pass QR Code" 
                  className="w-36 h-36 border border-slate-100 rounded-lg"
                />
                <span className="font-mono text-[9px] text-slate-500 font-extrabold tracking-widest uppercase mt-1">
                  TB-{receipt.id.substring(0, 8)}-PAID
                </span>
              </div>

              <p className="text-[10px] text-emerald-100/80 leading-relaxed font-medium">
                Thank you for your digital payment! This green bill acts as a verified security pass at the restaurant exit gate.
              </p>

              <button
                onClick={() => window.print()}
                className="mt-2 py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-[10px] font-bold tracking-wider flex items-center gap-1.5 uppercase transition-all"
              >
                <Printer size={12} />
                <span>Print Exit Receipt</span>
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default SimulatedCheckout;
