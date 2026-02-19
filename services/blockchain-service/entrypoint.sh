#!/bin/bash
set -e

echo "🚀 Blockchain Service - Initialisation..."

# Export des variables d'environnement pour les scripts Python
export WEB3_PROVIDER_URL="${WEB3_PROVIDER_URL:-http://ganache:8545}"
export AUTH_SERVICE_URL="${AUTH_SERVICE_URL:-http://auth-service:3001}"

# Afficher les configs
echo "📝 Configuration:"
echo "   WEB3_PROVIDER_URL: $WEB3_PROVIDER_URL"
echo "   AUTH_SERVICE_URL: $AUTH_SERVICE_URL"

# Attendre que Ganache soit prêt
echo "⏳ Attente de Ganache..."
sleep 5

# Vérifier rapidement que Ganache répond (optimisé avec stop rapide)
echo "🔍 Vérification de la connectivité à Ganache..."
MAX_ATTEMPTS=30
for i in $(seq 1 $MAX_ATTEMPTS); do
    # Utiliser Python directement pour tester la connexion (plus fiable)
    if python3 -c "
import urllib.request, json, sys
try:
    req = urllib.request.Request('http://ganache:8545', 
        data=json.dumps({'jsonrpc':'2.0','method':'web3_clientVersion','params':[],'id':1}).encode(),
        headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=2) as response:
        sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; then
        echo "✅ Ganache répond correctement (tentative $i/$MAX_ATTEMPTS)!"
        break
    fi
    
    # Si on est à la dernière tentative, afficher un warning
    if [ $i -eq $MAX_ATTEMPTS ]; then
        echo "⚠️  Ganache ne répond pas après $MAX_ATTEMPTS tentatives, on continue quand même..."
    else
        echo "   Tentative $i/$MAX_ATTEMPTS..."
        sleep 1
    fi
done

# Déployer les contrats
echo "📦 Déploiement des contrats..."
cd /app
python scripts/deploy_contracts.py

# Démarrer le service blockchain
echo "🚀 Démarrage du service blockchain..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 3003
