#!/usr/bin/env python3
"""
Module pour démarrer/stopper Ganache localement
Gère les chemins cross-platform
"""

import subprocess
import time
import signal
import sys
import os
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GanacheManager:
    """Gestionnaire de processus Ganache"""
    
    def __init__(self, host="127.0.0.1", port=8545, data_dir=None):
        self.host = host
        self.port = port
        self.data_dir = data_dir or Path.cwd() / "ganache_data"
        self.process = None
        
    def find_ganache_binary(self):
        """Trouver le binaire Ganache (support multi-plateforme)"""
        project_root = Path(__file__).parent.parent.parent.parent
        node_bin = project_root / "node_modules" / ".bin"

        if sys.platform == "win32":
            ganache_path = node_bin / "ganache.cmd"
        else:
            ganache_path = node_bin / "ganache"

        # Vérifier que le fichier existe
        if ganache_path.exists():
            logger.info(f"Binaire Ganache trouvé: {ganache_path}")
            return str(ganache_path)

        # Sinon chercher dans le PATH global
        for cmd in ["ganache", "ganache-cli"]:
            try:
                subprocess.run([cmd, "--version"], capture_output=True, check=True)
                logger.info(f"Binaire Ganache trouvé globalement: {cmd}")
                return cmd
            except (FileNotFoundError, subprocess.CalledProcessError):
                continue

        logger.error("Ganache non trouvé. Installez-le:")
        logger.error("   npm install --save-dev ganache")
        logger.error("   OU npm install -g ganache")
        return None

    
    def start(self):
        """Démarrer Ganache"""
        ganache_path = self.find_ganache_binary()
        
        if not ganache_path:
            logger.error("ERREUR: Ganache non trouvé. Installez-le:")
            logger.error("   npm install --save-dev ganache")
            logger.error("   OU dans le projet global: npm install -g ganache")
            return False
        
        # Construire la commande SANS persistence (mode dev - comptes frais à chaque démarrage)
        cmd = [
            ganache_path,
            "--server.host", self.host,
            "--server.port", str(self.port),
            "--wallet.totalAccounts", "20",
            "--wallet.defaultBalance", "1000",
            # PAS de --database.dbPath pour éviter la persistence en mode dev
            "--chain.chainId", "1337",
            "--chain.networkId", "1337",
            "--wallet.deterministic",
            "--logging.verbose",
            "--miner.blockTime", "2",
            "--miner.blockGasLimit", "8000000"  # <-- CORRECTION: gas limit augmenté
        ]
        
        logger.info(f"Démarrage de Ganache sur {self.host}:{self.port}")
        logger.debug(f"Commande: {' '.join(cmd)}")
        
        try:
            # CORRECTION: Ne pas capturer stdout/stderr pour éviter le blocage sous Windows
            # Laisser Ganache écrire directement dans la console
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,  # <-- CORRECTION: Ignorer stdout
                stderr=subprocess.DEVNULL,  # <-- CORRECTION: Ignorer stderr
                text=True
            )
            
            # Attendre que Ganache démarre
            for _ in range(30):  # 30 secondes max
                if self.process.poll() is not None:
                    # Processus terminé trop tôt
                    logger.error(f"Ganache s'est arrêté prématurément")
                    return False
                
                # Tester la connexion
                import requests
                try:
                    response = requests.post(
                        f"http://{self.host}:{self.port}",
                        json={"jsonrpc": "2.0", "method": "eth_blockNumber", "id": 1},
                        timeout=1
                    )
                    if response.status_code == 200:
                        logger.info("OK: Ganache démarré avec succès")
                        return True
                except requests.RequestException:
                    pass
                
                time.sleep(1)
            
            logger.error("ERREUR: Timeout - Ganache n'a pas démarré dans les temps")
            return False
            
        except Exception as e:
            logger.error(f"ERREUR: Erreur démarrage Ganache: {e}")
            return False
    
    def stop(self):
        """Arrêter Ganache proprement"""
        if self.process and self.process.poll() is None:
            logger.info("Arrêt de Ganache...")
            self.process.terminate()
            try:
                self.process.wait(timeout=10)
                logger.info("OK: Ganache arrêté")
            except subprocess.TimeoutExpired:
                logger.warning("Timeout, force kill...")
                self.process.kill()
            self.process = None
    
    def is_running(self):
        """Vérifier si Ganache tourne"""
        import requests
        try:
            response = requests.post(
                f"http://{self.host}:{self.port}",
                json={"jsonrpc": "2.0", "method": "eth_blockNumber", "id": 1},
                timeout=2
            )
            return response.status_code == 200
        except:
            return False
    
    def __enter__(self):
        """Context manager entry"""
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.stop()

def main():
    """Fonction principale pour tester Ganache seul"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Gestionnaire Ganache")
    parser.add_argument("action", choices=["start", "stop", "check"])
    args = parser.parse_args()
    
    manager = GanacheManager()
    
    if args.action == "start":
        if manager.start():
            print("OK: Ganache démarré. Appuyez sur Ctrl+C pour arrêter.")
            try:
                # Garder en vie
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                manager.stop()
    elif args.action == "stop":
        manager.stop()
    elif args.action == "check":
        if manager.is_running():
            print("OK: Ganache fonctionne")
        else:
            print("ERREUR: Ganache ne fonctionne pas")
            # Essayer de trouver le binaire
            path = manager.find_ganache_binary()
            if path:
                print(f"Binaire trouvé: {path}")
            else:
                print("Binaire non trouvé")

if __name__ == "__main__":
    main()  