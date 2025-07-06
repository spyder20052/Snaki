import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Trash2, ArrowRight, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CartItem from '@/components/CartItem';
import { useCart } from '@/contexts/CartContext';


const CartPage = () => {
  const { cart, cartTotal, clearCart, itemCount } = useCart();
  const deliveryFee = cartTotal > 6000 ? 500 : 1000;
  const totalAmount = cartTotal + deliveryFee;

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
                <CardContent className="space-y-2 md:space-y-4 text-sm md:text-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="font-medium">{cartTotal.toFixed(2)} f</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais de livraison</span>
                    <span className="font-medium">{deliveryFee.toFixed(2)} f</span>
                  </div>
                  <div className="border-t border-border pt-2 md:pt-4 mt-2 md:mt-4 flex justify-between font-bold text-lg sm:text-xl md:text-2xl text-primary">
                    <span>Total</span>
                    <span>{totalAmount.toFixed(2)} fcfa</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <motion.div className="w-full" whileTap={{ scale: 0.98 }}>
                    <Button
                      className="w-full button-glow bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold text-xs sm:text-sm md:text-base lg:text-lg py-2 px-4 md:py-3.5 md:px-8"
                      size="lg"
                      asChild
                    >
                      <Link to="/checkout">
                        Payer {totalAmount.toFixed(2)} FCFA
                      </Link>
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