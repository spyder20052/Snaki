import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ArrowLeft, CreditCard, Package, ShieldCheck, Truck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/ui/use-toast';


const CheckoutPage = () => {
  const { cart, cartTotal, clearCart, itemCount } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const deliveryFee = cartTotal > 6000 ? 500 : 1000;
  const totalAmount = cartTotal + deliveryFee;

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', whatsappNumber: '',
    address: '', city: '',
    deliveryDate: '', deliveryTime: '',
    paymentMethod: 'card',
    cardName: '', cardNumber: '', cardExpiry: '', cardCVC: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);

  useEffect(() => {
    if (itemCount === 0 && !orderComplete) {
      toast({
        title: "Panier vide",
        description: "Redirection vers le menu...",
        variant: "destructive",
      });
      navigate('/menu');
    }
  }, [itemCount, navigate, toast, orderComplete]);

  useEffect(() => {
    if (orderComplete) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [orderComplete, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    // Basic validation for current step before proceeding
    if (currentStep === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.whatsappNumber) {
        toast({ title: "Champs manquants", description: "Veuillez remplir tous les champs personnels et votre numéro WhatsApp.", variant: "destructive" });
        return;
      }
    }
    if (currentStep === 2) {
      if (!formData.address || !formData.city || !formData.deliveryDate || !formData.deliveryTime) {
        toast({ title: "Champs manquants", description: "Veuillez remplir tous les champs d'adresse et les détails de livraison.", variant: "destructive" });
        return;
      }
    }
    setCurrentStep(s => s + 1);
  };
  
  const handlePrevStep = () => setCurrentStep(s => s - 1);

  const formatOrderForWhatsApp = () => {
    const deliveryFee = cartTotal > 6000 ? 500 : 1000;
    const totalAmount = cartTotal + deliveryFee;
    
    let message = `🍹 *NOUVELLE COMMANDE SNAKI* 🍹\n\n`;
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
    message += `Sous-total: ${cartTotal.toFixed(2)} fcfa\n`;
    message += `Livraison: ${deliveryFee.toFixed(2)} fcfa\n`;
    message += `*TOTAL: ${totalAmount.toFixed(2)} fcfa*\n\n`;
    
    message += `💳 *MÉTHODE DE PAIEMENT*\n`;
    message += `${formData.paymentMethod === 'card' ? 'Carte Bancaire' : 'PayPal'}\n\n`;
    
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep !== 3) {
      handleNextStep(e);
      return;
    }
    setIsSubmitting(true);
    try {
      // Validation simplifiée
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
        throw new Error("Veuillez remplir tous les champs obligatoires");
      }
      // Générer le message WhatsApp
      const message = formatOrderForWhatsApp();
      const whatsappUrl = `https://wa.me/22953305896?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      setOrderComplete(true);
      clearCart();
    } catch (error) {
      toast({
        title: "Données invalides",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 260, damping: 20 } },
    exit: { opacity: 0, x: -50, transition: { ease: "easeInOut" } }
  };

  if (orderComplete) {
    return (
      <div className="pt-28 pb-16 flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-800 dark:via-gray-900 dark:to-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 15, duration: 0.7 }}
          className="text-center p-10 bg-card rounded-2xl shadow-2xl max-w-lg mx-auto"
        >
          <motion.div
            initial={{ scale:0 }} animate={{ scale:1 }} transition={{delay:0.2, type: 'spring', stiffness:200, damping:10}}
            className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full mb-8 shadow-lg"
          >
            <CheckCircle className="h-16 w-16 text-white" />
          </motion.div>
          <h1 className="text-4xl font-extrabold mb-5 text-green-600">Commande Réussie !</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Votre festin est en route ! Merci de nous avoir choisis. Votre commande a été envoyée par WhatsApp au restaurant pour traitement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={() => navigate('/')}
              size="lg"
              className="button-glow bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-700 text-white font-semibold text-lg py-3 px-8"
            >
              <Truck className="mr-2 h-5 w-5" /> Retour à l'accueil
            </Button>
            <Button 
              onClick={() => sendOrderToWhatsApp()}
              size="lg"
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50 font-semibold text-lg py-3 px-8"
            >
              📱 Voir le message WhatsApp
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-16 min-h-screen bg-gray-50 dark:bg-gray-900">

      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity:0, y:-10 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:0.3 }}
        >
          <Button 
            variant="ghost" 
            className="mb-4 flex items-center group text-muted-foreground hover:text-primary text-xs md:text-base px-2 md:px-4 py-1 md:py-2"
            onClick={() => currentStep === 1 ? navigate('/cart') : handlePrevStep()}
            size="sm"
          >
            <ArrowLeft className="mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5 transition-transform duration-300 group-hover:-translate-x-1" />
            {currentStep === 1 ? "Retour au Panier" : "Étape Précédente"}
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 items-start">
          <motion.div 
            className="md:col-span-2"
            initial={{ opacity:0, x:-20 }}
            animate={{ opacity:1, x:0 }}
            transition={{ duration:0.3, delay:0.05 }}
          >
            <Card className="shadow-md md:shadow-xl rounded-lg neumorphic-shadow">
              <CardHeader className="border-b p-2 md:p-6">
                <CardTitle className="text-lg md:text-3xl font-bold">Finaliser ma Commande</CardTitle>
                <CardDescription className="text-xs md:text-md">Étape {currentStep} sur 3: {currentStep === 1 ? "Informations Personnelles" : currentStep === 2 ? "Adresse et Livraison" : "Validation"}</CardDescription>
                <div className="w-full bg-muted rounded-full h-1 md:h-2.5 mt-1 md:mt-2">
                  <motion.div 
                    className="bg-primary h-1 md:h-2.5 rounded-full" 
                    animate={{ width: `${(currentStep / 3) * 100}%` }}
                    transition={{ type:"spring", stiffness:100 }}
                  ></motion.div>
                </div>
              </CardHeader>
              <CardContent className="pt-2 md:pt-6 px-2 md:px-6 text-xs md:text-base">
                <AnimatePresence mode="wait">
                  <motion.form 
                    key={currentStep}
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onSubmit={currentStep === 3 ? handleSubmit : handleNextStep} 
                    className="space-y-3 md:space-y-6"
                  >
                    {currentStep === 1 && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2"><Label htmlFor="firstName">Prénom</Label><Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required className="h-11"/></div>
                          <div className="space-y-2"><Label htmlFor="lastName">Nom</Label><Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required className="h-11"/></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required className="h-11"/></div>
                          <div className="space-y-2"><Label htmlFor="phone">Téléphone</Label><Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required className="h-11"/></div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="whatsappNumber">Numéro WhatsApp *</Label>
                          <Input 
                            id="whatsappNumber" 
                            name="whatsappNumber" 
                            type="tel" 
                            value={formData.whatsappNumber} 
                            onChange={handleInputChange} 
                            required 
                            placeholder="+22912345678" 
                            className="h-11"
                          />
                          <p className="text-xs text-muted-foreground">Ce numéro sera utilisé pour vous contacter concernant votre commande</p>
                        </div>
                      </>
                    )}
                    {currentStep === 2 && (
                      <>
                        <div className="space-y-2"><Label htmlFor="address">Indication du lieu de livraison</Label><Input id="address" name="address" value={formData.address} onChange={handleInputChange} required placeholder="123 Rue Principale" className="h-11"/></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2"><Label htmlFor="city">Ville</Label><Input id="city" name="city" value={formData.city} onChange={handleInputChange} required className="h-11"/></div>
                        </div>
                        <div className="border-t pt-6 mt-6">
                          <h3 className="text-lg font-semibold mb-4">📅 Détails de la livraison</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="deliveryDate">Date de livraison *</Label>
                              <Input 
                                id="deliveryDate" 
                                name="deliveryDate" 
                                type="date" 
                                value={formData.deliveryDate} 
                                onChange={handleInputChange} 
                                required 
                                min={new Date().toISOString().split('T')[0]}
                                className="h-11"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="deliveryTime">Heure de livraison *</Label>
                              <Input 
                                id="deliveryTime" 
                                name="deliveryTime" 
                                type="time" 
                                value={formData.deliveryTime} 
                                onChange={handleInputChange} 
                                required 
                                className="h-11"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Livraison disponible de 10h à 18h</p>
                        </div>
                      </>
                    )}
                    {currentStep === 3 && (
                      <>
                        <div className="space-y-4 text-center">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-blue-800 mb-2">💳 Paiement Sécurisé</h3>
                            <p className="text-sm text-blue-700 mb-3">
                              Votre commande sera traitée de manière sécurisée. 
                              Vous recevrez une confirmation par WhatsApp.
                            </p>
                            <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
                              <CreditCard className="h-4 w-4" />
                              <span>Paiement par carte bancaire ou mobile money</span>
                            </div>
                          </div>
                          
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-semibold text-green-800 mb-2">✅ Vérification finale</h4>
                            <ul className="text-sm text-green-700 space-y-1 text-left">
                              <li>• Vos informations personnelles sont complètes</li>
                              <li>• Votre adresse de livraison est renseignée</li>
                              <li>• Le montant total est de {totalAmount.toFixed(2)} fcfa</li>
                              <li>• Paiement sécurisé</li>
                              <li>• WhatsApp automatique après paiement</li>
                            </ul>
                          </div>
                        </div>
                        <div className="flex justify-center mt-6">
                        </div>
                      </>
                    )}
                    <div className="flex justify-end pt-4">
                       <Button 
                        type="submit" 
                        size="lg"
                        className="button-glow bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold text-lg py-3 px-8"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Traitement...' : (currentStep === 3 ? 'Confirmer et Payer' : 'Suivant')}
                      </Button>
                    </div>
                  </motion.form>
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            className="sticky top-20"
            initial={{ opacity:0, x:10 }}
            animate={{ opacity:1, x:0 }}
            transition={{ duration:0.3, delay:0.1 }}
          >
            <Card className="shadow-md md:shadow-xl rounded-lg neumorphic-shadow">
              <CardHeader className="p-2 md:p-6">
                <CardTitle className="text-base md:text-2xl flex items-center gap-2"><Package className="text-primary h-4 w-4 md:h-5 md:w-5"/>Votre Commande</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 md:space-y-3 px-2 md:px-6 text-xs md:text-sm">
                <AnimatePresence>
                {cart.map(item => (
                  <motion.div 
                    key={item.id} 
                    className="flex justify-between items-center text-xs md:text-sm"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <span className="truncate max-w-[100px] md:max-w-[150px]">{item.quantity}x {item.name}</span>
                    <span className="font-medium">{(item.price * item.quantity).toFixed(2)} fcfa</span>
                  </motion.div>
                ))}
                </AnimatePresence>
                <div className="border-t pt-2 md:pt-3 space-y-1 md:space-y-2">
                  <div className="flex justify-between text-xs md:text-md"><span className="text-muted-foreground">Sous-total</span><span className="font-medium">{cartTotal.toFixed(2)} f</span></div>
                  <div className="flex justify-between text-xs md:text-md"><span className="text-muted-foreground">Livraison</span><span className="font-medium">{deliveryFee.toFixed(2)} f</span></div>
                  <div className="flex justify-between font-bold text-base md:text-xl text-primary pt-1 md:pt-2"><span >Total TTC</span><span>{totalAmount.toFixed(2)} fcfa</span></div>
                </div>
              </CardContent>
              <CardFooter className="flex-col items-start space-y-1 md:space-y-2 text-xs md:text-sm text-muted-foreground pt-2 md:pt-4 border-t">
                  <div className="flex items-center gap-1.5"><span className="h-3 w-3 md:h-4 md:w-4 inline-block"><CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500"/></span> Paiement à la livraison.</div>
                  <div className="flex items-center gap-1.5"><span className="h-3 w-3 md:h-4 md:w-4 inline-block"><Clock className="h-3 w-3 md:h-4 md:w-4 text-blue-500"/></span> Livraison rapide.</div>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

function genererMessageCommande(formData, cart, totalAmount) {
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
  message += `\n💰 *TOTAL: ${totalAmount.toFixed(2)} fcfa*`;
  return message;
}

export default CheckoutPage;