# Échange de Compétences - Documentation Technique

## 🎯 Vue d'ensemble

Le système d'échange de compétences est implémenté 100% on-chain sur la blockchain Ethereum (Ganache). Il permet aux étudiants de proposer des échanges de compétences avec des tuteurs **sans utiliser de EDUcoins** (transactions à 0 EDU).

## 🏗️ Architecture

### Smart Contract (Solidity)
- **Fichier**: `services/blockchain-service/contracts/combined.sol`
- **Contrat**: `SkillExchange`
- **Stockage**: Blockchain uniquement (pas de PostgreSQL)

### Backend (Python/FastAPI)
- **Routes**: `services/blockchain-service/app/skill_exchange.py`
- **Logique blockchain**: `services/blockchain-service/app/blockchain.py`
- **Modèles Pydantic**: `services/blockchain-service/app/models.py`

### Frontend (React/TypeScript)
- **Service API**: `apps/web/src/services/skillExchangeService.ts`
- **Composants**:
  - `SkillExchangeButton.tsx` - Bouton pour créer un échange
  - `TutorSkillsDisplay.tsx` - Affichage des compétences
  - `SkillExchangePage.tsx` - Page de gestion des échanges

## 🔧 Fonctionnement

### 1. Création d'un échange
```typescript
// Frontend appelle
await createSkillExchange(tutorId, skillOffered, skillRequested)

// Backend Python crée la transaction blockchain
blockchain_manager.create_skill_exchange(
  student_user_id,
  tutor_user_id,
  json.dumps(skill_offered),
  json.dumps(skill_requested),
  frontend_id
)

// Smart Contract stocke
exchanges[exchangeId] = Exchange({
  studentId: bytes32,
  tutorId: bytes32,
  skillOffered: string (JSON),
  skillRequested: string (JSON),
  status: PENDING,
  createdAt: timestamp
})
```

### 2. Cycle de vie d'un échange

```
PENDING → ACCEPTED → COMPLETED
   ↓
REJECTED
```

**PENDING**: L'étudiant a créé la demande
- Seul le **tuteur** peut accepter ou rejeter

**ACCEPTED**: Le tuteur a accepté
- Les deux parties peuvent marquer comme **complété**

**REJECTED**: Le tuteur a refusé
- État final

**COMPLETED**: L'échange a eu lieu
- État final

### 3. Transaction blockchain à 0 EDU

Lors de la création d'un échange, une transaction de **0 EDU** est créée pour apparaître dans l'historique :

```python
self.transfer_tokens(
  from_user_id=student_user_id,
  to_address=student_address,  # À soi-même
  amount=0.0,
  description=f"Skill Exchange Request: {skill_name}"
)
```

Cela permet d'avoir une trace dans la blockchain sans transfert d'argent.

## 📡 API Endpoints

### Blockchain Service (Port 3003)

```bash
# Créer un échange
POST /api/blockchain/skill-exchange
{
  "tutorId": "uuid",
  "skillOffered": {"id": "1", "name": "Python", "level": "advanced"},
  "skillRequested": {"id": "2", "name": "React", "level": "intermediate"}
}

# Récupérer les échanges d'un utilisateur
GET /api/blockchain/skill-exchange?userId=uuid&status=PENDING

# Détails d'un échange
GET /api/blockchain/skill-exchange/{exchange_id}

# Accepter
PATCH /api/blockchain/skill-exchange/{exchange_id}/accept

# Rejeter
PATCH /api/blockchain/skill-exchange/{exchange_id}/reject

# Compléter
PATCH /api/blockchain/skill-exchange/{exchange_id}/complete

# Récupérer les compétences d'un utilisateur
GET /api/blockchain/skill-exchange/user/{user_id}/skills
```

## 🔑 Smart Contract - Fonctions principales

```solidity
// Créer un échange
function createExchange(
  bytes32 studentId,
  bytes32 tutorId,
  string memory skillOffered,
  string memory skillRequested,
  bytes32 frontendId
) external returns (uint256)

// Accepter
function acceptExchange(uint256 exchangeId, bytes32 tutorId) external

// Rejeter
function rejectExchange(uint256 exchangeId, bytes32 tutorId) external

// Compléter
function completeExchange(uint256 exchangeId) external

// Récupérer un échange
function getExchange(uint256 exchangeId) external view returns (...)
```

## 📊 Modèle de données

### User (PostgreSQL - auth-service)
```js
{
  id: "uuid",
  firstName: "John",
  lastName: "Doe",
  skillsToTeach: [
    {"id": "1", "name": "Python", "level": "advanced"},
    {"id": "2", "name": "JavaScript", "level": "expert"}
  ],
  skillsToLearn: [
    {"id": "3", "name": "React", "level": "intermediate"}
  ]
}
```

