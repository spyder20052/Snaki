import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Star, Clock, Truck, Zap, ChevronDown, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import { getPopularProducts } from '@/data/products';
import videoFile from './videoback.mp4';

const AnimatedTitle = ({ text, className }) => {
  return (
    <h1 className={`title-char-animation ${className}`}>
      {text.split("").map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          style={{ animationDelay: `${index * 0.03}s` }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </h1>
  );
};

const FloatingElement = ({ children, delay = 0, duration = 3 }) => {
  return (
    <motion.div
      animate={{
        y: [-10, 10, -10],
        rotate: [-2, 2, -2],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
};

const HomePage = () => {
  const popularProducts = getPopularProducts();
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const heroVariants = {
    initial: { opacity: 0, y: 50 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 1, 
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.15 
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, y: 30, scale: 0.9 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        duration: 0.6, 
        ease: [0.22, 1, 0.36, 1] 
      } 
    }
  };

  const floatingBubbles = [
    { id: 1, x: '10%', y: '20%', size: 'w-4 h-4', delay: 0 },
    { id: 2, x: '85%', y: '15%', size: 'w-6 h-6', delay: 0.5 },
    { id: 3, x: '20%', y: '80%', size: 'w-3 h-3', delay: 1 },
    { id: 4, x: '75%', y: '70%', size: 'w-5 h-5', delay: 1.5 },
    { id: 5, x: '50%', y: '10%', size: 'w-4 h-4', delay: 2 },
  ];

  return (
    <div className="pt-16 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-screen min-h-[700px] flex items-center justify-center text-center overflow-hidden">
        {/* Video Background */}
        <motion.div 
          className="absolute inset-0 z-0"
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2, ease: [0.22, 1, 0.36, 1]}}
          style={{
            transform: `scale(${1 + scrollY * 0.0005}) translateY(${scrollY * 0.3}px)`
          }}
        >
          <video
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            src={videoFile}
            alt="Délicieux hamburgers et frites en gros plan"
            aria-label="Délicieux hamburgers et frites en gros plan"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-transparent to-red-500/20"></div>
        </motion.div>

        {/* Floating Elements */}
        <div className="absolute inset-0 z-5 pointer-events-none">
          {floatingBubbles.map((bubble) => (
            <FloatingElement key={bubble.id} delay={bubble.delay}>
              <div 
                className={`absolute ${bubble.size} bg-gradient-to-br from-orange-400/30 to-red-500/30 rounded-full blur-sm`}
                style={{ left: bubble.x, top: bubble.y }}
              />
            </FloatingElement>
          ))}
        </div>

        
        {/* Main Content */}
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="max-w-4xl mx-auto text-white"
            variants={heroVariants}
            initial="initial"
            animate="animate"
          >
            {/* Badge */}
            <motion.div 
              variants={itemVariants}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6 text-sm font-medium"
            >
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span>Livraison gratuite dès 5000 FCFA</span>
            </motion.div>

            {/* Main Title */}
            <motion.div variants={itemVariants} className="mb-6">
              <AnimatedTitle 
                text="Savourez l'instant avec Snaki" 
                className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-4 !leading-tight bg-gradient-to-r from-white via-orange-100 to-white bg-clip-text text-transparent" 
              />
            </motion.div>

            {/* Subtitle */}
            <motion.p 
              variants={itemVariants} 
              className="text-base sm:text-lg md:text-xl lg:text-2xl mb-8 md:mb-12 max-w-3xl mx-auto leading-relaxed text-gray-100"
            >
              Des <span className="text-orange-300 font-semibold">Tacos juteux</span>, des <span className="text-orange-300 font-semibold">Bubbles Tea savoureuses</span> et bien plus encore, livrés directement chez vous en un éclair.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              variants={itemVariants} 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
            >
              <Button 
                asChild
                size="lg" 
                className="button-glow bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-base md:text-lg shadow-2xl transform transition-all duration-300 py-4 px-8 md:py-5 md:px-10 rounded-xl"
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: "0 0 30px rgba(255, 140, 0, 0.5)",
                  y: -2
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to="/menu" className="flex items-center">
                  <Zap className="mr-2 h-5 w-5 md:h-6 md:w-6"/> 
                  Voir le Menu
                </Link>
              </Button>
              
              <Button 
                asChild
                variant="outline" 
                size="lg" 
                className="border-2 border-white/30 text-orange-600 hover:bg-white/10 font-bold text-base md:text-lg shadow-xl transform transition-all duration-300 backdrop-blur-sm py-4 px-8 md:py-5 md:px-10 rounded-xl"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to="/promotions" className="flex items-center">
                  Nos Promotions
                </Link>
              </Button>
            </motion.div>

            {/* Features Row */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-wrap justify-center gap-6 md:gap-8 text-sm md:text-base"
            >
              {[
                { icon: Clock, text: "Livraison en 30min" },
                { icon: Star, text: "Ingrédients frais" },
                { icon: Truck, text: "Commande facile" }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2"
                  whileHover={{ scale: 1.05 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <feature.icon className="h-4 w-4 text-orange-300" />
                  <span className="text-gray-100">{feature.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-6 w-6 text-white/70" />
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-12 md:mb-20"
            initial={{ opacity:0, y:30 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">
              Pourquoi choisir <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Snaki</span> ?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Nous nous engageons à vous offrir une expérience culinaire exceptionnelle avec des ingrédients de première fraîcheur et un service aussi rapide que l'éclair.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { 
                icon: Star, 
                title: "Qualité Premium", 
                desc: "Ingrédients frais et savoureux, sélectionnés avec soin pour des plats inoubliables.",
                color: "from-yellow-400 to-orange-500"
              },
              { 
                icon: Clock, 
                title: "Livraison Express", 
                desc: "Votre festin arrive chaud et rapide, pour satisfaire vos envies sans attendre.",
                color: "from-green-400 to-blue-500"
              },
              { 
                icon: Truck, 
                title: "Commande Simplifiée", 
                desc: "Quelques clics suffisent pour commander vos plats préférés, où que vous soyez.",
                color: "from-purple-400 to-pink-500"
              }
            ].map((feature, index) => (
              <motion.div 
                key={index}
                className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-2xl neumorphic-shadow flex flex-col items-center text-center group hover:shadow-2xl transition-all duration-500"
                initial={{ opacity:0, y:50, scale:0.9 }}
                whileInView={{ opacity:1, y:0, scale:1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ 
                  y: -15, 
                  scale: 1.02, 
                  boxShadow: "0 25px 50px rgba(255,107,0,0.3)",
                  transition: { duration: 0.3 }
                }}
              >
                <motion.div 
                  className={`bg-gradient-to-br ${feature.color} p-4 md:p-6 rounded-2xl w-16 h-16 md:w-24 md:h-24 flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300`}
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <feature.icon className="text-white h-8 w-8 md:h-12 md:w-12" />
                </motion.div>
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 text-gray-800 dark:text-white">{feature.title}</h3>
                <p className="text-sm md:text-base lg:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Products Section */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div 
            className="flex flex-col sm:flex-row justify-between items-center mb-12 md:mb-16"
            initial={{ opacity:0, y:30 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 sm:mb-0">
              Nos <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Best-Sellers</span> Gourmands
            </h2>
            <Button 
              asChild 
              variant="ghost" 
              className="text-orange-500 hover:text-orange-600 group text-base md:text-lg font-semibold"
            >
              <Link to="/menu" className="flex items-center">
                Voir tout le Menu 
                <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </Button>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {popularProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-orange-500 via-red-500 to-red-600 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-32 h-32 bg-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white rounded-full"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.h2 
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6 md:mb-8"
            initial={{ opacity:0, y:30 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6 }}
          >
            Une petite faim ? <span className="block sm:inline">Ne résistez plus !</span>
          </motion.h2>
          <motion.p 
            className="text-base sm:text-lg md:text-xl lg:text-2xl mb-8 md:mb-12 max-w-4xl mx-auto leading-relaxed"
            initial={{ opacity:0, y:30 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay:0.1 }}
          >
            Découvrez notre menu explosif de saveurs et faites-vous livrer en un temps record. Votre prochain coup de cœur culinaire est à portée de clic !
          </motion.p>
          <motion.div
            initial={{ opacity:0, scale:0.8 }}
            whileInView={{ opacity:1, scale:1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay:0.2, type: "spring", stiffness:150 }}
          >
            <Button 
              asChild
              size="xl" 
              className="button-glow bg-white text-orange-600 hover:bg-orange-100 font-bold text-lg md:text-xl shadow-2xl transform hover:scale-105 transition-all duration-300 py-4 px-8 md:py-6 md:px-12 rounded-xl"
              whileHover={{ 
                scale: 1.05, 
                boxShadow: "0 0 30px rgba(255, 255, 255, 0.5)",
                y: -2
              }}
              whileTap={{ scale: 0.95 }}
            >
              <Link to="/menu" className="flex items-center">
                Commander Maintenant 
                <Zap className="ml-2 h-5 w-5 md:h-6 md:w-6"/>
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;