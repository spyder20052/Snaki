import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const [cartTotal, setCartTotal] = useState(0);
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

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('fastbite-cart', JSON.stringify(cart));
    
    // Calculate total including options
    const total = cart.reduce((sum, item) => {
      let itemTotal = item.price * item.quantity;
      
      // Add options prices
      if (item.selectedOptions) {
        Object.entries(item.selectedOptions).forEach(([optionKey, selectedValue]) => {
          const option = item.options[optionKey];
          const choice = option.choices.find(c => c.id === selectedValue);
          if (choice && choice.price) {
            itemTotal += choice.price * item.quantity;
          }
        });
      }
      
      return sum + itemTotal;
    }, 0);
    
    setCartTotal(total);
  }, [cart]);

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
      cartTotal,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      itemCount: cart.reduce((count, item) => count + item.quantity, 0)
    }}>
      {children}
    </CartContext.Provider>
  );
};