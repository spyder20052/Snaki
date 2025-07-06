import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, Home, ListOrdered, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import snakiLogo from './snaki.webp';
import snaki2Logo from './snaki2.webp';

const NavLink = ({ to, children, icon, textColorClass }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); 
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Link to={to} className="relative group">
      <motion.div
        className={`flex items-center font-medium px-2 md:px-3 py-1 md:py-2 rounded-md transition-colors duration-300 text-xs md:text-sm ${isActive ? 'text-orange-500' : textColorClass}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {icon && React.cloneElement(icon, { className: `mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5 ${isActive ? 'text-orange-500' : textColorClass}` })}
        {children}
      </motion.div>
      {isActive && (
        <motion.div
          layoutId="active-nav-indicator"
          className="absolute -bottom-1 left-0 right-0 h-0.5 bg-orange-500"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </Link>
  );
};


const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const location = useLocation();

  // Détecte si on est sur la page d'accueil
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); 
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Détermine le style de la navbar
  const headerClass = isHome && !isScrolled
    ? 'bg-transparent'
    : 'bg-white text-gray-900 shadow-lg';

  // Détermine le logo à afficher
  const logoToShow = isHome
    ? (isScrolled ? snakiLogo : snaki2Logo)
    : snakiLogo;

  // Détermine la couleur des textes
  const textColorClass = isHome && !isScrolled
    ? 'text-white hover:text-orange-300'
    : 'text-gray-900 hover:text-orange-500';

  // Détermine le fond du menu mobile
  const mobileMenuBg = isHome && !isScrolled
    ? 'bg-transparent'
    : 'bg-white dark:bg-gray-900';

  // Détermine la couleur des icônes principaux (panier, menu)
  const iconMainColor = isHome && !isScrolled ? 'text-white' : 'text-gray-900';

  return (
    <motion.header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerClass}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <div className="container mx-auto px-4 py-2 md:py-3">
        <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center group">
          <motion.img
            src={logoToShow}
            alt="Snaki Logo"
            className={`h-8 w-auto md:h-10 group-hover:scale-105 transition-transform duration-300`}
            whileHover={{ rotate: [0, -5, 5, -5, 0], scale: 1.1 }}
            transition={{ duration: 0.5 }}
          />
        </Link>

          <nav className="hidden md:flex items-center space-x-1">
            <NavLink to="/" icon={<Home />} textColorClass={textColorClass}>Accueil</NavLink>
            <NavLink to="/menu" icon={<ListOrdered />} textColorClass={textColorClass}>Menu</NavLink>
            <NavLink to="/promotions" icon={<Gift />} textColorClass={textColorClass}>Abonnements</NavLink>
          </nav>

          <div className="flex items-center space-x-1 md:space-x-2">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Link to="/cart" className="relative">
                <Button variant="ghost" className="relative p-1 md:p-2 rounded-full hover:bg-orange-500/10">
                  <ShoppingCart className={`h-5 w-5 md:h-6 md:w-6 ${iconMainColor} group-hover:text-orange-500`} />
                  {itemCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0, y: -5 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 bg-red-500 text-white text-xs font-semibold rounded-full h-4 w-4 md:h-5 md:w-5 flex items-center justify-center shadow-md"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </Button>
              </Link>
            </motion.div>
            
            <div className="md:hidden">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Menu"
                className="rounded-full hover:bg-orange-500/10 h-8 w-8 md:h-10 md:w-10"
              >
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={isMobileMenuOpen ? "x" : "menu"}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isMobileMenuOpen ? <X className={`h-5 w-5 md:h-6 md:w-6 ${iconMainColor}`} /> : <Menu className={`h-5 w-5 md:h-6 md:w-6 ${iconMainColor}`} />}
                  </motion.div>
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`md:hidden ${mobileMenuBg} shadow-lg backdrop-blur-md overflow-hidden`}
          >
            <div className="container mx-auto px-4 py-2 md:py-4 flex flex-col space-y-1 md:space-y-2">
              <NavLink to="/" icon={<Home />} textColorClass={textColorClass}>Accueil</NavLink>
              <NavLink to="/menu" icon={<ListOrdered />} textColorClass={textColorClass}>Menu</NavLink>
              <NavLink to="/promotions" icon={<Home />} textColorClass={textColorClass}>Abonnements</NavLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Navbar;