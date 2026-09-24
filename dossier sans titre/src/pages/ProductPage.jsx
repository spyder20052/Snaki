import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Plus, Minus, Star, Zap, Leaf, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProductById, getPopularProducts } from '@/data/products';
import { useCart } from '@/contexts/CartContext';
import ProductCard from '@/components/ProductCard';

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cart, itemCount } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isAdded, setIsAdded] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({});

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchedProduct = getProductById(id);
    if (fetchedProduct) {
      setProduct(fetchedProduct);
      setQuantity(1); // Reset quantity when product changes
      
      // Initialize selected options
      if (fetchedProduct.options) {
        const initialOptions = {};
        Object.keys(fetchedProduct.options).forEach(optionKey => {
          initialOptions[optionKey] = fetchedProduct.options[optionKey].choices[0].id;
        });
        setSelectedOptions(initialOptions);
      }
      
      // Fetch related products (e.g., popular or same category, excluding current)
      const popular = getPopularProducts().filter(p => p.id !== fetchedProduct.id).slice(0, 4);
      setRelatedProducts(popular);

    } else {
      navigate('/menu');
    }
  }, [id, navigate]);

  useEffect(() => {
    if (product) {
      const itemInCart = cart.find(item => item.id === product.id);
      setIsAdded(!!itemInCart);
    }
  }, [cart, product]);


  const handleQuantityChange = (amount) => {
    setQuantity(prev => Math.max(1, prev + amount));
  };

  const handleOptionChange = (optionKey, value) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionKey]: value
    }));
  };

  const handleAddToCart = () => {
    if (product) {
      const wasEmpty = itemCount === 0;
      addToCart({
        ...product,
        selectedOptions
      }, quantity);
      setIsAdded(true);
      // Animation for button
      setTimeout(() => setIsAdded(false), 2000); // Reset after 2s for re-click
      if (wasEmpty) {
        navigate('/cart');
      }
    }
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'tacos': 
        return <Flame className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />;  // Par exemple un feu pour tacos
      case 'bubble-tea': 
        return <Leaf className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />;   // Feuille pour bubble tea
      default: 
        return null;
    }
  }

  // Ajout : fonction pour calculer le prix dynamique
  const getDynamicPrice = () => {
    let total = product.price;
    if (product.options && selectedOptions) {
      Object.entries(selectedOptions).forEach(([optionKey, selectedValue]) => {
        const option = product.options[optionKey];
        const choice = option.choices.find(c => c.id === selectedValue);
        if (choice && choice.price) {
          total += choice.price;
        }
      });
    }
    return total;
  };

  if (!product) {
    return (
      <div className="pt-32 pb-16 container mx-auto px-4 flex justify-center items-center min-h-[calc(100vh-128px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500"></div>
      </div>
    );
  }

  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  };

  const imageVariants = {
    initial: { opacity: 0, scale: 0.8, rotate: -5 },
    animate: { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 150, damping: 20, delay: 0.1 } }
  };

  const detailsVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100, damping: 20, delay: 0.3 } }
  };
  
  const tabContentVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };


  return (
    <motion.div 
      className="pt-20 sm:pt-28 pb-10 sm:pb-16 overflow-hidden overflow-x-hidden w-full max-w-full"
      key={id} 
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="container mx-auto px-2 sm:px-4">
        <motion.div whileHover={{ x: -5 }} className="inline-block">
          <Button 
            variant="ghost" 
            className="mb-4 md:mb-8 flex items-center group text-gray-600 dark:text-gray-400 hover:text-orange-500 text-xs md:text-base"
            onClick={() => navigate(-1)}
            size="lg"
          >
            <ArrowLeft className="mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5 transition-transform duration-300 group-hover:-translate-x-1" />
            Retour
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 sm:gap-10 lg:gap-16 items-start">
          <motion.div 
            className="rounded-3xl overflow-hidden shadow-2xl aspect-square neumorphic-shadow"
            variants={imageVariants}
          >
            <img  
              className="w-full h-full object-cover max-w-full transform hover:scale-110 transition-transform duration-500 ease-out" 
              alt={product.name}
              src={`${product.image}`}
            />
          </motion.div>

          <motion.div variants={detailsVariants}>
            <div className="bg-card text-card-foreground p-4 md:p-6 sm:p-8 rounded-2xl shadow-xl h-full flex flex-col neumorphic-shadow">
              <div>
                <div className="flex justify-between items-start mb-3 md:mb-4">
                  <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-extrabold leading-tight bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">{product.name}</h1>
                  <span className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl font-bold text-orange-500 whitespace-nowrap ml-2 sm:ml-4 pt-1">{getDynamicPrice().toFixed(2)} fcfa</span>
                </div>
                
                <div className="mb-4 md:mb-6">
                  <span className="category-badge text-xs md:text-sm font-semibold px-2 md:px-4 py-1 md:py-2 rounded-full text-white inline-flex items-center shadow-md">
                    {getCategoryIcon(product.category)}
                    {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                  </span>
                </div>
                
                <div className="mb-4 md:mb-6 border-b border-border pb-1">
                  <div className="flex space-x-1 xs:space-x-2 sm:space-x-4">
                    {['description', 'ingredients', 'nutrition'].map(tab => (
                      <button 
                        key={tab}
                        className={`px-2 py-1 md:px-3 md:py-2 sm:px-4 sm:py-3 font-medium rounded-t-md transition-all duration-300 relative text-xs md:text-sm ${activeTab === tab ? 'text-orange-500' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {activeTab === tab && (
                          <motion.div layoutId="activeProductTab" className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    variants={tabContentVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="mb-6 md:mb-8"
                  >
                    {activeTab === 'description' && (
                      <div className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
                        {product.description}
                      </div>
                    )}
                    
                    {activeTab === 'ingredients' && (
                      <div className="text-xs sm:text-sm md:text-base text-muted-foreground">
                        <h3 className="font-semibold text-foreground mb-2">Ingrédients principaux :</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {product.ingredients?.map((ingredient, index) => (
                            <li key={index}>{ingredient}</li>
                          )) || (
                            <li>Informations non disponibles</li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    {activeTab === 'nutrition' && (
                      <div className="text-xs sm:text-sm md:text-base text-muted-foreground">
                        <h3 className="font-semibold text-foreground mb-2">Valeurs nutritionnelles :</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div>Calories: <span className="font-medium">{product.nutritionalInfo?.calories ?? 'N/A'}</span></div>
                          <div>Protéines: <span className="font-medium">{product.nutritionalInfo?.protein ? `${product.nutritionalInfo.protein}` : 'N/A'}{product.nutritionalInfo?.protein ? 'g' : ''}</span></div>
                          <div>Glucides: <span className="font-medium">{product.nutritionalInfo?.carbs ? `${product.nutritionalInfo.carbs}` : 'N/A'}{product.nutritionalInfo?.carbs ? 'g' : ''}</span></div>
                          <div>Lipides: <span className="font-medium">{product.nutritionalInfo?.fat ? `${product.nutritionalInfo.fat}` : 'N/A'}{product.nutritionalInfo?.fat ? 'g' : ''}</span></div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Options personnalisation */}
                {product.options && (
                  <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
                    {Object.entries(product.options).map(([optionKey, option]) => (
                      <div key={optionKey} className="space-y-2">
                        <label className="text-xs sm:text-sm md:text-base font-medium text-foreground">
                          {option.label}
                        </label>
                        <div className="flex flex-wrap gap-4">
                          {option.choices.map((choice) => {
                            const isSelected = selectedOptions[optionKey] === choice.id;
                            const isWithMilk = choice.id === 'with_milk';
                            const isWithoutMilk = choice.id === 'without_milk';
                            return (
                              <Button
                                key={choice.id}
                                type="button"
                                variant={isSelected ? 'default' : 'outline'}
                                className={`relative flex items-center px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 shadow-sm focus:ring-2 focus:ring-orange-400 ${isSelected ? 'ring-2 ring-orange-500 scale-105' : ''}`}
                                onClick={() => handleOptionChange(optionKey, choice.id)}
                              >
                                {isWithMilk && <span className="mr-1">🥛</span>}
                                {isWithoutMilk && <span className="mr-1">🌱</span>}
                                {choice.label}
                                {isWithMilk && (
                                  <span className="ml-2 bg-orange-500 text-white text-[11px] px-2 py-0.5 rounded-full font-bold absolute -top-3 -right-3 shadow-lg animate-pulse border-2 border-white z-10">
                                    Populaire
                                  </span>
                                )}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
              
              <div className="mt-auto pt-4 md:pt-8">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <div className="flex items-center border border-input rounded-lg overflow-hidden neumorphic-shadow">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 md:h-12 md:w-12 quantity-control-button rounded-none"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                    
                    <span className="w-12 md:w-16 text-center text-sm md:text-xl font-semibold bg-background">{quantity}</span>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 md:h-12 md:w-12 quantity-control-button rounded-none"
                      onClick={() => handleQuantityChange(1)}
                    >
                      <Plus className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                  </div>
                  
                  <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground">{(getDynamicPrice().toFixed(2) * quantity).toFixed(2)} fcfa</span>
                </div>
                
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button 
                    className={`w-full text-xs sm:text-sm md:text-base lg:text-lg font-semibold button-glow py-2 px-4 md:py-3 md:px-8 transition-all duration-300 ease-in-out transform hover:scale-102 ${isAdded ? 'bg-green-500 hover:bg-green-600' : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'}`}
                    size="xl"
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="mr-1 md:mr-2.5 h-4 w-4 md:h-6 md:w-6" />
                    {isAdded ? 'Ajouté !' : 'Ajouter au Panier'}
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 md:mt-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="mb-8 md:mb-12"
            >
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-center mb-6 md:mb-8">
                Vous aimerez aussi
              </h2>
            </motion.div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {relatedProducts.map((relatedProduct, index) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} index={index} />
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
};

export default ProductPage;