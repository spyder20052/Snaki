import React from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { motion } from 'framer-motion';

const CartItem = ({ item }) => {
  const { updateQuantity, removeFromCart } = useCart();

  const calculateItemTotal = () => {
    let total = item.price * item.quantity;
    
    // Add options prices
    if (item.selectedOptions) {
      Object.entries(item.selectedOptions).forEach(([optionKey, selectedValue]) => {
        const option = item.options[optionKey];
        const choice = option.choices.find(c => c.id === selectedValue);
        if (choice && choice.price) {
          total += choice.price * item.quantity;
        }
      });
    }
    
    return total;
  };

  const getUnitPrice = () => {
    let total = item.price;
    if (item.selectedOptions) {
      Object.entries(item.selectedOptions).forEach(([optionKey, selectedValue]) => {
        const option = item.options[optionKey];
        const choice = option.choices.find(c => c.id === selectedValue);
        if (choice && choice.price) {
          total += choice.price;
        }
      });
    }
    return total;
  };

  const itemVariants = {
    initial: { opacity: 0, x: -50, height: 0 },
    animate: { 
      opacity: 1, 
      x: 0, 
      height: 'auto',
      transition: { type: "spring", stiffness: 300, damping: 30, opacity: { duration: 0.5 }}
    },
    exit: { 
      opacity: 0, 
      x: 50, 
      height: 0,
      transition: { duration: 0.3, ease: "easeInOut" }
    }
  };

  return (
    <motion.div 
      layout
      variants={itemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex items-center py-3 md:py-5 border-b border-border last:border-b-0 gap-2 md:gap-4"
    >
      <div className="h-16 w-16 md:h-24 md:w-24 flex-shrink-0 overflow-hidden rounded-lg shadow-md">
        <img  
          className="h-full w-full object-cover transform hover:scale-110 transition-transform duration-300" 
          alt={item.name}
          src={`${item.image}`} 
        />
      </div>
      
      <div className="ml-1 md:ml-2 flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-sm sm:text-base md:text-lg">{item.name}</h3>
            {item.selectedOptions && (
              <div className="mt-1 space-y-0.5 md:space-y-1">
                {Object.entries(item.selectedOptions).map(([optionKey, selectedValue]) => {
                  const option = item.options[optionKey];
                  const choice = option.choices.find(c => c.id === selectedValue);
                  return (
                    <span key={optionKey} className="text-xs md:text-sm text-muted-foreground block">
                      {option.label}: {choice.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs md:text-sm text-muted-foreground">{getUnitPrice().toFixed(2)} fcfa</p>
      </div>
      
      <div className="flex items-center">
        <div className="flex items-center border border-input rounded-md overflow-hidden neumorphic-shadow">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 md:h-9 md:w-9 quantity-control-button rounded-none"
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            <Minus className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
          
          <span className="w-8 md:w-10 text-center text-xs md:text-sm font-medium bg-background/50">{item.quantity}</span>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 md:h-9 md:w-9 quantity-control-button rounded-none"
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
          >
            <Plus className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        </div>
      </div>
      
      <div className="ml-1 md:ml-2 text-right w-16 md:w-24">
        <span className="font-semibold text-xs md:text-sm">{calculateItemTotal().toFixed(2)} fcfa</span>
      </div>

      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="ml-1 md:ml-2 text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-full h-6 w-6 md:h-8 md:w-8"
          onClick={() => removeFromCart(item.id)}
        >
          <X className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default CartItem;