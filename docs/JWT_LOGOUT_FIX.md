# 🔐 Gestion de la Déconnexion Automatique JWT

## 📋 Résumé du problème

Auparavant, quand un token JWT était invalide ou expiré, le message d'erreur s'affichait dans la console mais :
- ❌ L'utilisateur **restait sur la page actuelle**
- ❌ **Aucune redirection** vers la page de connexion
- ❌ **L'app restait dans un état incohérent** (utilisateur phantom)

## ✅ Solution implémentée

### 1. **Intercepteur API (api.ts)**
```typescript
// Quand un 401 est reçu :
if (error.response?.status === 401) {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event('auth:logout')); // Événement global
  window.location.href = '/connexion'; // Redirection
}
```

**Avantages :**
- Capture TOUS les 401 au même endroit
- Redirection automatique vers `/connexion`
- Événement global pour notifier l'app

### 2. **Contexte d'Authentification Global (AuthContext.tsx)**
```typescript
- Gère l'état utilisateur globalement
- Écoute l'événement 'auth:logout'
- Synchronise localStorage avec React state
- Évite les état zombies
```

### 3. **Composant ProtectedRoute**
```typescript
- Vérifie l'authentification avant d'afficher
- Gère la redirection automatique
- Valide le rôle si nécessaire
```

### 4. **Navbar amélioré**
```typescript
- Écoute l'événement auth:logout
- Met à jour l'état utilisateur
- Navigue vers /connexion
```

## 🔄 Flux de déconnexion automatique

```
Token invalide (401)
        ↓
Intercepteur API capte l'erreur
        ↓
Supprime token & user du localStorage
        ↓
Émet événement 'auth:logout'
        ↓
Tous les composants/contextes réagissent
        ↓
Redirection vers /connexion
```

## 📝 Points clés

### Environment
- **Status Code 401** = Session invalide
- **localStorage** = Source de vérité pour l'auth
- **Event dispatch** = Communication entre composants

### Flux client-serveur
```
Client → API (avec token)
Server → Valide token
Server → Token invalide → 401
Client → Capture 401 → Logout & Redirect
```

## 🚀 À faire ensuite

- [ ] Ajouter une notification toast lors de la déconnexion
- [ ] Implémenter un système de refresh token
- [ ] Ajouter un timeout de session
- [ ] Stocker le dernier chemin avant logout pour redirection post-login

## 🧪 Test

1. Attendez que votre token expire (ou suppressez-le manuellement)
2. Faites une requête API
3. Vous devriez être redirigé vers `/connexion`
4. Le message "[AUTH] ❌ Token invalide..." apparaîtra en console du serveur

