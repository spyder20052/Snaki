import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Fonction utilitaire pour générer le message WhatsApp détaillé
function formatOrderForWhatsApp(formData, cart, cartTotal, deliveryFee, totalAmount) {
  let message = `🍕 *NOUVELLE COMMANDE SNAKI* 🍕\n\n`;
  message += `👤 *INFORMATIONS CLIENT*\n`;
  message += `Nom: ${formData.firstName} ${formData.lastName}\n`;
  message += `Téléphone: ${formData.phone}\n`;
  message += `WhatsApp: ${formData.whatsappNumber}\n`;
  message += `Email: ${formData.email}\n\n`;
  message += `📍 *ADRESSE DE LIVRAISON*\n`;
  message += `${formData.address}\n`;
  message += `${formData.city}\n\n`;
  message += `📅 *DÉTAILS DE LIVRAISON*\n`;
  message += `Date: ${formData.deliveryDate}\n`;
  message += `Heure: ${formData.deliveryTime}\n\n`;
  message += `🛒 *DÉTAILS DE LA COMMANDE*\n`;
  cart.forEach(item => {
    message += `• ${item.quantity}x ${item.name}\n`;
  });
  message += `\n💰 *RÉCAPITULATIF*\n`;
  message += `Sous-total: ${(cartTotal ?? 0).toFixed(2)} fcfa\n`;
  message += `Livraison: ${(deliveryFee ?? 0).toFixed(2)} fcfa\n`;
  message += `*TOTAL: ${(totalAmount ?? 0).toFixed(2)} fcfa*\n\n`;
  message += `📅 *DATE ET HEURE*\n`;
  message += `${new Date().toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}\n\n`;
  message += `🚚 *STATUT*\n`;
  message += `En attente de confirmation`;
  return message;
}

/**
 * Pour que ce composant fonctionne, il faut l'appeler ainsi dans CheckoutPage.jsx :
 *
 * <FedaPaymentInfo
 *   cart={cart}
 *   cartTotal={cartTotal}
 *   deliveryFee={deliveryFee}
 *   totalAmount={totalAmount}
 *   formData={formData}
 *   onCancel={() => setShowPaymentInfo(false)}
 * />
 */

const FedaPaymentInfo = ({ cart = [], cartTotal = 0, deliveryFee = 0, totalAmount = 0, formData = {}, onCancel }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-1"
    >
      <Card className="w-full max-w-xs sm:max-w-sm bg-white rounded-xl shadow-lg">
        <CardHeader className="text-center pb-2 px-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-2"
          >
            <CheckCircle className="h-6 w-6 text-green-600" />
          </motion.div>
          <CardTitle className="text-base font-bold text-gray-800">
            Confirmation de commande
          </CardTitle>
          <p className="text-xs text-gray-600 mt-1">
            Vérifiez les informations de votre commande avant de valider.
          </p>
        </CardHeader>
        <CardContent className="space-y-2 px-2 pb-2">
          {/* Récapitulatif détaillé */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-left text-xs space-y-1">
            <div className="font-bold text-base mb-1">🍕 NOUVELLE COMMANDE SNAKI 🍕</div>
            <div>
              <span className="font-semibold">👤 INFORMATIONS CLIENT</span><br/>
              Nom: {formData.firstName} {formData.lastName}<br/>
              Téléphone: {formData.phone}<br/>
              WhatsApp: {formData.whatsappNumber}<br/>
              Email: {formData.email}
            </div>
            <div>
              <span className="font-semibold">📍 ADRESSE DE LIVRAISON</span><br/>
              {formData.address}<br/>
              {formData.city}
            </div>
            <div>
              <span className="font-semibold">📅 DÉTAILS DE LIVRAISON</span><br/>
              Date: {formData.deliveryDate}<br/>
              Heure: {formData.deliveryTime}
            </div>
            <div>
              <span className="font-semibold">🛒 DÉTAILS DE LA COMMANDE</span><br/>
              {cart.map(item => (
                <div key={item.id}>• {item.quantity}x {item.name}</div>
              ))}
            </div>
            <div>
              <span className="font-semibold">💰 RÉCAPITULATIF</span><br/>
              Sous-total: {(cartTotal ?? 0).toFixed(2)} fcfa<br/>
              Livraison: {(deliveryFee ?? 0).toFixed(2)} fcfa<br/>
              <b>TOTAL: {(totalAmount ?? 0).toFixed(2)} fcfa</b>
            </div>
            <div>
              <span className="font-semibold">📅 DATE ET HEURE</span><br/>
              {new Date().toLocaleString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div>
              <span className="font-semibold">🚚 STATUT</span><br/>
              En attente de confirmation
            </div>
          </div>
          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-2 pt-2"
          >
            <Button
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-2 rounded-lg text-xs hover:bg-gray-300 transition-colors font-medium min-w-0"
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                const message = formatOrderForWhatsApp(formData, cart, cartTotal, deliveryFee, totalAmount);
                const whatsappNumber = "+22953305896";
                const encodedMessage = encodeURIComponent(message);
                const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
                window.open(whatsappUrl, '_blank');
              }}
              className="flex-1 bg-green-600 text-white py-2 px-2 rounded-lg text-xs hover:bg-green-700 transition-colors font-medium min-w-0"
            >
              Valider la commande
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default FedaPaymentInfo; 