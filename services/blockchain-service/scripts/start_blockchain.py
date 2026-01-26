#!/usr/bin/env python3
"""
Script principal pour démarrer l'écosystème blockchain
"""

import sys
import time
import signal
import atexit
import logging
from pathlib import Path
import importlib
import subprocess

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Ajouter le chemin pour les imports locaux
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from ganache_setup import GanacheManager
except ImportError:
    logger.error("Module ganache_setup introuvable")
    sys.exit(1)

def check_python_dependencies():
    """Vérifie et installe les dépendances Python nécessaires."""
    logger.info("Vérification des dépendances Python...")

    # Liste des dépendances
    dependencies = [
        "web3",
        "fastapi",
        "uvicorn[standard]",
        "python-dotenv",
        "pydantic",
        "pydantic-settings",
        "aiofiles",
        "python-jose[cryptography]",
        "passlib[bcrypt]",
        "cryptography",
        "redis",
        "celery",
        "py-solc-x"
    ]

    missing = []

    for dep in dependencies:
        package_name = dep.split("[")[0]  # Extrait le nom sans extras
        try:
            importlib.import_module(package_name)
            logger.info(f"   OK - {dep} déjà installé")
        except ImportError:
            missing.append(dep)

    if missing:
        logger.warning(f"   Dépendances manquantes: {', '.join(missing)}")
        logger.info("   Installation avec pip...")

        try:
            subprocess.run([
                sys.executable, "-m", "pip", "install",
                "--quiet", "--disable-pip-version-check"
            ] + missing, check=True)
            logger.info("   Dépendances installées")
        except subprocess.CalledProcessError as e:
            logger.error(f"   Échec installation: {e}")
            return False

    return True

def start_fastapi_service():
    """Démarrer le service FastAPI en appelant directement main()"""
    logger.info("Démarrage du service blockchain...")

    try:
        # Importer directement la fonction main() de app.main
        from app.main import main
        logger.info("Appel direct de la fonction main()...")
        
        # Appel direct : cela bloquera le thread principal (normal)
        main()
        
        # Si on arrive ici, le service est en cours d'exécution
        return True

    except ImportError as e:
        logger.error(f"Impossible d'importer app.main: {e}")
        return None
    except Exception as e:
        logger.error(f"Erreur démarrage service: {e}")
        import traceback
        traceback.print_exc()
        return None


class BlockchainSystem:
    """Système complet blockchain"""
    
    def __init__(self):
        self.ganache = GanacheManager()
        self.running = False
        
    def cleanup(self):
        """Nettoyage propre"""
        logger.info("Nettoyage en cours...")

        # Ganache reste le seul vrai process externe
        self.ganache.stop()
        self.running = False
        logger.info("Nettoyage terminé")
    
    def signal_handler(self, sig, frame):
        """Gérer les signaux d'arrêt"""
        logger.info(f"\nSignal {sig} reçu, arrêt en cours...")
        self.cleanup()
        sys.exit(0)
    
    def setup_signal_handlers(self):
        """Configurer les gestionnaires de signaux"""
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        atexit.register(self.cleanup)
    
    def deploy_contracts(self):
        """Déployer les contrats intelligents"""
        logger.info("Déploiement des contrats...")

        try:
            # Ajouter le chemin du script au sys.path pour l'import
            script_dir = Path(__file__).parent
            sys.path.insert(0, str(script_dir))
            
            from deploy_contracts import main as deploy_main
        except ImportError as e:
            logger.error(f"Impossible d'importer deploy_contracts.py: {e}")
            logger.error(f"Chemin cherché: {Path(__file__).parent / 'deploy_contracts.py'}")
            return False

        try:
            # Exécuter la fonction main directement
            logger.info("Démarrage du déploiement...")
            addresses = deploy_main()  # <-- ici tu exécutes directement
            if addresses:
                logger.info("Déploiement des contrats terminé avec succès")
                return True
            else:
                logger.error("Échec du déploiement des contrats")
                return False
        except Exception as e:
            logger.error(f"Erreur lors du déploiement: {e}")
            import traceback
            traceback.print_exc()
            return False

    def run(self):
        """Exécuter le système complet"""
        logger.info("=" * 50)
        logger.info("DÉMARRAGE DU SYSTÈME BLOCKCHAIN EDUCOIN")
        logger.info("=" * 50)
        
        # 1. Configurer les signaux
        self.setup_signal_handlers()
        
        # 2. Vérifier les dépendances
        if not check_python_dependencies():
            logger.error("Dépendances manquantes")
            return False
        
        # 3. Démarrer Ganache
        logger.info("\n1. DÉMARRAGE GANACHE")
        if not self.ganache.start():
            return False
        
        # 4. Déployer les contrats
        logger.info("\n2. DÉPLOIEMENT DES CONTRATS")
        if not self.deploy_contracts():
            self.cleanup()
            return False
        
        # 5. Démarrer le service FastAPI
        logger.info("\n3. DÉMARRAGE SERVICE BLOCKCHAIN")
        start_fastapi_service()  # Appel direct, bloque ici
        
        # 6. Afficher le tableau de bord
        self.display_dashboard()
        
        # 7. Maintenir en vie
        self.running = True
        self.monitor_processes()
        
        return True
    
    def display_dashboard(self):
        """Afficher le tableau de bord"""
        print("\n" + "=" * 60)
        print("TABLEAU DE BORD - SYSTÈME BLOCKCHAIN")
        print("=" * 60)
        print("\nSERVICES ACTIFS:")
        print(f"   - {'OK' if self.ganache.is_running() else 'KO'} Ganache")
        print("     http://127.0.0.1:8545")
        print("   - OK Service Blockchain")
        print("     http://localhost:3003")
        
        print("\nENDPOINTS:")
        print("     API:        http://localhost:3003/api")
        print("     Docs:       http://localhost:3003/docs")
        print("     Redoc:      http://localhost:3003/redoc")
        print("     Health:     http://localhost:3003/health")
        
        print("\nCOMPTES GANACHE (déterministes):")
        print("     1. 0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1")
        print("        PK: 0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d")
        print("     2. 0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0")
        print("        PK: 0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1")
        
        print("\nUTILISATION:")
        print("     - Ctrl+C pour arrêter proprement")
        print("     - Les logs s'affichent ci-dessus")
        print("     - Vérifiez .env.local pour les adresses de contrats")
        print("=" * 60 + "\n")
    
    def monitor_processes(self):
        """Surveiller les processus"""
        try:
            while self.running:
                time.sleep(2)
                
                if not self.ganache.is_running():
                    logger.error("Ganache s'est arrêté")
                    break
                    
        except KeyboardInterrupt:
            logger.info("\nArrêt demandé par l'utilisateur")
        finally:
            self.cleanup()

def main():
    """Point d'entrée principal"""
    system = BlockchainSystem()
    
    try:
        if system.run():
            logger.info("Système blockchain démarré avec succès")
            return 0
        else:
            logger.error("Échec du démarrage du système")
            return 1
    except Exception as e:
        logger.error(f"Erreur inattendue: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())