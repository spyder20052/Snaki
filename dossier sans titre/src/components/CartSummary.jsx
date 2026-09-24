import React from 'react';
import { useCart } from '@/contexts/CartContext';
import { PromoCode } from './PromoCode';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Truck, CheckCircle, Tag } from 'lucide-react';

export const CartSummary = ({ onCheckout }) => {
  const {
    subtotal,
    discountAmount,
    deliveryFee,
    finalTotal,
    cart,
    appliedPromo,
    originalSubtotal,
    bubbleTeaItems = [],
    applyPromoCode,
    removePromo
  } = useCart();

  if (cart.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="text-center py-8">
          <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Votre panier est vide</h3>
          <p className="text-gray-500">Ajoutez des délicieux produits pour commencer vos achats</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-medium mb-4">Récapitulatif de la commande</h3>
        
        <div className="space-y-4">
          {/* Ligne du sous-total */}
          <div className="flex justify-between">
            <span className="text-gray-600">Sous-total ({cart.reduce((sum, item) => sum + (item.quantity || 1), 0)} articles)</span>
            <span className="font-medium">{originalSubtotal.toLocaleString()} FCFA</span>
          </div>
          
          {appliedPromo && (
            <>
              {/* En-tête du code promo */}
              <div className="flex items-center gap-2 text-sm bg-pink-50 text-pink-700 px-3 py-2 rounded-md">
                <Tag className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">Code promo appliqué: <span className="font-bold">{appliedPromo.id}</span></span>
              </div>
              
              {/* Détail des réductions */}
              {bubbleTeaItems.length > 0 && (
                <div className="space-y-2 text-sm">
                  <div className="font-medium text-gray-700">Détail des réductions :</div>
                  <div className="ml-4 space-y-1">
                    {bubbleTeaItems.map((item, index) => {
                      const originalTotal = item.originalPrice + item.optionsPrice;
                      const discountedTotal = (1000 * item.quantity) + item.optionsPrice;
                      return (
                        <div key={index} className="flex justify-between">
                          <span className="text-gray-600">
                            {item.quantity}x {item.name} à 1000 FCFA
                            {item.optionsPrice > 0 && ` + ${item.optionsPrice.toLocaleString()} FCFA (options)`}
                          </span>
                          <span className="text-pink-600 whitespace-nowrap">
                            -{(originalTotal - discountedTotal).toLocaleString()} FCFA
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Ligne de la réduction */}
              <div className="flex justify-between font-medium pt-2 border-t border-gray-100">
                <span>Réduction totale</span>
                <span className="text-pink-600">-{discountAmount.toLocaleString()} FCFA</span>
              </div>
              
              {/* Ligne du total après réduction */}
              <div className="flex justify-between font-medium pt-2">
                <span>Total après réduction</span>
                <span className="font-medium">{subtotal.toLocaleString()} FCFA</span>
              </div>
            </>
          )}
          
          {/* Frais de livraison */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <span className="text-gray-600">Frais de livraison</span>
            </div>
            {deliveryFee === 0 ? (
              <span className="text-green-600 font-medium">Offert</span>
            ) : (
              <span>{deliveryFee.toLocaleString()} FCFA</span>
            )}
          </div>
          
          {appliedPromo?.freeDelivery && (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded-md flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Livraison offerte avec le code promo</span>
            </div>
          )}
          
          {/* Total à payer */}
          <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-gray-200">
            <span className="text-lg font-bold">Total à payer</span>
            <div className="text-right">
              <div className="text-2xl font-bold text-pink-600">{finalTotal.toLocaleString()} FCFA</div>
              {appliedPromo && finalTotal < originalSubtotal && (
                <div className="text-xs text-green-600">
                  Économie de {(originalSubtotal + (deliveryFee > 0 ? deliveryFee : 0) - finalTotal).toLocaleString()} FCFA
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6 border-t border-gray-200 pt-6">
          <h4 className="text-sm font-medium mb-3">Code promo</h4>
          <PromoCode 
            className="mb-4"
            appliedPromo={appliedPromo}
            onApplyPromo={applyPromoCode}
            onRemovePromo={removePromo}
          />
        </div>
        
        <Button 
          className="w-full bg-pink-500 hover:bg-pink-600 text-white py-6 text-lg"
          onClick={onCheckout}
        >
          Valider la commande
        </Button>
        
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          <Truck className="w-4 h-4" />
          <span>Livraison gratuite à partir de 6000 FCFA d'achat</span>
        </div>
      </div>
      
      {appliedPromo?.freeDelivery && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <div className="bg-green-100 p-2 rounded-full">
            <Truck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-medium text-green-800">Livraison offerte !</h4>
            <p className="text-sm text-green-600">Votre commande est éligible à la livraison gratuite grâce à votre code promo.</p>
          </div>
        </div>
      )}
    </div>
  );
};
