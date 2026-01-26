// components/DeleteAnnonceModal/DeleteAnnonceModal.tsx
import React from 'react';
import styles from './DeleteAnnonceModal.module.css';

interface DeleteAnnonceModalProps {
  annonceTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const DeleteAnnonceModal: React.FC<DeleteAnnonceModalProps> = ({
  annonceTitle,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Supprimer l'annonce</h3>
          <button 
            className={styles.closeButton}
            onClick={onCancel}
            type="button"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <p>
            Êtes-vous sûr de vouloir supprimer l'annonce <strong>"{annonceTitle}"</strong> ?
          </p>
          <p className={styles.warningText}>
            Cette action est irréversible. Toutes les données de cette annonce seront définitivement perdues.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            onClick={onCancel}
            className={styles.cancelButton}
            disabled={isLoading}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={styles.confirmButton}
            disabled={isLoading}
          >
            {isLoading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAnnonceModal;