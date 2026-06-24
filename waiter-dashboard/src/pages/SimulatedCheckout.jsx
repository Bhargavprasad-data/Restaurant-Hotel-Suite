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

  const handlePrint = () => {
    window.print();
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

  const printDate = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.origin + '/checkout/simulated?order_id=' + receipt.id)}`;

  return (
    <>
      {/* ══════════ PRINT-ONLY STYLES ══════════ */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          /* Hide everything on screen */
          body * { visibility: hidden !important; }

          /* Show only the print receipt */
          #print-receipt,
          #print-receipt * { visibility: visible !important; }

          #print-receipt {
            position: relative !important;
            width: 80mm !important;
            margin: 0 auto !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .pr-header {
            text-align: center;
            padding: 14px 10px 10px;
            border-bottom: 2px dashed #000;
          }

          .pr-restaurant-name {
            font-size: 20px !important;
            font-weight: 900 !important;
            letter-spacing: 2px !important;
            text-transform: uppercase !important;
            color: #000 !important;
            font-family: 'Courier New', Courier, monospace !important;
          }

          .pr-tagline {
            font-size: 9px !important;
            letter-spacing: 1px !important;
            text-transform: uppercase !important;
            color: #555 !important;
            margin-top: 2px !important;
          }

          .pr-status-badge {
            display: inline-block !important;
            margin-top: 8px !important;
            padding: 3px 14px !important;
            border: 2px solid #000 !important;
            border-radius: 999px !important;
            font-size: 10px !important;
            font-weight: 900 !important;
            letter-spacing: 2px !important;
            text-transform: uppercase !important;
            color: #000 !important;
            background: #f0fdf4 !important;
          }

          .pr-section {
            padding: 10px 12px;
            border-bottom: 1px dashed #aaa;
          }

          .pr-row {
            display: flex !important;
            justify-content: space-between !important;
            font-size: 11px !important;
            margin-bottom: 4px !important;
            color: #000 !important;
          }

          .pr-row-label { color: #555 !important; }
          .pr-row-value { font-weight: 700 !important; color: #000 !important; }
          .pr-row-mono  { font-family: 'Courier New', monospace !important; font-size: 10px !important; font-weight: 700 !important; }

          .pr-items-header {
            font-size: 9px !important;
            font-weight: 900 !important;
            letter-spacing: 1.5px !important;
            text-transform: uppercase !important;
            color: #444 !important;
            margin-bottom: 6px !important;
          }

          .pr-item-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            font-size: 11px !important;
            margin-bottom: 5px !important;
            color: #000 !important;
          }

          .pr-item-name { flex: 1 !important; }
          .pr-item-qty  { color: #444 !important; font-size: 10px !important; }
          .pr-item-price { font-weight: 700 !important; white-space: nowrap !important; }

          .pr-totals {
            padding: 10px 12px;
            border-bottom: 2px dashed #000;
          }

          .pr-total-row {
            display: flex !important;
            justify-content: space-between !important;
            font-size: 11px !important;
            margin-bottom: 4px !important;
            color: #000 !important;
          }

          .pr-grand-total {
            display: flex !important;
            justify-content: space-between !important;
            font-size: 15px !important;
            font-weight: 900 !important;
            color: #000 !important;
            padding-top: 6px !important;
            margin-top: 4px !important;
            border-top: 1px solid #000 !important;
          }

          .pr-qr-section {
            padding: 12px 10px;
            text-align: center;
            border-bottom: 1px dashed #aaa;
          }

          .pr-qr-label {
            font-size: 9px !important;
            font-weight: 900 !important;
            letter-spacing: 2px !important;
            text-transform: uppercase !important;
            color: #444 !important;
            margin-bottom: 8px !important;
          }

          .pr-qr-img {
            display: block !important;
            margin: 0 auto !important;
            width: 130px !important;
            height: 130px !important;
            border: 2px solid #000 !important;
            padding: 4px !important;
            background: #fff !important;
          }

          .pr-qr-code-text {
            font-size: 8px !important;
            font-family: 'Courier New', monospace !important;
            font-weight: 900 !important;
            letter-spacing: 2px !important;
            color: #000 !important;
            margin-top: 5px !important;
          }

          .pr-footer {
            padding: 10px 12px 16px;
            text-align: center;
          }

          .pr-footer-main {
            font-size: 11px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            letter-spacing: 1.5px !important;
            color: #000 !important;
            margin-bottom: 4px !important;
          }

          .pr-footer-sub {
            font-size: 9px !important;
            color: #555 !important;
            line-height: 1.5 !important;
          }

          .pr-date-line {
            font-size: 9px !important;
            color: #555 !important;
            text-align: center !important;
            padding: 6px 0 !important;
            border-top: 1px dashed #aaa !important;
            border-bottom: 1px dashed #aaa !important;
          }

          .pr-divider { border: none !important; border-top: 1px dashed #aaa !important; margin: 0 !important; }
        }

        /* Hide print receipt on screen */
        @media screen {
          #print-receipt { display: none !important; }
        }
      `}</style>

      {/* ══════════ PRINT RECEIPT (hidden on screen, shown on print) ══════════ */}
      <div id="print-receipt">
        {/* Header */}
        <div className="pr-header">
          <div className="pr-restaurant-name">Tasty Bites</div>
          <div className="pr-tagline">— Invoice Receipt —</div>
          <div className="pr-status-badge">✓ PAID SUCCESSFUL</div>
        </div>

        {/* Date Line */}
        <div className="pr-date-line">{printDate}</div>

        {/* Customer Info */}
        <div className="pr-section">
          <div className="pr-row">
            <span className="pr-row-label">Customer:</span>
            <span className="pr-row-value">{receipt.customer_name}</span>
          </div>
          <div className="pr-row">
            <span className="pr-row-label">Table:</span>
            <span className="pr-row-value">Table {receipt.table_number}</span>
          </div>
          <div className="pr-row">
            <span className="pr-row-label">Receipt Ref:</span>
            <span className="pr-row-mono">{receipt.id.substring(0, 13).toUpperCase()}</span>
          </div>
          {receipt.payment && (
            <div className="pr-row">
              <span className="pr-row-label">Txn ID:</span>
              <span className="pr-row-mono">{receipt.payment.razorpay_payment_id}</span>
            </div>
          )}
          {receipt.payment && (
            <div className="pr-row">
              <span className="pr-row-label">Method:</span>
              <span className="pr-row-value">{receipt.payment.method || 'UPI'}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="pr-section">
          <div className="pr-items-header">Order Items</div>
          {receipt.items?.map((item, idx) => (
            <div key={idx} className="pr-item-row">
              <span className="pr-item-name">
                {item.menu_item_name} <span className="pr-item-qty">×{item.quantity}</span>
              </span>
              <span className="pr-item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="pr-totals">
          <div className="pr-total-row">
            <span>Subtotal:</span>
            <span>₹{parseFloat(receipt.total_amount).toFixed(2)}</span>
          </div>
          <div className="pr-total-row">
            <span>GST (5%):</span>
            <span>₹{parseFloat(receipt.tax_amount).toFixed(2)}</span>
          </div>
          <div className="pr-grand-total">
            <span>GRAND TOTAL</span>
            <span>₹{parseFloat(receipt.grand_total).toFixed(2)}</span>
          </div>
        </div>

        {/* QR Exit Pass */}
        <div className="pr-qr-section">
          <div className="pr-qr-label">⬛ Express Exit Pass</div>
          <img src={qrUrl} alt="Exit Pass QR" className="pr-qr-img" />
          <div className="pr-qr-code-text">TB-{receipt.id.substring(0, 8).toUpperCase()}-PAID</div>
        </div>

        {/* Footer */}
        <div className="pr-footer">
          <div className="pr-footer-main">Thank You!</div>
          <div className="pr-footer-sub">
            This receipt is your verified exit pass.<br />
            Present at the exit gate for quick clearance.
          </div>
        </div>
      </div>

      {/* ══════════ SCREEN UI ══════════ */}
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
                    src={qrUrl} 
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
                  onClick={handlePrint}
                  className="mt-2 py-2.5 px-6 rounded-xl bg-white text-emerald-700 border border-emerald-200 text-[11px] font-black tracking-wider flex items-center gap-2 uppercase transition-all hover:bg-emerald-50 shadow-md shadow-emerald-900/20 active:scale-95"
                >
                  <Printer size={13} />
                  <span>Print Exit Receipt</span>
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </>
  );
};

export default SimulatedCheckout;