### Exchange (Blockchain)
```solidity
struct Exchange {
  bytes32 studentId;        // UUID converti en bytes32
  bytes32 tutorId;          // UUID converti en bytes32
  string skillOffered;      // JSON: {"id": "...", "name": "...", "level": "..."}
  string skillRequested;    // JSON: {"id": "...", "name": "...", "level": "..."}
  ExchangeStatus status;    // PENDING, ACCEPTED, REJECTED, COMPLETED
  uint256 createdAt;        // timestamp blockchain
  bytes32 frontendId;       // UUID frontend pour mapping
}
```

## 🚀 Déploiement

### 1. Compiler et déployer les contrats

```bash
cd services/blockchain-service
python scripts/deploy_contracts.py
```

Cela va :
- Compiler `EduToken`, `BookingEscrow`, `SkillExchange`
- Déployer sur Ganache
- Créer le fichier `.env` avec les adresses

### 2. Variables d'environnement

```env
EDU_TOKEN_ADDRESS=0x...
BOOKING_ESCROW_ADDRESS=0x...
SKILL_EXCHANGE_ADDRESS=0x...
```

### 3. Démarrer le service blockchain

```bash
# Depuis la racine
npm run dev

# Ou directement
cd services/blockchain-service
python -m uvicorn app.main:app --port 3003
```

## 🔍 Récupération des compétences

Les compétences sont stockées dans PostgreSQL (User model) et récupérées par le blockchain service :

```python
async def get_user_skills(user_id: str, authorization: str):
    response = requests.get(
        f"{blockchain_manager.auth_service_url}/api/users/{user_id}",
        headers={"Authorization": authorization}
    )
    return {
        "skillsToTeach": user_data["skillsToTeach"],
        "skillsToLearn": user_data["skillsToLearn"]
    }
```

## 📝 Exemple d'utilisation

### Frontend

```tsx
// Sur la page profil du tuteur
<SkillExchangeButton
  tutorId={tutorId}
  tutorSkillsToTeach={tutor.skillsToTeach}
  tutorSkillsToLearn={tutor.skillsToLearn}
  userSkillsToTeach={currentUser.skillsToTeach}
  userSkillsToLearn={currentUser.skillsToLearn}
/>
```

### Backend

```python
# L'étudiant crée un échange
result = blockchain_manager.create_skill_exchange(
  student_user_id="uuid-student",
  tutor_user_id="uuid-tutor",
  skill_offered='{"id": "1", "name": "Python", "level": "advanced"}',
  skill_requested='{"id": "2", "name": "React", "level": "intermediate"}',
  frontend_exchange_id="uuid-frontend"
)

# Le tuteur accepte
blockchain_manager.accept_skill_exchange(
  exchange_id=1,
  tutor_user_id="uuid-tutor"
)
```

## 🎨 Affichage dans l'historique

Les échanges de compétences apparaissent dans l'historique blockchain comme des transactions à **0 EDU** :

```
📝 Skill Exchange Request: React
Montant: 0.00 EDU
Description: Demande d'échange de compétence
```

## ⚠️ Points importants

1. **Pas de stockage local**: Tout est on-chain (pas de JSON, pas de fichiers)
2. **Aucun EDUcoin impliqué**: Les échanges sont gratuits (0 EDU)
3. **Déterminisme**: Les wallets sont générés de manière déterministe depuis userId
4. **Mapping UUID ↔ bytes32**: Les UUID sont convertis en bytes32 pour Solidity
5. **Intégration PostgreSQL**: Les skills viennent du User model (auth-service)

## 🔗 Liens avec les autres services

```
Frontend (React) → Blockchain Service (Python/FastAPI) → Smart Contract (Solidity)
                ↓
        Auth Service (Node.js) - Récupération des skills/user info
```

## 📦 Fichiers supprimés

Les fichiers suivants ont été supprimés car remplacés par la version blockchain :

- `services/auth-service/src/controllers/skillExchangeController.js`
- `services/auth-service/src/routes/skillExchangeRoutes.js`
- `services/auth-service/src/models/SkillExchange.js`

## ✅ Avantages de cette architecture

1. **Traçabilité complète**: Tout est sur la blockchain
2. **Décentralisation**: Pas de serveur central pour les échanges
3. **Cohérence**: Même pattern que les bookings
4. **Simplicité**: Pas de duplication de données
5. **Performance**: Lecture directe depuis la blockchain avec cache
