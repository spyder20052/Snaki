import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Trash2, ArrowRight, Receipt, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CartItem from '@/components/CartItem';
import { useCart } from '@/contexts/CartContext';


const CartPage = () => {
  const { 
    cart, 
    cartTotal, 
    clearCart, 
    itemCount, 
    promoCode, 
    setPromoCode, 
    applyPromoCode, 
    appliedPromo, 
    removePromoCode, 
    discountAmount,
    hasBubbleTea,
    deliveryFee,
    subtotal
  } = useCart();
  
  const [promoInput, setPromoInput] = useState('');
  const totalAmount = cartTotal; // Le total est déjà calculé avec la livraison dans le contexte
  const navigate = useNavigate();

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeInOut" } },
  };

  const summaryVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.2, ease: "easeInOut" } },
  };

  return (
    <motion.div 
      className="pt-28 pb-16 min-h-[calc(100vh-112px)]"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <div className="container mx-auto px-4">
        <div className="mb-4 flex justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4 rotate-180" /> Continuer mes achats
          </Button>
        </div>
        <div className="text-center mb-6 md:mb-10">
          <motion.h1 
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2 md:mb-3 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 120 }}
          >
            Votre Festin en Préparation
          </motion.h1>
          <motion.p 
            className="text-xs sm:text-sm md:text-base lg:text-lg text-muted-foreground"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {itemCount > 0 
              ? `Vous avez ${itemCount} article${itemCount > 1 ? 's' : ''} prêts à être dévorés !`
              : 'Votre panier est tristement vide...'}
          </motion.p>
        </div>

        {itemCount > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 items-start">
            <div className="lg:col-span-2">
              <Card className="shadow-xl neumorphic-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2 md:pb-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl md:text-2xl">Contenu du Panier</CardTitle>
                    <CardDescription className="text-xs sm:text-sm md:text-base">Vérifiez vos articles avant de finaliser.</CardDescription>
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="flex items-center gap-1 md:gap-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 border border-red-500/30 text-xs md:text-sm py-1 px-2 md:py-2 md:px-3"
                      onClick={clearCart}
                    >
                      <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      Vider
                    </Button>
                  </motion.div>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                  <AnimatePresence>
                    {cart.map(item => (
                      <CartItem key={item.id} item={item} />
                    ))}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </div>

            <motion.div variants={summaryVariants} className="sticky top-28">
              <Card className="shadow-xl neumorphic-shadow">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-1 md:gap-2">
                    <Receipt className="text-primary h-4 w-4 md:h-5 md:w-5"/>
                    Récapitulatif
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {/* Section de code promo améliorée */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Tag className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-foreground">Code promo</span>
                        {!appliedPromo && hasBubbleTea && (
                          <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            🎁 Offre spéciale disponible
                          </span>
                        )}
                      </div>
                      
                      {!appliedPromo ? (
                        <div className="flex gap-2">
                          <div className="relative flex-1 group">
                            <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500 group-focus-within:text-primary transition-colors" />
                            <input
                              type="text"
                              placeholder="Entrez votre code promo"
                              className="flex h-11 w-full rounded-lg border-2 border-amber-100 bg-amber-50/50 px-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:border-amber-300 transition-all duration-200"
                              value={promoInput}
                              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && promoInput.trim()) {
                                  e.preventDefault();
                                  applyPromoCode(promoInput.trim());
                                }
                              }}
                            />
                          </div>
                          <Button 
                            type="button" 
                            className="whitespace-nowrap h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                            onClick={() => {
                              if (promoInput.trim()) {
                                applyPromoCode(promoInput.trim());
                              }
                            }}
                          >
                            Appliquer
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 p-3 text-sm text-green-800 border border-green-100 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-100 rounded-full">
                              <Tag className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">Code appliqué : <span className="text-green-700">{appliedPromo.name}</span></p>
                              <p className="text-xs text-green-600">{appliedPromo.description}</p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-green-700 hover:bg-green-100/50 rounded-full"
                            onClick={removePromoCode}
                            aria-label="Retirer le code promo"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      {!appliedPromo && hasBubbleTea && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center">
                          <span className="inline-block mr-1">💡</span> Essayez votre code promo pour des réductions exclusives !
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Sous-total</span>
                      <span className="font-medium">{subtotal.toLocaleString()} FCFA</span>
                    </div>
                    
                    {appliedPromo?.freeDelivery && (
                      <div className="flex justify-between text-green-600">
                        <span className="text-sm">Livraison offerte</span>
                        <span className="font-medium">0 FCFA</span>
                      </div>
                    )}
                    
                    {!appliedPromo?.freeDelivery && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Livraison</span>
                        <span className="font-medium">{deliveryFee.toLocaleString()} FCFA</span>
                      </div>
                    )}
                    
                    {appliedPromo && (
                      <div className="flex justify-between text-green-600">
                        <span className="text-sm">{appliedPromo.name}</span>
                        <span className="font-medium">{(appliedPromo.discountValue * itemCount).toLocaleString()} FCFA</span>
                      </div>
                    )}
                    
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{totalAmount.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <motion.div className="w-full" whileTap={{ scale: 0.98 }}>
                    <Button 
                      className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3 text-base md:text-lg"
                      size="lg"
                      onClick={() => navigate('/checkout')}
                      disabled={itemCount === 0}
                    >
                      {itemCount > 0 ? (
                        <>
                          Passer la commande
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      ) : (
                        'Votre panier est vide'
                      )}
                    </Button>
                  </motion.div>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        ) : (
          <div className="text-center py-8 md:py-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 150, damping:10, delay: 0.2 }}
              className="inline-block p-4 md:p-8 bg-primary/10 rounded-full mb-6 md:mb-8 shadow-lg"
            >
              <ShoppingBag className="h-16 w-16 md:h-24 md:w-24 text-primary opacity-70" />
            </motion.div>
            <motion.h2 
              className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 md:mb-4"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Votre panier a faim !
            </motion.h2>
            <motion.p 
              className="text-xs sm:text-sm md:text-base lg:text-lg text-muted-foreground mb-6 md:mb-10 max-w-md mx-auto"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Parcourez notre menu alléchant et ajoutez quelques délices pour satisfaire vos envies.
            </motion.p>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 150 }}
            >
            <Button 
              asChild
              size="xl"
              className="button-glow bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold text-xs sm:text-sm md:text-base lg:text-lg py-2 px-4 md:py-3.5 md:px-8"
            >
              <Link to="/menu">
                Découvrir le Menu
              </Link>
            </Button>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CartPage;