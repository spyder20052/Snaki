# Intégration FedaPay - Guide Complet

## 📋 Vue d'ensemble

Ce guide explique comment intégrer l'API FedaPay dans votre application Snaki pour permettre les paiements sécurisés avec envoi WhatsApp automatique.

## 🚀 Configuration

### 1. Variables d'environnement

Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :

```env
# Configuration FedaPay API
VITE_FEDAPAY_PUBLIC_KEY=votre_clé_publique_fedapay
VITE_FEDAPAY_ENVIRONMENT=sandbox
```

### 2. Obtenir les identifiants FedaPay

1. **Inscrivez-vous sur le portail développeur FedaPay** :
   - Allez sur [FedaPay Developer Portal](https://fedapay.com)
   - Créez un compte développeur
   - Créez une nouvelle application

2. **Récupérez vos identifiants** :
   - Public Key (pour les tests et la production)
   - Secret Key (pour le backend uniquement)

## 📁 Structure des fichiers

```
src/
├── services/
│   └── fedaPayService.js          # Service principal FedaPay
├── components/
│   └── FedaPaymentInfo.jsx        # Composant d'informations de paiement
├── pages/
│   ├── CheckoutPage.jsx           # Page de checkout mise à jour
│   ├── PaymentCallbackPage.jsx    # Page de callback FedaPay
│   └── PaymentCancelPage.jsx      # Page d'annulation
└── App.jsx                        # Routage mis à jour
```

## 🔧 Fonctionnalités implémentées

### Service FedaPay (`fedaPayService.js`)

- ✅ **Création de paiements** : Intégration complète avec l'API FedaPay
- ✅ **Validation des données** : Vérification des informations client et commande
- ✅ **Gestion des callbacks** : Traitement automatique des retours de paiement
- ✅ **Envoi WhatsApp automatique** : Message envoyé après paiement confirmé
- ✅ **Gestion d'erreurs** : Messages d'erreur clairs et informatifs

### Composant FedaPaymentInfo (`FedaPaymentInfo.jsx`)

- ✅ **Interface utilisateur** : Modal avec animations et design moderne
- ✅ **Informations complètes** : Montant, client, livraison
- ✅ **Instructions claires** : Guide pour l'utilisateur
- ✅ **Sécurité** : Indicateurs de sécurité

### Pages de paiement

- ✅ **PaymentCallbackPage** : Traitement des paiements réussis
- ✅ **PaymentCancelPage** : Gestion des annulations
- ✅ **Intégration routage** : Routes configurées dans App.jsx

## 📱 Flux de paiement

### 1. Initiation du paiement
```
Utilisateur → CheckoutPage → FedaPaymentInfo → fedaPayService.createPayment()
```

### 2. Redirection vers FedaPay
```
Service → FedaPay API → Page de paiement → Utilisateur paie
```

### 3. Callback automatique
```
FedaPay → PaymentCallbackPage → Vérification statut → Envoi WhatsApp
```

### 4. Envoi WhatsApp
```
Paiement confirmé → sendOrderToWhatsApp() → WhatsApp +22953305896
```

## 🔒 Configuration WhatsApp

### Numéros configurés

- **Destinataire** : `+22953305896` (numéro qui reçoit les commandes)
- **Expéditeur** : `+22943202239` (numéro depuis lequel les messages sont envoyés)

### Format du message WhatsApp

Le message inclut :
- 🆔 Référence de commande et paiement
- 👤 Informations client complètes
- 📍 Adresse de livraison
- 📅 Détails de livraison
- 🛒 Détails de la commande
- 💰 Récapitulatif financier
- 💳 Confirmation de paiement FedaPay
- 📅 Date et heure
- 🚚 Statut de livraison

## 🧪 Test de l'intégration

### Environnement Sandbox

1. **Utilisez les clés de test** :
   ```env
   VITE_FEDAPAY_PUBLIC_KEY=pk_test_...
   VITE_FEDAPAY_ENVIRONMENT=sandbox
   ```

2. **Testez les scénarios** :
   - ✅ Paiement réussi
   - ❌ Paiement refusé
   - ⏰ Paiement annulé
   - 🔄 Callback automatique

### Test en production

1. **Configurez les variables de production** :
   ```env
   VITE_FEDAPAY_PUBLIC_KEY=pk_live_...
   VITE_FEDAPAY_ENVIRONMENT=production
   ```

2. **Utilisez de vrais paiements** :
   - Cartes bancaires réelles
   - Mobile money actif

## 🔒 Sécurité

### Bonnes pratiques

- ✅ **Variables d'environnement** : Ne jamais commiter les vraies clés
- ✅ **Validation côté client** : Vérification des données avant envoi
- ✅ **HTTPS obligatoire** : En production uniquement
- ✅ **Callbacks sécurisés** : Vérification des signatures FedaPay

### Variables sensibles

```env
# ❌ Ne jamais commiter ces valeurs
VITE_FEDAPAY_PUBLIC_KEY=pk_live_secret_key_123

# ✅ Utiliser des valeurs par défaut sécurisées
VITE_FEDAPAY_PUBLIC_KEY=pk_test_...
```

## 📱 Fonctionnalités WhatsApp

### Envoi automatique

Le message WhatsApp est envoyé automatiquement après :
1. ✅ Paiement confirmé par FedaPay
2. ✅ Vérification du statut de paiement
3. ✅ Traitement des métadonnées de commande

### Contenu du message

```
🍕 NOUVELLE COMMANDE SNAKI 🍕

🆔 RÉFÉRENCE
Commande: snaki-1234567890-abc123
Paiement: FED-123456789

👤 INFORMATIONS CLIENT
Nom: Jean Dupont
Téléphone: +22912345678
WhatsApp: +22987654321
Email: jean@example.com

📍 ADRESSE DE LIVRAISON
123 Rue Principale
Cotonou

📅 DÉTAILS DE LIVRAISON
Date: 2024-01-15
Heure: 14:30

🛒 DÉTAILS DE LA COMMANDE
• 2x Pizza Margherita - 3000.00 fcfa
• 1x Coca-Cola - 500.00 fcfa

💰 RÉCAPITULATIF
Sous-total: 3500.00 fcfa
Livraison: 500.00 fcfa
TOTAL: 4000.00 fcfa

💳 MÉTHODE DE PAIEMENT
FedaPay - Paiement confirmé ✅

📅 DATE ET HEURE
15 janvier 2024 à 14:30

🚚 STATUT
Paiement confirmé - Prêt pour la livraison
```

## 🐛 Dépannage

### Erreurs courantes

1. **"Impossible de créer le paiement"**
   - Vérifiez votre clé publique FedaPay
   - Vérifiez la connectivité internet
   - Vérifiez les données de paiement

2. **"Paramètres de paiement manquants"**
   - Vérifiez les URLs de callback
   - Vérifiez la configuration des routes

3. **"WhatsApp non envoyé"**
   - Vérifiez les métadonnées de paiement
   - Vérifiez le format des données

### Logs de débogage

Activez les logs dans la console :
```javascript
// Dans fedaPayService.js
console.log('🔗 Création du paiement FedaPay:', paymentData);
console.log('📱 Message WhatsApp envoyé:', message);
```

## 📞 Support

### Documentation officielle
- [FedaPay API Documentation](https://docs.fedapay.com)
- [Sandbox Environment](https://sandbox.fedapay.com)

### Contact
- Support FedaPay : support@fedapay.com
- Documentation technique : docs@fedapay.com

## 🚀 Déploiement

### Prérequis
1. Compte FedaPay Developer actif
2. Application approuvée par FedaPay
3. Variables d'environnement configurées
4. Certificat SSL (production)

### Étapes
1. Configurez les variables de production
2. Testez avec des paiements réels
3. Déployez votre application
4. Surveillez les logs de paiement

---

**Note** : Cette intégration utilise l'environnement sandbox par défaut. Pour la production, changez les variables d'environnement et testez avec de vrais paiements. 