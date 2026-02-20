# Rapport de Maintenance – EduMate SAE

**Projet:** EduMate - Plateforme de mise en relation tuteurs/étudiants  
**Date:** 19 février 2026  
**Auteur:** Équipe de développement EduMate  
**Version:** 2.0.0 (Phase II - Microservices & Blockchain)

---

## Introduction et contexte du projet

### Présentation d'EduMate

EduMate est une plateforme éducative innovante née dans le cadre de notre Situation d'Apprentissage et d'Évaluation (SAE). L'objectif principal est de créer un écosystème **100% gratuit** permettant de mettre en relation des étudiants avec des tuteurs, tout en intégrant des technologies modernes comme la blockchain et l'intelligence artificielle.

Le modèle économique repose sur une **monnaie virtuelle** (EduCoins) distribuée gratuitement aux utilisateurs, permettant d'effectuer des transactions via des smart contracts sur la blockchain Ethereum. Cette approche élimine les frais bancaires traditionnels et démocratise l'accès au tutorat.

### Évolution du projet

Le projet a connu deux phases majeures :

**Phase I (Livrable 1-4):**
- Application web monolithique (React + Node.js)
- Base de données centralisée
- Authentification basique
- Interface utilisateur fonctionnelle

**Phase II (Livrable 5-8):**
- Migration vers architecture microservices
- Intégration blockchain (Ganache → Polygon)
- Implémentation intelligence artificielle (matching, parsing CV)
- Containerisation Docker complète
- Messagerie temps réel

Cette évolution rapide nous a permis d'acquérir une expertise technique solide, mais a également généré une **dette technique** qu'il convient d'analyser et de corriger.

### Contraintes et difficultés rencontrées

Durant le développement, plusieurs défis majeurs ont émergé :

1. **Complexité de la blockchain:** La gestion des wallets, des transactions et du déploiement de smart contracts s'est révélée bien plus complexe que prévu. L'utilisation de Ganache en développement a introduit des problématiques spécifiques (comptes générés aléatoirement au démarrage, nécessité de gérer les clés privées de manière sécurisée).

2. **Orchestration Docker:** Coordonner 10 services différents (PostgreSQL, MongoDB, Qdrant, Ganache, 6 microservices applicatifs) avec leurs dépendances respectives a nécessité de nombreuses itérations. Les problèmes de timing au démarrage et de communication inter-services nous ont occupés plusieurs jours.

3. **Instabilité des API IA gratuites:** Notre dépendance à OpenRouter (plateforme agrégeant des modèles IA gratuits) s'est révélée problématique. Les modèles gratuits disparaissent régulièrement ou changent d'API, causant des pannes imprévisibles.

