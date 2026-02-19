# 🐳 EduMate Docker Setup

## ⚡ Démarrage Rapide (30 secondes)

### ⭐ Méthode Recommandée

**Sur Windows**
```cmd
docker-start.bat
```

**Sur Linux/Mac**
```bash
chmod +x docker-start.sh
./docker-start.sh
```

---

## 🚀 Différentes Façons de Lancer Docker

### 1️⃣ **Via Docker Desktop (GUI) - Méthode Graphique**

#### Windows/Mac

**Étape 1 : Lancer Docker Desktop**
- Cliquer sur l'icône Docker Desktop sur le bureau
- Attendre que le statut passe à "Docker started" (icône verte)

**Étape 2 : Ouvrir Terminal (dans Docker Desktop)**
- Menu Docker Desktop → Open in Terminal
- OU ouvrir PowerShell/Terminal directement

**Étape 3 : Naviguer au projet**
```cmd
cd /path/to/edumate  # ou C:\Users\username\path\to\edumate
```

**Étape 4 : Lancer les services**
```cmd
docker-compose up -d
```

**Étape 5 : Vérifier les services**
- Docker Desktop → Containers
- Vous verrez tous vos 9 services avec statut ✅

**Accéder à l'application**
```
http://localhost:5173
```

---

### 2️⃣ **Via Script Automatisé - Méthode Simple**

#### Windows (Batch Script)
```cmd
cd /path/to/edumate  # Naviguer au dossier du projet
docker-start.bat
```

**Qu'est-ce qui se passe** :
- ✅ Vérifie que Docker est installé
- ✅ Copie `.env.docker.example` → `.env` (si besoin)
- ✅ Build les images
- ✅ Lance tous les services
- ✅ Affiche les URLs et commandes utiles

#### Linux/Mac (Bash Script)
```bash
cd /path/to/edumate  # Naviguer au dossier du projet
chmod +x docker-start.sh
./docker-start.sh
```

---

### 3️⃣ **Via Makefile - Méthode Développeur**

```bash
# Copier la configuration
make setup

# Builder les images
make build

# Lancer les services
make start

# Vérifier le statut
make ps

# Voir les logs
make logs
```

**Commandes pratiques Makefile** :
```bash
make start           # Démarrer tous les services
make stop            # Arrêter tous les services
make restart         # Redémarrer tout
make clean           # Nettoyer (supprimer containers + volumes)
make logs            # Voir les logs
make logs-auth       # Voir logs d'un service spécifique
make logs-blockchain # Voir logs blockchain
make logs-message    # Voir logs message
make logs-web        # Voir logs web app
make rebuild-auth    # Rebuild + restart un service
make ps              # Status de tous les containers
make health          # Test les endpoints /health
```

---

### 4️⃣ **Via Docker Compose Directement - Méthode CLI**

```bash
# Vérifier que Docker est lancé
docker --version
docker-compose --version

# Se placer dans le répertoire du projet
cd /path/to/edumate

# Copier la config
cp .env.docker.example .env

# Lancer en arrière-plan (-d = detached mode)
docker-compose up -d

# Vérifier les services
docker-compose ps

# Ouvrir http://localhost:5173
```

---

### 5️⃣ **Mode Attaché vs Détaché**

#### Mode Détaché (-d) ✅ Recommandé Pour Dev
```bash
docker-compose up -d
# Les services tournent en arrière-plan
# Vous avez votre terminal libre
# Vous pouvez continuer à développer
```

#### Mode Attaché (sans -d) 📍 Pour Déboguer
```bash
docker-compose up
# Vous voyez tous les logs en temps réel
# Ctrl+C arrête tous les services
# Utile pour déboguer les démarrages
```

---

### 6️⃣ **Rebuild + Redémarrer (Après Modification Code)**

```bash
# Rebuild un service spécifique et relancer
docker-compose up -d --build auth-service

# Rebuild tous les services
docker-compose build --no-cache
docker-compose up -d

# Ou via Makefile
make rebuild-auth
make rebuild-all
```

---

### 7️⃣ **Arrêter et Nettoyer**

```bash
# Arrêter les services (conserve les données)
docker-compose down

# Arrêter + supprimer tous les volumes (réinitialise DBs)
docker-compose down -v

# Supprimer les images aussi
docker-compose down -v --rmi all
```

