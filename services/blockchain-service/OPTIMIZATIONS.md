# Optimisations du Blockchain Service

## Problème initial
- **Chargement du portefeuille : 8-10 secondes**
- Cause : Appels réseau bloquants répétés (auth-service + blockchain)

## Solutions implémentées

### 1. **Cache utilisateur (5 minutes)**
- `wallet.py` : Ajout de `_user_cache` avec expiration TTL
- Les appels répétés au même utilisateur ne refont pas l'appel auth-service
- Fallback sur cache expiré si auth-service timeout

**Impact** : `-3-4 secondes` par appel utilisateur connu

### 2. **Timeout réduit (5s → 3s)**
- `wallet.py` : Réduction du timeout requests de 5s à 3s
- Fail fast plutôt que d'attendre 5 secondes

**Impact** : `-2 secondes` en cas d'erreur réseau

### 3. **Cache wallet existence**
- `blockchain.py` : Ajout de `_wallet_cache` 
- Le résultat "exists_on_chain" est mis en cache
- Évite l'appel blockchain à chaque get_user_wallet()

**Impact** : `-2-3 secondes` par appel wallet (appel blockchain = 1-2s)

### 4. **Enregistrement wallet non-bloquant**
- `wallet.py` : L'enregistrement du wallet continue même s'il échoue
- Ne bloque plus la réponse API
- Enregistrement en arrière-plan

**Impact** : `-1 seconde` lors du premier appel

### 5. **Fallback balance gracieux**
- `wallet.py` : Si le solde ne peut pas être récupéré, retourner 0.0
- Ne pas bloquer la réponse complète pour une info secondaire

**Impact** : Résilience améliorée

---

## Résultats attendus
- **Avant** : 8-10 secondes
- **Après** : 1-2 secondes (premier appel)
- **Appels répétés** : < 100ms (cache)

## Configuration du cache
- **TTL utilisateur** : 5 minutes
- **TTL wallet** : Jusqu'au redémarrage du service
- Les caches se nettoient automatiquement lors du redémarrage
