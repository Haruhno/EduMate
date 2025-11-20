// components/EditAnnonceForm/EditAnnonceForm.tsx
import React, { useState } from 'react';
import styles from './EditAnnonceForm.module.css';
import annonceService from '../../services/annonceService';
import type { AnnonceFromDB, CreateAnnonceData } from '../../services/annonceService';

interface EditAnnonceFormProps {
  annonce: AnnonceFromDB;
  onCancel: () => void;
  onUpdate: (updatedAnnonce: AnnonceFromDB) => void;
  onToggleStatus?: (annonceId: string, isActive: boolean) => void;
}

const EditAnnonceForm: React.FC<EditAnnonceFormProps> = ({ 
  annonce, 
  onCancel, 
  onUpdate,
  onToggleStatus 
}) => {
  // Liste des matières disponibles
  const availableSubjects = [
    "Allemand", "Anglais", "Arabe", "Archéologie", "Architecture",
    "Arts", "Arts plastiques", "Biologie", "Chimie", "Chinois", "Commerce International",
    "Communication", "Comptabilité", "Culture générale", "Dessin",
    "Droit", "Économie", "Éducation civique", "Électrotechnique",
    "Espagnol", "Finance", "Français", "Géographie", "Gestion",
    "Graphisme", "Histoire", "Histoire-Géographie", "Histoire de l'art",
    "Informatique", "Italien", "Japonais", "Latin", "Littérature",
    "Marketing", "Management et gestion des entreprises", "Mathématiques", "Mécanique", "Médecine", "Méthodologie", "Musique",
    "Philosophie", "Physique", "Portugais", "Programmation",
    "Psychologie", "Russe", "SES", "SVT", "Sciences de l'ingénieur",
    "Sciences politiques", "Sociologie", "Statistiques", "Sport",
    "Théâtre", "Électronique", "Génie civil", "Génie électrique",
    "Génie mécanique", "Biochimie", "Géologie", "Astronomie",
    "Écologie", "Bureautique", "Rédaction", "Préparation aux concours",
    "Aide aux devoirs", "Méthodologie", "Orientation scolaire",
    "Soutien scolaire", "Russe", "Néerlandais", "Coréen"
  ].sort();

  // Liste des niveaux disponibles
  const availableLevels = [
    "Tous niveaux",
    "Primaire",
    "Collège", 
    "Lycée",
    "Supérieur",
    "Prépa"
  ];

  const [formData, setFormData] = useState({
    title: annonce.title,
    description: annonce.description,
    subject: annonce.subject,
    level: annonce.level,
    hourlyRate: annonce.hourlyRate,
    teachingMode: annonce.teachingMode,
    location: annonce.location,
    availability: annonce.availability
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showToggleStatusConfirmation, setShowToggleStatusConfirmation] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'hourlyRate' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirmUpdate = async () => {
    setIsLoading(true);
    setError(null);
    setShowConfirmation(false);

    try {
      const response = await annonceService.updateAnnonce(annonce.id, formData);
      if (response.success) {
        onUpdate(response.data);
      } else {
        setError(response.message || 'Erreur lors de la mise à jour');
      }
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  const handleToggleStatus = () => {
    setShowToggleStatusConfirmation(true);
  };

  const handleConfirmToggleStatus = async () => {
    setIsLoading(true);
    setError(null);
    setShowToggleStatusConfirmation(false);

    try {
      const newStatus = !annonce.isActive;
      // Vous devrez ajouter cette méthode dans votre annonceService
      const response = await annonceService.toggleAnnonce(annonce.id, newStatus);
      if (response.success) {
        onUpdate(response.data);
        if (onToggleStatus) {
          onToggleStatus(annonce.id, newStatus);
        }
      } else {
        setError(response.message || 'Erreur lors de la modification du statut');
      }
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelToggleStatus = () => {
    setShowToggleStatusConfirmation(false);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Modifier l'annonce</h2>
          <button 
            className={styles.closeButton}
            onClick={onCancel}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="title">Titre de l'annonce *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              required
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="subject">Matière *</label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
              >
                <option value="">Sélectionnez une matière</option>
                {availableSubjects.map((subject, index) => (
                  <option key={index} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="level">Niveau *</label>
              <select
                id="level"
                name="level"
                value={formData.level}
                onChange={handleChange}
                required
              >
                <option value="">Sélectionnez un niveau</option>
                {availableLevels.map((level, index) => (
                  <option key={index} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="hourlyRate">Tarif horaire (€) *</label>
              <input
                type="number"
                id="hourlyRate"
                name="hourlyRate"
                value={formData.hourlyRate}
                onChange={handleChange}
                min="0"
                step="0.5"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="teachingMode">Mode d'enseignement *</label>
              <select
                id="teachingMode"
                name="teachingMode"
                value={formData.teachingMode}
                onChange={handleChange}
                required
              >
                <option value="En ligne">En ligne</option>
                <option value="En présentiel">En présentiel</option>
                <option value="Les deux">Les deux</option>
              </select>
            </div>
          </div>

          <div className={styles.statusSection}>
            <div className={styles.statusInfo}>
              <span className={styles.statusLabel}>Statut actuel :</span>
              <span className={`${styles.statusBadge} ${annonce.isActive ? styles.active : styles.inactive}`}>
                {annonce.isActive ? '🟢 Active' : '🔴 Inactive'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleStatus}
              className={styles.toggleStatusButton}
              disabled={isLoading}
            >
              {annonce.isActive ? 'Désactiver l\'annonce' : 'Activer l\'annonce'}
            </button>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de confirmation pour la mise à jour */}
      {showConfirmation && (
        <div className={styles.confirmationOverlay}>
          <div className={styles.confirmationModal}>
            <div className={styles.confirmationHeader}>
              <h3>Confirmer la modification</h3>
            </div>
            <div className={styles.confirmationContent}>
              <p>Êtes-vous sûr de vouloir modifier cette annonce ?</p>
            </div>
            <div className={styles.confirmationActions}>
              <button
                onClick={handleCancelConfirmation}
                className={styles.confirmationCancel}
                disabled={isLoading}
              >
                Non
              </button>
              <button
                onClick={handleConfirmUpdate}
                className={styles.confirmationConfirm}
                disabled={isLoading}
              >
                {isLoading ? 'Mise à jour...' : 'Oui'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation pour le changement de statut */}
      {showToggleStatusConfirmation && (
        <div className={styles.confirmationOverlay}>
          <div className={styles.confirmationModal}>
            <div className={styles.confirmationHeader}>
              <h3>
                {annonce.isActive ? 'Désactiver l\'annonce' : 'Activer l\'annonce'}
              </h3>
            </div>
            <div className={styles.confirmationContent}>
              <p>
                {annonce.isActive 
                  ? 'Êtes-vous sûr de vouloir désactiver cette annonce ? Elle ne sera plus visible par les étudiants.'
                  : 'Êtes-vous sûr de vouloir activer cette annonce ? Elle sera à nouveau visible par les étudiants.'
                }
              </p>
            </div>
            <div className={styles.confirmationActions}>
              <button
                onClick={handleCancelToggleStatus}
                className={styles.confirmationCancel}
                disabled={isLoading}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmToggleStatus}
                className={styles.confirmationConfirm}
                disabled={isLoading}
              >
                {isLoading ? 'Modification...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditAnnonceForm;