import React from 'react';
import { useCart } from '@/contexts/CartContext';
import { CartItem } from '@/components/CartItem';
import { CartSummary } from '@/components/CartSummary';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart } = useCart();

  const handleCheckout = () => {
    // Handle checkout logic here
    console.log('Proceeding to checkout');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link to="/" className="mr-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Mon Panier</h1>
      </div>
      
      {cart.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-medium text-gray-900 mb-2">Votre panier est vide</h2>
          <p className="text-gray-500 mb-6">Découvrez nos délicieux produits et faites-vous plaisir !</p>
          <Link to="/menu">
            <Button className="bg-pink-500 hover:bg-pink-600 text-white">
              Voir le menu
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium">Vos articles ({cart.reduce((sum, item) => sum + (item.quantity || 1), 0)})</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {cart.map((item) => (
                  <CartItem 
                    key={`${item.id}-${JSON.stringify(item.selectedOptions || {})}`}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="lg:sticky lg:top-4">
            <CartSummary onCheckout={handleCheckout} />
          </div>
        </div>
      )}
    </div>
  );
}
