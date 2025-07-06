import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search } from 'lucide-react';

const promotionsData = [
  {
    id: 1,
    name: "Plan Découverte",
    price: "5 000 fcfa / mois",
    advantages: [
      "Livraison gratuite",
      "Remise de 10% sur toutes les commandes",
      "Accès prioritaire aux nouveautés"
    ]
  },
  {
    id: 2,
    name: "Plan Premium",
    price: "12 000 fcfa / mois",
    advantages: [
      "Livraison gratuite et express",
      "Remise de 20% sur toutes les commandes",
      "Offres exclusives chaque mois",
      "Support client dédié"
    ]
  },
  {
    id: 3,
    name: "Plan VIP",
    price: "20 000 fcfa / mois",
    advantages: [
      "Livraison express + cadeau mensuel",
      "Remise de 30% sur toutes les commandes",
      "Accès VIP aux événements",
      "Consultation personnalisée"
    ]
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 }
};

const PromotionsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPromos, setFilteredPromos] = useState(promotionsData);

  useEffect(() => {
    const filtered = promotionsData.filter(promo =>
      promo.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPromos(filtered);
  }, [searchTerm]);

  return (
    <div className="pt-28 pb-16 md:pb-20 min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-500">
      <div className="container mx-auto px-4 md:px-6 lg:px-12">
        {/* Header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-8 md:mb-14 px-2 md:px-4"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold mb-3 md:mb-6 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent
                    drop-shadow-[0_4px_6px_rgba(251,146,60,0.8)] 
                    hover:drop-shadow-[0_6px_10px_rgba(251,146,60,1)] 
                    transition-shadow duration-300 ease-in-out select-none cursor-default">
        Nos Promotions
        </h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
            Découvrez nos offres exclusives adaptées à tous vos besoins et envies.
          </p>
        </motion.div>

        {/* Search Input */}
        <div className="max-w-sm mx-auto mb-8 md:mb-12 relative">
          <Input
            type="text"
            placeholder="Rechercher un plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 md:pl-12 h-8 md:h-12 rounded-xl border-2 border-gray-300 dark:border-gray-700 focus:border-orange-500 focus:ring-orange-500 shadow-md transition-all duration-300 text-xs md:text-base"
          />
          <Search
            className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400 dark:text-gray-500 pointer-events-none"
            strokeWidth={2}
          />
        </div>

        {/* Promotion Cards */}
        <AnimatePresence>
          {filteredPromos.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-10"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              {filteredPromos.map((promo) => (
                <motion.div
                  key={promo.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 md:p-8 flex flex-col cursor-pointer select-none
                             hover:shadow-2xl hover:scale-[1.03] transition-transform duration-300"
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 md:mb-4 text-orange-600 tracking-wide">{promo.name}</h2>
                  <p className="text-sm sm:text-base md:text-lg lg:text-2xl font-extrabold mb-4 md:mb-6 text-gray-900 dark:text-white">{promo.price}</p>
                  <ul className="list-disc list-inside mb-6 md:mb-8 text-xs sm:text-sm md:text-base text-gray-700 dark:text-gray-300 space-y-2 md:space-y-3 flex-grow">
                    {promo.advantages.map((adv, idx) => (
                      <li key={idx} className="leading-relaxed">{adv}</li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700
                               text-white font-semibold button-glow flex items-center justify-center shadow-md text-xs sm:text-sm md:text-base py-2 px-4 md:py-3 md:px-8"
                    onClick={() => alert(`Vous avez choisi ${promo.name} !`)}
                  >
                    <PlusCircle className="mr-1 md:mr-3 h-4 w-4 md:h-6 md:w-6" />
                    Souscrire
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.p
              className="text-center text-gray-500 dark:text-gray-400 py-8 md:py-16 text-sm md:text-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Aucun plan ne correspond à votre recherche.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PromotionsPage;
