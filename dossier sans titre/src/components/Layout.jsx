import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';

const Layout = ({ children, key }) => {
  const location = useLocation();
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  // Mise à jour de la hauteur de la fenêtre lors du redimensionnement
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Style dynamique basé sur la hauteur de l'écran
  const layoutStyle = {
    minHeight: `${windowHeight}px`,
    maxHeight: windowHeight < 600 ? '100vh' : 'none',
    overflowY: windowHeight < 600 ? 'auto' : 'visible',
    WebkitOverflowScrolling: 'touch', // Pour un défilement fluide sur iOS
  };

  return (
    <motion.div 
      key={key}
      className="flex flex-col w-full"
      style={layoutStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <Navbar />
      <main className="flex-grow w-full" style={{
        minHeight: windowHeight < 600 ? `calc(${windowHeight}px - 8rem)` : 'auto',
        paddingBottom: '2rem'
      }}>
        {children}
      </main>
      <Footer style={{
        flexShrink: 0
      }} />
    </motion.div>
  );
};

export default Layout;