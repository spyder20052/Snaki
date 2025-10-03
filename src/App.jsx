import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/contexts/CartContext';
import HomePage from '@/pages/HomePage';
import MenuPage from '@/pages/MenuPage';
import ProductPage from '@/pages/ProductPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';

import Layout from '@/components/Layout';
import LoadingScreen from '@/components/LoadingScreen';
import { AnimatePresence } from 'framer-motion';
import PromotionsPage from '@/pages/PromotionsPage';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation(); // Pour gérer la clé de AnimatePresence

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // Durée du chargement

    return () => clearTimeout(timer);
  }, []);

  return (
    <CartProvider>
      <LoadingScreen isLoading={isLoading} />
      <AnimatePresence mode="wait">
        {!isLoading && (
          <Layout key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/promotions" element={<PromotionsPage />} />
            </Routes>
          </Layout>
        )}
      </AnimatePresence>
      <Toaster />
    </CartProvider>
  );
}

export default App;