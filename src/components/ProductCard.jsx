import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';

const ProductCard = ({ product, index, priority = 'normal' }) => {
  const { addToCart } = useCart();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Préchargement des images pour les bubble tea
  useEffect(() => {
    if (priority === 'high' && product.image) {
      const img = new Image();
      img.onload = () => setImageLoaded(true);
      img.onerror = () => setImageError(true);
      img.src = product.image;
    }
  }, [product.image, priority]);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 25,
        delay: priority === 'high' ? index * 0.02 : index * 0.05 // Animation plus rapide pour bubble tea
      } 
    }
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 1.1 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  console.log("ProductCard", product);

  if (!product) return <div>Produit non trouvé</div>;
  if (!product.name) return <div>Produit sans nom</div>;

  return (
    <motion.div 
      className="food-card bg-card text-card-foreground rounded-2xl overflow-hidden shadow-xl neumorphic-shadow"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -8, scale: 1.03, transition: { type: "spring", stiffness: 300 } }}
      layout
    >
      <Link to={`/product/${product.id}`} className="block group">
        <div className="relative h-40 md:h-56 overflow-hidden">
          <motion.img
            className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-125" 
            alt={product.name}
            src={product.image}
            variants={imageVariants}
            initial="hidden"
            animate={imageLoaded || priority !== 'high' ? "visible" : "hidden"}
            loading={priority === 'high' ? 'eager' : 'lazy'}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            style={{
              filter: imageLoaded ? 'none' : 'blur(2px)',
              transition: 'filter 0.3s ease-out'
            }}
          />
          
          {/* Placeholder pendant le chargement */}
          {!imageLoaded && priority === 'high' && (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-2 md:mb-4 text-white bg-black/50 hover:bg-orange-500 hover:text-white flex items-center backdrop-blur-sm text-xs md:text-sm"
              asChild
            >
              <div><Eye className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Voir détails</div>
            </Button>
          </div>
          <div className="absolute top-2 md:top-3 right-2 md:right-3">
            <span className="category-badge text-xs font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-full text-white shadow-md pulse-badge">
              {product.category === 'tacos' ? 'Tacos' : 
               product.category === 'bubble-tea' ? 'Bubble-tea' :
               product.category === 'sides' ? 'Side' : 'Drink'}
            </span>
          </div>
        </div>
        
        <div className="p-3 md:p-5">
          <div className="flex justify-between items-center mb-1 md:mb-2">
            <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold truncate group-hover:text-orange-500 transition-colors duration-300">{product.name}</h3>
            <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-orange-500 whitespace-nowrap">
              {product.category === 'bubble-tea' ? '2000.00 fcfa' : product.price.toFixed(2) + ' fcfa'}
            </span>
          </div>
          
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1 h-8 md:h-10 line-clamp-2">{product.description}</p>
          
          <motion.div 
            className="mt-3 md:mt-4"
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold button-glow flex items-center text-xs sm:text-sm md:text-base py-2 px-3 md:py-3 md:px-4"
              onClick={handleAddToCart}
            >
              <PlusCircle className="mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5" />
              Ajouter au Panier
            </Button>
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;