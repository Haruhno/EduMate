// AnnoncesPage.tsx (version modifiée)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './AnnoncesPage.module.css';
import annonceService from '../../services/annonceService';
import type { AnnonceFromDB } from '../../services/annonceService';
import EditAnnonceForm from '../../components/EditAnnonceForm/EditAnnonceForm';
import DeleteAnnonceModal from '../../components/DeleteAnnonceModal/DeleteAnnonceModal';

const AnnoncesPage: React.FC = () => {
  const [annonces, setAnnonces] = useState<AnnonceFromDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAnnonce, setEditingAnnonce] = useState<AnnonceFromDB | null>(null);
  const [deletingAnnonce, setDeletingAnnonce] = useState<AnnonceFromDB | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadMyAnnonces();
  }, []);

  const loadMyAnnonces = async () => {
    try {
      setIsLoading(true);
      const response = await annonceService.getMyAnnonces();
      if (response.success) {
        setAnnonces(response.data || []);
      }
    } catch (error) {
      console.error('Erreur chargement annonces:', error);
      setAnnonces([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAnnonce = (annonce: AnnonceFromDB) => {
    setEditingAnnonce(annonce);
  };

  const handleCancelEdit = () => {
    setEditingAnnonce(null);
  };

  const handleUpdateAnnonce = (updatedAnnonce: AnnonceFromDB) => {
    setAnnonces(prev => prev.map(annonce => 
      annonce.id === updatedAnnonce.id ? updatedAnnonce : annonce
    ));
    setEditingAnnonce(null);
  };

  const handleToggleStatus = (annonceId: string, isActive: boolean) => {
    setAnnonces(prev => prev.map(annonce => 
      annonce.id === annonceId ? { ...annonce, isActive } : annonce
    ));
  };

  const handleDeleteAnnonce = (annonce: AnnonceFromDB) => {
    setDeletingAnnonce(annonce);
  };

  const handleCancelDelete = () => {
    setDeletingAnnonce(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAnnonce) return;

    setIsDeleting(true);
    try {
      const response = await annonceService.deleteAnnonce(deletingAnnonce.id);
      if (response.success) {
        setAnnonces(prev => prev.filter(annonce => annonce.id !== deletingAnnonce.id));
        setDeletingAnnonce(null);
      } else {
        console.error('Erreur suppression annonce:', response.message);
      }
    } catch (error) {
      console.error('Erreur suppression annonce:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Chargement de vos annonces...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* En-tête */}
      <div className={styles.header}>
        <h1 className={styles.title}>Mes annonces de cours</h1>
        <p className={styles.subtitle}>
          Gérez vos annonces et suivez leur performance
        </p>
      </div>

      {/* Bouton créer annonce */}
      <div className={styles.createSection}>
        <Link to="/creer-annonce" className={styles.createButton}>
          ＋ Créer une nouvelle annonce
        </Link>
      </div>

      {/* Grille des annonces */}
      <div className={styles.annoncesSection}>
        <h2 className={styles.sectionTitle}>
          {annonces.length} annonce{annonces.length > 1 ? 's' : ''} publiée{annonces.length > 1 ? 's' : ''}
        </h2>

        {annonces.length > 0 ? (
          <div className={styles.annoncesGrid}>
            {annonces.map((annonce) => (
              <div key={annonce.id} className={styles.annonceCard}>
                <div className={styles.annonceHeader}>
                  <h3 className={styles.annonceTitle}>{annonce.title}</h3>
                  <span className={`${styles.statusBadge} ${annonce.isActive ? styles.active : styles.inactive}`}>
                    {annonce.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className={styles.annonceDetails}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Matière:</span>
                    <span className={styles.detailValue}>{annonce.subject}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Niveau:</span>
                    <span className={styles.detailValue}>{annonce.level}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Tarif:</span>
                    <span className={styles.detailValue}>{annonce.hourlyRate}€/h</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Mode:</span>
                    <span className={styles.detailValue}>{annonce.teachingMode}</span>
                  </div>
                </div>

                {annonce.description && (
                  <p className={styles.annonceDescription}>
                    {annonce.description}
                  </p>
                )}

                <div className={styles.annonceActions}>
                  <button
                    onClick={() => handleEditAnnonce(annonce)}
                    className={styles.editButton}
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteAnnonce(annonce)}
                    className={styles.deleteButton}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noAnnonces}>
            <h3>Vous n'avez pas encore créé d'annonce</h3>
            <p>Créez votre première annonce pour commencer à recevoir des demandes de cours</p>
            <Link to="/creer-annonce" className={styles.createAnnonceButton}>
              Créer une annonce
            </Link>
          </div>
        )}
      </div>

      {/* Modal de modification d'annonce */}
      {editingAnnonce && (
        <EditAnnonceForm
          annonce={editingAnnonce}
          onCancel={handleCancelEdit}
          onUpdate={handleUpdateAnnonce}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {/* Modal de suppression d'annonce */}
      {deletingAnnonce && (
        <DeleteAnnonceModal
          annonceTitle={deletingAnnonce.title}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};

export default AnnoncesPage;