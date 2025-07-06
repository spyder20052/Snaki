import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { categories, getProductsByCategory } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import { SlidersHorizontal, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MenuPage = () => {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState({});
  const [visibleSections, setVisibleSections] = useState(new Set());
  const sectionRefs = useRef({});

  categories.forEach(category => {
    if (!sectionRefs.current[category.id]) {
      sectionRefs.current[category.id] = React.createRef();
    }
  });

  // Préchargement des images des bubble tea
  useEffect(() => {
    const bubbleTeaProducts = getProductsByCategory('bubble-tea');
    bubbleTeaProducts.forEach(product => {
      if (product.image) {
        const img = new Image();
        img.src = product.image;
      }
    });
  }, []);

  useEffect(() => {
    const newFilteredProducts = {};
    categories.forEach(category => {
      const products = getProductsByCategory(category.id);
      newFilteredProducts[category.id] = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
    setFilteredProducts(newFilteredProducts);
  }, [searchTerm]);

  // Observer pour détecter les sections visibles
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set([...prev, entry.target.id]));
          }
        });
      },
      {
        threshold: 0.1, // Déclenche dès que 10% de la section est visible
        rootMargin: '50px' // Déclenche 50px avant que la section soit visible
      }
    );

    // Observer toutes les sections
    categories.forEach(category => {
      const element = sectionRefs.current[category.id]?.current;
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  const scrollToCategory = (categoryId) => {
    setActiveCategory(categoryId);
    if (sectionRefs.current[categoryId] && sectionRefs.current[categoryId].current) {
      sectionRefs.current[categoryId].current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05, // Réduit le délai entre les enfants
        delayChildren: 0.1 // Réduit le délai initial
      }
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4, // Réduit la durée d'animation
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="pt-28 pb-16 min-h-screen">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-6 md:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2 md:mb-4 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Notre Menu Délicieux</h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Explorez une avalanche de saveurs ! Des burgers épiques aux pizzas irrésistibles, chaque plat est une promesse de pur plaisir.
          </p>
        </motion.div>

        <motion.div 
          className="sticky top-[70px] z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md py-2 md:py-4 mb-6 md:mb-10 rounded-xl shadow-lg neumorphic-shadow"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between px-2 md:px-4 gap-2 md:gap-4">
            <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
              <Input 
                type="text"
                placeholder="Rechercher un délice..."
                className="pl-8 md:pl-10 w-full sm:w-64 h-8 md:h-11 rounded-lg border-2 border-transparent focus:border-orange-500 focus:ring-orange-500 transition-all duration-300 shadow-inner text-xs md:text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <div className="flex overflow-x-auto pb-2 hide-scrollbar w-full sm:w-auto">
              <div className="flex space-x-1 md:space-x-2">
                {categories.map((category) => (
                  <motion.button
                    key={category.id}
                    onClick={() => scrollToCategory(category.id)}
                    className={`px-2 md:px-4 py-1.5 md:py-2.5 rounded-lg whitespace-nowrap transition-all duration-300 font-medium text-xs md:text-sm ${
                      activeCategory === category.id
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md scale-105'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
                    }`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {category.name}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {categories.map((category, catIndex) => {
          const productsToDisplay = filteredProducts[category.id] || getProductsByCategory(category.id);
          const isVisible = visibleSections.has(category.id);
          
          return (
            <section 
              key={category.id} 
              ref={sectionRefs.current[category.id]}
              className="mb-10 md:mb-20 menu-section"
              id={category.id}
            >
              <motion.div
                initial="hidden"
                animate={isVisible ? "visible" : "hidden"}
                variants={sectionVariants}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-8 flex items-center text-gray-800 dark:text-white">
                  <span className={`inline-block p-2 md:p-3 rounded-xl mr-2 md:mr-4 bg-gradient-to-br from-orange-400 to-red-500 shadow-lg`}>
                    {/* Icones peuvent être ajoutées ici si disponibles */}
                  </span>
                  {category.name}
                </h2>
                
                <AnimatePresence>
                  {productsToDisplay.length > 0 ? (
                    <motion.div 
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-x-6 gap-y-6 md:gap-y-10"
                      variants={containerVariants}
                      initial="hidden"
                      animate={isVisible ? "visible" : "hidden"}
                    >
                      {productsToDisplay.map((product, index) => (
                        <ProductCard 
                          key={product.id} 
                          product={product} 
                          index={index}
                          // Optimisation pour bubble tea
                          priority={category.id === 'bubble-tea' ? 'high' : 'normal'}
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <motion.p 
                      className="text-center text-gray-500 dark:text-gray-400 py-6 md:py-8 text-sm md:text-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Oops! Aucun délice ne correspond à votre recherche dans cette catégorie.
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default MenuPage;