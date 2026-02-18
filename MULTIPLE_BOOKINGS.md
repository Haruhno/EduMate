# Support des Réservations Multiples (Batch Bookings)

## Problème Initial
La page de réservation permettait de sélectionner plusieurs créneaux, mais le système envoyait des requêtes **individuelles et parallèles** pour chaque réservation. Cela causait des problèmes :
- Approbations multiples non coordonnées
- Risque de dépassement d'allowance
- Transactions de booking échouaient (status 0)

## Solution Implémentée

### 1. **Nouveau Modèle Pydantic** (models.py)
```python
class CreateBatchBookingData(BaseModel):
    """Données pour créer plusieurs réservations en une seule requête"""
    tutorId: str
    annonceId: str
    bookings: List[Dict[str, Any]]  # [{"date": "...", "time": "...", "amount": 35, "duration": 60}, ...]
    description: Optional[str] = None
    studentNotes: Optional[str] = None
```

### 2. **Nouvel Endpoint API** (booking.py)
```
POST /api/blockchain/booking/batch
```

**Avantages:**
- ✅ Vérifications utilisateur faites UNE SEULE FOIS
- ✅ Montants validés ensemble
- ✅ Récupération annonce UNE SEULE FOIS
- ✅ Créé les réservations dans une boucle sérialisée
- ✅ Chaque réservation a son propre ID frontend unique

**Logique:**
```
1. Vérifier étudiant et tuteur (une seule fois)
2. Calculer montant total
3. Récupérer titre annonce (une seule fois)
4. Boucle pour chaque créneau:
   - Générer ID frontend unique
   - Créer réservation blockchain
   - Ajouter au résultat
5. Retourner tous les résultats
```

### 3. **Frontend - Nouvelle Méthode Service** (blockchainService.ts)
```typescript
async createBatchBookings(data: {
  tutorId: string;
  annonceId: string;
  bookings: Array<{
    date: string;
    time: string;
    duration: number;
    amount: number;
  }>;
  description?: string;
  studentNotes?: string;
})
```

### 4. **Frontend - BookingPage Adaptée**
**Avant (❌ Promise.all parallèle):**
```typescript
const bookingPromises = selectedSlots.map(slot => {
  return blockchainService.createBooking(bookingData); // Individual calls
});
const results = await Promise.all(bookingPromises); // Parallel ❌
```

**Après (✅ Batch sérialisé):**
```typescript
const bookingsData = selectedSlots.map(slot => ({
  date: slot.date,
  time: slot.time,
  duration: slot.duration,
  amount: calculateAmount(slot)
}));

const batchData = {
  tutorId,
  annonceId,
  bookings: bookingsData,  // All in one request ✅
  studentNotes
};

const response = await blockchainService.createBatchBookings(batchData);
```

## Flux Complet de Création

### Ancien Flux (❌ Problématique)
```
Créneau 1: approve(35) + createBooking(35) ❌ Approval manquant pour créneau 2
Créneau 2: approve(35) + createBooking(35) ❌ Peut échouer (allowance insuffisant)
```

### Nouveau Flux (✅ Optimisé)
```
Validation unique:
  ✅ Student vérifié (1x)
  ✅ Tutor vérifié (1x)
  ✅ Annonce récupérée (1x)
  ✅ Montant total calculé: 70 EDU

Boucle création:
  ✅ Créneau 1 (09:00-10:00): createBooking(35)
  ✅ Créneau 2 (10:00-11:00): createBooking(35)

Résultat:
  ✅ 2 réservations créées
  ✅ Total: 70 EDU
```

## Fichiers Modifiés

### Backend
1. **services/blockchain-service/app/models.py**
   - Ajout du modèle `CreateBatchBookingData`

2. **services/blockchain-service/app/booking.py**
   - Import du nouveau modèle
   - Nouvel endpoint `POST /booking/batch`
   - Logique de traitement par batch avec erreurs individuelles gérées

### Frontend
1. **apps/web/src/services/blockchainService.ts**
   - Nouvelle méthode `createBatchBookings()`

2. **apps/web/src/pages/Booking/BookingPage.tsx**
   - Changement de `Promise.all()` à appel batch unique
   - Logging amélioré du flux batch

## Gestion des Erreurs

Le système batch supporte les erreurs partielles :
```typescript
{
  "success": true,  // Au moins une réservation créée
  "data": {
    "bookings": [...],        // Les réservations réussies
    "count": 1,               // Nombre de succès
    "failedCount": 1,         // Nombre d'échecs
    "failures": [             // Détails des échecs
      {
        "index": 2,
        "slot": {...},
        "error": "..."
      }
    ]
  }
}
```

## Tests à Effectuer

1. ✅ Sélectionner 2 créneaux consécutifs
2. ✅ Vérifier que la requête est envoyée UNE SEULE FOIS au lieu de 2
3. ✅ Vérifier que les 2 réservations sont créées
4. ✅ Vérifier que le solde est bien débité du montant total
5. ✅ Tester avec 3+ créneaux
6. ✅ Vérifier les logs backend pour voir la boucle batch

## Performance

**Avant (Promise.all):**
- Approvals: 2 transactions
- Bookings: 2 transactions
- Total: ~4 transactions + overhead

**Après (Batch):**
- Validations: 1x étudiant + 1x tuteur + 1x annonce
- Bookings: 2 transactions dans une boucle
- Total: ~2 transactions + meilleure performance

## Logs Attendus

```
[CREATE_BATCH_BOOKING] Nouvelles 2 réservations demandées
[CREATE_BATCH_BOOKING] Vérification étudiant: d755226e-bb7b-4bec-9af0-e578da8362dc ✅
[CREATE_BATCH_BOOKING] Vérification tuteur: d085706f-9304-4011-a28a-08fd871afe4f ✅
[CREATE_BATCH_BOOKING] Montant total: 70 EDU pour 2 réservations
[CREATE_BATCH_BOOKING] Titre annonce trouvé: Cours de Deep Learning avancé
[CREATE_BATCH_BOOKING] Création réservation 1/2
[CREATE_BATCH_BOOKING] ✅ Réservation 1 créée: 42
[CREATE_BATCH_BOOKING] Création réservation 2/2
[CREATE_BATCH_BOOKING] ✅ Réservation 2 créée: 43
[CREATE_BATCH_BOOKING] ✅ Toutes les 2 réservations ont été créées avec succès!
```
