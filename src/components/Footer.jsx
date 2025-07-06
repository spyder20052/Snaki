import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ListOrdered, ShoppingCart, Gift } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
          <div>
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Snaki</span>
            <p className="mt-2 md:mt-4 text-xs sm:text-sm md:text-base text-gray-400">Délicieux fast food livré rapidement à votre porte. Savourez nos burgers, pizzas et plus encore.</p>
            <div className="flex space-x-3 md:space-x-4 mt-4 md:mt-6">
              <Link to="/" className="text-gray-400 hover:text-orange-500 transition-colors">
                <Home className="h-5 w-5 md:h-6 md:w-6" />
              </Link>
              <Link to="/menu" className="text-gray-400 hover:text-orange-500 transition-colors">
                <ListOrdered className="h-5 w-5 md:h-6 md:w-6" />
              </Link>
              <Link to="/cart" className="text-gray-400 hover:text-orange-500 transition-colors">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
              </Link>
              <Link to="/promotions" className="text-gray-400 hover:text-orange-500 transition-colors">
                <Gift className="h-5 w-5 md:h-6 md:w-6" />
              </Link>
            </div>
          </div>

          <div>
            <p className="font-semibold text-sm md:text-lg mb-2 md:mb-4">Navigation</p>
            <ul className="space-y-1 md:space-y-2">
              <li><Link to="/" className="text-xs sm:text-sm md:text-base text-gray-400 hover:text-white transition-colors">Accueil</Link></li>
              <li><Link to="/menu" className="text-xs sm:text-sm md:text-base text-gray-400 hover:text-white transition-colors">Menu</Link></li>
              <li><Link to="/cart" className="text-xs sm:text-sm md:text-base text-gray-400 hover:text-white transition-colors">Panier</Link></li>
              <li><Link to="/promotions" className="text-xs sm:text-sm md:text-base text-gray-400 hover:text-white transition-colors">Promotions</Link></li>
            </ul>
          </div>
          
          <div>
            <p className="font-semibold text-sm md:text-lg mb-2 md:mb-4">Menu</p>
            <ul className="space-y-1 md:space-y-2">
              <li><Link to="/menu" className="text-xs sm:text-sm md:text-base text-gray-400 hover:text-white transition-colors">Tacos</Link></li>
              <li><Link to="/menu" className="text-xs sm:text-sm md:text-base text-gray-400 hover:text-white transition-colors">Bubble Tea</Link></li>
            </ul>
          </div>
          
          <div>
            <p className="font-semibold text-sm md:text-lg mb-2 md:mb-4">Contact</p>
            <ul className="space-y-1 md:space-y-2">
              <li className="text-xs sm:text-sm md:text-base text-gray-400">📍 Cotonou, Bénin</li>
              <li className="text-xs sm:text-sm md:text-base text-gray-400">📞 +229 53 30 58 96</li>
              <li className="text-xs sm:text-sm md:text-base text-gray-400">📧 snaki@gmail.com</li>
              <li className="text-xs sm:text-sm md:text-base text-gray-400">🕒 10h-18h</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 md:mt-12 pt-6 md:pt-8 text-center text-xs sm:text-sm md:text-base text-gray-400">
          <p>© 2025 Snaki. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;