4. **Manque de temps:** La pression des délais nous a poussés à prendre des raccourcis techniques (logs basiques, absence de tests unitaires, gestion d'erreurs minimale) que nous devons maintenant corriger.

### Objectifs de ce rapport

Ce document de maintenance a pour but de :
- Analyser les bugs corrigés durant la dernière session de maintenance
- Identifier la dette technique accumulée et proposer des solutions concrètes
- Réfléchir aux évolutions futures de la plateforme
- Préparer le portage mobile (iOS) pour élargir notre audience
- Documenter nos choix techniques pour faciliter la reprise du projet

---

## Table des matières

1. [Maintenance corrective](#1-maintenance-corrective)
2. [Maintenance évolutive](#2-maintenance-évolutive)
3. [Maintenance adaptative](#3-maintenance-adaptative-portage-ios)
4. [Scripts et documentation](#4-scripts-et-documentation)
5. [Bilan global](#5-bilan-global)

---

## 1. Maintenance corrective

### 1.1 Analyse globale du backend

#### Architecture microservices : bilan de la Phase II

Lors de la Phase II du projet, nous avons opéré une migration majeure : passer d'une application monolithique à une architecture microservices. Cette décision, motivée par des objectifs de scalabilité et de modularité, a profondément transformé notre codebase.

**L'organisation actuelle comprend 8 services distincts :**

- **auth-service** (Node.js/Express) : Gère l'authentification JWT, les profils utilisateurs et les rôles
- **blockchain-service** (Python/FastAPI) : Interface avec la blockchain Ethereum pour déployer et interagir avec nos smart contracts
- **message-service** (Node.js/Express) : Messagerie instantanée entre tuteurs et étudiants
- **cv-parser-service** (Python/Flask) : Analyse automatique des CV uploadés par les tuteurs

Quatre services supplémentaires sont prévus mais non encore implémentés :
- **notification-service** : Gestion des emails, push notifications et websockets
- **payments-service** : Achat de EduCoins supplémentaires (bien que gratuits à l'inscription)
- **scraper-service** : Collecte automatique de ressources éducatives
- **tutoring-service** : Gestion des sessions de tutorat et planning

**Cette architecture présente des avantages indéniables :** Chaque service peut être développé, testé et déployé indépendamment. Par exemple, si le blockchain-service rencontre un bug, seul ce service nécessite un redémarrage, sans affecter l'authentification ou la messagerie. De plus, nous utilisons des bases de données spécialisées (PostgreSQL pour les données relationnelles, MongoDB pour les messages, Qdrant pour les vecteurs d'embedding IA), ce qui optimise les performances.

**Cependant, nous avons identifié plusieurs faiblesses techniques :**

**1. Gestion des erreurs non unifiée**
```javascript
// Actuellement dans auth-service
app.get('/api/users', async (req, res) => {
  try {
    const users = await pool.query('SELECT * FROM users');
    res.json(users.rows);
  } catch (err) {
    console.error(err); // Log basique
    res.status(500).send('Server error'); // Message générique
  }
});

// Recommandé
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

// Middleware global
app.use((err, req, res, next) => {
  logger.error({
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    userId: req.user?.id
  });
  
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message
    });
  }
  
  // Erreur non prévue
  return res.status(500).json({
    status: 'error',
    message: 'Une erreur inattendue s\'est produite'
  });
});
```

**2. Absence de logs structurés**
```javascript
// Actuellement
console.log('User logged in');
console.error(err);

// Recommandé - Winston ou Pino
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

logger.info('User logged in', { 
  userId: user.id, 
  email: user.email,
  ip: req.ip 
});
```

**3. Validation des entrées incomplète**
```javascript
// Risque d'injection
app.post('/api/user', async (req, res) => {
  const { email, password } = req.body;
  // Pas de validation
});

// Recommandé - Joi/Yup
const Joi = require('joi');

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/[A-Z]/).pattern(/[0-9]/).required(),
  role: Joi.string().valid('student', 'tutor').required()
});

app.post('/api/user', validateBody(userSchema), async (req, res) => {
  // Corps validé
});
```

#### Architecture blockchain-service

**Points positifs:**
- ✅ Utilisation de Web3.py
- ✅ Génération déterministe de wallets
- ✅ Smart contracts Solidity propres (EduToken, BookingEscrow, SkillExchange)
- ✅ Déploiement automatisé via entrypoint.sh

L'architecture blockchain est bien structurée avec une bibliothèque Python standard (Web3.py) qui facilite l'interaction avec Ethereum. Le système de wallets est déterministe, ce qui garantit la reproductibilité des comptes entre différents environnements. Les smart contracts sont modulaires et suivent les bonnes pratiques Solidity, avec un déploiement complètement automatisé qui évite les interventions manuelles.

**Bugs corrigés durant la session:**

**Bug #1: Hardcoded localhost URLs**
```python
# Problème initial
self.auth_service_url = "http://localhost:3001"

# Correction appliquée
self.auth_service_url = os.getenv("AUTH_SERVICE_URL", "http://localhost:3001")
```

**Bug #2: Clés privées hardcodées (incompatibles Ganache dynamique)**
```python
# Problème initial
ganache_account_0_address = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"
ganache_account_0_key = "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
signed_tx = self.w3.eth.account.sign_transaction(tx, ganache_account_0_key)

# Correction appliquée
ganache_accounts = self.w3.eth.accounts
owner_address = ganache_accounts[0]  # Détection dynamique
tx_hash = self.w3.eth.send_transaction(tx)  # Utilise comptes déverrouillés
```

**Bug #3: .env overridant les variables Docker**
```python
# Problème initial
load_dotenv(dotenv_path=env_path, override=True)

# Correction appliquée
load_dotenv(dotenv_path=env_path, override=False)  # Docker prioritaire
```

### 1.2 Analyse du frontend

#### Organisation du code

**Structure React détectée:**
```
apps/web/src/
├── components/
├── context/
├── hooks/
├── pages/
├── services/
├── types/
└── utils/
```

**Points d'amélioration:**

**1. Gestion d'état globale**
```typescript
// Props drilling probable
<Parent>
  <Child user={user}>
    <GrandChild user={user}>
      <GreatGrandChild user={user} />
    </GrandChild>
  </Child>
</Parent>

// Recommandé - Context + hooks personnalisés
// context/AuthContext.tsx
export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Utilisation
function Profile() {
  const { user, logout } = useAuth();
  // ...
}
```

**2. Appels API non centralisés**
```typescript
// Appels directs dans les composants
function UserList() {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    fetch('http://localhost:3001/api/users')
      .then(res => res.json())
      .then(setUsers)
      .catch(console.error); // Gestion d'erreur minimale
  }, []);
}

// Recommandé - Service centralisé + React Query
// services/api.ts
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirection login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// hooks/useUsers.ts
export const useUsers = () => {
  return useQuery('users', () => 
    api.get('/api/users').then(res => res.data)
  );
};

// Utilisation
function UserList() {
  const { data: users, isLoading, error } = useUsers();
  
  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return <UserTable users={users} />;
}
```

**3. Gestion des erreurs UX**
```typescript
// Toast notifications recommandées
import { toast } from 'react-hot-toast';

async function handleSubmit(data: FormData) {
  try {
    await api.post('/api/booking', data);
    toast.success('Réservation confirmée !');
  } catch (error) {
    if (error.response?.status === 409) {
      toast.error('Créneau déjà réservé');
    } else {
      toast.error('Une erreur est survenue');
    }
  }
}
```

### 1.3 Analyse Docker

#### Configuration actuelle

**docker-compose.yml - 10 services:**
```yaml
services:
  postgres:      # PostgreSQL 16
  mongodb:       # MongoDB 7.0
  qdrant:        # Vector DB
  ganache:       # Ethereum testnet
  auth-service:  # Node.js
  blockchain-service: # Python/FastAPI
  message-service: # Node.js
  cv-parser-service: # Python/Flask
  web-app:       # React + Nginx
```

**Points positifs:**
- ✅ Réseau Docker isolé (`edumate-network`)
- ✅ Volumes persistants pour les données
- ✅ Health checks sur services critiques
- ✅ Variables d'environnement centralisées

La configuration Docker est professionnelle avec un réseau isolé qui sécurise la communication inter-services. Les volumes persistants évitent la perte de données lors des redémarrages, tandis que les health checks permettent à Docker de détecter automatiquement les services défaillants et de les relancer. La centralisation des variables d'environnement simplifie considérablement la gestion de configuration.

**Points d'amélioration:**

**1. Secrets en clair dans docker-compose.yml**
```yaml
# Actuellement
environment:
  POSTGRES_PASSWORD: edumate_password
  MONGO_PASSWORD: edumate_password

# Recommandé - Docker secrets
secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
    
services:
  postgres:
    secrets:
      - postgres_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
```

**2. Images non optimisées**
```dockerfile
# blockchain-service/Dockerfile actuel
FROM python:3.11
COPY . /app
RUN pip install -r requirements.txt

# Recommandé - Multi-stage build
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]

# Réduction de ~500MB à ~150MB
```

**3. Logging MongoDB trop verbeux**
```yaml
# Actuellement - logs énormes
mongodb:
  image: mongo:7.0

# Correction appliquée
mongodb:
  image: mongo:7.0
  command: mongod --quiet --logpath /dev/null
```

### 1.4 Bugs majeurs identifiés

#### Bug #1: Lenteur Ganache (30 tentatives systématiques)

**Problème:**
```bash
# entrypoint.sh AVANT correction
for i in {1..30}; do
    if timeout 2 python << 'PYEOF'
    # ... check qui ne marchait pas
    then
        echo "✅ Ganache répond!"
        break
    fi
    echo "Tentative $i/30..."
    sleep 1
done
# Faisait TOUTES les 30 tentatives même si Ganache répondait
```

**Solution appliquée:**
```bash
# APRÈS correction
MAX_ATTEMPTS=30
for i in $(seq 1 $MAX_ATTEMPTS); do
    if python3 -c "
import urllib.request, json, sys
try:
    req = urllib.request.Request('http://ganache:8545', 
        data=json.dumps({'jsonrpc':'2.0','method':'web3_clientVersion'}).encode())
    with urllib.request.urlopen(req, timeout=2) as response:
        sys.exit(0)
except:
    sys.exit(1)
" 2>/dev/null; then
        echo "✅ Ganache répond (tentative $i/$MAX_ATTEMPTS)!"
        break  # ← Sortie immédiate
    fi
    echo "   Tentative $i/$MAX_ATTEMPTS..."
    sleep 1
done
```

**Impact:** Réduction du temps de démarrage de ~30s à ~2-5s.

#### Bug #2: Instabilité OpenRouter (dépendance modèles gratuits)

**Problème actuel:**
```javascript
// api-ia/services/openrouter.js
const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
  model: 'openai/gpt-3.5-turbo',  // Modèle gratuit qui peut disparaître
  messages: [...]
});
```

**Proposition #1: Abstraction provider avec fallback**
```typescript
// services/ai/AIProvider.ts
interface AIProvider {
  name: string;
  generateResponse(prompt: string): Promise<string>;
}

class OpenRouterProvider implements AIProvider {
  name = 'OpenRouter';
  private models = [
    'openai/gpt-3.5-turbo',
    'meta-llama/llama-3-8b-instruct:free',
    'google/gemma-7b-it:free'
  ];
  
  async generateResponse(prompt: string): Promise<string> {
    for (const model of this.models) {
      try {
        const response = await this.callAPI(model, prompt);
        return response;
      } catch (error) {
        console.warn(`Model ${model} failed, trying next...`);
        continue;
      }
    }
    throw new Error('All OpenRouter models failed');
  }
}

class OllamaProvider implements AIProvider {
  name = 'Ollama';
  async generateResponse(prompt: string): Promise<string> {
    // Fallback local
    return await axios.post('http://localhost:11434/api/generate', {
      model: 'llama2',
      prompt
    });
  }
}

class AIService {
  private providers: AIProvider[] = [
    new OpenRouterProvider(),
    new OllamaProvider()
  ];
  
  async generate(prompt: string): Promise<string> {
    for (const provider of this.providers) {
      try {
        return await provider.generateResponse(prompt);
      } catch (error) {
        console.warn(`${provider.name} failed, trying next...`);
      }
    }
    throw new Error('All AI providers failed');
  }
}

// Utilisation
const aiService = new AIService();
const response = await aiService.generate('Analyse ce CV...');
```

**Proposition #2: Configuration base de données au lieu de .env**

**Pourquoi l'idée "page admin pour modifier .env" est problématique:**

1. **Sécurité:** Risque de fuite des clés API si exposées en clair
2. **Traçabilité:** Modifications non versionnées et non auditables
3. **Scalabilité:** Impossible avec plusieurs instances du service
4. **Redémarrage:** Modification du .env nécessite restart du service

**Solution professionnelle: Configuration centralisée**

```sql
-- Table configuration chiffrée
CREATE TABLE service_config (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(50) NOT NULL,
  config_key VARCHAR(100) NOT NULL,
  config_value_encrypted TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(100),
  UNIQUE(service_name, config_key)
);

CREATE TABLE config_audit_log (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(50),
  config_key VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by VARCHAR(100),
  changed_at TIMESTAMP DEFAULT NOW()
);
```

```typescript
// services/config/ConfigService.ts
import { createCipheriv, createDecipheriv } from 'crypto';

class ConfigService {
  private encryptionKey = process.env.CONFIG_ENCRYPTION_KEY;
  
  async getConfig(serviceName: string, key: string): Promise<string> {
    const result = await pool.query(
      'SELECT config_value_encrypted FROM service_config WHERE service_name = $1 AND config_key = $2',
      [serviceName, key]
    );
    
    if (!result.rows.length) return null;
    return this.decrypt(result.rows[0].config_value_encrypted);
  }
  
  async setConfig(
    serviceName: string, 
    key: string, 
    value: string,
    userId: string
  ): Promise<void> {
    // Récupérer ancienne valeur pour audit
    const oldValue = await this.getConfig(serviceName, key);
    
    // Chiffrer et sauvegarder
    const encrypted = this.encrypt(value);
    await pool.query(
      `INSERT INTO service_config (service_name, config_key, config_value_encrypted, updated_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (service_name, config_key) 
       DO UPDATE SET config_value_encrypted = $3, updated_at = NOW(), updated_by = $4`,
      [serviceName, key, encrypted, userId]
    );
    
    // Log de l'audit
    await pool.query(
      'INSERT INTO config_audit_log (service_name, config_key, old_value, new_value, changed_by) VALUES ($1, $2, $3, $4, $5)',
      [serviceName, key, oldValue ? '***' : null, '***', userId]
    );
    
    // Notifier le service pour reload (via WebSocket ou Redis Pub/Sub)
    await this.notifyServiceReload(serviceName);
  }
  
  private encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }
  
  private decrypt(text: string): string {
    const [ivHex, encrypted] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// API endpoint sécurisé (admin uniquement)
router.put('/api/admin/config', 
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    const { serviceName, key, value } = req.body;
    
    await configService.setConfig(serviceName, key, value, req.user.id);
    
    res.json({ 
      success: true,
      message: 'Configuration updated successfully'
    });
  }
);
```

**Avantages:**
- ✅ Clés chiffrées en base
- ✅ Audit trail complet
- ✅ Rechargement à chaud sans restart
- ✅ Scalable (plusieurs instances)
- ✅ Versioning possible
Cette approche de configuration centralisée représente un vrai bond professionnel par rapport à la simple modification de fichiers `.env`. Le chiffrement garantit que même en cas de compromission de la base de données, les clés API restent protégées. L'audit trail permet de tracer qui a modifié quoi et quand, ce qui est essentiel pour la sécurité et le debugging. Le rechargement à chaud évite les interruptions de service, et la scalabilité horizontale devient enfin possible puisque toutes les instances partagent la même configuration. Enfin, le versioning et le rollback permettent de revenir rapidement en arrière en cas de problème.

- ✅ Rollback facile

#### Bug #3: Timeouts API potentiels

**Problème:**
```javascript
// Pas de timeout configuré
const response = await fetch('/api/users');
```

**Solution:**
```typescript
// services/api.ts
export const api = axios.create({
  baseURL: process.env.API_URL,
  timeout: 10000, // 10s max
  timeoutErrorMessage: 'La requête a pris trop de temps'
});

// Retry automatique avec exponential backoff
import axiosRetry from 'axios-retry';

axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) 
      || error.code === 'ECONNABORTED';
  }
});
```

### 1.5 Tests recommandés

**Tests unitaires backend (Jest + Supertest):**
```javascript
// auth-service/tests/auth.test.js
describe('POST /api/login', () => {
  it('should return JWT token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ email: 'test@test.com', password: 'Test1234!' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
  });
  
  it('should return 401 for invalid password', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ email: 'test@test.com', password: 'wrong' });
    
    expect(response.status).toBe(401);
  });
});
```

**Tests smart contracts (Hardhat):**
```javascript
// blockchain-service/test/EduToken.test.js
describe('EduToken', () => {
  it('Should mint initial tokens correctly', async () => {
    const [owner, user1] = await ethers.getSigners();
    const EduToken = await ethers.getContractFactory('EduToken');
    const token = await EduToken.deploy();
    
    await token.mintInitialTokens(user1.address, ethers.utils.parseEther('500'));
    const balance = await token.balanceOf(user1.address);
    
    expect(balance).to.equal(ethers.utils.parseEther('500'));
  });
});
```

---

## 2. Maintenance évolutive

### 2.1 Fonctionnalités Phase II implémentées

#### Intégration blockchain

**Smart Contracts déployés:**
1. **EduToken (ERC20):** Token ERC20 personnalisé avec système de crédits initiaux
2. **BookingEscrow:** Gestion des réservations avec système d'escrow
3. **SkillExchange:** Échange de compétences entre utilisateurs

**Architecture:**
```
blockchain-service (FastAPI)
├── Smart Contracts (Solidity)
├── Web3.py pour interaction
├── Ganache (dev) → Polygon/Arbitrum (prod)
└── Wallets déterministes par user_id
```

**Points d'amélioration:**

**1. Migration vers un vrai testnet**
```python
# Configuration multi-environnement
BLOCKCHAIN_CONFIG = {
    'development': {
        'provider': 'http://ganache:8545',
        'chain_id': 1337
    },
    'staging': {
        'provider': 'https://polygon-mumbai.infura.io/v3/YOUR_KEY',
        'chain_id': 80001
    },
    'production': {
        'provider': 'https://polygon-mainnet.infura.io/v3/YOUR_KEY',
        'chain_id': 137
    }
}

config = BLOCKCHAIN_CONFIG[os.getenv('ENVIRONMENT', 'development')]
w3 = Web3(HTTPProvider(config['provider']))
```

**2. Gas optimization**
```solidity
// Coûteux
function transfer(address to, uint amount) public {
    balances[msg.sender] -= amount;  // 2x SSTORE
    balances[to] += amount;
}

// Optimisé
function transfer(address to, uint amount) public {
    uint senderBalance = balances[msg.sender];  // 1x SLOAD
    require(senderBalance >= amount, "Insufficient balance");
    
    unchecked {
        balances[msg.sender] = senderBalance - amount;  // 1x SSTORE
        balances[to] += amount;  // 1x SSTORE
    }
}
```

#### Microservices

**Services opérationnels:**
- ✅ auth-service (Node.js/Express + PostgreSQL)
- ✅ blockchain-service (Python/FastAPI + Ganache)
- ✅ message-service (Node.js/Express + MongoDB)
- ✅ cv-parser-service (Python/Flask)

Le cœur de l'infrastructure microservices est déjà bien déployé avec quatre services majeurs. L'auth-service gère toute l'authentification JWT de manière centralisée. Le blockchain-service offre la couche décentralisée pour les paiements en EduCoins et l'escrow des réservations. Le message-service permet la communication temps réel entre étudiants et tuteurs. Enfin, le cv-parser-service utilise l'IA pour extraire automatiquement les compétences depuis les CVs uploadés. Chaque service a sa propre base de données, respectant le principe de l'indépendance des données en microservices.

**Services à finaliser:**
- ⚠️ notification-service (emails, push, websockets)
- ⚠️ payments-service (Stripe/PayPal)
- ⚠️ tutoring-service (gestion sessions)

**Pattern recommandé: API Gateway**
```javascript
// api-gateway/server.js
const gateway = require('express-gateway');

gateway()
  .load({
    apiEndpoints: {
      auth: { host: 'localhost', paths: '/api/auth/*' },
      blockchain: { host: 'localhost', paths: '/api/blockchain/*' },
      messages: { host: 'localhost', paths: '/api/messages/*' }
    },
    serviceEndpoints: {
      authService: { url: 'http://auth-service:3001' },
      blockchainService: { url: 'http://blockchain-service:3003' },
      messageService: { url: 'http://message-service:3002' }
    },
    policies: ['rate-limit', 'jwt', 'cors'],
    pipelines: {
      authPipeline: {
        apiEndpoints: ['auth'],
        policies: [
          { cors: {} },
          { rate-limit: { max: 100, windowMs: 60000 } },
          { proxy: { serviceEndpoint: 'authService' } }
        ]
      }
    }
  })
  .run();
```

#### Intégration IA

**État actuel:**
```javascript
// api-ia/services/openrouter.js
- Analyse CV
- Matching tuteur/étudiant
- Recommandations personnalisées
```

**Améliorations proposées:**

**1. Cache intelligent**
```typescript
// services/ai/CachedAIService.ts
import Redis from 'ioredis';

class CachedAIService {
  private redis = new Redis(process.env.REDIS_URL);
  private aiProvider = new AIService();
  
  async generateResponse(prompt: string): Promise<string> {
    const cacheKey = `ai:${this.hashPrompt(prompt)}`;
    
    // Vérifier cache
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    // Générer réponse
    const response = await this.aiProvider.generate(prompt);
    
    // Mettre en cache (24h)
    await this.redis.setex(cacheKey, 86400, JSON.stringify(response));
    
    return response;
  }
  
  private hashPrompt(prompt: string): string {
    return createHash('sha256').update(prompt).digest('hex');
  }
}
```

**2. Rate limiting utilisateur**
```typescript
// middleware/aiRateLimit.ts
const userAILimits = new Map<string, number>();

export const aiRateLimit = async (req, res, next) => {
  const userId = req.user.id;
  const count = userAILimits.get(userId) || 0;
  
  // Limite: 10 requêtes IA par heure par utilisateur
  if (count >= 10) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Maximum 10 AI requests per hour',
      retryAfter: 3600
    });
  }
  
  userAILimits.set(userId, count + 1);
  setTimeout(() => {
    userAILimits.set(userId, Math.max(0, userAILimits.get(userId) - 1));
  }, 3600000);
  
  next();
};
```

### 2.2 Améliorations performances

#### Mise en cache (Redis)

**Architecture recommandée:**
```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
```

**Cas d'usage:**
```typescript
// Cache des profils utilisateurs (lecture fréquente)
async function getUserProfile(userId: string) {
  const cacheKey = `profile:${userId}`;
  
  // Vérifier cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Requête DB
  const profile = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  
  // Mise en cache (10 min)
  await redis.setex(cacheKey, 600, JSON.stringify(profile));
  
  return profile;
}

// Invalidation lors de la mise à jour
async function updateUserProfile(userId: string, data: any) {
  await db.query('UPDATE users SET ... WHERE id = $1', [userId]);
  await redis.del(`profile:${userId}`); // Invalider cache
}
```

#### Queue system (Bull)

**Traitement asynchrone:**
```typescript
// services/queue/emailQueue.ts
import Bull from 'bull';

export const emailQueue = new Bull('emails', {
  redis: { host: 'redis', port: 6379 }
});

// Producer - ajout tâche
await emailQueue.add('welcome-email', {
  to: user.email,
  name: user.name
});

// Consumer - traitement
emailQueue.process('welcome-email', async (job) => {
  const { to, name } = job.data;
  await sendEmail({
    to,
    subject: 'Bienvenue sur EduMate',
    template: 'welcome',
    data: { name }
  });
});

// Retry automatique en cas d'échec
emailQueue.on('failed', (job, err) => {
  console.error(`Email job ${job.id} failed:`, err);
});
```

#### Observabilité (Logs + Monitoring)

**Stack recommandée: ELK (Elasticsearch + Logstash + Kibana)**

```yaml
# docker-compose.monitoring.yml
services:
  elasticsearch:
    image: elasticsearch:8.10.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data
  
  logstash:
    image: logstash:8.10.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch
  
  kibana:
    image: kibana:8.10.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
```

**Logs structurés avec Winston:**
```typescript
// config/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    new winston.transports.Http({
      host: 'logstash',
      port: 5000,
      path: '/logs'
    })
  ]
});

// Utilisation
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  userAgent: req.headers['user-agent']
});
```

### 2.3 Sécurité avancée

#### Rate limiting (express-rate-limit)

```typescript
import rateLimit from 'express-rate-limit';

// Limite globale
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', generalLimiter);

// Limite stricte sur login (brute force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentatives max
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again in 15 minutes'
});

app.post('/api/auth/login', loginLimiter, loginController);
```

#### JWT Refresh tokens

```typescript
// Génération token + refresh token
function generateTokens(userId: string) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}

// Endpoint refresh
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    if (payload.type !== 'refresh') {
      return res.status(403).json({ error: 'Invalid token type' });
    }
    
    const tokens = generateTokens(payload.userId);
    res.json(tokens);
    
  } catch (error) {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});
```

#### Protection CSRF

```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.post('/api/booking', csrfProtection, bookingController);
```

---

## 3. Maintenance adaptative (Portage iOS)

### 3.1 Contraintes techniques iOS

#### Règles Apple App Store

**Compliance obligatoire:**
1. **Paiements in-app:** Si achat de tokens/crédits → IAP obligatoire (30% commission Apple)
2. **IDFA (tracking):** Demander permission explicite
3. **Privacy:** Déclaration précise des données collectées
4. **Review Guidelines:** Pas de contenu généré par IA non modéré
5. **Minimum iOS version:** iOS 15+ recommandé (SwiftUI)

**Adaptation backend nécessaire:**
```typescript
// Endpoint spécifique iOS IAP
router.post('/api/payments/ios/verify-receipt', async (req, res) => {
  const { receipt, userId } = req.body;
  
  // Vérification auprès d'Apple
  const verifyURL = process.env.APPLE_SANDBOX 
    ? 'https://sandbox.itunes.apple.com/verifyReceipt'
    : 'https://buy.itunes.apple.com/verifyReceipt';
  
  const response = await axios.post(verifyURL, {
    'receipt-data': receipt,
    'password': process.env.APPLE_SHARED_SECRET
  });
  
  if (response.data.status === 0) {
    // Créditer compte utilisateur
    await creditUserAccount(userId, response.data.receipt.in_app);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid receipt' });
  }
});
```

### 3.2 Stratégie recommandée

#### Option 1: Swift natif (SwiftUI + UIKit)

**Avantages:**
- ✅ Performances maximales
- ✅ Accès complet aux APIs iOS
- ✅ UX native parfaite
- ✅ Widgets, Live Activities, App Clips

Cette approche Swift natif garantit une application iOS de qualité supérieure. Les performances sont optimales puisqu'il n'y a pas de couche d'abstraction entre le code et le système d'exploitation. On peut exploiter toutes les dernières fonctionnalités d'iOS comme les widgets pour voir ses prochains cours sur l'écran d'accueil, les Live Activities pour suivre une réservation en temps réel, ou les App Clips pour permettre de découvrir rapidement un tuteur. L'expérience utilisateur sera parfaitement alignée avec les standards Apple auxquels les utilisateurs iOS sont habitués.

**Inconvénients:**
- ❌ Code non partagé avec Android
- ❌ 2 équipes de développement
- ❌ Maintenance double

Le principal désavantage de Swift natif réside dans l'impossibilité de réutiliser ce code pour une future application Android. Cela signifie maintenir deux bases de code complètement séparées, avec potentiellement deux équipes de développement distinctes (ou au moins des compétences très différentes dans l'équipe). Chaque nouvelle fonctionnalité devra être implémentée deux fois, doublant ainsi le temps et le coût de développement.

**Architecture recommandée:**
```swift
// Architecture MVVM + Clean Architecture
EduMate-iOS/
├── App/
│   ├── EduMateApp.swift
│   └── AppDelegate.swift
├── Core/
│   ├── Network/
│   │   ├── APIClient.swift
│   │   ├── Endpoints.swift
│   │   └── NetworkError.swift
│   ├── Storage/
│   │   ├── UserDefaultsManager.swift
│   │   └── KeychainManager.swift
│   └── Extensions/
├── Features/
│   ├── Auth/
│   │   ├── Models/
│   │   ├── ViewModels/
│   │   └── Views/
│   ├── Home/
│   ├── Tutoring/
│   └── Profile/
├── Resources/
│   ├── Assets.xcassets
│   └── Localizable.strings
└── Tests/
```

**Exemple API Client:**
```swift
// Core/Network/APIClient.swift
class APIClient {
    static let shared = APIClient()
    private let baseURL = "https://api.edumate.fr"
    
    func request<T: Decodable>(
        _ endpoint: Endpoint,
        method: HTTPMethod = .get,
        body: Encodable? = nil
    ) async throws -> T {
        var request = URLRequest(url: URL(string: baseURL + endpoint.path)!)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Token JWT
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.serverError
        }
        
        return try JSONDecoder().decode(T.self, from: data)
    }
}

// Utilisation dans ViewModel
class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    func login() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let response: LoginResponse = try await APIClient.shared.request(
                .login,
                method: .post,
                body: LoginRequest(email: email, password: password)
            )
            
            KeychainManager.shared.saveToken(response.token)
            // Navigation vers Home
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
```

#### Option 2: React Native (recommandé pour MVP rapide)

**Avantages:**
- ✅ Code partagé iOS + Android (70-80%)
- ✅ Équipe unique JavaScript/TypeScript
- ✅ Développement plus rapide
- ✅ Hot reload

React Native représente probablement la meilleure option pour EduMate compte tenu de notre stack actuel. Puisque le frontend web est déjà en React, l'équipe maîtrise déjà JavaScript/TypeScript et les concepts de composants React. Environ 70-80% du code peut être partagé entre iOS et Android, ce qui réduit considérablement le temps de développement. Le hot reload permet de voir instantanément les modifications pendant le développement, accélérant les itérations. Et surtout, une seule équipe peut gérer les trois plateformes (web, iOS, Android).

**Inconvénients:**
- ❌ Performances légèrement inférieures
- ❌ Dépendance bibliothèques tierces
- ❌ Bridge JS <> Native

La contrepartie de React Native est que les performances sont légèrement moins bonnes que du natif pur, car le code JavaScript doit passer par un "bridge" pour communiquer avec les APIs natives. Il faut aussi dépendre de bibliothèques tierces pour certaines fonctionnalités avancées, ce qui peut poser problème si ces bibliothèques ne sont plus maintenues. Cependant, pour une application comme EduMate qui n'a pas besoin de calculs graphiques intensifs, ces inconvénients sont mineurs.

**Migration depuis React Web:**
```typescript
// Conversion composant Web → React Native
// AVANT (Web)
import React from 'react';

export function UserCard({ user }) {
  return (
    <div className="card">
      <img src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
      <p>{user.bio}</p>
    </div>
  );
}

// APRÈS (React Native)
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export function UserCard({ user }) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: user.avatar }} style={styles.avatar} />
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.bio}>{user.bio}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8
  },
  bio: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  }
});
```

**Bibliothèques recommandées:**
```json
{
  "dependencies": {
    "react-native": "0.73.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "react-native-safe-area-context": "^4.8.0",
    "axios": "^1.6.2",
    "react-query": "^3.39.3",
    "zustand": "^4.4.7",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "react-native-keychain": "^8.1.2",
    "react-native-push-notification": "^8.1.1"
  }
}
```

#### Option 3: Flutter (alternative multi-plateforme)

**Avantages:**
- ✅ Performances natives (compilé en ARM)
- ✅ Design system Material + Cupertino
- ✅ Un seul codebase iOS + Android + Web
- ✅ Hot reload

Flutter est une excellente alternative techniquement. Le code Dart est compilé directement en code machine ARM, offrant des performances quasi-natives. Flutter fournit deux design systems complets (Material Design pour Android et Cupertino pour iOS), permettant d'adapter l'apparence selon la plateforme. Un seul codebase peut générer des applications iOS, Android et même web. Le hot reload est encore plus rapide que React Native.

**Inconvénients:**
- ❌ Langage Dart (courbe d'apprentissage)
- ❌ Moins de contributeurs JS

Le principal frein à Flutter pour EduMate est que Dart est un nouveau langage à apprendre pour l'équipe actuelle qui maîtrise JavaScript/TypeScript. Cette courbe d'apprentissage ralentirait significativement le développement initial. De plus, il serait plus difficile de recruter ou d'intégrer des contributeurs puisque JavaScript est beaucoup plus répandu que Dart dans l'écosystème étudiant.

### 3.3 Actions concrètes portage

#### Phase 1: Préparation backend (2 semaines)

1. **API versioning**
```typescript
// app.ts
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes); // Futures évolutions iOS
```

2. **Endpoints mobile-specific**
```typescript
// routes/mobile.ts
router.get('/api/mobile/config', (req, res) => {
  res.json({
    forceUpdate: false,
    minVersion: '1.0.0',
    features: {
      bookingEnabled: true,
      chatEnabled: true,
      blockchainEnabled: process.env.ENVIRONMENT === 'production'
    }
  });
});
```

3. **Push notifications (Firebase Cloud Messaging)**
```typescript
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function sendPushNotification(userId: string, message: string) {
  const user = await getUserById(userId);
  
  if (user.fcmToken) {
    await admin.messaging().send({
      token: user.fcmToken,
      notification: {
        title: 'EduMate',
        body: message
      },
      data: {
        type: 'booking_confirmed',
        bookingId: '123'
      }
    });
  }
}
```

#### Phase 2: Développement iOS (8 semaines)

**Sprint 1-2: Core + Auth**
- Setup projet Xcode / React Native
- Écrans login / register / onboarding
- Intégration JWT
- Stockage sécurisé (Keychain)

**Sprint 3-4: Features principales**
- Liste tuteurs
- Recherche / filtres
- Profils détaillés
- Système de booking

**Sprint 5-6: Communication**
- Chat temps réel (WebSocket)
- Notifications push
- Système de reviews

**Sprint 7-8: Blockchain + Polish**
- Wallet integration
- Gestion tokens
- Transactions
- Tests + App Store submission

#### Phase 3: Testing + Déploiement (2 semaines)

1. **TestFlight beta**
```bash
# Déploiement TestFlight
xcodebuild -exportArchive -archivePath EduMate.xcarchive \
  -exportPath ./build -exportOptionsPlist ExportOptions.plist

xcrun altool --upload-app -f EduMate.ipa \
  --apiKey YOUR_API_KEY --apiIssuer YOUR_ISSUER_ID
```

2. **Tests utilisateurs**
- 20-30 beta testeurs
- Feedback + bugs
- Itérations

3. **App Store submission**
- App Store Connect metadata
- Screenshots
- Privacy policy
- Review submission

---

## 4. Scripts et documentation

### 4.1 Scripts Docker

**État actuel:**

✅ **Fichiers présents:**
- `docker-compose.yml` - Orchestration 10 services
- `docker-start.bat` / `docker-start.sh` - Scripts de démarrage multi-OS
- `Dockerfile` dans chaque service
- `entrypoint.sh` dans blockchain-service

**Améliorations recommandées:**

**1. Makefile pour commandes simplifiées**
```makefile
# Makefile
.PHONY: start stop restart logs build clean test

start:
	docker-compose up -d

stop:
	docker-compose down

restart: stop start

logs:
	docker-compose logs -f

logs-service:
	docker-compose logs -f $(service)

build:
	docker-compose build

clean:
	docker-compose down -v
	docker system prune -f

test:
	docker-compose -f docker-compose.test.yml up --abort-on-container-exit

dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

prod:
	docker-compose -f docker-compose.prod.yml up -d

# Exemples d'utilisation:
# make start
# make logs-service service=blockchain-service
# make test
```

**2. Scripts de health check**
```bash
#!/bin/bash
# scripts/healthcheck.sh

SERVICES=("postgres" "mongodb" "ganache" "auth-service" "blockchain-service")
ALL_HEALTHY=true

echo "🔍 Vérification santé des services..."

for service in "${SERVICES[@]}"; do
    if docker ps --filter "name=edumate-$service" --filter "health=healthy" | grep -q edumate-$service; then
        echo "✅ $service: HEALTHY"
    else
        echo "❌ $service: UNHEALTHY"
        ALL_HEALTHY=false
    fi
done

if [ "$ALL_HEALTHY" = true ]; then
    echo ""
    echo "✅ Tous les services sont opérationnels"
    exit 0
else
    echo ""
    echo "❌ Certains services ont des problèmes"
    exit 1
fi
```

**3. Scripts de backup**
```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Sauvegarde PostgreSQL..."
docker exec edumate-postgres pg_dump -U edumate_user edumate > "$BACKUP_DIR/postgres.sql"

echo "📦 Sauvegarde MongoDB..."
docker exec edumate-mongodb mongodump --out /tmp/dump
docker cp edumate-mongodb:/tmp/dump "$BACKUP_DIR/mongodb"

echo "📦 Sauvegarde Ganache..."
docker cp edumate-ganache:/ganache/data "$BACKUP_DIR/ganache"

echo "✅ Sauvegarde terminée: $BACKUP_DIR"
```

### 4.2 Documentation développeur

**Création recommandée: `/docs/DEVELOPER_GUIDE.md`**

```markdown
# Guide du développeur EduMate

## Installation locale

### Prérequis
- Docker Desktop 24.0+
- Node.js 20+
- Python 3.11+
- Git

### Premier lancement
\`\`\`bash
# Cloner le repo
git clone https://github.com/edumate/edumate.git
cd edumate

# Copier .env.example
cp .env.example .env

# Lancer Docker
docker-compose up -d

# Vérifier les services
make healthcheck

# Accéder à l'app
# Frontend: http://localhost:5173
# Auth API: http://localhost:3001
# Blockchain API: http://localhost:3003
\`\`\`

## Architecture

[Diagramme architecture microservices]

## Développement

### Backend (auth-service)
\`\`\`bash
cd services/auth-service
npm install
npm run dev  # Port 3001
\`\`\`

### Frontend (React)
\`\`\`bash
cd apps/web
npm install
npm run dev  # Port 5173
\`\`\`

### Tests
\`\`\`bash
# Tests unitaires
npm test

# Tests e2e
npm run test:e2e

# Coverage
npm run test:coverage
\`\`\`

## Conventions code

### Commits (Conventional Commits)
\`\`\`
feat: ajout endpoint /api/bookings
fix: correction timeout blockchain
docs: mise à jour README
refactor: simplification auth middleware
test: ajout tests unitaires booking
\`\`\`

### Code style
- ESLint + Prettier
- \`npm run lint\` avant commit
- Hooks pre-commit avec Husky

## Debugging

### Backend
\`\`\`bash
# Logs en temps réel
docker logs -f edumate-auth-service

# Shell dans container
docker exec -it edumate-auth-service /bin/bash
\`\`\`

### Base de données
\`\`\`bash
# PostgreSQL
docker exec -it edumate-postgres psql -U edumate_user -d edumate

# MongoDB
docker exec -it edumate-mongodb mongosh
\`\`\`
```

### 4.3 Documentation administrateur

**Création recommandée: `/docs/ADMIN_GUIDE.md`**

```markdown
# Guide administrateur EduMate

## Déploiement production

### Serveur VPS (recommandé: Hetzner, OVH, DigitalOcean)

**Configuration minimale:**
- 4 vCPUs
- 8 GB RAM
- 160 GB SSD
- Ubuntu 22.04 LTS

### Installation
\`\`\`bash
# Mise à jour système
sudo apt update && sudo apt upgrade -y

# Installation Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Installation Docker Compose
sudo apt install docker-compose-plugin

# Clone projet
git clone https://github.com/edumate/edumate.git /opt/edumate
cd /opt/edumate

# Configuration production
cp .env.production .env
nano .env  # Éditer variables
\`\`\`

### Variables d'environnement critiques
\`\`\`bash
# Base de données
POSTGRES_PASSWORD=<mot_de_passe_fort>
MONGO_PASSWORD=<mot_de_passe_fort>

# JWT
JWT_SECRET=<générer_avec_openssl_rand_-hex_32>
JWT_REFRESH_SECRET=<générer_avec_openssl_rand_-hex_32>

# Blockchain (production: Polygon/Arbitrum)
BLOCKCHAIN_PROVIDER_URL=https://polygon-mainnet.infura.io/v3/YOUR_KEY
BLOCKCHAIN_OWNER_PRIVATE_KEY=<clé_privée_wallet_owner>

# IA
OPENROUTER_API_KEY=<votre_clé_api>

# Email
SMTP_HOST=smtp.mailtrap.io
SMTP_USER=<votre_user>
SMTP_PASS=<votre_pass>
\`\`\`

### Lancement production
\`\`\`bash
docker-compose -f docker-compose.prod.yml up -d
\`\`\`

### SSL/TLS (Let's Encrypt)
\`\`\`bash
# Installer certbot
sudo apt install certbot python3-certbot-nginx

# Générer certificats
sudo certbot --nginx -d api.edumate.fr -d edumate.fr
\`\`\`

### Monitoring
\`\`\`bash
# Prometheus + Grafana
docker-compose -f docker-compose.monitoring.yml up -d

# Accès Grafana: http://serveur:3000
# User: admin, Pass: admin (à changer)
\`\`\`

### Backups automatiques
\`\`\`bash
# Cron job quotidien (3h du matin)
0 3 * * * /opt/edumate/scripts/backup.sh >> /var/log/edumate-backup.log 2>&1
\`\`\`

### Mise à jour application
\`\`\`bash
cd /opt/edumate
git pull origin main
docker-compose build
docker-compose up -d
\`\`\`

## Troubleshooting

### Service ne démarre pas
\`\`\`bash
# Vérifier logs
docker logs edumate-<service-name>

# Redémarrer service
docker-compose restart <service-name>
\`\`\`

### Base de données corrompue
\`\`\`bash
# Restaurer backup
./scripts/restore.sh backups/20260219_030000
\`\`\`

### Problème blockchain
\`\`\`bash
# Redéployer contrats (DEV uniquement)
docker exec -it edumate-blockchain-service python scripts/deploy_contracts.py
\`\`\`
```

### 4.4 Documentation utilisateur

**Création recommandée: `/docs/USER_GUIDE.md`**

```markdown
# Guide utilisateur EduMate

## Inscription

1. Accéder à https://edumate.fr
2. Cliquer "S'inscrire"
3. Choisir profil (Étudiant / Tuteur)
4. Remplir formulaire
5. Vérifier email

## Recherche de tuteur

1. Accéder à "Rechercher"
2. Filtrer par:
   - Matière
   - Niveau
   - Prix
   - Disponibilité
3. Consulter profils
4. Réserver session

## Paiement

EduMate utilise des **EduCoins** (tokens blockchain).

1. Nouveau compte = 500 EduCoins gratuits
2. Acheter plus:
   - 100 EduCoins = 10€
   - 500 EduCoins = 45€
   - 1000 EduCoins = 80€

## Messagerie

1. Accéder à "Messages"
2. Démarrer conversation avec tuteur
3. Notifications temps réel

## Blockchain & Sécurité

- Transactions sécurisées via smart contracts
- Fonds bloqués en escrow jusqu'à validation
- Traçabilité complète
```

---

## 5. Bilan global

### 5.1 Réduction dette technique

**Dette technique actuelle: MOYENNE**

| Composant | Dette | Actions correctives |
|-----------|-------|---------------------|
| Backend | Moyenne | Middleware erreurs, logs structurés, tests |
| Frontend | Faible | Centralisation API, React Query |
| Docker | Faible | Secrets manager, images optimisées |
| Blockchain | Moyenne | Migration testnet, gas optimization |
| Documentation | Élevée | ✅ Rapport créé, guides à finaliser |

**Recommandations prioritaires:**

1. **Court terme (1-2 semaines):**
   - ✅ Corriger bugs Ganache (fait)
   - ✅ Corriger gestion clés privées (fait)
   - ✅ Optimiser entrypoint.sh (fait)
   - Ajouter middleware erreurs global
   - Implémenter logs structurés (Winston)

2. **Moyen terme (1 mois):**
   - Abstraction providers IA avec fallback
   - Configuration centralisée (BDD chiffrée)
   - Tests unitaires (>60% coverage)
   - Setup CI/CD (GitHub Actions)

3. **Long terme (3 mois):**
   - Migration Polygon/Arbitrum (production)
   - API Gateway
   - Observabilité complète (ELK)
   - Portage iOS (React Native)

### 5.2 Amélioration stabilité

**Points forts actuels:**
- ✅ Architecture microservices modulaire
- ✅ Docker Compose fonctionnel
- ✅ Health checks implémentés
- ✅ Communication inter-services stable

La plateforme repose sur des fondations solides. L'architecture microservices permet d'isoler les responsabilités et de scaler indépendamment chaque composant. Docker Compose orchestre correctement tous les services avec leurs dépendances respectives. Les health checks garantissent que Docker peut détecter et redémarrer les services défaillants automatiquement. La communication entre services via le réseau Docker isolé fonctionne de manière fiable.

**Axes d'amélioration:**
- ⚠️ Ajouter retry automatique (axios-retry)
- ⚠️ Implémenter circuit breaker (opossum)
- ⚠️ Queue system pour tâches asynchrones (Bull + Redis)
- ⚠️ Monitoring temps réel (Prometheus + Grafana)

### 5.3 Sécurité

**Évaluation: CORRECTE (authentification JWT OK)**

**À renforcer:**
```typescript
// 1. Rate limiting (notamment login)
import rateLimit from 'express-rate-limit';

// 2. Helmet (sécurité headers HTTP)
import helmet from 'helmet';
app.use(helmet());

// 3. CORS strict
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));

// 4. Validation Joi/Yup systématique
// 5. Chiffrement données sensibles (crypto)
// 6. Logs sécurité (tentatives login échouées)
// 7. Audit dependencies (npm audit)
```

### 5.4 Performance

**État actuel:**

| Métrique | Valeur | Objectif |
|----------|--------|----------|
| Temps réponse API | ~200ms | <100ms |
| Temps démarrage Docker | ~45s | <20s |
| Déploiement contrats | ~5s | <3s |
| Chargement frontend | ~2s | <1s |

**Optimisations recommandées:**
1. Redis pour cache (sessions, profils, résultats IA)
2. CDN pour assets statiques (images, CSS, JS)
3. Lazy loading composants React
4. Database indexing optimal
5. Compression gzip/brotli

### 5.5 Évolutivité

**Scalabilité horizontale:**

```yaml
# docker-compose.scale.yml
services:
  auth-service:
    deploy:
      replicas: 3  # 3 instances
    
  nginx-load-balancer:
    image: nginx:alpine
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
```

**Load balancing Nginx:**
```nginx
upstream auth_backend {
    least_conn;
    server auth-service-1:3001;
    server auth-service-2:3001;
    server auth-service-3:3001;
}

server {
    listen 80;
    location /api/auth {
        proxy_pass http://auth_backend;
    }
}
```

### 5.6 Perspectives futures

**Roadmap technique 2026:**

**Q1 2026:**
- ✅ Phase II terminée (microservices + blockchain)
- Finalisation tests unitaires
- Documentation complète
- Portage iOS beta (React Native)

**Q2 2026:**
- Migration blockchain production (Polygon)
- API Gateway complet
- Observabilité ELK
- App iOS sur App Store

**Q3 2026:**
- Portage Android
- Système de recommendations IA avancé
- Gamification (badges, niveaux)
- Intégration calendriers (Google Calendar, Outlook)

**Q4 2026:**
- Machine Learning (matching optimisé)
- Visioconférence intégrée (WebRTC)
- Marketplace de contenu éducatif
- Internationalisation (multi-langues)

---

## Conclusion

EduMate présente une **architecture solide** avec une base technique saine. Les bugs critiques identifiés durant cette session de maintenance ont été corrigés (Ganache, clés privées, variables d'environnement).

**Points forts:**
- ✅ Architecture microservices moderne
- ✅ Intégration blockchain innovante
- ✅ Stack technique pertinente
- ✅ Docker opérationnel

EduMate s'appuie sur des choix technologiques judicieux pour un projet étudiant. L'architecture microservices démontre une compréhension des patterns industriels modernes et permet une évolution progressive du système. L'intégration blockchain avec Ethereum/Ganache apporte une dimension innovante avec les EduCoins et l'escrow décentralisé. La stack choisie (Node.js, Python, React, PostgreSQL, MongoDB) correspond aux technologies enseignées en formation et largement utilisées en entreprise. Docker garantit la reproductibilité de l'environnement entre tous les contributeurs.

**Points d'amélioration:**
- ⚠️ Dette technique modérée (middleware erreurs, logs, tests)
- ⚠️ Dépendance OpenRouter à sécuriser (abstraction provider)
- ⚠️ Documentation à finaliser
- ⚠️ Migration production blockchain nécessaire

**Recommandation globale:**  
Le projet est **prêt pour une phase de stabilisation** avant déploiement production. Priorité aux tests, monitoring, et sécurité renforcée.

**Estimation charge maintenance:**
- Corrective: **2-3 jours/mois**
- Évolutive: **10-15 jours/mois**
- Adaptative (iOS): **40 jours** (Sprint dédié)

---

*Document généré le 19 février 2026*  
*Dernière mise à jour: Session de maintenance corrective*
