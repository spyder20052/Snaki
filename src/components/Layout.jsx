import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';

const Layout = ({ children, key }) => {
  return (
    <motion.div 
      key={key}
      className="flex flex-col min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </motion.div>
  );
};

export default Layout;