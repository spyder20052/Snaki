import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PaymentCancelPage = () => {
  const navigate = useNavigate();

  return (
    <div className="pt-28 pb-16 min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-4"
      >
        <Card className="bg-orange-50 border-orange-200 border-2">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4"
            >
              <XCircle className="h-8 w-8 text-orange-600" />
            </motion.div>
            
            <CardTitle className="text-xl font-bold text-orange-800">
              Paiement annulé
            </CardTitle>
            
            <p className="text-sm text-orange-700 mt-2">
              Vous avez annulé le processus de paiement
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg p-4 border border-orange-200"
            >
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <h4 className="font-semibold mb-2">Aucun paiement n'a été effectué</h4>
                  <p>Votre commande n'a pas été traitée. Vous pouvez réessayer à tout moment.</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <Button
                onClick={() => navigate('/cart')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au panier
              </Button>
              
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
              >
                Retour à l'accueil
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PaymentCancelPage; 