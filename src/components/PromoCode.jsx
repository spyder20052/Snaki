import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, X, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PromoCode = ({ 
  appliedPromo, 
  onApplyPromo, 
  onRemovePromo,
  className = ''
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!promoCode.trim()) {
      setError('Veuillez entrer un code promo');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await onApplyPromo(promoCode);
      if (!result.success) {
        setError(result.message || 'Code promo invalide');
      } else {
        setPromoCode('');
      }
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  if (appliedPromo) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`border border-green-200 bg-gradient-to-r from-green-50 to-green-100 rounded-lg overflow-hidden shadow-sm ${className}`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-full mt-0.5">
              <Gift className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-green-800">Code promo appliqué</h4>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={onRemovePromo}
                  className="text-green-700 hover:bg-green-200/50 h-8 w-8 p-0 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {appliedPromo.name}
                </span>
                {appliedPromo.description && (
                  <p className="mt-1 text-sm text-green-700">{appliedPromo.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${className}`}
    >
      <div className="bg-gradient-to-r from-pink-50 to-pink-100 p-4 rounded-lg border border-pink-100">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-5 h-5 text-pink-600" />
          <h4 className="font-medium text-pink-800">Code promo</h4>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Entrez votre code promo"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className={`${error ? 'border-red-500' : 'border-pink-200 focus:border-pink-400'} bg-white`}
              />
            </div>
            <Button 
              type="submit" 
              className="bg-pink-500 hover:bg-pink-600 text-white whitespace-nowrap"
              disabled={isLoading}
            >
              {isLoading ? 'Application...' : 'Appliquer'}
            </Button>
          </div>
          
          <AnimatePresence>
            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-red-500 overflow-hidden"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          
          <div className="flex items-center gap-2 text-xs text-pink-600 mt-1">
            <span className="font-medium">Exemple:</span>
            <span className="bg-pink-100 px-2 py-0.5 rounded">BOBA1000</span>
            <span>pour une réduction spéciale</span>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
