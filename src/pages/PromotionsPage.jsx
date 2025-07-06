import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Star, Users, ShieldCheck, User, Phone, Mail } from 'lucide-react';

const plans = [
  {
    id: 'personal',
    name: 'Découverte',
    subtitle: 'Pour les curieux',
    price: 5000,
    oldPrice: 7000,
    devices: '+ 1 boisson',
    features: [
      'Livraison gratuite',
      '- 10% sur tous les achats',
      'Accès prioritaire aux nouveautés',
      'Support WhatsApp',
    ],
    highlight: false,
    action: 'Souscrire Découverte',
  },
  {
    id: 'standard',
    name: 'Gourmand',
    subtitle: 'Pour les gourmets',
    price: 12000,
    oldPrice: 15000,
    devices: '+ 2 boissons',
    features: [
      'Livraison express',
      '- 20% sur tous les achats',
      'Offres exclusives chaque mois',
      'Support prioritaire',
    ],
    highlight: true,
    action: 'Souscrire Gourmand',
    badge: 'Le plus populaire',
  },
  {
    id: 'pro',
    name: 'VIP',
    subtitle: 'Pour les passionnés',
    price: 20000,
    oldPrice: 25000,
    devices: '+ 3 boissons',
    features: [
      'Livraison express +',
      '- 30% sur tous les achats',
      'Accès VIP aux événements',
      'Consultation personnalisée',
    ],
    highlight: false,
    action: 'Souscrire VIP',
  },
];

const infoList = [
  { icon: <ShieldCheck className="inline w-4 h-4 mr-1 text-orange-500" />, text: 'Paiement sécurisé' },
  { icon: <Star className="inline w-4 h-4 mr-1 text-yellow-400" />, text: 'Avec votre abonnement tout vas plus vite' },
  { icon: <CheckCircle className="inline w-4 h-4 mr-1 text-green-500" />, text: 'Satisfait ou Satisfait' },
];

const customers = [
  // Tu peux ajouter des images d'avatars ici si tu veux
  'A', 'B', 'C', 'D', 'E', 'F', 'G',
];

export default function PromotionsPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [clientInfo, setClientInfo] = useState({ name: '', phone: '', email: '' });

  const handlePlanClick = (plan) => {
    setSelectedPlan(plan);
    setShowForm(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!clientInfo.name || !clientInfo.phone || !clientInfo.email) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    const message =
      `🍹 *SNAKI - Nouvelle souscription !*\n` +
      `\n` +
      `✨ *Offre choisie* : _${selectedPlan.name}_\n` +
      `💸 *Prix* : ${selectedPlan.price.toLocaleString()} FCFA\n` +
      `\n` +
      `🎁 *Avantages inclus* :\n` +
      `${selectedPlan.features.map(f => `• ${f}`).join('\n')}\n` +
      `\n` +
      `👤 *Infos client* :\n` +
      `• Nom : ${clientInfo.name}\n` +
      `• Téléphone : ${clientInfo.phone}\n` +
      `• Email : ${clientInfo.email}\n` +
      `\n` +
      `---\n` +
      `Merci de me recontacter pour finaliser ma souscription !\n` +
      `_Snaki, le plaisir livré chez vous !_`;
    const whatsappUrl = `https://wa.me/22953305896?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setShowForm(false);
    setSelectedPlan(null);
    setClientInfo({ name: '', phone: '', email: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-32 md:pt-36 pb-12 px-2 sm:px-4 overflow-x-hidden">
      <div className="max-w-4xl mx-auto text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-2 text-gray-900 dark:text-white">
          Petit investissement<br />
          <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Gros boost de plaisir !</span>
        </h1>
        <div className="flex flex-wrap justify-center gap-4 items-center text-sm md:text-base text-gray-700 dark:text-gray-200 mt-4 mb-2">
          {infoList.map((info, i) => (
            <span key={i} className="flex items-center gap-1">
              {info.icon}{info.text}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 mt-2 mb-1">
          <span className="flex -space-x-2">
            {customers.map((c, i) => (
              <span key={i} className="inline-block w-7 h-7 rounded-full bg-orange-200 border-2 border-white text-xs flex items-center justify-center font-bold text-orange-700 shadow">{c}</span>
            ))}
          </span>
          <span className="ml-2 text-xs text-gray-500">+200 clients satisfaits</span>
        </div>
      </div>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-y-8 md:gap-y-0 gap-6 md:gap-8 items-stretch">
        {plans.map((plan, idx) => (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl md:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 bg-white dark:bg-gray-800 border transition-all duration-300
              ${plan.highlight ? 'border-orange-500 scale-105 z-10 shadow-2xl' : 'border-gray-200 dark:border-gray-700'}
              ${plan.highlight ? 'bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-orange-900 dark:via-gray-900 dark:to-orange-900' : ''}
              mx-auto w-full max-w-xs md:max-w-none
            `}
          >
            {plan.badge && (
              <span className="absolute top-4 right-4 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">{plan.badge}</span>
            )}
            <div className="mb-2">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h2>
              <div className="text-xs text-gray-500 mb-2">{plan.subtitle}</div>
            </div>
            <div className="flex items-end justify-center gap-2 mb-4">
              <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-orange-600">{plan.price.toLocaleString()} FCFA</span>
              <span className="text-base md:text-lg line-through text-gray-400">{plan.oldPrice.toLocaleString()} FCFA</span>
            </div>
            <div className="text-xs text-gray-500 mb-4">{plan.devices}</div>
            <ul className="mb-6 space-y-2 text-sm md:text-base">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <CheckCircle className="w-4 h-4 text-orange-500" /> {f}
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              className={`w-full font-bold py-2 sm:py-3 rounded-xl text-base md:text-lg shadow-md transition-all duration-300 mt-2
                ${plan.highlight ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white' : 'bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-50'}`}
              onClick={() => handlePlanClick(plan)}
            >
              {plan.action}
            </Button>
          </div>
        ))}
      </div>
      <div className="max-w-3xl mx-auto text-center text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-10 space-y-2">
        <div>
          Les prix sont fait pour vous. Pour 1 mois de pure plaisir. Paiement sécurisé.
        </div>
        <div>
          Pour toutes préoccupations, n'hésitez pas à nous contacter au : <a href="https://wa.me/22953305896" className="underline text-orange-600" target="_blank">+22953305896</a>
        </div>
      </div>

      {/* Modal Formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 md:p-8 max-w-xs sm:max-w-md w-full shadow-2xl">
            <h3 className="text-xl md:text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Souscrire à l'offre {selectedPlan?.name}
            </h3>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom complet *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={clientInfo.name}
                    onChange={e => setClientInfo({ ...clientInfo, name: e.target.value })}
                    className="pl-10 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-700 focus:border-orange-500 focus:ring-orange-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="Votre nom complet"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Téléphone *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={clientInfo.phone}
                    onChange={e => setClientInfo({ ...clientInfo, phone: e.target.value })}
                    className="pl-10 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-700 focus:border-orange-500 focus:ring-orange-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="Votre numéro de téléphone"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={clientInfo.email}
                    onChange={e => setClientInfo({ ...clientInfo, email: e.target.value })}
                    className="pl-10 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-700 focus:border-orange-500 focus:ring-orange-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="Votre adresse email"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowForm(false); setSelectedPlan(null); setClientInfo({ name: '', phone: '', email: '' }); }}
                    className="w-full sm:w-auto"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                  >
                    Envoyer
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
