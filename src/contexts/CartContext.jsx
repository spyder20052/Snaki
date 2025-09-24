import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';

const CartContext = createContext(null);

const PROMO_CODES = {
  'BOBA1000': {
    discount: 'bubble_tea',
    discountValue: 1000,
    freeDelivery: true,
    name: 'Réduction Bubble Tea',
    description: 'Tous les Bubble Tea à 1000 FCFA et livraison offerte'
  }
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const { toast } = useToast();

  // Load cart from localStorage on initial render
  useEffect(() => {
    const savedCart = localStorage.getItem('fastbite-cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to parse cart from localStorage:', error);
      }
    }
  }, []);

  // Calculate cart total with promo code
  const { finalTotal, discountAmount, hasBubbleTea } = useMemo(() => {
    let total = cart.reduce((sum, item) => {
      let itemTotal = item.price * item.quantity;
      
      // Add options prices
      if (item.selectedOptions) {
        Object.entries(item.selectedOptions).forEach(([optionKey, selectedValue]) => {
          const option = item.options?.[optionKey];
          const choice = option?.choices?.find(c => c.id === selectedValue);
          if (choice && choice.price) {
            itemTotal += choice.price * item.quantity;
          }
        });
      }
      
      // Apply promo code discount if applicable
      if (appliedPromo && item.category === 'bubble-tea') {
        if (appliedPromo.discount === 'bubble_tea') {
          itemTotal = Math.min(itemTotal, appliedPromo.discountValue * item.quantity);
        }
      }
      
      return sum + itemTotal;
    }, 0);

    const hasBubbleTea = cart.some(item => item.category === 'bubble-tea');
    const deliveryFee = (appliedPromo?.freeDelivery || total > 6000) ? 0 : (total > 0 ? 1000 : 0);
    const finalTotal = total + deliveryFee;
    
    return {
      finalTotal,
      discountAmount: appliedPromo ? (cartTotal - total) : 0,
      hasBubbleTea,
      deliveryFee
    };
  }, [cart, appliedPromo]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('fastbite-cart', JSON.stringify(cart));
    setCartTotal(finalTotal);
  }, [cart, finalTotal]);

  // Apply promo code
  const applyPromoCode = (code) => {
    const promo = PROMO_CODES[code];
    if (!promo) {
      toast({
        title: "Code promo invalide",
        description: "Le code promo saisi n'est pas valide.",
        variant: "destructive"
      });
      return false;
    }

    if (promo.discount === 'bubble_tea' && !cart.some(item => item.category === 'bubble-tea')) {
      toast({
        title: "Code promo non applicable",
        description: "Ce code promo n'est valable que pour les Bubble Tea.",
        variant: "destructive"
      });
      return false;
    }

    setAppliedPromo(promo);
    toast({
      title: "Code promo appliqué",
      description: promo.description,
    });
    return true;
  };

  // Remove promo code
  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoCode('');
  };

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      // Nouvelle logique : comparer id + options
      const isSameOptions = (a, b) => {
        if (!a.selectedOptions && !b.selectedOptions) return true;
        if (!a.selectedOptions || !b.selectedOptions) return false;
        const aKeys = Object.keys(a.selectedOptions);
        const bKeys = Object.keys(b.selectedOptions);
        if (aKeys.length !== bKeys.length) return false;
        return aKeys.every(key => b.selectedOptions[key] === a.selectedOptions[key]);
      };
      const existingItemIndex = prevCart.findIndex(item => item.id === product.id && isSameOptions(item, product));
      
      if (existingItemIndex >= 0) {
        // Item already exists, update quantity
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + quantity
        };
        
        toast({
          title: "Produit ajouté",
          description: `${product.name} a été ajouté au panier`,
          duration: 2000,
        });
        
        return updatedCart;
      } else {
        // Add new item
        toast({
          title: "Produit ajouté",
          description: `${product.name} a été ajouté au panier`,
          duration: 2000,
        });
        
        return [...prevCart, { ...product, quantity }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => {
      const updatedCart = prevCart.filter(item => item.id !== productId);
      
      toast({
        title: "Produit retiré",
        description: "Le produit a été retiré du panier",
        duration: 2000,
      });
      
      return updatedCart;
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) return;
    
    setCart(prevCart => 
      prevCart.map(item => 
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    toast({
      title: "Panier vidé",
      description: "Tous les produits ont été retirés du panier",
      duration: 2000,
    });
  };

  return (
    <CartContext.Provider value={{
      cart,
      cartTotal: finalTotal,
      itemCount: cart.reduce((total, item) => total + item.quantity, 0),
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      promoCode,
      setPromoCode,
      applyPromoCode,
      removePromoCode,
      appliedPromo,
      discountAmount,
      hasBubbleTea,
      deliveryFee: (appliedPromo?.freeDelivery || finalTotal > 6000) ? 200 : (finalTotal > 0 ? 1000 : 0),
      subtotal: cart.reduce((sum, item) => {
        let itemTotal = item.price * item.quantity;
        if (item.selectedOptions) {
          Object.entries(item.selectedOptions).forEach(([optionKey, selectedValue]) => {
            const option = item.options?.[optionKey];
            const choice = option?.choices?.find(c => c.id === selectedValue);
            if (choice && choice.price) {
              itemTotal += choice.price * item.quantity;
            }
          });
        }
        return sum + itemTotal;
      }, 0)
    }}>
      {children}
    </CartContext.Provider>
  );
};