// Service FedaPay pour l'intégration des paiements
// Version sans import FedaPay pour éviter les erreurs

class FedaPayService {
  constructor() {
    // Configuration FedaPay
    this.config = {
      publicKey: import.meta.env.VITE_FEDAPAY_PUBLIC_KEY || 'pk_sandbox_u8So2ARbuAK4_ybYRh66yWL9',
      environment: import.meta.env.VITE_FEDAPAY_ENVIRONMENT || 'sandbox',
      currency: 'XOF',
      callbackUrl: window.location.origin + '/payment-callback',
      cancelUrl: window.location.origin + '/payment-cancel'
    };
    
    // Mode simulation pour l'instant
    this.isAvailable = false;
    console.log('🔧 FedaPay en mode simulation');
  }

  // Créer un paiement FedaPay via le backend
  async createPayment(amount, customerData, orderData) {
    try {
      const response = await fetch('http://localhost:5000/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount * 100, // FedaPay attend les centimes
          customer: {
            firstname: customerData.firstName,
            lastname: customerData.lastName,
            email: customerData.email,
            phone_number: customerData.phone
          },
          metadata: {
            ...orderData,
            whatsapp_number: customerData.whatsappNumber
          }
        })
      });
      const data = await response.json();
      if (data.paymentUrl) {
        return {
          success: true,
          paymentUrl: data.paymentUrl,
          message: 'Paiement créé avec succès'
        };
      } else {
        throw new Error(data.error || 'Erreur lors de la création du paiement');
      }
    } catch (error) {
      console.error('❌ Erreur création paiement FedaPay:', error);
      throw new Error('Impossible de créer le paiement. Veuillez réessayer.');
    }
  }

  // Vérifier le statut d'un paiement
  async checkPaymentStatus(paymentId) {
    try {
      // Simulation temporaire
      const mockPayment = {
        status: 'approved',
        amount: 10000,
        currency: 'XOF',
        reference: `FED-${Date.now()}`,
        customer: {
          firstname: 'Test',
          lastname: 'User',
          phone_number: '+22912345678'
        },
        metadata: {
          order_id: 'test-order',
          customer_id: 'test-customer',
          delivery_address: 'Test Address',
          delivery_city: 'Cotonou',
          delivery_date: '2024-01-15',
          delivery_time: '14:30',
          whatsapp_number: '+22987654321',
          cart_items: '[]',
          cart_total: 100,
          delivery_fee: 500,
          total_amount: 600
        }
      };
      
      return {
        success: true,
        status: mockPayment.status,
        amount: mockPayment.amount / 100, // Convertir en fcfa
        currency: mockPayment.currency,
        reference: mockPayment.reference,
        customer: mockPayment.customer,
        metadata: mockPayment.metadata,
        message: this.getStatusMessage(mockPayment.status)
      };
    } catch (error) {
      console.error('❌ Erreur vérification statut FedaPay:', error);
      throw new Error('Impossible de vérifier le statut du paiement.');
    }
  }

  // Obtenir le message selon le statut
  getStatusMessage(status) {
    const messages = {
      'pending': 'Paiement en attente de confirmation',
      'approved': 'Paiement approuvé avec succès',
      'declined': 'Paiement refusé',
      'failed': 'Paiement échoué',
      'cancelled': 'Paiement annulé',
      'expired': 'Paiement expiré'
    };
    
    return messages[status] || 'Statut inconnu';
  }

  // Rediriger vers la page de paiement FedaPay
  redirectToPayment(paymentUrl) {
    if (paymentUrl) {
      // En mode simulation, on simule juste
      console.log('🔄 Redirection vers:', paymentUrl);
      // window.location.href = paymentUrl;
    } else {
      throw new Error('URL de paiement invalide');
    }
  }

  // Traiter le callback de paiement
  async handlePaymentCallback(paymentId) {
    try {
      const paymentStatus = await this.checkPaymentStatus(paymentId);
      
      if (paymentStatus.status === 'approved') {
        // Paiement réussi - envoyer WhatsApp
        await this.sendOrderToWhatsApp(paymentStatus.metadata);
        
        return {
          success: true,
          message: 'Paiement confirmé et commande envoyée',
          data: paymentStatus
        };
      } else {
        return {
          success: false,
          message: paymentStatus.message,
          data: paymentStatus
        };
      }
    } catch (error) {
      console.error('❌ Erreur traitement callback:', error);
      throw error;
    }
  }

  // Envoyer la commande par WhatsApp
  async sendOrderToWhatsApp(metadata) {
    try {
      const {
        order_id,
        customer_id,
        delivery_address,
        delivery_city,
        delivery_date,
        delivery_time,
        whatsapp_number,
        cart_items,
        cart_total,
        delivery_fee,
        total_amount
      } = metadata;

      const cartItems = JSON.parse(cart_items);
      
      let message = `🍕 *NOUVELLE COMMANDE SNAKI* 🍕\n\n`;
      message += `🆔 *RÉFÉRENCE*\n`;
      message += `Commande: ${order_id}\n`;
      message += `Paiement: ${metadata.reference}\n\n`;
      
      message += `👤 *INFORMATIONS CLIENT*\n`;
      message += `Nom: ${metadata.customer?.firstname} ${metadata.customer?.lastname}\n`;
      message += `Téléphone: ${metadata.customer?.phone_number}\n`;
      message += `WhatsApp: ${whatsapp_number}\n`;
      message += `Email: ${metadata.customer?.email}\n\n`;
      
      message += `📍 *ADRESSE DE LIVRAISON*\n`;
      message += `${delivery_address}\n`;
      message += `${delivery_city}\n\n`;
      
      message += `📅 *DÉTAILS DE LIVRAISON*\n`;
      message += `Date: ${delivery_date}\n`;
      message += `Heure: ${delivery_time}\n\n`;
      
      message += `🛒 *DÉTAILS DE LA COMMANDE*\n`;
      cartItems.forEach(item => {
        message += `• ${item.quantity}x ${item.name}`;
        if (item.selectedOptions) {
          Object.entries(item.selectedOptions).forEach(([optionKey, selectedValue]) => {
            const option = item.options[optionKey];
            const choice = option.choices.find(c => c.id === selectedValue);
            if (choice) {
              message += ` (${choice.name})`;
            }
          });
        }
        message += ` - ${(item.price * item.quantity).toFixed(2)} fcfa\n`;
      });
      
      message += `\n💰 *RÉCAPITULATIF*\n`;
      message += `Sous-total: ${cart_total.toFixed(2)} fcfa\n`;
      message += `Livraison: ${delivery_fee.toFixed(2)} fcfa\n`;
      message += `*TOTAL: ${total_amount.toFixed(2)} fcfa*\n\n`;
      
      message += `💳 *MÉTHODE DE PAIEMENT*\n`;
      message += `FedaPay - Paiement confirmé ✅\n\n`;
      
      message += `📅 *DATE ET HEURE*\n`;
      message += `${new Date().toLocaleString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}\n\n`;
      
      message += `🚚 *STATUT*\n`;
      message += `Paiement confirmé - Prêt pour la livraison`;

      // Encoder le message pour WhatsApp
      const encodedMessage = encodeURIComponent(message);
      
      // URL WhatsApp avec les numéros spécifiés
      const whatsappUrl = `https://wa.me/+22953305896?text=${encodedMessage}`;
      
      // Ouvrir WhatsApp dans un nouvel onglet
      window.open(whatsappUrl, '_blank');
      
      console.log('📱 Message WhatsApp envoyé:', message);
      
      return {
        success: true,
        message: 'Commande envoyée par WhatsApp avec succès'
      };
    } catch (error) {
      console.error('❌ Erreur envoi WhatsApp:', error);
      throw new Error('Impossible d\'envoyer la commande par WhatsApp');
    }
  }

  // Valider les données de paiement
  validatePaymentData(customerData, orderData) {
    const errors = [];

    if (!customerData.firstName || !customerData.lastName) {
      errors.push('Nom et prénom requis');
    }

    if (!customerData.email) {
      errors.push('Email requis');
    }

    if (!customerData.phone) {
      errors.push('Numéro de téléphone requis');
    }

    if (!customerData.address || !customerData.city) {
      errors.push('Adresse de livraison requise');
    }

    if (!customerData.deliveryDate || !customerData.deliveryTime) {
      errors.push('Date et heure de livraison requises');
    }

    if (!orderData.cartItems || orderData.cartItems.length === 0) {
      errors.push('Panier vide');
    }

    if (orderData.totalAmount <= 0) {
      errors.push('Montant invalide');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    return true;
  }

  // Générer un ID de commande unique
  generateOrderId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `snaki-${timestamp}-${random}`;
  }
}

// Instance singleton
const fedaPayService = new FedaPayService();

export default fedaPayService; 