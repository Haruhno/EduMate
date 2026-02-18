# SAE501 – Entrepôt de données et agent IA pour le soutien scolaire ciblé

## Contexte
Plateforme de soutien scolaire pair-a-pair qui met en relation etudiants et tuteurs. Le projet combine un portail web et une appli mobile, des services IA pour la recommandation et la moderation, et une couche data pour l’analyse et l’enrichissement des profils.
La monnaie interne s’appelle **educoins** et sert aux echanges, reservations et transactions.

## Objectifs
- Mettre en relation etudiants et tuteurs via web et mobile.
- Proposer un agent IA pour recommandation, scoring et moderation.
- Gerer les credits **educoins** (gains, depenses, conversion partielle).
- Supporter des parcours collaboratifs (troc de competences, mentorat, sessions collectives).
- Mettre en place un environnement technique complet avec CI/CD et data warehouse.

## Architecture technique (vue d’ensemble)
- **Frontend :** React (web) + React Native ou Flutter (mobile).
- **Backend :** Node.js/TypeScript (API REST/GraphQL).
- **Authentification :** Keycloak / OAuth2 + 2FA.
- **Bases de donnees :**
  - PostgreSQL (utilisateurs, transactions, reservations)
  - MongoDB (contenus, logs IA, messagerie)
  - Data Warehouse (BigQuery / Redshift / Postgres + ETL)
  - Vector Store (Qdrant / Weaviate / Pinecone)
- **IA & ML :** Microservices Python (FastAPI), RAG, scoring de fiabilite.
- **Streaming/Events :** Kafka.
- **Infra :** Kubernetes + CI/CD (GitHub Actions).

## Structure du depot
- /apps/web : application web (Vite + React)
- /apps/mobile : application mobile
- /apps/admin : backoffice
- /services/* : microservices (auth, matching, notifications, paiements, etc.)
- /libs : librairies partagees
- /infra : Kubernetes, Helm, Terraform
- /docs : documentation et livrables

## Fonctionnalites principales
- Recherche filtree de tuteurs (matiere, niveau, disponibilite, prix en credits, langue...)
- Gestion des **educoins** (gains, depenses, conversion)
- Reservations, messagerie securisee, visio integree
- Systeme d’evaluation + badges
- Troc de competences et sessions collectives
- Scrapers pour contenus pedagogiques
- Agent IA de recommandation, scoring, moderation

## Lancer le projet (dev)
Pour tout lancer d’un coup, a la racine du projet :
```bash
npm run dev
```

Les services et frontends se lancent aussi separement. Exemples ci-dessous.

### Web (apps/web)
```bash
cd apps/web
npm install
npm run dev
```

### Admin (apps/admin)
```bash
cd apps/admin
npm install
npm run dev
```

### Mobile (apps/mobile)
```bash
cd apps/mobile
npm install
npm run start
```

### Services (exemple : auth-service)
```bash
cd services/auth-service
npm install
npm run dev
```

## Notes
- Chaque service a son propre README pour les variables d’environnement et prerequis.
- Les scripts infra et data se trouvent dans /infra et /libs.

