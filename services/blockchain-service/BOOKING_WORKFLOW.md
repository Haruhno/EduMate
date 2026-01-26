# 📋 Booking Workflow - Système de Réservation Complet

## Vue d'ensemble du flux

### Étape 1: Création de la réservation
- **Acteur**: Étudiant
- **Action**: Appelle `POST /api/blockchain/booking`
- **Smart Contract**: `createBooking()` 
- **Résultat**: 
  - Réservation créée avec status `PENDING`
  - Argent transféré en escrow au contrat (pas au tuteur encore!)
  - ID frontend généré (UUID)
  - ID blockchain retourné

**État de l'argent**: 🔒 En attente (escrow)

---

### Étape 2: Confirmation/Annulation par le tuteur
#### Option A: Tuteur confirme
- **Acteur**: Tuteur
- **Action**: Appelle `PATCH /api/blockchain/booking/{id}/confirm`
- **Smart Contract**: `confirmBooking()`
- **Résultat**:
  - Réservation avec status `CONFIRMED`
  - Argent reste en escrow

**État de l'argent**: 🔒 Toujours en attente

#### Option B: Tuteur annule
- **Acteur**: Tuteur
- **Action**: Appelle `PATCH /api/blockchain/booking/{id}/cancel`
- **Smart Contract**: `rejectBooking()`
- **Résultat**:
  - Réservation avec status `CANCELLED`
  - Argent remboursé immédiatement à l'étudiant

**État de l'argent**: ✅ Remboursé à l'étudiant

---

### Étape 3: Confirmation de l'issue après la date du cours
**(Après que la date/heure du cours soit passée)**

- **Acteur**: Les deux (étudiant ET tuteur doivent confirmer)
- **Action**: Chacun appelle `POST /api/blockchain/booking/{id}/confirm-outcome?course_held={true|false}`
- **Smart Contract**: `confirmCourseOutcome()`

#### Scénario 3A: Les deux confirment "le cours a eu lieu" (courseHeld = true)
- **Résultat**:
  - Status = `COMPLETED`
  - Outcome = `COURSE_HELD`
  - Argent transféré au tuteur

**État de l'argent**: ✅ Versé au tuteur

#### Scénario 3B: Les deux confirment "le cours n'a pas eu lieu" (courseHeld = false)
- **Résultat**:
  - Status = `CANCELLED`
  - Outcome = `COURSE_NOT_HELD`
  - Argent remboursé à l'étudiant

**État de l'argent**: ✅ Remboursé à l'étudiant

#### Scénario 3C: Les deux ne sont pas d'accord
- **Résultat**: 
  - Status reste `CONFIRMED`
  - Les confirmations sont enregistrées mais aucun mouvement d'argent
  - Dispute resolution (TODO: implémenter après 7 jours)

**État de l'argent**: 🔒 Reste en attente

---

## Routes API

### POST /api/blockchain/booking
```json
{
  "tutorId": "uuid",
  "annonceId": "uuid",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "amount": 50.00,
  "duration": 60,
  "description": "Session de tutorat",
  "studentNotes": "Notes optionnelles"
}
```

### PATCH /api/blockchain/booking/{id}/confirm
Tuteur confirme la réservation (argent reste en escrow)

### PATCH /api/blockchain/booking/{id}/cancel
Tuteur annule la réservation (remboursement immédiat)

### PATCH /api/blockchain/booking/{id}/complete
Route pour compatibilité (TODO: à retirer ou impl. pour dispute resolution)

### POST /api/blockchain/booking/{id}/confirm-outcome
```json
{
  "course_held": true|false
}
```
Les deux parties confirment si le cours a eu lieu ou non

### GET /api/blockchain/booking/{id}
Récupère les détails complets d'une réservation

### GET /api/blockchain/booking/user/{userId}
Récupère les réservations d'un étudiant

### GET /api/blockchain/booking/tutor/{tutorId}
Récupère les réservations d'un tuteur

### GET /api/blockchain/booking/{userId}/stats
Récupère les statistiques de réservation

---

## Statuts de réservation

| Status | Signification | Argent |
|--------|--------------|--------|
| `PENDING` | Réservation créée, en attente de confirmation du tuteur | 🔒 Escrow |
| `CONFIRMED` | Tuteur a confirmé, en attente de la date du cours | 🔒 Escrow |
| `COMPLETED` | Cours confirmé par les deux -> Tuteur payé | ✅ Tuteur |
| `CANCELLED` | Annulé -> Étudiant remboursé | ✅ Étudiant |
| `DISPUTED` | Désaccord entre les parties | 🔒 Escrow |

---

## Logique de Smart Contract

### Struct Booking
```solidity
struct Booking {
    uint256 id;
    address student;          // Adresse Ethereum de l'étudiant
    address tutor;            // Adresse Ethereum du tuteur
    uint256 amount;           // Montant en wei
    uint256 startTime;        // Timestamp Unix du début
    uint256 duration;         // Durée en minutes
    BookingStatus status;     // PENDING, CONFIRMED, CANCELLED, COMPLETED, DISPUTED
    Outcome outcome;          // NOT_DECIDED, COURSE_HELD, COURSE_NOT_HELD
    uint256 createdAt;        // Timestamp création
    bool studentConfirmed;    // Étudiant a confirmé l'issue
    bool tutorConfirmed;      // Tuteur a confirmé l'issue
    string description;       // Description du cours
    bytes32 frontendId;       // ID UUID du frontend (mapping vers ID blockchain)
    bool studentCourseHeld;   // Confirmation de l'étudiant: cours eu lieu?
    bool tutorCourseHeld;     // Confirmation du tuteur: cours eu lieu?
}
```

### Mappings
```solidity
mapping(uint256 => Booking) public bookings;
mapping(bytes32 => uint256) public frontendToBookingId;  // UUID -> blockchain ID
```

---

## Intégration avec le contrat EduToken

Le contrat `BookingEscrow` utilise `EduToken` pour:
1. Vérifier le solde et l'allowance lors de la création
2. Transférer les tokens en escrow lors de la création
3. Transférer au tuteur ou rembourser l'étudiant selon l'outcome

---

## Notes importantes

✅ **L'argent ne quitte JAMAIS la blockchain** - tout est traceable
✅ **Escrow sécurisé** - l'étudiant ne peut pas rependre l'argent une fois le booking créé (sauf annulation tuteur)
✅ **Mutual agreement required** - les deux parties doivent confirmer avant tout versement (sauf rejet tuteur)
✅ **Transparence totale** - tous les événements sont émis et loggables

⚠️ **TODO: Dispute resolution** - implémenter après 7 jours si désaccord
⚠️ **TODO: Event indexing** - pour les routes `/user` et `/tutor` (actuellement retourne liste vide)