---

### 8️⃣ **Mode Développement avec Hot Reload**

Les services redémarrent automatiquement à chaque modification de code grâce aux volumes montés.

```bash
# Lancer les services
docker-compose up -d

# Avoir les logs en continu
docker-compose logs -f auth-service

# Modifier votre code dans src/
# Les services vont redémarrer automatiquement
# Rafraîchir le navigateur pour voir les changements
```

---

### 9️⃣ **Via Terminal VS Code**

1. Ouvrir VS Code dans le projet
2. Ouvrir un terminal (Ctrl+`)
3. Même commandes que ci-dessus :
   ```bash
   docker-compose up -d
   docker-compose ps
   docker-compose logs -f
   ```

---

### 🔟 **Accès à la Base de Données**

#### PostgreSQL
```bash
# Via CLI
docker exec -it edumate-postgres psql -U edumate_user -d edumate

# Avec DBeaver (GUI)
- Host: localhost
- Port: 5432
- User: edumate_user
- Password: (dans .env → DB_PASSWORD)
- Database: edumate
```

#### MongoDB
```bash
# Via CLI
docker exec -it edumate-mongodb mongosh

# Avec MongoDB Compass (GUI)
# URL: mongodb://root:edumate@localhost:27017
```

---

## 📊 Comparaison des Méthodes

| Méthode | Facilité | Visibilité | Shell Libre | Idéale Pour |
|---------|----------|-----------|-------------|------------|
| Docker Desktop | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Débutants, UI lovers |
| docker-start.bat | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Windows users |
| docker-start.sh | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Linux/Mac users |
| Makefile | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Développeurs |
| Docker Compose CLI | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Power users |
| Terminal Attaché | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | Déboguer |

---

## ✅ Prérequis

- **Docker Desktop** : https://www.docker.com/products/docker-desktop (v4.0+)
- **Docker Compose** : Inclus avec Docker Desktop
- **RAM disponible** : ~4GB minimum
- **Disque libre** : ~5GB (pour les images et volumes)

## 📋 Vérifier l'Installation

```bash
docker --version     # Docker version 20.10+
docker-compose --version  # Docker Compose 2.0+
```

## 🚀 Démarrage Complet

### Étape 1 : Copier la configuration

```bash
cp .env.docker.example .env
```

### Étape 2 : Démarrer les services

```bash
docker-compose up -d
```

### Étape 3 : Vérifier l'état

```bash
docker-compose ps
```

**Résultat attendu** :
```
NAME                        STATUS
edumate-postgres            Up 30s (healthy)
edumate-mongodb             Up 25s (healthy)
edumate-qdrant              Up 20s (healthy)
edumate-ganache             Up 15s (healthy)
edumate-auth-service        Up 10s (healthy)
edumate-blockchain-service  Up 8s (healthy)
edumate-message-service     Up 6s (healthy)
edumate-cv-parser-service   Up 4s (healthy)
edumate-web-app             Up 2s (healthy)
```

## 🌐 Accès aux Services

| Service | URL | Port |
|---------|-----|------|
| **Web App** | http://localhost:5173 | 5173 |
| **Auth API** | http://localhost:3001 | 3001 |
| **Blockchain API** | http://localhost:3003 | 3003 |
| **Message API** | http://localhost:3002 | 3002 |
| **CV Parser** | http://localhost:5001 | 5001 |
| **Ganache RPC** | http://localhost:8545 | 8545 |
| **Qdrant** | http://localhost:6333 | 6333 |
| **PostgreSQL** | localhost:5432 | 5432 |
| **MongoDB** | localhost:27017 | 27017 |

## 🛠️ Commandes Utiles

```bash
# Voir tous les services
docker-compose ps

# Voir les logs en temps réel
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f auth-service

# Arrêter tous les services
docker-compose down

# Redémarrer un service
docker-compose restart auth-service

# Rebuild et redémarrer (si modification du code)
docker-compose up -d --build auth-service

# Supprimer tout (volumes + containers)
docker-compose down -v
```

## 📊 Monitoring

### Voir la consommation de ressources
```bash
docker stats
```

### Health check des services
```bash
# Chaque service a un endpoint /health
curl http://localhost:3001/health
curl http://localhost:3003/health
curl http://localhost:3002/health
curl http://localhost:5001/health
```

## 🔧 Configuration Avancée

### Changer les ports

Éditer `.env` :
```env
WEB_APP_PORT=5174              # Changer port web app
AUTH_SERVICE_PORT=3011         # Changer port auth
BLOCKCHAIN_SERVICE_PORT=3013   # Changer port blockchain
# ... etc
```

Redémarrer les services :
```bash
docker-compose down
docker-compose up -d
```

### Ajouter des variables d'environnement

Éditer `.env` et ajouter votre config :
```env
MISTRAL_API_KEY=votre-cle-ici
OPENROUTER_API_KEY=votre-cle-ici
JWT_SECRET=votre-secret-ici
```

Redémarrer le service affecté :
```bash
docker-compose restart auth-service
```

## 🐛 Dépannage

### "docker: command not found"
→ Docker n'est pas installé. Télécharger : https://www.docker.com/products/docker-desktop

### "Port 5173 is already in use"
→ Changer dans `.env` : `WEB_APP_PORT=5174`

### "connection refused" aux services
→ Vérifier que tous les services sont "healthy" :
```bash
docker-compose ps
docker-compose logs
```

### Un service ne démarre pas
```bash
# Voir l'erreur détaillée
docker-compose logs blockchain-service

# Redémarrer le service
docker-compose restart blockchain-service
```

### Réinitialiser complètement
```bash
# Arrêter + supprimer tout
docker-compose down -v

# Rebuild tout
docker-compose build --no-cache

# Redémarrer
docker-compose up -d
```

## 📚 Documentation Complète

Ce document couvre tout ce dont vous avez besoin. Pour les détails techniques avancés, consultez les commentaires dans `docker-compose.yml`.

---

## 📦 INVENTAIRE COMPLET DES FICHIERS CRÉÉS

### Dockerfiles (5)
- ✓ `apps/web/Dockerfile` - React + Nginx (multi-stage)
- ✓ `services/auth-service/Dockerfile` - Node.js/Express (multi-stage)
- ✓ `services/blockchain-service/Dockerfile` - Python/FastAPI (multi-stage)
- ✓ `services/message-service/Dockerfile` - Node.js/Express (multi-stage)
- ✓ `services/cv-parser-service/Dockerfile` - Python/Flask (multi-stage)

### Infrastructure
- ✓ `docker-compose.yml` - Orchestration centralisée (9 services)
- ✓ `apps/web/nginx.conf` - Configuration reverse proxy
- ✓ `apps/web/.dockerignore` - Optimisations build
- ✓ `services/auth-service/.dockerignore`
- ✓ `services/blockchain-service/.dockerignore`
- ✓ `services/message-service/.dockerignore`
- ✓ `services/cv-parser-service/.dockerignore`
- ✓ `.env.docker.example` - Template variables
- ✓ `.gitignore` (updated)

### Scripts Automatisés
- ✓ `docker-start.sh` - Unix/Mac startup
- ✓ `docker-start.bat` - Windows startup
- ✓ `Makefile` - 50+ commandes

### Database
- ✓ `services/auth-service/scripts/init.sql` - PostgreSQL schema

---

## 🎯 ARCHITECTURE COMPLÈTE

```
┌─────────────────────────────────────────────────────────────┐
│                  EduMate Docker Compose                      │
│          Network: edumate-network (172.25.0.0/16)           │
└─────────────────────────────────────────────────────────────┘

FRONTEND (1)
  └─ web-app (nginx:alpine)
     :5173 → React SPA + Reverse Proxy

BACKENDS (4)
  ├─ auth-service (node:20-alpine)
  │  :3001 → Express, PostgreSQL, JWT
  │
  ├─ blockchain-service (python:3.11-slim)
  │  :3003 → FastAPI, Web3, Ganache
  │
  ├─ message-service (node:20-alpine)
  │  :3002 → Express, Socket.io, MongoDB
  │
  └─ cv-parser-service (python:3.11-slim)
     :5001 → Flask, Mistral AI

DATABASES (4)
  ├─ postgres:16-alpine (:5432)
  │  → PostgreSQL avec init.sql
  │  → Volume: postgres_data
  │
  ├─ mongodb:7-alpine (:27017)
  │  → Vol: mongodb_data, mongodb_config
  │
  ├─ qdrant (:6333)
  │  → Vector database
  │  → Volume: qdrant_data
  │
  └─ ganache (:8545)
     → Blockchain testnet
     → Volume: ganache_data
```

---

## 📋 TOUS LES SERVICES & URLS

| Service | URL | Port | Base | Type |
|---------|-----|------|------|------|
| Web App | http://localhost:5173 | 5173 | nginx:alpine | Frontend |
| Auth API | http://localhost:3001 | 3001 | node:20-alpine | REST |
| Blockchain | http://localhost:3003 | 3003 | python:3.11-slim | FastAPI |
| Message | http://localhost:3002 | 3002 | node:20-alpine | WebSocket |
| CV Parser | http://localhost:5001 | 5001 | python:3.11-slim | Flask |
| PostgreSQL | localhost | 5432 | postgres:16-alpine | DB |
| MongoDB | localhost | 27017 | mongo:7-alpine | NoSQL |
| Qdrant | http://localhost:6333 | 6333 | qdrant/qdrant | Vector DB |
| Ganache | http://localhost:8545 | 8545 | trufflesuite/ganache | Blockchain |

---

## ⚡ COMMANDES LES PLUS COURANTES

### Avec Makefile (Recommandé)
```bash
make start           # Lancer tous les services
make stop            # Arrêter tous les services
make ps              # Voir le statut
make logs            # Logs en temps réel
make logs-auth       # Logs d'un service spécifique
make rebuild-auth    # Rebuild + redémarrer
make health          # Test endpoints /health
make clean           # Stop + supprimer tout
```

### Avec Docker Compose
```bash
docker-compose up -d              # Démarrer
docker-compose down               # Arrêter
docker-compose ps                 # Status
docker-compose logs -f            # Logs
docker-compose restart auth       # Redémarrer un service
docker-compose up -d --build auth # Rebuild spécifique
docker-compose down -v            # Stop + supprimer volumes
```

### Accès Shells
```bash
docker exec -it edumate-postgres psql -U edumate_user -d edumate
docker exec -it edumate-mongodb mongosh
docker exec -it edumate-auth-service sh
docker stats
```

---

## 🔧 CONFIGURATION AVANCÉE

### Modifier les Ports
```env
# Dans .env
WEB_APP_PORT=5174
AUTH_SERVICE_PORT=3011
BLOCKCHAIN_SERVICE_PORT=3013
MESSAGE_SERVICE_PORT=3012
CV_PARSER_SERVICE_PORT=5011
```

### Variables d'Environnement
```env
# Authentification
JWT_SECRET=votre-secret-secure-ici
JWT_EXPIRE=7d

# Base de données
POSTGRES_USER=edumate_user
POSTGRES_PASSWORD=edumate_password
MONGO_USER=edumate_user
MONGO_PASSWORD=edumate_password

# APIs Externes
MISTRAL_API_KEY=votre-clé-ici
OPENROUTER_API_KEY=votre-clé-ici
LINKEDIN_ACCESS_TOKEN=votre-token-ici

# Blockchain
PRIVATE_KEY=votre-private-key-ici
MNEMONIC=votre-mnemonic-ici
```

Redémarrer après modification :
```bash
docker-compose down
docker-compose up -d
```

---

## 🐛 DÉPANNAGE AVANCÉ

### Port Already in Use
```bash
# Windows
netstat -ano | findstr 5173
taskkill /PID xxxx /F

# Mac/Linux
lsof -i :5173
kill -9 <PID>
```

### Service Ne Démarre Pas
```bash
# Voir l'erreur
docker-compose logs blockchain-service

# Rebuild du zéro
docker-compose build --no-cache blockchain-service
docker-compose up -d blockchain-service
```

### Réinitialiser Complètement
```bash
# DESTRUCTIF - Supprime tout
docker-compose down -v
docker system prune -a

# Rebuild tout
docker-compose build --no-cache
docker-compose up -d
```

### Connection Refused
```bash
# Vérifier that all are healthy
docker-compose ps

# Check specific service
docker-compose logs auth-service

# Wait for startup
docker-compose up auth-service  # Mode attaché pour voir startup
```

---

## 📊 COMPARAISON MÉTHODES DÉMARRAGE

| Méthode | Facilité | Autonome | Recommandé |
|---------|----------|----------|-----------|
| docker-start.bat | ⭐⭐⭐⭐⭐ | Oui | Windows ✅ |
| docker-start.sh | ⭐⭐⭐⭐⭐ | Oui | Linux/Mac ✅ |
| make start | ⭐⭐⭐⭐ | Oui | Dev ⚡ |
| Docker Desktop UI | ⭐⭐⭐⭐⭐ | Oui | Débutants 👶 |
| docker-compose up -d | ⭐⭐⭐ | Oui | Power users |
| docker-compose up | ⭐⭐⭐ | Non | Déboguer 🐛 |

---

## 📈 PERFORMANCE & RESSOURCES

### Memory per Service
```
PostgreSQL         : ~200 MB
MongoDB            : ~150 MB
Qdrant             : ~300 MB
Ganache            : ~400 MB
auth-service       : ~80 MB
blockchain-service : ~150 MB
message-service    : ~70 MB
cv-parser-service  : ~120 MB
web-app (nginx)    : ~20 MB
─────────────────────────
TOTAL              : ~1.5 GB
```

### Startup Times
```
First Run (all images):    60-90 seconds
Normal Startup:            20-30 seconds
After Code Change:         5-15 seconds (hot reload)
```

### Disk Space
```
All Images:   ~1.2 GB
Volumes:      ~3.8 GB (grows with data)
Total:        ~5 GB recommended
```

---

## 🎓 WORKFLOW DÉVELOPPEMENT

```bash
# 1. Démarrer les services
docker-start.bat   # ou make start

# 2. Ouvrir l'app
http://localhost:5173

# 3. Modifier votre code (dans /services ou /apps)
# Les volumes montés rechargeront le code automatiquement

# 4. Voir les logs si erreur
make logs-auth     # ou docker-compose logs -f auth-service

# 5. Arrêter quand fini
docker-compose down

# 6. Nettoyer si besoin
docker-compose down -v
```

---

## 📞 SUPPORT & AIDE

### Où Chercher
1. Ce document (DOCKER_README.md) - Première ressource
2. `docker-compose.yml` - Commentaires intégrés
3. `.env.docker.example` - Variables expliquées
4. `Makefile` - Commandes commentées

### Common Issues
```
❌ "Cannot connect to Docker daemon"
→ Vérifier Docker Desktop est lancé

❌ "Port already in use"
→ docker-compose down || Changer ports dans .env

❌ "Image not found"
→ docker-compose build

❌ "Out of memory"  
→ Augmenter Docker Desktop memory settings

❌ "Slow first start"
→ Normal, images se téléchargent. Patience!
```

## 🎯 Architecture

```
┌─────────────────────────────────────────┐
│      Docker Compose Network             │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────────────────────────┐   │
│  │   Frontend (React + Nginx)     │   │
│  │   :5173                        │   │
│  └────────────────────────────────┘   │
│           ↓                            │
│  ┌────────────────────────────────┐   │
│  │   Backend Services             │   │
│  │   - Auth (3001, Express)       │   │
│  │   - Blockchain (3003, FastAPI) │   │
│  │   - Message (3002, Express)    │   │
│  │   - CV Parser (5001, Flask)    │   │
│  └────────────────────────────────┘   │
│           ↓                            │
│  ┌────────────────────────────────┐   │
│  │   Databases & Infrastructure   │   │
│  │   - PostgreSQL (5432)          │   │
│  │   - MongoDB (27017)            │   │
│  │   - Qdrant (6333)              │   │
│  │   - Ganache (8545)             │   │
│  └────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

## ✨ Ensuite

Une fois les services démarrés :
1. Ouvrir http://localhost:5173
2. Créer un compte
3. Explorer l'application

## 💡 Tips & Tricks

### Voir les infos d'un container
```bash
docker inspect edumate-auth-service
```

### Exécuter une commande dans un container
```bash
docker exec -it edumate-postgres psql -U edumate_user -d edumate
```

### Voir les variables d'environnement
```bash
docker exec edumate-auth-service env
```

### Backup de la base PostgreSQL
```bash
docker exec edumate-postgres pg_dump -U edumate_user edumate > backup.sql
```

## 📞 Support

Ce document contient toute la documentation Docker. Pour les questions générales du projet, consultez [README.md](README.md).

---

**Bon développement! 🚀**
