import React, { useState } from 'react';
import { X, Copy, Printer } from 'lucide-react';

interface QuickPrintModalProps {
  open: boolean;
  onClose: () => void;
  type: 'photocopy' | 'printing';
  pricePerPage: number;
  staplePrice: number;
  currency: string;
  onConfirm: (quantity: number, pages: number, total: number, type: 'photocopy' | 'printing', staples: number) => void;
}

const QuickPrintModal: React.FC<QuickPrintModalProps> = ({
  open,
  onClose,
  type,
  pricePerPage,
  staplePrice,
  currency,
  onConfirm
}) => {
  const [quantity, setQuantity] = useState(1);
  const [pagesPerCopy, setPagesPerCopy] = useState(1);
  const [useStaples, setUseStaples] = useState(false);
  const [staplesPerCopy, setStaplesPerCopy] = useState(1);

  const totalPages = quantity * pagesPerCopy;
  const printCost = totalPages * pricePerPage;
  const stapleCost = useStaples ? quantity * staplesPerCopy * staplePrice : 0;
  const total = printCost + stapleCost;

  const handleConfirm = () => {
    onConfirm(quantity, pagesPerCopy, total, type, useStaples ? quantity * staplesPerCopy : 0);
    setQuantity(1);
    setPagesPerCopy(1);
    setUseStaples(false);
    setStaplesPerCopy(1);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ fontFamily: 'Inter, Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(30, 35, 44, 0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden" style={{ border: '1px solid #e2e5eb' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: '#f8f9fa', borderColor: '#e2e5eb', padding: '10px 16px' }}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded ${type === 'photocopy' ? 'bg-slate-100' : 'bg-blue-50'}`}>
              {type === 'photocopy' ? (
                <Copy size={16} className="text-slate-600" />
              ) : (
                <Printer size={16} className="text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#1a1d23', fontSize: '20px', lineHeight: 1.4 }}>
                {type === 'photocopy' ? 'Quick Photocopy' : 'Type & Printing'}
              </h2>
              <p className="text-xs" style={{ color: '#5c6370', lineHeight: 1.4 }}>
                {currency}{pricePerPage} per page
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100 transition-colors"
            style={{ padding: '6px' }}
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4" style={{ padding: '16px' }}>
          <div>
            <label className="block text-xs font-medium" style={{ color: '#4a4f56', marginBottom: '6px', lineHeight: 1.5, fontSize: '12px' }}>
              Pages per Copy
            </label>
            <input
              type="number"
              min={1}
              value={pagesPerCopy}
              onChange={(e) => setPagesPerCopy(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded border text-right"
              style={{ 
                padding: '8px 10px', 
                borderColor: '#d1d5db', 
                fontSize: '13.5px', 
                fontWeight: 500,
                color: '#1a1d23',
                backgroundColor: '#fafbfc',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.4
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium" style={{ color: '#4a4f56', marginBottom: '6px', lineHeight: 1.5, fontSize: '12px' }}>
              Number of Copies
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded border text-right"
              style={{ 
                padding: '8px 10px', 
                borderColor: '#d1d5db', 
                fontSize: '13.5px', 
                fontWeight: 500,
                color: '#1a1d23',
                backgroundColor: '#fafbfc',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.4
              }}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded border" style={{ backgroundColor: '#f8f9fa', borderColor: '#e2e5eb', padding: '8px 10px' }}>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useStaples"
                checked={useStaples}
                onChange={(e) => setUseStaples(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                style={{ accentColor: '#10b981' }}
              />
              <label htmlFor="useStaples" className="text-xs font-medium" style={{ color: '#4a4f56', lineHeight: 1.5 }}>
                Include Staple Wire
              </label>
            </div>
            {useStaples && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: '#8b9099', lineHeight: 1.4, fontSize: '11px' }}>per copy:</span>
                <input
                  type="number"
                  min={1}
                  value={staplesPerCopy}
                  onChange={(e) => setStaplesPerCopy(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 px-2 py-1 rounded border text-center"
                  style={{ 
                    borderColor: '#d1d5db', 
                    fontSize: '13px', 
                    fontWeight: 500,
                    color: '#1a1d23',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.4,
                    padding: '4px 6px'
                  }}
                />
              </div>
            )}
          </div>

          <div className="p-3 rounded border" style={{ backgroundColor: '#f8f9fa', borderColor: '#e2e5eb', padding: '10px' }}>
            <div className="flex justify-between items-center" style={{ lineHeight: 1.5 }}>
              <span className="text-xs font-normal" style={{ color: '#5c6370' }}>Total Pages:</span>
              <span className="font-semibold text-right" style={{ color: '#1a1d23', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{totalPages}</span>
            </div>
            {useStaples && (
              <div className="flex justify-between items-center mt-1.5" style={{ lineHeight: 1.5 }}>
                <span className="text-xs font-normal" style={{ color: '#5c6370' }}>Total Staples:</span>
                <span className="font-semibold text-right" style={{ color: '#1a1d23', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{quantity * staplesPerCopy}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 mt-2 border-t" style={{ borderColor: '#e2e5eb', lineHeight: 1.4, marginTop: '8px', paddingTop: '8px' }}>
              <span className="text-xs font-semibold" style={{ color: '#4a4f56' }}>Total</span>
              <span className="font-bold text-right" style={{ color: '#059669', fontSize: '18px', fontVariantNumeric: 'tabular-nums' }}>
                {currency}{total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t" style={{ padding: '10px 16px', borderColor: '#e2e5eb', backgroundColor: '#f8f9fa' }}>
          <button
            onClick={onClose}
            className="flex-1 rounded font-medium transition-colors"
            style={{ padding: '8px 14px', fontSize: '13px', color: '#5c6370', backgroundColor: 'transparent', border: '1px solid #d1d5db' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded font-medium transition-colors"
            style={{ padding: '8px 14px', fontSize: '13px', color: '#ffffff', backgroundColor: '#10b981', border: 'none' }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickPrintModal;