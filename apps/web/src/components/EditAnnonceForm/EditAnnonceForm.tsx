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
    "Marketing", "Management et gestion des entreprises", "Mathématiques", "Mécanique", "Médecine", "Musique",
    "Philosophie", "Physique", "Portugais", "Programmation",
    "Psychologie", "Russe", "SES", "SVT", "Sciences de l'ingénieur",
    "Sciences politiques", "Sociologie", "Statistiques", "Sport",
    "Théâtre", "Électronique", "Génie civil", "Génie électrique",
    "Génie mécanique", "Biochimie", "Géologie", "Astronomie",
    "Écologie", "Bureautique", "Rédaction", "Préparation aux concours",
    "Aide aux devoirs", "Méthodologie", "Orientation scolaire",
    "Soutien scolaire", "Néerlandais", "Coréen"
  ].sort();

  // Liste des niveaux disponibles
  const availableLevels = [
    "Tous niveaux",
    "Primaire",
    "Collège", 
    "Lycée",
    "Master",
    "Doctorat"
  ];

  const [formData, setFormData] = useState({
    title: annonce.title,
    description: annonce.description,
    subject: annonce.subject,
    subjects: annonce.subjects || [],
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
  const [newSubject, setNewSubject] = useState('');
  const [editingSubjectIndex, setEditingSubjectIndex] = useState<number | null>(null);
  const [editingSubjectValue, setEditingSubjectValue] = useState('');
  const [isActive, setIsActive] = useState(annonce.isActive);
  const [lastDeletedSubject, setLastDeletedSubject] = useState<{ index: number; value: string } | null>(null);

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
      const newStatus = !isActive;
      const response = await annonceService.toggleAnnonce(annonce.id, newStatus);
      if (response.success) {
        setIsActive(newStatus);
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

  const handleAddSubject = () => {
    const trimmedSubject = newSubject.trim();
    if (trimmedSubject && !formData.subjects.includes(trimmedSubject)) {
      setFormData(prev => ({
        ...prev,
        subjects: [...prev.subjects, trimmedSubject]
      }));
      setNewSubject('');
    }
  };

  const handleRemoveSubject = (index: number) => {
    setLastDeletedSubject({ index, value: formData.subjects[index] });
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }));
  };

  const handleUndoRemoveSubject = () => {
    if (lastDeletedSubject) {
      setFormData(prev => {
        const newSubjects = [...prev.subjects];
        newSubjects.splice(lastDeletedSubject.index, 0, lastDeletedSubject.value);
        return {
          ...prev,
          subjects: newSubjects
        };
      });
      setLastDeletedSubject(null);
    }
  };

  const handleEditSubject = (index: number) => {
    setEditingSubjectIndex(index);
    setEditingSubjectValue(formData.subjects[index]);
  };

  const handleSaveEditSubject = (index: number) => {
    const trimmedValue = editingSubjectValue.trim();
    if (trimmedValue && !formData.subjects.some((s, i) => i !== index && s === trimmedValue)) {
      setFormData(prev => {
        const newSubjects = [...prev.subjects];
        newSubjects[index] = trimmedValue;
        return {
          ...prev,
          subjects: newSubjects
        };
      });
    }
    setEditingSubjectIndex(null);
    setEditingSubjectValue('');
  };

  const handleCancelEditSubject = () => {
    setEditingSubjectIndex(null);
    setEditingSubjectValue('');
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

          <div className={styles.formGroup}>
            <label>Compétences enseignées</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {formData.subjects.map((skill: string, index: number) => (
                <div
                  key={index}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: editingSubjectIndex === index ? '#fff3e0' : '#e8f5e9',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '14px',
                    border: editingSubjectIndex === index ? '2px solid #ff9800' : 'none'
                  }}
                >
                  {editingSubjectIndex === index ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={editingSubjectValue}
                        onChange={(e) => setEditingSubjectValue(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEditSubject(index);
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #ff9800',
                          fontSize: '14px',
                          width: '150px'
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditSubject(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          color: '#4caf50'
                        }}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditSubject}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          color: '#f44336'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        onClick={() => handleEditSubject(index)}
                        style={{
                          cursor: 'pointer',
                          flex: 1
                        }}
                      >
                        {skill}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          color: '#f44336',
                          padding: '0',
                          marginLeft: '4px'
                        }}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubject();
                  }
                }}
                placeholder="Ajouter une compétence..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
              <button
                type="button"
                onClick={handleAddSubject}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Ajouter
              </button>
              {lastDeletedSubject && (
                <button
                  type="button"
                  onClick={handleUndoRemoveSubject}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2196f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                  title={`Annuler la suppression de "${lastDeletedSubject.value}"`}
                >
                  ↶ Annuler suppression
                </button>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
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
              <span className={`${styles.statusBadge} ${isActive ? styles.active : styles.inactive}`}>
                {isActive ? '🟢 Active' : '🔴 Inactive'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleStatus}
              className={styles.toggleStatusButton}
              disabled={isLoading}
            >
              {isActive ? 'Désactiver l\'annonce' : 'Activer l\'annonce'}
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
                {isActive ? 'Désactiver l\'annonce' : 'Activer l\'annonce'}
              </h3>
            </div>
            <div className={styles.confirmationContent}>
              <p>
                {isActive 
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