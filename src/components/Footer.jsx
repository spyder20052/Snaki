import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, ListOrdered, ShoppingCart, Gift, ChevronDown, ChevronUp } from 'lucide-react';
import snakiLogo from '/logo/snaki2.webp';

const Footer = ({ style }) => {
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);
  const [expandedSections, setExpandedSections] = useState({
    navigation: false,
    menu: false,
    contact: false
  });

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderSection = (title, content, sectionKey) => {
    const isExpanded = expandedSections[sectionKey];
    
    return (
      <div className="border-b border-gray-800 md:border-none pb-2 md:pb-0">
        <div 
          className="flex justify-between items-center cursor-pointer md:cursor-default"
          onClick={() => isSmallScreen && toggleSection(sectionKey)}
        >
          <p className="font-semibold text-sm md:text-lg py-2">{title}</p>
          {isSmallScreen && (isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />)}
        </div>
        
        <div 
          className={`overflow-hidden transition-all duration-300 ${isSmallScreen && !isExpanded ? 'max-h-0' : 'max-h-96'}`}
        >
          {content}
        </div>
      </div>
    );
  };

  return (
    <footer className="bg-gray-900 text-white" style={style}>
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8">
          <div className="md:col-span-1">
            <div className="flex flex-col items-center md:items-start">
              <img
                src={snakiLogo}
                alt="Snaki Logo"
                className="h-8 w-auto md:h-10 transition-transform duration-300 hover:scale-105"
              />
              <p className="mt-2 text-xs md:text-sm text-gray-400 text-center md:text-left">
                Délicieux fast food livré rapidement à votre porte. Savourez vos bubbles tea préférés oû que vous soyez.
              </p>
              <div className="flex space-x-3 mt-3 md:mt-4">
                {[
                  { to: "/", icon: <Home className="h-5 w-5" /> },
                  { to: "/menu", icon: <ListOrdered className="h-5 w-5" /> },
                  { to: "/cart", icon: <ShoppingCart className="h-5 w-5" /> },
                  { to: "/promotions", icon: <Gift className="h-5 w-5" /> }
                ].map((item, index) => (
                  <Link 
                    key={index} 
                    to={item.to} 
                    className="text-gray-400 hover:text-orange-500 transition-colors"
                    aria-label={item.to.replace('/', '') || 'home'}
                  >
                    {item.icon}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {renderSection(
            'Navigation',
            <ul className="space-y-1 md:space-y-2 mt-1 mb-3 md:mb-0">
              {[
                { to: "/", text: "Accueil" },
                { to: "/menu", text: "Menu" },
                { to: "/cart", text: "Panier" },
                { to: "/promotions", text: "Abonnements" }
              ].map((item, index) => (
                <li key={index}>
                  <Link 
                    to={item.to} 
                    className="text-xs md:text-sm text-gray-400 hover:text-white transition-colors block py-1"
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    {item.text}
                  </Link>
                </li>
              ))}
            </ul>,
            'navigation'
          )}
          
          {renderSection(
            'Menu',
            <ul className="space-y-1 md:space-y-2 mt-1 mb-3 md:mb-0">
              {['Tacos', 'Bubble Tea'].map((item, index) => (
                <li key={index}>
                  <Link 
                    to="/menu" 
                    className="text-xs md:text-sm text-gray-400 hover:text-white transition-colors block py-1"
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>,
            'menu'
          )}
          
          {renderSection(
            'Contact',
            <ul className="space-y-1 md:space-y-2 mt-1 mb-3 md:mb-0">
              {[
                { icon: '📍', text: 'Cotonou, Bénin' },
                { icon: '📞', text: '+229 53 30 58 96' },
                { icon: '📧', text: 'snaki@gmail.com' },
                { icon: '🕒', text: '10h-18h' }
              ].map((item, index) => (
                <li key={index} className="text-xs md:text-sm text-gray-400 flex items-start py-1">
                  <span className="mr-2 mt-0.5">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>,
            'contact'
          )}
        </div>
        
        <div className="border-t border-gray-800 mt-6 md:mt-8 pt-4 md:pt-6 text-center text-xs md:text-sm text-gray-400">
          <p>© {new Date().getFullYear()} Snaki. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;