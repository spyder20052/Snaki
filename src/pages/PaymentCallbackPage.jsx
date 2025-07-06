import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import fedaPayService from '@/services/fedaPayService';

const PaymentCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    const handlePaymentCallback = async () => {
      try {
        // Récupérer les paramètres de l'URL
        const paymentId = searchParams.get('payment_id');
        const status = searchParams.get('status');
        
        if (!paymentId) {
          setStatus('error');
          setMessage('Paramètres de paiement manquants');
          return;
        }

        console.log('🔄 Traitement du callback FedaPay:', { paymentId, status });

        // Traiter le callback
        const result = await fedaPayService.handlePaymentCallback(paymentId);
        
        if (result.success) {
          setStatus('success');
          setMessage(result.message);
          setPaymentData(result.data);
          
          toast({
            title: "Paiement confirmé!",
            description: "Votre commande a été envoyée par WhatsApp.",
            variant: "success",
            duration: 5000,
          });
        } else {
          setStatus('error');
          setMessage(result.message);
          
          toast({
            title: "Paiement échoué",
            description: result.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('❌ Erreur callback FedaPay:', error);
        setStatus('error');
        setMessage(error.message || 'Erreur lors du traitement du paiement');
        
        toast({
          title: "Erreur de paiement",
          description: error.message,
          variant: "destructive",
        });
      }
    };

    handlePaymentCallback();
  }, [searchParams, toast]);

  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: Loader2,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Traitement du paiement...',
          description: 'Veuillez patienter pendant que nous vérifions votre paiement'
        };
      
      case 'success':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Paiement confirmé!',
          description: 'Votre commande a été envoyée avec succès'
        };
      
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Paiement échoué',
          description: 'Le paiement n\'a pas pu être validé'
        };
      
      default:
        return {
          icon: CreditCard,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: 'Statut inconnu',
          description: 'Impossible de déterminer le statut'
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <div className="pt-28 pb-16 min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-4"
      >
        <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className={`inline-flex items-center justify-center w-16 h-16 ${config.bgColor} rounded-full mb-4`}
            >
              {status === 'loading' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <IconComponent className={`h-8 w-8 ${config.color}`} />
                </motion.div>
              ) : (
                <IconComponent className={`h-8 w-8 ${config.color}`} />
              )}
            </motion.div>
            
            <CardTitle className={`text-xl font-bold ${config.color}`}>
              {config.title}
            </CardTitle>
            
            <p className="text-sm text-gray-600 mt-2">
              {config.description}
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <p className="text-sm text-gray-700">{message}</p>
              </motion.div>
            )}

            {paymentData && status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-lg p-4 border"
              >
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Référence:</span>
                    <span className="font-medium">{paymentData.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant:</span>
                    <span className="font-medium">{paymentData.amount.toLocaleString()} fcfa</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client:</span>
                    <span className="font-medium">
                      {paymentData.customer?.firstname} {paymentData.customer?.lastname}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex gap-3 pt-4"
            >
              <Button
                onClick={() => navigate('/')}
                className="flex-1"
                variant={status === 'success' ? 'default' : 'outline'}
              >
                Retour à l'accueil
              </Button>
              
              {status === 'error' && (
                <Button
                  onClick={() => navigate('/cart')}
                  className="flex-1"
                  variant="outline"
                >
                  Réessayer
                </Button>
              )}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PaymentCallbackPage; 