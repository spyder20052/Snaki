import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const { toast } = useToast();

  // --- Load cart & promo from localStorage
  useEffect(() => {
    try {
      const savedCart = JSON.parse(localStorage.getItem('fastbite-cart') || '[]');
      if (Array.isArray(savedCart)) setCart(savedCart);

      const savedPromo = JSON.parse(localStorage.getItem('fastbite-appliedPromo') || 'null');
      if (savedPromo && savedPromo.name) setAppliedPromo(savedPromo);
    } catch (err) {
    }
  }, []);

  // --- Persist cart
  useEffect(() => {
    try {
      localStorage.setItem('fastbite-cart', JSON.stringify(cart));
    } catch (err) {
    }
  }, [cart]);

  // --- Persist applied promo
  useEffect(() => {
    try {
      if (appliedPromo) localStorage.setItem('fastbite-appliedPromo', JSON.stringify(appliedPromo));
      else localStorage.removeItem('fastbite-appliedPromo');
    } catch (err) {
    }
  }, [appliedPromo]);

  // --- Promo lookup (normalize input)
  const getPromoByCode = useCallback((rawCode) => {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) return { valid: false };

    if (code === 'BOBA1000') {
      return {
        valid: true,
        name: 'BOBA1000',
        description: 'Tous les bubble teas à 1000 FCFA et livraison gratuite',
        freeDelivery: true,
        fixedPricePerBubbleTea: 1000
      };
    }

    return { valid: false };
  }, []);

  // --- Apply promo (exposed through context as applyPromoCode)
  const handleApplyPromo = useCallback((code) => {
    const promo = getPromoByCode(code);
    if (promo.valid) {
      setAppliedPromo(promo);
      toast({ title: 'Code promo appliqué', description: promo.description, duration: 3000 });
      return { success: true, message: 'Code promo appliqué avec succès !', promo };
    }
    return { success: false, message: 'Code promo invalide' };
  }, [getPromoByCode, toast]);

  // --- Remove promo (exposed)
  const removePromo = useCallback(() => {
    setAppliedPromo(null);
    toast({ title: 'Code promo supprimé', duration: 2000 });
  }, [toast]);

  // --- Totaux du panier (gère BOBA1000 correctement)
  const cartTotals = useMemo(() => {
    const isBobaPromoActive = appliedPromo?.name === 'BOBA1000';

    const totals = cart.reduce((acc, item) => {
      const unitPrice = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;

      // options unit price (somme des prix des choix *par unité*)
      let optionsUnitPrice = 0;
      if (item.selectedOptions) {
        Object.entries(item.selectedOptions).forEach(([optionKey, selectedValue]) => {
          const option = item.options?.[optionKey];
          if (!option?.choices) return;
          const choice = option.choices.find(c => c.id === selectedValue || c.value === selectedValue || c.name === selectedValue || c.label === selectedValue);
          if (choice?.price) optionsUnitPrice += Number(choice.price) || 0;
        });
      }

      const originalItemTotal = (unitPrice + optionsUnitPrice) * qty;

      // Pour BOBA1000 : chaque bubble tea coûte FIXE 1000 FCFA * quantité (on ignore les options
      // si tu veux conserver les options il faudrait les ajouter explicitement)
      let finalItemTotal = originalItemTotal;
      if (isBobaPromoActive && item.name?.toLowerCase().includes('bubble tea')) {
        finalItemTotal = (appliedPromo?.fixedPricePerBubbleTea ?? 1000) * qty;
      }

      acc.originalSubtotal += originalItemTotal;
      acc.subtotal += finalItemTotal;
      acc.discountAmount += Math.max(0, originalItemTotal - finalItemTotal);
      acc.totalItems += qty;
      return acc;
    }, { subtotal: 0, originalSubtotal: 0, discountAmount: 0, totalItems: 0 });

    // frais de livraison : gratuit si promo BOBA1000 ou si originalSubtotal >= 6000 (règle existante)
    const deliveryFee = (isBobaPromoActive || totals.originalSubtotal >= 6000) ? 0 : 1000;
    const finalTotal = totals.subtotal + deliveryFee;

    return {
      subtotal: totals.subtotal,
      originalSubtotal: totals.originalSubtotal,
      discountAmount: totals.discountAmount,
      deliveryFee,
      finalTotal,
      itemCount: totals.totalItems
    };
  }, [cart, appliedPromo]);

  // --- addToCart (génère uniqueId)
  const addToCart = useCallback((product, quantity = 1) => {
    setCart(prevCart => {
      const generateItemId = (item) => {
        if (!item.selectedOptions) return String(item.id);
        const optionsString = Object.entries(item.selectedOptions)
          .sort(([a],[b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}:${v}`)
          .join('|');
        return `${item.id}_${optionsString}`;
      };

      const itemId = generateItemId(product);
      const existingIndex = prevCart.findIndex(i => (i.uniqueId || i.id) === itemId);

      if (existingIndex >= 0) {
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: (Number(updated[existingIndex].quantity) || 0) + quantity
        };
        toast({ title: 'Quantité mise à jour', description: `${product.name} mis à jour`, duration: 2000 });
        return updated;
      } else {
        const newItem = { ...product, quantity, uniqueId: itemId };
        toast({ title: 'Produit ajouté', description: `${product.name} ajouté au panier`, duration: 2000 });
        return [...prevCart, newItem];
      }
    });
  }, [toast]);

  // --- removeFromCart
  const removeFromCart = useCallback((productId) => {
    setCart(prev => {
      const item = prev.find(i => (i.uniqueId === productId || i.id === productId));
      const next = prev.filter(i => (i.uniqueId !== productId && i.id !== productId));
      if (item) toast({ title: 'Produit retiré', description: `${item.name} retiré du panier`, duration: 2000 });
      return next;
    });
  }, [toast]);

  // --- updateQuantity
  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity < 1) return;
    setCart(prev => prev.map(i => (i.uniqueId === productId || i.id === productId) ? { ...i, quantity } : i));
  }, []);

  // --- clearCart (aussi supprime le promo pour éviter effets étranges)
  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedPromo(null);
    toast({ title: 'Panier vidé', description: 'Tous les produits ont été retirés du panier', duration: 2000 });
  }, [toast]);

  // --- valeur du context exposée
  const contextValue = useMemo(() => ({
    cart,
    itemCount: cartTotals.itemCount,
    cartTotal: cartTotals.finalTotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    deliveryFee: cartTotals.deliveryFee,
    subtotal: cartTotals.subtotal,
    finalTotal: cartTotals.finalTotal,
    originalSubtotal: cartTotals.originalSubtotal,
    appliedPromo,
    applyPromoCode: handleApplyPromo, // fonction que aspettent les composants (retourne {success, message})
    removePromo,
    discountAmount: cartTotals.discountAmount
  }), [cart, cartTotals, addToCart, removeFromCart, updateQuantity, clearCart, handleApplyPromo, removePromo, appliedPromo]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};
