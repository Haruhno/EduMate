import React, { useState, useRef, useEffect, useCallback } from 'react';
import annonceService from '../../services/annonceService';
import styles from './TransformSkillToAnnonceModal.module.css';
import { allSkills as allAvailableSkills } from '../../data/skillsData';

interface TransformSkillToAnnonceModalProps {
  skills: string[];
  onClose: () => void;
  onCreated?: () => void;
  profileData?: any;
}

interface AIAnalysis {
  title: string;
  description: string;
  skills: string[];
  domains: string[];
  levels: string[];
  teachingMode: string;
  extractionMetadata: {
    confidence: number;
    explicitlyMentioned: boolean;
    extractedKeywords: string[];
    language: string;
    originalTextLength: number;
    validatedSkillsCount: number;
    rawSkillsCount: number;
  };
}

interface Offer {
  id: string;
  title: string;
  description: string;
  isAIGenerated?: boolean;
  skills?: string[];
}

interface CompetenceAssignment {
  skill: string;
  offerIds: string[];
}

interface SkillWithActionsProps {
  skill: string;
  onAssignToOffer: (skill: string, offerId?: string) => void;
  onRemove: (skill: string) => void;
  offers: Offer[];
  assignedOffers: string[];
  isFromAI?: boolean;
  isManualSkill?: boolean;
  isProfileSkill?: boolean;
}

type QuestionType = 'skills' | 'levels' | 'price' | 'confirmation';

interface Question {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

const niveaux = ['Tous niveaux', 'Primaire', 'Collège', 'Lycée', 'Prépa', 'Licence', 'Master', 'Doctorat'];

const questions: Question[] = [
  {
    id: 'skills',
    question: 'Quelles compétences souhaitez-vous enseigner ?',
    type: 'skills'
  },
  {
    id: 'levels',
    question: 'À quels niveaux souhaitez-vous enseigner ?',
    type: 'levels',
    options: niveaux
  },
  {
    id: 'price',
    question: 'Quel tarif horaire proposez-vous ?',
    type: 'price',
    min: 10,
    max: 100,
    step: 5
  },
  {
    id: 'confirmation',
    question: 'Confirmez la création de votre annonce',
    type: 'confirmation'
  }
];

// Fonction utilitaire pour générer un titre d'offre unique
const generateUniqueOfferTitle = async (baseSkills: string[], existingOffers: Offer[]): Promise<{title: string, description: string}> => {
  try {
    const generatedOffer = await generateOfferFromSkills(baseSkills);
    let title = generatedOffer.title;
    let counter = 1;
    
    // Vérifier si le titre existe déjà
    while (existingOffers.some(offer => offer.title === title)) {
      title = `${generatedOffer.title} (${counter})`;
      counter++;
    }
    
    return {
      title: title,
      description: generatedOffer.description
    };
  } catch (error) {
    // Fallback si l'IA échoue
    const fallbackTitle = baseSkills.length === 1 
      ? `Cours de ${baseSkills[0]}`
      : `Cours de ${baseSkills.join(' et ')}`;
    
    let title = fallbackTitle;
    let counter = 1;
    
    while (existingOffers.some(offer => offer.title === title)) {
      title = `${fallbackTitle} (${counter})`;
      counter++;
    }
    
    return {
      title: title,
      description: `Formation complète en ${baseSkills.join(', ')}. Cours personnalisé avec exercices pratiques et suivi individualisé.`
    };
  }
};

const generateOfferFromSkills = async (skills: string[], rawText?: string): Promise<{title: string, description: string}> => {
  try {
    const combinedSkills = [...new Set(skills)].filter(s => s.trim().length > 0);
    
    if (combinedSkills.length === 0) {
      throw new Error('Aucune compétence fournie');
    }
    
    const token = localStorage.getItem('token');
    
    console.log('📤 Envoi à l\'IA:', combinedSkills);
    
    const response = await fetch('http://localhost:3001/api/annonces/generate-offer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ 
        skills: combinedSkills,
        rawText: rawText || ''
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    
    console.log('📥 Réponse IA:', {
      success: result.success,
      hasDescription: !!result.data?.description,
      descLength: result.data?.description?.length || 0
    });
    
    if (result.success && result.data) {
      if (!result.data.description || result.data.description.trim().length === 0) {
        throw new Error('L\'IA n\'a pas généré de description');
      }
      
      return {
        title: result.data.title || `Formation ${combinedSkills[0]}`,
        description: result.data.description
      };
    } else {
      throw new Error(result.message || 'Échec de l\'IA');
    }
    
  } catch (error) {
    console.error('Échec génération IA:', error);
    
    try {
      console.log('Nouvel essai IA...');
      return await retryWithFallback(skills, rawText);
    } catch (retryError) {
      console.error('Échec du nouvel essai:', retryError);
      
      return {
        title: `Formation ${skills[0] || 'personnalisée'}`,
        description: 'Description en cours de génération... Veuillez réessayer ou contacter le support.'
      };
    }
  }
};

const retryWithFallback = async (skills: string[], rawText?: string): Promise<{title: string, description: string}> => {
  const token = localStorage.getItem('token');
  const combinedSkills = [...new Set(skills)].filter(s => s.trim().length > 0);
  
  const descResponse = await fetch('http://localhost:3001/api/annonces/generate-offer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: JSON.stringify({ 
      skills: combinedSkills,
      rawText: 'GÉNÈRE UNE DESCRIPTION DÉTAILLÉE DE 6-8 PHRASES SEULEMENT'
    })
  });
  
  if (descResponse.ok) {
    const result = await descResponse.json();
    if (result.success && result.data?.description) {
      return {
        title: result.data.title || `Formation ${combinedSkills[0]}`,
        description: result.data.description
      };
    }
  }
  
  const titleResponse = await fetch('http://localhost:3001/api/annonces/generate-title', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: JSON.stringify({ skills: combinedSkills })
  });
  
  if (titleResponse.ok) {
    const result = await titleResponse.json();
    if (result.success && result.data?.title) {
      return {
        title: result.data.title,
        description: `Formation complète en ${combinedSkills.join(', ')}. Cours personnalisé avec exercices pratiques et suivi individualisé. Adapté à tous les niveaux.`
      };
    }
  }
  
  throw new Error('Tous les essais ont échoué');
};


interface ExistingAnnonce {
  id: string;
  title: string;
  description: string;
  subjects: string[];
  level: string;
  hourlyRate: number;
  teachingMode: string;
  isActive: boolean;
  location?: string | null; 
  availability?: string | null; 
}
const SkillWithActions: React.FC<SkillWithActionsProps> = ({
  skill,
  onAssignToOffer,
  onRemove,
  offers,
  assignedOffers,
  isFromAI = false,
  isManualSkill = false,
  isProfileSkill = false
}) => {
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [showSkillExistsModal, setShowSkillExistsModal] = useState(false);
  const [showDeleteConfirmationModal, setShowDeleteConfirmationModal] = useState(false);

  const handleAssignClick = () => {
    const offersWithoutSkill = offers.filter(offer => {
      const offerSkills = offer.skills || [];
      return !offerSkills.includes(skill);
    });
    
    const allOffersHaveSkill = offersWithoutSkill.length === 0 && offers.length > 0;
    
    if (allOffersHaveSkill) {
      setShowSkillExistsModal(true);
    } else if (offersWithoutSkill.length === 0 && offers.length === 0) {
      onAssignToOffer(skill);
    } else {
      setShowOfferModal(true);
    }
  };

  const handleConfirmAssignment = () => {
    if (selectedOfferId === 'new') {
      onAssignToOffer(skill);
    } else if (selectedOfferId) {
      onAssignToOffer(skill, selectedOfferId);
    }
    setShowOfferModal(false);
    setSelectedOfferId('');
  };

  const handleRemoveClick = () => {
    setShowDeleteConfirmationModal(true);
  };

  const handleConfirmDelete = () => {
    onRemove(skill);
    setShowDeleteConfirmationModal(false);
  };

  return (
    <>
      <span className={`${styles.skillTagWithActions} ${isProfileSkill ? styles.profileSkill : ''}`}>
        {skill}
        <button
          type="button"
          onClick={handleAssignClick}
          className={styles.assignButton}
          title="Assigner à une offre"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleRemoveClick}
          className={styles.removeButton}
          title="Supprimer"
        >
          ×
        </button>
      </span>

      {showOfferModal && (
        <div className={styles.offerModalOverlay} onClick={() => setShowOfferModal(false)}>
          <div className={styles.offerModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4>Assigner "{skill}" à quelle offre ?</h4>
              <button className={styles.closeButton} onClick={() => setShowOfferModal(false)}>✕</button>
            </div>
            
            <div className={styles.offerList}>
              {offers
                .filter(offer => {
                  const offerSkills = offer.skills || [];
                  return !offerSkills.includes(skill);
                })
                .filter((offer, index, self) => 
                  index === self.findIndex(o => o.id === offer.id)
                )
                .map(offer => (
                <div
                  key={offer.id}
                  className={`${styles.offerOption} ${selectedOfferId === offer.id ? styles.selected : ''}`}
                  onClick={() => setSelectedOfferId(offer.id)}
                >
                  <input
                    type="radio"
                    id={`offer-${offer.id}`}
                    name="selectedOffer"
                    checked={selectedOfferId === offer.id}
                    onChange={() => setSelectedOfferId(offer.id)}
                  />
                  <label htmlFor={`offer-${offer.id}`}>
                    <div className={styles.offerHeader}>
                      <strong>{offer.title}</strong>
                      {offer.isAIGenerated && <span className={styles.aiLabel}>IA</span>}
                    </div>
                    <span className={styles.offerPreview}>{offer.description.substring(0, 80)}...</span>
                    <div className={styles.offerStats}>
                      <span className={styles.offerSkillCount}>{offer.skills?.length || 0} compétence(s)</span>
                    </div>
                  </label>
                </div>
              ))}
              
              <div
                className={`${styles.offerOption} ${styles.newOfferOption} ${selectedOfferId === 'new' ? styles.selected : ''}`}
                onClick={() => setSelectedOfferId('new')}
              >
                <input
                  type="radio"
                  id="offer-new"
                  name="selectedOffer"
                  checked={selectedOfferId === 'new'}
                  onChange={() => setSelectedOfferId('new')}
                />
                <label htmlFor="offer-new">
                  <strong>+ Créer une nouvelle offre</strong>
                  <span className={styles.offerPreview}>L'IA générera un titre basé sur cette compétence</span>
                </label>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" onClick={() => setShowOfferModal(false)} className={styles.cancelButton}>
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignment}
                disabled={!selectedOfferId}
                className={styles.confirmButton}
              >
                {selectedOfferId === 'new' ? 'Créer offre' : 'Assigner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSkillExistsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSkillExistsModal(false)}>
          <div className={styles.smallModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4>⚠️ Compétence déjà existante</h4>
              <button className={styles.closeButton} onClick={() => setShowSkillExistsModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p>La compétence <strong>"{skill}"</strong> existe déjà dans toutes vos offres actuelles.</p>
              <p>Souhaitez-vous créer une nouvelle offre avec cette compétence ?</p>
            </div>
            <div className={styles.modalActions}>
              <button 
                type="button" 
                onClick={() => {
                  setShowSkillExistsModal(false);
                  onAssignToOffer(skill);
                }} 
                className={styles.confirmButton}
              >
                Créer une nouvelle offre
              </button>
              <button 
                type="button" 
                onClick={() => setShowSkillExistsModal(false)} 
                className={styles.cancelButton}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmationModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirmationModal(false)}>
          <div className={styles.smallModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4>Supprimer la compétence</h4>
              <button className={styles.closeButton} onClick={() => setShowDeleteConfirmationModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p>Êtes-vous sûr de vouloir supprimer la compétence <strong>"{skill}"</strong> ?</p>
              {isProfileSkill && (
                <p className={styles.warningText}>
                  ⚠️ Cette compétence sera supprimée de votre profil.
                </p>
              )}
            </div>
            <div className={styles.modalActions}>
              <button 
                type="button" 
                onClick={handleConfirmDelete} 
                className={styles.deleteConfirmButton}
              >
                Oui, supprimer
              </button>
              <button 
                type="button" 
                onClick={() => setShowDeleteConfirmationModal(false)} 
                className={styles.cancelButton}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const OfferEditModal: React.FC<{
  skill?: string;
  offerToEdit?: Offer;
  onClose: () => void;
  onSave: (offer: Offer) => void;
  aiAnalysis?: AIAnalysis | null;
  currentSkills?: string[];
}> = ({ skill, offerToEdit, onClose, onSave, aiAnalysis, currentSkills = [] }) => {
  const [title, setTitle] = useState(offerToEdit?.title || (skill ? `Cours de ${skill}` : 'Nouvelle offre'));
  const [description, setDescription] = useState(offerToEdit?.description || '');
  const [useAISuggestion, setUseAISuggestion] = useState(!!aiAnalysis?.title && !offerToEdit);
  const [isEditing, setIsEditing] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    if (aiAnalysis?.title && useAISuggestion && !offerToEdit) {
      setTitle(aiAnalysis.title);
      setDescription(aiAnalysis.description || '');
    } else if (!useAISuggestion && !offerToEdit) {
      setTitle(skill ? `Cours de ${skill}` : 'Nouvelle offre');
      setDescription('');
    }
  }, [useAISuggestion, aiAnalysis, skill, offerToEdit]);

  const generateOfferWithAI = async () => {
    if (currentSkills.length === 0 && !skill) return;
    
    setGeneratingAI(true);
    try {
      const skillsToAnalyze = skill ? [skill, ...currentSkills] : currentSkills;
      const generatedOffer = await generateOfferFromSkills(skillsToAnalyze);
      
      setTitle(generatedOffer.title);
      setDescription(generatedOffer.description);
      setUseAISuggestion(true);
    } catch (error) {
      console.error('Erreur génération IA:', error);
      if (skill) {
        setTitle(`Cours de ${skill}`);
        setDescription(`Cours personnalisé de ${skill}${currentSkills.length > 0 ? ` incluant aussi ${currentSkills.join(', ')}` : ''}.`);
      }
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSave = () => {
    const newOffer: Offer = {
      id: offerToEdit?.id || `offer-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      isAIGenerated: useAISuggestion && !offerToEdit,
      skills: skill ? [skill, ...currentSkills] : currentSkills
    };
    onSave(newOffer);
    onClose();
  };

  return (
    <div className={styles.offerEditModalOverlay} onClick={onClose}>
      <div className={styles.offerEditModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{offerToEdit ? 'Modifier l\'offre' : `Créer une nouvelle offre${skill ? ` pour "${skill}"` : ''}`}</h3>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.skillsStep}>
            <div className={styles.inputWrapper}>
              <div className={styles.actionButtons}>
                <button
                  type="button"
                  onClick={generateOfferWithAI}
                  disabled={generatingAI || (currentSkills.length === 0 && !skill)}
                  className={styles.detectButton}
                >
                  {generatingAI ? (
                    <>
                      <div className={styles.loadingSpinnerSmall}></div>
                      Génération IA...
                    </>
                  ) : (
                    'Générer un titre et description avec IA'
                  )}
                </button>
              </div>
              <p className={styles.helpText}>
                L'IA analysera {skill ? `"${skill}"` : 'les compétences'} et créera une offre pertinente
              </p>
            </div>
          </div>

          {aiAnalysis?.title && !offerToEdit && (
            <div className={styles.aiSuggestion}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={useAISuggestion}
                  onChange={(e) => setUseAISuggestion(e.target.checked)}
                  className={styles.checkboxInput}
                  disabled={isEditing}
                />
                <span>Utiliser la suggestion de l'IA</span>
              </label>
              {useAISuggestion && (
                <div className={styles.suggestionPreview}>
                  <strong>Titre suggéré:</strong> {aiAnalysis.title}
                  <br />
                  <strong>Description:</strong> {aiAnalysis.description.substring(0, 120)}...
                  <button 
                    type="button" 
                    className={styles.editSuggestionButton} 
                    onClick={() => setIsEditing(true)}
                  >
                    ✎ Personnaliser
                  </button>
                </div>
              )}
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Titre de l'offre *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (aiAnalysis?.title && e.target.value !== aiAnalysis.title) {
                  setIsEditing(true);
                  setUseAISuggestion(false);
                }
              }}
              placeholder={skill ? `Cours de ${skill}` : 'Titre de l\'offre'}
              className={styles.titleInput}
              disabled={useAISuggestion && !!aiAnalysis?.title && !isEditing}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (aiAnalysis?.description && e.target.value !== aiAnalysis.description) {
                  setIsEditing(true);
                  setUseAISuggestion(false);
                }
              }}
              placeholder={skill ? `Description du cours de ${skill}...` : 'Description de l\'offre...'}
              className={styles.descriptionInput}
              rows={4}
              disabled={useAISuggestion && !!aiAnalysis?.description && !isEditing}
            />
          </div>

          {currentSkills.length > 0 && (
            <div className={styles.currentSkillsPreview}>
              <strong>Compétences dans cette offre:</strong>
              <div className={styles.skillsChips}>
                {skill && <span className={styles.skillChipSmall}>{skill}</span>}
                {currentSkills.map((s, index) => (
                  <span key={index} className={styles.skillChipSmall}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelButton}>Annuler</button>
          <button onClick={handleSave} disabled={!title.trim()} className={styles.confirmButton}>
            {offerToEdit ? 'Mettre à jour' : 'Créer l\'offre'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface OffersSummaryProps {
  offers: Offer[];
  competenceAssignments: CompetenceAssignment[];
  selectedSkills: string[];
  onEditOffer: (offerId: string) => void;
  onRemoveOffer: (offerId: string) => void;
  onCreateOfferFromAll: (skills: string[]) => void;
  onSaveSkillsOnly: () => void;
  onAssignSkillFromOffer: (skill: string, currentOfferId: string) => void; 
  onRemoveSkillFromOffer: (skill: string, offerId: string) => void; 
  onAssignSkillToOffer: (skill: string, offerId?: string) => void;
  onRemoveSkill: (skill: string) => void;
  aiSkills?: string[];
  profileSkills?: string[];
}

const OffersSummary: React.FC<OffersSummaryProps> = ({ 
  offers, 
  competenceAssignments, 
  selectedSkills, 
  onEditOffer, 
  onRemoveOffer, 
  onCreateOfferFromAll, 
  onSaveSkillsOnly,
  onAssignSkillFromOffer,
  onRemoveSkillFromOffer,
  onAssignSkillToOffer,
  onRemoveSkill,
  aiSkills = [],
  profileSkills = []
}) => {
  console.log('OffersSummary - offers:', offers);
  console.log('OffersSummary - competenceAssignments:', competenceAssignments);
  
  const getSkillsByOffer = () => {
    const skillsByOffer: {[offerId: string]: {offer: Offer, skills: string[], isExisting: boolean}} = {};
    
    const seenOfferIds = new Set();
    
    offers.forEach(offer => {
      if (seenOfferIds.has(offer.id)) {
        console.log('⚠️ Offre en double détectée:', offer.id);
        return;
      }
      seenOfferIds.add(offer.id);
      
      const isExisting = offer.id.startsWith('existing-');
      skillsByOffer[offer.id] = { 
        offer, 
        skills: [...new Set(offer.skills || [])],
        isExisting 
      };
    });
    
    competenceAssignments.forEach(assignment => {
      assignment.offerIds.forEach(offerId => {
        if (skillsByOffer[offerId]) {
          const currentSkills = skillsByOffer[offerId].skills;
          if (!currentSkills.includes(assignment.skill)) {
            skillsByOffer[offerId].skills.push(assignment.skill);
          }
        }
      });
    });
    
    const result = Object.entries(skillsByOffer)
      .filter(([_, data]) => data.skills.length > 0)
      .map(([offerId, data]) => ({ 
        ...data, 
        id: offerId 
      }))
      .sort((a, b) => {
        if (a.isExisting && !b.isExisting) return -1;
        if (!a.isExisting && b.isExisting) return 1;
        return 0;
      });
    
    console.log('📋 Offres après traitement:', result.map(o => ({
      id: o.id,
      title: o.offer.title,
      skillCount: o.skills.length,
      isExisting: o.isExisting
    })));
    
    return result;
  };
  
  const offersWithSkills = getSkillsByOffer();
  
  console.log('OffersSummary - offersWithSkills:', offersWithSkills);

  if (offersWithSkills.length === 0) {
    return null;
  }

  return (
    <div className={styles.offersSummary}>
      <h4>Gestion des offres</h4>
      
      <div className={styles.sectionHeader}>
        <h5>Vos annonces existantes</h5>
        <p className={styles.sectionHint}>
          Ces annonces sont déjà publiées. Vous pouvez y ajouter de nouvelles compétences.
        </p>
      </div>
      
      {offersWithSkills.filter((o: {isExisting: boolean}) => o.isExisting).length > 0 ? (
        <div className={`${styles.offersList} ${styles.existingOffers}`}>
          {offersWithSkills
            .filter((offerData: {isExisting: boolean}) => offerData.isExisting)
            .map((offerData: any, index: number) => {
              const getAssignedOffersForSkill = (skill: string): string[] => {
                const assignment = competenceAssignments.find(a => a.skill === skill);
                return assignment ? assignment.offerIds : [];
              };
              
              return (
                <div key={offerData.id} className={`${styles.offerItem} ${styles.existingOffer}`}>
                  <div className={styles.offerHeader}>
                    <div className={styles.offerTitle}>
                      <strong>Annonce existante {index + 1}: {offerData.offer.title}</strong>
                      <span className={styles.existingLabel}>Publiée</span>
                    </div>
                    <div className={styles.offerActions}>
                      <span className={styles.infoText}>
                        <small>Modifiable depuis "Mes annonces"</small>
                      </span>
                    </div>
                  </div>
                  
                  {offerData.offer.description && (
                    <div className={styles.offerDescription}>
                      <p>{offerData.offer.description}</p>
                    </div>
                  )}
                  
                  <div className={styles.offerSkills}>
                    <span className={styles.skillsLabel}>Compétences actuelles:</span>
                    <div className={styles.offerSkillsChips}>
                      {offerData.skills.map((skill: string, skillIndex: number) => (
                        <span key={skillIndex} className={`${styles.skillChip} ${styles.existingSkill}`}>
                          {skill}
                          <span className={styles.originalBadge} title="Compétence d'origine">●</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className={styles.newAssignments}>
                    <span className={styles.skillsLabel}>Compétences ajoutées:</span>
                    <div className={styles.offerSkillsChips}>
                      {competenceAssignments
                        .filter((a: CompetenceAssignment) => a.offerIds.includes(offerData.id))
                        .map((assignment: CompetenceAssignment, index: number) => (
                          <SkillWithActions
                            key={index}
                            skill={assignment.skill}
                            onAssignToOffer={onAssignSkillToOffer}
                            onRemove={onRemoveSkill}
                            offers={offers}
                            assignedOffers={getAssignedOffersForSkill(assignment.skill)}
                            isProfileSkill={profileSkills.includes(assignment.skill)}
                            isFromAI={aiSkills.includes(assignment.skill)}
                            isManualSkill={!aiSkills.includes(assignment.skill)}
                          />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <p className={styles.noExistingOffers}>
          Vous n'avez pas encore d'annonces publiées.
        </p>
      )}
      
      <div className={styles.sectionHeader}>
        <h5>Nouvelles offres à créer</h5>
        <p className={styles.sectionHint}>
          Ces offres seront créées lorsque vous cliquerez sur "Créer l'annonce".
        </p>
      </div>
      
      {offersWithSkills.filter((o: {isExisting: boolean}) => !o.isExisting).length > 0 ? (
        <div className={styles.offersList}>
          {offersWithSkills
            .filter((offerData: {isExisting: boolean}) => !offerData.isExisting)
            .map((offerData: any, index: number) => {
              const getAssignedOffersForSkill = (skill: string): string[] => {
                const assignment = competenceAssignments.find(a => a.skill === skill);
                return assignment ? assignment.offerIds : [];
              };
              
              return (
                <div key={offerData.id} className={styles.offerItem}>
                  <div className={styles.offerHeader}>
                    <div className={styles.offerTitle}>
                      <strong>Nouvelle offre {index + 1}: {offerData.offer.title}</strong>
                      {offerData.offer.isAIGenerated && <span className={styles.aiLabel}>Généré par IA</span>}
                    </div>
                    <div className={styles.offerActions}>
                      <button
                        type="button"
                        className={styles.editOfferSummaryButton}
                        onClick={() => onEditOffer(offerData.id)}
                        title="Modifier cette offre"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className={styles.removeOfferButton}
                        onClick={() => onRemoveOffer(offerData.id)}
                        title="Supprimer cette offre"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  {offerData.offer.description && (
                    <div className={styles.offerDescription}>
                      <p>{offerData.offer.description}</p>
                    </div>
                  )}
                  
                  <div className={styles.offerSkills}>
                    <span className={styles.skillsLabel}>Compétences:</span>
                    {offerData.skills.length > 0 ? (
                      <div className={styles.offerSkillsChips}>
                        {offerData.skills.map((skill: string, skillIndex: number) => (
                          <SkillWithActions
                            key={skillIndex}
                            skill={skill}
                            onAssignToOffer={onAssignSkillToOffer}
                            onRemove={onRemoveSkill}
                            offers={offers}
                            assignedOffers={getAssignedOffersForSkill(skill)}
                            isProfileSkill={profileSkills.includes(skill)}
                            isFromAI={aiSkills.includes(skill)}
                            isManualSkill={!aiSkills.includes(skill)}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className={styles.noSkillsInOffer}>
                        ⚠️ Aucune compétence assignée. Cliquez sur "+" pour en ajouter.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <p className={styles.noNewOffers}>
          Aucune nouvelle offre créée. Cliquez sur "+" à côté d'une compétence pour créer une offre.
        </p>
      )}
      
      <div className={styles.summaryActions}>
        <button
          type="button"
          className={styles.saveSkillsButton}
          onClick={onSaveSkillsOnly}
          disabled={selectedSkills.length === 0}
          title="Enregistrer toutes les compétences sans créer d'offre"
        >
          Enregistrer les compétences dans le profil
        </button>
      </div>
    </div>
  );
};

interface SkillsInputWithAutocompleteProps {
  initialSkills: string[];
  onSkillsChange: (skills: string[]) => void;
  rawText: string;
  onRawTextChange: (text: string) => void;
  onAnalyzeWithAI: () => void;
  isAnalyzing: boolean;
  hasLargeText: boolean;
  offers: Offer[];
  competenceAssignments: CompetenceAssignment[];
  onAssignSkillToOffer: (skill: string, offerId?: string) => void;
  onEditOffer: (offerId: string) => void;
  onRemoveOffer: (offerId: string) => void;
  onCreateOfferFromAll: (skills: string[]) => void;
  onSaveSkillsOnly: () => void;
  aiSkills?: string[];
  aiAnalysis?: AIAnalysis | null;
  onAssignSkillFromOffer: (skill: string, currentOfferId: string) => void;
  onRemoveSkillFromOffer: (skill: string, offerId: string) => void;
  onRemoveSkill: (skill: string) => void;
  profileSkills?: string[];
  manualSkills?: string[];
  onAddManualSkill: (skill: string) => void;
  newManualSkills: string[];
  setNewManualSkills: React.Dispatch<React.SetStateAction<string[]>>;
}

const SkillsInputWithAutocomplete: React.FC<SkillsInputWithAutocompleteProps> = ({ 
  initialSkills, 
  onSkillsChange, 
  rawText, 
  onRawTextChange, 
  onAnalyzeWithAI, 
  isAnalyzing, 
  hasLargeText,
  offers,
  competenceAssignments,
  onAssignSkillToOffer,
  onEditOffer,
  onRemoveOffer,
  onCreateOfferFromAll,
  onSaveSkillsOnly,
  aiSkills = [],
  aiAnalysis,
  onAssignSkillFromOffer,
  onRemoveSkillFromOffer,
  onRemoveSkill,
  profileSkills = [],
  manualSkills = [],
  onAddManualSkill,
  newManualSkills,
  setNewManualSkills
}) => {
  const [localManualSkills, setLocalManualSkills] = useState<string[]>(manualSkills || []);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLargeTextMode, setIsLargeTextMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalManualSkills(manualSkills || []);
  }, [manualSkills]);

  useEffect(() => {
    setIsLargeTextMode(rawText.length > 100);
  }, [rawText]);

  useEffect(() => {
    console.log('🎓 SkillsInputWithAutocomplete - profileSkills reçus:', profileSkills);
  }, [profileSkills]);

  const getAssignedOffersForSkill = useCallback((skill: string): string[] => {
    const assignment = competenceAssignments.find(a => a.skill === skill);
    return assignment ? assignment.offerIds : [];
  }, [competenceAssignments]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleAddSkill(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleAddSkill = (skill: string) => {
    if (!localManualSkills.includes(skill) && !profileSkills.includes(skill) && skill.trim()) {
      const newLocalManualSkills = [...localManualSkills, skill.trim()];
      setLocalManualSkills(newLocalManualSkills);
      
      if (!newManualSkills.includes(skill.trim())) {
        setNewManualSkills(prev => [...prev, skill.trim()]);
      }
      
      const allSkills = [...new Set([...profileSkills, ...newLocalManualSkills, skill.trim()])];
      onSkillsChange(allSkills);
    }
    onRawTextChange('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleRemoveSkillLocal = (skill: string) => {
    onRemoveSkill(skill);
  };

  const handleAddManualSkill = () => {
    if (!rawText.trim()) return;
    
    const skill = rawText.trim();
    
    if (profileSkills.includes(skill) || localManualSkills.includes(skill)) {
      console.log(`Compétence "${skill}" déjà existante`);
      onRawTextChange('');
      return;
    }
    
    const newLocalManualSkills = [...localManualSkills, skill];
    setLocalManualSkills(newLocalManualSkills);
    
    if (!newManualSkills.includes(skill)) {
      setNewManualSkills(prev => [...prev, skill]);
    }
    
    onAddManualSkill(skill);
    
    const allSkills = [...new Set([...profileSkills, ...newLocalManualSkills, skill])];
    onSkillsChange(allSkills);
    
    onRawTextChange('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    onRawTextChange(value);
    setSelectedIndex(-1);
    
    if (value.trim() && !isLargeTextMode) {
      const searchTerm = value.toLowerCase();
      
      const startsWithMatches = allAvailableSkills
        .filter(skill => 
          skill.toLowerCase().startsWith(searchTerm) && 
          !localManualSkills.includes(skill) &&
          !profileSkills.includes(skill)
        )
        .sort((a, b) => a.localeCompare(b));

      const includesMatches = allAvailableSkills
        .filter(skill => 
          skill.toLowerCase().includes(searchTerm) && 
          !skill.toLowerCase().startsWith(searchTerm) && 
          !localManualSkills.includes(skill) &&
          !profileSkills.includes(skill)
        )
        .sort((a, b) => a.localeCompare(b));

      const filtered = [...startsWithMatches, ...includesMatches].slice(0, 10);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleRemoveNewSkill = (skill: string) => {
    setNewManualSkills(prev => prev.filter(s => s !== skill));
    
    if (localManualSkills.includes(skill)) {
      const newLocalManualSkills = localManualSkills.filter(s => s !== skill);
      setLocalManualSkills(newLocalManualSkills);
      
      const allSkills = [...new Set([...profileSkills, ...newLocalManualSkills])];
      onSkillsChange(allSkills);
    }
  };

  const highlightMatch = (text: string, search: string) => {
    if (!search.trim()) return text;

    const lowerText = text.toLowerCase();
    const lowerSearch = search.toLowerCase();
    const matchIndex = lowerText.indexOf(lowerSearch);

    if (matchIndex === -1) return text;

    const before = text.substring(0, matchIndex);
    const match = text.substring(matchIndex, matchIndex + search.length);
    const after = text.substring(matchIndex + search.length);

    return (
      <>
        {before}
        <strong style={{ color: '#FBBF24' }}>{match}</strong>
        {after}
      </>
    );
  };

  return (
    <div className={styles.skillsContainer}>
      <p className={styles.helpText}>
        Tapez vos compétences, mots ou texte libre. Utilisez le bouton "Ajouter" pour les mots simples, ou "Détecter avec l'IA" pour les textes longs.
      </p>
      
      <div className={styles.inputWrapper}>
        <div className={styles.inputContainer}>
          {isLargeTextMode ? (
            <textarea
              ref={textareaRef}
              value={rawText}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                handleInputKeyDown(e);
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddManualSkill();
                }
              }}
              placeholder="Tapez votre description complète ici..."
              className={styles.skillsTextarea}
              rows={6}
              autoFocus
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={rawText}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                handleInputKeyDown(e);
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddManualSkill();
                }
              }}
              placeholder="Tapez une compétence..."
              className={styles.skillsInput}
              autoFocus
            />
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && !isLargeTextMode && (
          <div className={styles.suggestions} ref={suggestionsRef}>
            {suggestions.map((skill, index) => (
              <div
                key={index}
                className={`${styles.suggestion} ${index === selectedIndex ? styles.selected : ''}`}
                onClick={() => handleAddSkill(skill)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {highlightMatch(skill, rawText)}
              </div>
            ))}
          </div>
        )}
      </div> 

      <div className={styles.actionButtons}>
        {!hasLargeText && rawText.trim() && (
          <button 
            type="button" 
            onClick={handleAddManualSkill} 
            className={styles.addButton} 
            disabled={!rawText.trim()}
            title="Ajouter cette compétence"
          >
            Ajouter
          </button>
        )}
        
        {hasLargeText && (
          <button
            type="button"
            onClick={onAnalyzeWithAI}
            disabled={isAnalyzing || !rawText.trim()}
            className={styles.detectButton}
          >
            {isAnalyzing ? (
              <>
                <div className={styles.loadingSpinnerSmall}></div>
                Analyse...
              </>
            ) : (
              'Détecter les compétences grâce à l\'IA'
            )}
          </button>
        )}
      </div>
      
      {newManualSkills.length > 0 && (
        <div className={styles.newSkillsSection}>
          <div className={styles.newSkillsHeader}>
            <h4>Compétences que vous voulez ajouter</h4>
            <span className={styles.newSkillsBadge}>{newManualSkills.length}</span>
          </div>
          <p className={styles.helpText}>
            Ces compétences seront enregistrées dans votre profil lorsque vous cliquerez sur "Enregistrer les compétences dans le profil".
          </p>
          <div className={styles.newSkillsList}>
            {newManualSkills.map((skill, index) => (
              <span key={index} className={styles.newSkillTag}>
                {skill}
                {aiSkills.includes(skill) && (
                  <span className={styles.aiIndicator} title="Détectée par IA">🤖</span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveNewSkill(skill)}
                  className={styles.removeButton}
                  title="Retirer cette compétence"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          
          <div className={styles.saveSkillsButtonContainer}>
            <button
              type="button"
              onClick={() => {
                onSaveSkillsOnly && onSaveSkillsOnly();
              }}
              disabled={newManualSkills.length === 0}
              className={styles.saveSkillsNowButton}
              title="Enregistrer ces compétences dans votre profil"
            >
              Enregistrer {newManualSkills.length} compétence(s) dans le profil
            </button>
          </div>
        </div>
      )}
      
      {profileSkills.length > 0 && (
        <div className={styles.profileSkillsContainer}>
          <div className={styles.profileSkillsHeader}>
            <h4>Vos compétences déjà enregistrées</h4>
            <span className={styles.profileBadge}>{profileSkills.length}</span>
          </div>
          <p className={styles.helpText}>
            Ces compétences sont déjà enregistrées dans votre profil. Vous pouvez les assigner à des offres.
          </p>
        <div className={styles.profileSkillsList}>
          {profileSkills.map((skill, index) => (
            <SkillWithActions  
              key={index}
              skill={skill}
              onAssignToOffer={onAssignSkillToOffer}
              onRemove={onRemoveSkill}
              offers={offers}
              assignedOffers={getAssignedOffersForSkill(skill)}
              isProfileSkill={true}
              isFromAI={aiSkills.includes(skill)}
              isManualSkill={false}
            />
          ))}
        </div>
        </div>
      )}
      
      {profileSkills.length === 0 && (
        <div className={styles.noProfileSkillsNote}>
          <span className={styles.noProfileSkills}>
            <strong>Compétences déjà enregistrées :</strong> Aucune compétence enregistrée dans votre profil
          </span>
        </div>
      )}
      
      <div className={styles.textCounter}>
        {rawText.length} caractères
        {rawText.length > 100 && !isLargeTextMode && (
          <span className={styles.warning}> (basculer vers zone de texte agrandie)</span>
        )}
      </div>

      <OffersSummary
        offers={offers}
        competenceAssignments={competenceAssignments}
        selectedSkills={[...localManualSkills, ...profileSkills, ...offers.flatMap(o => o.skills || [])]}
        onEditOffer={onEditOffer}
        onRemoveOffer={onRemoveOffer}
        onCreateOfferFromAll={onCreateOfferFromAll}
        onSaveSkillsOnly={onSaveSkillsOnly}
        onAssignSkillFromOffer={onAssignSkillFromOffer}
        onRemoveSkillFromOffer={onRemoveSkillFromOffer}
        onAssignSkillToOffer={onAssignSkillToOffer}
        onRemoveSkill={handleRemoveSkillLocal}
        aiSkills={aiSkills}
        profileSkills={profileSkills}
      />
      
      {rawText.length > 200 && !hasLargeText && (
        <div className={styles.aiPrompt}>
          <p>📝 Vous avez tapé un texte long ({rawText.length} caractères).</p>
          <p>Cliquez sur "Détecter les compétences grâce à l'IA" pour une analyse automatique.</p>
        </div>
      )}
    </div>
  );
};

const PriceSlider: React.FC<{
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}> = ({ min, max, step, value, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const [error, setError] = useState<string | null>(null);

  const handlePriceClick = () => {
    setIsEditing(true);
    setInputValue(value.toString());
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    if (val === '') {
      setError(null);
      return;
    }
    
    const numericValue = parseInt(val);
    
    if (isNaN(numericValue)) {
      setError('Veuillez entrer un nombre valide');
      return;
    }
    
    if (numericValue < min) {
      setError(`Le tarif ne doit pas être inférieur à ${min} 🪙`);
      return;
    }
    
    if (numericValue > max) {
      setError(`Le tarif ne peut pas être supérieur à ${max} 🪙`);
      return;
    }
    
    onChange(numericValue);
    setError(null);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    
    if (inputValue === '') {
      setInputValue(value.toString());
      setError(null);
      return;
    }
    
    const numericValue = parseInt(inputValue);
    
    if (isNaN(numericValue)) {
      setInputValue(value.toString());
      setError(null);
      return;
    }
    
    if (numericValue < min) {
      onChange(min);
      setInputValue(min.toString());
      setError(null);
      return;
    }
    
    if (numericValue > max) {
      onChange(max);
      setInputValue(max.toString());
      setError(null);
      return;
    }
    
    onChange(numericValue);
    setError(null);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className={styles.priceContainer}>
      <div className={styles.priceHeader}>
        {isEditing ? (
          <div className={styles.priceInputWrapper}>
            <input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              className={`${styles.priceInput} ${error ? styles.inputError : ''}`}
              autoFocus
              min={min}
              max={max}
            />
            <span className={styles.priceInputSuffix}>🪙/h</span>
          </div>
        ) : (
          <div className={styles.priceDisplay}>
            <span className={styles.priceValue} onClick={handlePriceClick} title="Cliquez pour modifier">
              {value}
            </span>
            <span className={styles.priceUnit}>🪙/h</span>
          </div>
        )}
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.priceSliderContainer}>
        <div className={styles.priceSliderBackground}></div>
        <div 
          className={styles.priceSliderProgress}
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        ></div>
        <div 
          className={styles.priceSliderThumb}
          style={{ left: `${((value - min) / (max - min)) * 100}%` }}
        ></div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className={styles.priceSliderInput}
        />
      </div>
      
      <div className={styles.priceRangeLabels}>
        <span>{min}🪙</span>
        <span>{max}🪙</span>
      </div>
    </div>
  );
};

const ConfirmationStep: React.FC<{
  formData: any;
  aiAnalysis: AIAnalysis | null;
  hasLargeText: boolean;
  offers: Offer[];
  competenceAssignments: CompetenceAssignment[];
  onEditOffer: (offerId: string) => void;
  onRemoveSkill: (skill: string) => void;
}> = ({ formData, aiAnalysis, hasLargeText, offers, competenceAssignments, onEditOffer, onRemoveSkill }) => {
  
  // ⭐ CORRECTION : Fonction pour obtenir les offres UNIQUES avec compétences
  const getUniqueOffersWithSkills = () => {
    const result: Array<{
      offer: Offer;
      skills: string[];
      isExisting: boolean;
      isAIGenerated: boolean;
    }> = [];
    
    // Utiliser un Set pour éviter les doublons par titre
    const seenTitles = new Set<string>();
    
    // Pour chaque offre, voir quelles compétences y sont assignées
    offers.forEach(offer => {
      // ⭐ Éviter les doublons par titre
      if (seenTitles.has(offer.title)) {
        console.log('⏩ Offre en double ignorée dans la confirmation:', offer.title);
        return;
      }
      seenTitles.add(offer.title);
      
      const assignedSkills = competenceAssignments
        .filter(a => a.offerIds.includes(offer.id))
        .map(a => a.skill);
      
      if (assignedSkills.length > 0) {
        result.push({
          offer,
          skills: assignedSkills,
          isExisting: offer.id.startsWith('existing-'),
          isAIGenerated: offer.isAIGenerated || false
        });
      }
    });
    
    console.log('📊 Offres uniques pour la confirmation:', result.map(r => ({
      title: r.offer.title,
      skills: r.skills,
      isExisting: r.isExisting
    })));
    
    return result;
  };

  const uniqueOffersWithSkills = getUniqueOffersWithSkills();
  
  // ⭐ CORRECTION : N'afficher que les offres UNIQUES
  const offersToDisplay = uniqueOffersWithSkills;
  
  const hasMultipleOffers = offersToDisplay.length > 1;

  // Si aucune offre n'est trouvée, afficher un message
  if (offersToDisplay.length === 0) {
    return (
      <div className={styles.confirmationContent}>
        <div className={styles.summaryCard}>
          <h3>Aucune offre à confirmer</h3>
          <p>Veuillez assigner des compétences à des offres en cliquant sur "+" à côté des compétences.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.confirmationContent}>
      <div className={styles.summaryCard}>
        <h3>Résumé de {hasMultipleOffers ? 'vos offres' : 'votre annonce'}</h3>

        {hasMultipleOffers ? (
          <div className={styles.offersSummary}>
            {offersToDisplay.map((offerData, index) => (
              <div key={`${offerData.offer.id}-${index}`} className={styles.offerSummary}>
                <div className={styles.offerHeader}>
                  <h4>Offre {index + 1}: {offerData.offer.title}</h4>
                  {!offerData.isExisting && (
                    <button
                      type="button"
                      className={styles.editOfferSummaryButton}
                      onClick={() => onEditOffer(offerData.offer.id)}
                      title="Modifier cette offre"
                    >
                      ✎
                    </button>
                  )}
                </div>
                <div className={styles.summaryRow}>
                  <label>Compétences :</label>
                  <div className={styles.skillsSummary}>
                    {offerData.skills.map((skill, skillIndex) => (
                      <span key={skillIndex} className={styles.skillSummaryChip}>
                        {skill}
                        <button
                          type="button"
                          className={styles.removeSkillButton}
                          onClick={() => onRemoveSkill(skill)}
                          title="Retirer cette compétence"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.singleOfferSummary}>
            <div className={styles.summaryRow}>
              <label>Compétences :</label>
              <div className={styles.skillsSummary}>
                {offersToDisplay[0].skills.map((skill: string, index: number) => (
                  <span key={index} className={styles.skillSummaryChip}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className={styles.summaryRow}>
          <label>Niveaux :</label>
          <span>{formData.levels.join(', ')}</span>
        </div>
        
        <div className={styles.summaryRow}>
          <label>Tarif horaire :</label>
          <span className={styles.priceHighlight}>{formData.hourlyRate} 🪙/h</span>
        </div>
        
        <div className={styles.summaryRow}>
          <label>Mode d'enseignement :</label>
          <span>{formData.teachingMode}</span>
        </div>

        <div className={styles.previewSection}>
          <h4>Aperçu {hasMultipleOffers ? 'des offres' : 'de l\'annonce'} :</h4>
          
          {hasMultipleOffers ? (
            <div className={styles.multipleOffersPreview}>
              {offersToDisplay.map((offerData, index) => (
                <div key={`preview-${offerData.offer.id}-${index}`} className={styles.annoncePreview}>
                  <div className={styles.previewTitle}>
                    {offerData.offer.title}
                    {offerData.isAIGenerated && <span className={styles.aiLabel}>Généré par IA</span>}
                  </div>
                  <div className={styles.previewDescription}>
                    <div className={styles.offerDescriptionPreview}>
                      <strong>Description :</strong> 
                      <div className={styles.fullTextPreview}>
                        {offerData.offer.description || 'Description en cours de génération...'}
                      </div>
                    </div>
                    <div className={styles.offerSkillsPreview}>
                      <strong>Compétences :</strong> {offerData.skills.join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.annoncePreview}>
              <div className={styles.previewTitle}>
                {offersToDisplay[0].offer.title}
                {offersToDisplay[0].isAIGenerated && <span className={styles.aiLabel}>Généré par IA</span>}
              </div>
              <div className={styles.previewDescription}>
                <div className={styles.offerDescriptionPreview}>
                  <strong>Description :</strong> 
                  <div className={styles.fullTextPreview}>
                    {offersToDisplay[0].offer.description || 'Description en cours de génération...'}
                  </div>
                </div>
                <div className={styles.offerSkillsPreview}>
                  <strong>Compétences :</strong> {offersToDisplay[0].skills.join(', ')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TransformSkillToAnnonceModal: React.FC<TransformSkillToAnnonceModalProps> = ({
  skills,
  onClose,
  onCreated,
  profileData
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    selectedSkills: [] as string[],
    rawText: '',
    levels: [] as string[],
    hourlyRate: 20,
    teachingMode: 'Les deux',
    description: '',
    title: ''
  });
  const [loading, setLoading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLargeText, setHasLargeText] = useState(false);
  
  const [offers, setOffers] = useState<Offer[]>([]);
  const [competenceAssignments, setCompetenceAssignments] = useState<CompetenceAssignment[]>([]);
  const [showOfferEditModal, setShowOfferEditModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | undefined>();
  const [skillForNewOffer, setSkillForNewOffer] = useState<string>('');
  
  const [showAssignSkillModal, setShowAssignSkillModal] = useState(false);
  const [selectedSkillToAssign, setSelectedSkillToAssign] = useState<string>('');
  const [selectedCurrentOfferId, setSelectedCurrentOfferId] = useState<string>('');
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [profileSkills, setProfileSkills] = useState<string[]>(profileData?.skillsToTeach || []);
  const [manualAddedSkills, setManualAddedSkills] = useState<string[]>([]);
  const [aiDetectedSkills, setAiDetectedSkills] = useState<string[]>([]);
  const [newManualSkills, setNewManualSkills] = useState<string[]>([]);
  const [existingAnnonces, setExistingAnnonces] = useState<ExistingAnnonce[]>([]);
  const [loadingExistingAnnonces, setLoadingExistingAnnonces] = useState(true);

  const [showOfferSuccessModal, setShowOfferSuccessModal] = useState(false);
  const [offerSuccessMessage, setOfferSuccessMessage] = useState('');

  useEffect(() => {
    setHasLargeText(formData.rawText.length > 200);
  }, [formData.rawText]);

  useEffect(() => {
    if (profileData?.skillsToTeach && Array.isArray(profileData.skillsToTeach)) {
      console.log('📚 Compétences du profil chargées:', profileData.skillsToTeach);
      setProfileSkills(profileData.skillsToTeach);
      
      setFormData(prev => ({
        ...prev,
        selectedSkills: profileData.skillsToTeach
      }));
    }
    
    loadExistingAnnonces();
  }, [profileData?.skillsToTeach]);

  const SuccessModal: React.FC<{
    message: string;
    onClose: () => void;
  }> = ({ message, onClose }) => (
    <div className={styles.successModalOverlay} onClick={onClose}>
      <div className={styles.successModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.successModalContent}>
          <h4>Succès !</h4>
          <p>{message}</p>
          <button 
            type="button" 
            onClick={onClose} 
            className={styles.successButton}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );

  const loadExistingAnnonces = async () => {
    try {
      setLoadingExistingAnnonces(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('http://localhost:3001/api/annonces/my-annonces', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const existingOffers: Offer[] = result.data.map((annonce: any) => ({
            id: `existing-${annonce.id}`,
            title: annonce.title,
            description: annonce.description || '',
            isAIGenerated: annonce.metadata?.aiGenerated || false,
            skills: annonce.subjects || []
          }));
          
          setExistingAnnonces(result.data);
          setOffers(prev => [...prev, ...existingOffers]);
        }
      }
    } catch (error) {
      console.error('Erreur chargement annonces existantes:', error);
    } finally {
      setLoadingExistingAnnonces(false);
    }
  };

  const handleAddManualSkill = (skill: string) => {
    if (!newManualSkills.includes(skill)) {
      setNewManualSkills(prev => [...prev, skill]);
    }
    
    if (!manualAddedSkills.includes(skill)) {
      setManualAddedSkills(prev => [...prev, skill]);
    }
    
    const updatedSkills = [...new Set([...formData.selectedSkills, skill])];
    setFormData(prev => ({ ...prev, selectedSkills: updatedSkills }));
  };

  const analyzeTextWithAI = async () => {
    if (formData.rawText.length < 30) {
      setError('Le texte doit contenir au moins 30 caractères pour l\'analyse IA');
      return;
    }

    setAiProcessing(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/annonces/test-extraction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          text: formData.rawText,
          promptHint: "Extrais uniquement les compétences techniques et éducatives. La description sera le texte de l'utilisateur."
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const aiAnalysis = {
          ...result.data,
          description: formData.rawText, 
          extractionMetadata: {
            ...result.data.extractionMetadata,
            descriptionSource: 'user_text'
          }
        };
        
        setAiAnalysis(aiAnalysis);
        setAiDetectedSkills(result.data.skills);
        
        // CORRECTION : Utiliser generateUniqueOfferTitle pour éviter les doublons
        const uniqueOffer = await generateUniqueOfferTitle(result.data.skills, offers);
        
        const newOffer: Offer = {
          id: `offer-${Date.now()}`,
          title: uniqueOffer.title,
          description: formData.rawText,
          isAIGenerated: true,
          skills: result.data.skills
        };
        
        setOffers(prev => [...prev, newOffer]);
        
        const newAssignments: CompetenceAssignment[] = result.data.skills.map((skill: string) => ({
          skill,
          offerIds: [newOffer.id]
        }));
        
        setCompetenceAssignments(prev => [...prev, ...newAssignments]);
        
      }
    } catch (error: any) {
      console.error('Erreur fetch analyse IA:', error);
      setError('Service d\'analyse temporairement indisponible: ' + error.message);
    } finally {
      setAiProcessing(false);
    }
  };

  const handleAssignSkillFromOffer = (skill: string, currentOfferId: string) => {
    setSelectedSkillToAssign(skill);
    setSelectedCurrentOfferId(currentOfferId);
    setShowAssignSkillModal(true);
  };

  const handleConfirmAssignmentFromModal = async (targetOfferId: string) => {
    if (targetOfferId === 'new') {
      try {
        const skillsForNewOffer = [selectedSkillToAssign];
        
        // CORRECTION : Utiliser generateUniqueOfferTitle
        const uniqueOffer = await generateUniqueOfferTitle(skillsForNewOffer, offers);
        
        const newOffer: Offer = {
          id: `offer-${Date.now()}`,
          title: uniqueOffer.title,
          description: uniqueOffer.description,
          isAIGenerated: true,
          skills: skillsForNewOffer
        };
        
        setOffers(prev => [...prev, newOffer]);
        
        setCompetenceAssignments(prev => {
          const existing = prev.find(a => a.skill === selectedSkillToAssign);
          if (existing) {
            return prev.map(a => 
              a.skill === selectedSkillToAssign ? { ...a, offerIds: [...a.offerIds, newOffer.id] } : a
            );
          }
          return [...prev, { skill: selectedSkillToAssign, offerIds: [newOffer.id] }];
        });
      } catch (error) {
        console.error('Erreur création nouvelle offre:', error);
        setError('Erreur lors de la création de la nouvelle offre');
      }
    } else {
      setCompetenceAssignments(prev => {
        const existing = prev.find(a => a.skill === selectedSkillToAssign);
        if (existing) {
          if (!existing.offerIds.includes(targetOfferId)) {
            return prev.map(a => 
              a.skill === selectedSkillToAssign ? { ...a, offerIds: [...a.offerIds, targetOfferId] } : a
            );
          }
          return prev;
        }
        return [...prev, { skill: selectedSkillToAssign, offerIds: [targetOfferId] }];
      });
      
      updateOfferWithAIAuto(targetOfferId);
    }
    
    setShowAssignSkillModal(false);
    setSelectedSkillToAssign('');
    setSelectedCurrentOfferId('');
  };

  const handleRemoveSkillFromOffer = (skill: string, offerId: string) => {
    setCompetenceAssignments(prev => 
      prev
        .map(assignment => {
          if (assignment.skill === skill && assignment.offerIds.includes(offerId)) {
            const newOfferIds = assignment.offerIds.filter(id => id !== offerId);
            if (newOfferIds.length === 0) {
              return null;
            }
            return { ...assignment, offerIds: newOfferIds };
          }
          return assignment;
        })
        .filter(Boolean) as CompetenceAssignment[]
    );
    
    const remainingSkills = competenceAssignments
      .filter(a => a.offerIds.includes(offerId))
      .map(a => a.skill);
    
    if (remainingSkills.length === 0) {
      handleRemoveOffer(offerId);
    } else {
      updateOfferWithAIAuto(offerId);
    }
  };

  const handleAssignSkillToOffer = async (skill: string, offerId?: string) => {
    const isExistingOffer = offerId?.startsWith('existing-');
    
    if (!offerId || offerId === 'new') {
      try {
        setAiProcessing(true);
        const skillsForNewOffer = [skill];
        
        // CORRECTION : Vérifier si une offre avec cette compétence existe déjà
        const existingSimilarOffer = offers.find(offer => {
          const hasSkill = offer.skills?.includes(skill);
          const isSimilarTitle = offer.title.toLowerCase().includes(skill.toLowerCase()) ||
                                skill.toLowerCase().includes(offer.title.toLowerCase().replace('cours de', '').trim());
          
          return hasSkill || isSimilarTitle;
        });
        
        if (existingSimilarOffer) {
          const useExisting = window.confirm(
            `Une offre similaire existe déjà : "${existingSimilarOffer.title}".\n\nVoulez-vous assigner la compétence à cette offre existante ?`
          );
          
          if (useExisting) {
            // Assigner à l'offre existante au lieu de créer un doublon
            setCompetenceAssignments(prev => {
              const existing = prev.find(a => a.skill === skill);
              if (existing) {
                if (!existing.offerIds.includes(existingSimilarOffer.id)) {
                  return prev.map(a => 
                    a.skill === skill ? { ...a, offerIds: [...a.offerIds, existingSimilarOffer.id] } : a
                  );
                }
                return prev;
              }
              return [...prev, { skill, offerIds: [existingSimilarOffer.id] }];
            });
            
            setOfferSuccessMessage(`La compétence "${skill}" a été ajoutée à l'offre existante "${existingSimilarOffer.title}" !`);
            setShowOfferSuccessModal(true);
            setAiProcessing(false);
            return; // ⭐ IMPORTANT : Arrêter ici pour éviter de créer un doublon
          }
        }
        
        // Générer un titre unique
        const uniqueOffer = await generateUniqueOfferTitle(skillsForNewOffer, offers);
        
        // ⭐ AJOUT : Vérifier une dernière fois qu'aucune offre avec ce titre exact n'existe
        const duplicateByTitle = offers.find(o => o.title === uniqueOffer.title);
        if (duplicateByTitle) {
          console.warn('⚠️ Doublon détecté, utilisation de l\'offre existante:', duplicateByTitle.id);
          // Assigner à l'offre existante
          setCompetenceAssignments(prev => {
            const existing = prev.find(a => a.skill === skill);
            if (existing) {
              if (!existing.offerIds.includes(duplicateByTitle.id)) {
                return prev.map(a => 
                  a.skill === skill ? { ...a, offerIds: [...a.offerIds, duplicateByTitle.id] } : a
                );
              }
              return prev;
            }
            return [...prev, { skill, offerIds: [duplicateByTitle.id] }];
          });
          setAiProcessing(false);
          return;
        }
        
        const newOffer: Offer = {
          id: `offer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ⭐ ID plus unique
          title: uniqueOffer.title,
          description: uniqueOffer.description,
          isAIGenerated: true,
          skills: skillsForNewOffer
        };
        
        setOffers(prev => [...prev, newOffer]);
        
        setCompetenceAssignments(prev => {
          const existing = prev.find(a => a.skill === skill);
          if (existing) {
            if (!existing.offerIds.includes(newOffer.id)) {
              return prev.map(a => 
                a.skill === skill ? { ...a, offerIds: [...a.offerIds, newOffer.id] } : a
              );
            }
            return prev;
          }
          return [...prev, { skill, offerIds: [newOffer.id] }];
        });
        
        setOfferSuccessMessage(`Nouvelle offre "${newOffer.title}" créée pour la compétence "${skill}" !`);
        setShowOfferSuccessModal(true);
        
      } catch (error) {
        console.error('Erreur création offre IA:', error);
        setError('Erreur lors de la création de l\'offre');
      } finally {
        setAiProcessing(false);
      }
    } else if (isExistingOffer) {
      // Assigner à une offre existante
      console.log(`Assigner "${skill}" à l'offre existante ${offerId}`);
      
      setCompetenceAssignments(prev => {
        const existing = prev.find(a => a.skill === skill);
        if (existing) {
          if (!existing.offerIds.includes(offerId)) {
            return prev.map(a => 
              a.skill === skill ? { ...a, offerIds: [...a.offerIds, offerId] } : a
            );
          }
          return prev;
        }
        return [...prev, { skill, offerIds: [offerId] }];
      });
      
      const existingOffer = offers.find(o => o.id === offerId);
      if (existingOffer) {
        setOfferSuccessMessage(`La compétence "${skill}" a été ajoutée à l'offre "${existingOffer.title}" !`);
        setShowOfferSuccessModal(true);
      }
      
    } else {
      // Offre créée dans cette session
      const currentOffer = offers.find(o => o.id === offerId);
      if (currentOffer && currentOffer.skills?.includes(skill)) {
        console.log(`La compétence "${skill}" est déjà dans l'offre "${currentOffer.title}"`);
        return;
      }
      
      setCompetenceAssignments(prev => {
        const existing = prev.find(a => a.skill === skill);
        if (existing) {
          if (!existing.offerIds.includes(offerId)) {
            return prev.map(a => 
              a.skill === skill ? { ...a, offerIds: [...a.offerIds, offerId] } : a
            );
          }
          return prev;
        }
        return [...prev, { skill, offerIds: [offerId] }];
      });
      
      const offerForMessage = offers.find(o => o.id === offerId);
      if (offerForMessage) {
        setOfferSuccessMessage(`La compétence "${skill}" a été ajoutée à l'offre "${offerForMessage.title}" !`);
        setShowOfferSuccessModal(true);
      }

      updateOfferWithAIAuto(offerId, skill);
    }
  };

  const updateOfferWithAIAuto = async (offerId: string, newSkill?: string) => {
    const offer = offers.find(o => o.id === offerId);
    if (!offer) return;

    const assignedSkills = competenceAssignments
      .filter(a => a.offerIds.includes(offerId))
      .map(a => a.skill);

    const uniqueAssignedSkills = [...new Set(assignedSkills)];

    if (uniqueAssignedSkills.length === 0) return;

    try {
      const currentSkills = [...new Set(offer.skills || [])];
      
      if (newSkill && !currentSkills.includes(newSkill)) {
        currentSkills.push(newSkill);
      }
      
      const combinedSkills = [...new Set([...currentSkills, ...uniqueAssignedSkills])];
      
      // CORRECTION : Utiliser generateUniqueOfferTitle pour éviter les doublons
      const uniqueOffer = await generateUniqueOfferTitle(combinedSkills, offers.filter(o => o.id !== offerId));
      
      const updatedOffers = offers.map(o => 
        o.id === offerId 
          ? { 
              ...o, 
              title: uniqueOffer.title,
              description: uniqueOffer.description,
              isAIGenerated: true,
              skills: combinedSkills
            }
          : o
      );
      setOffers(updatedOffers);
      
      if (newSkill) {
        setCompetenceAssignments(prev => {
          const existing = prev.find(a => a.skill === newSkill);
          if (existing) {
            if (!existing.offerIds.includes(offerId)) {
              return prev.map(a => 
                a.skill === newSkill ? { ...a, offerIds: [...a.offerIds, offerId] } : a
              );
            }
            return prev;
          }
          return [...prev, { skill: newSkill, offerIds: [offerId] }];
        });
      }
    } catch (error) {
      console.error('Erreur mise à jour IA offre:', error);
    }
  };

  const handleSaveOffer = async (offer: Offer) => {
    try {
      let finalOffer = { ...offer };
      
      if (!editingOffer || !offer.title || offer.title === 'Nouvelle offre') {
        const skillsForOffer = offer.skills && offer.skills.length > 0 
          ? offer.skills 
          : (skillForNewOffer ? [skillForNewOffer] : []);
        
        if (skillsForOffer.length > 0) {
          try {
            // CORRECTION : Vérifier les doublons avant de créer
            const existingDuplicate = offers.find(o => 
              o.title === offer.title && 
              o.id !== offer.id
            );
            
            if (existingDuplicate && !editingOffer) {
              alert(`Une offre avec le titre "${offer.title}" existe déjà.`);
              return;
            }
            
            const uniqueOffer = await generateUniqueOfferTitle(skillsForOffer, offers);
            
            finalOffer = {
              ...finalOffer,
              title: uniqueOffer.title,
              description: uniqueOffer.description,
              isAIGenerated: true,
              skills: skillsForOffer
            };
          } catch (error) {
            console.error('Erreur génération IA:', error);
            finalOffer = {
              ...finalOffer,
              title: offer.title || `Cours de ${skillsForOffer[0]}`,
              description: offer.description || `Cours de ${skillsForOffer.join(', ')}`,
              isAIGenerated: false,
              skills: skillsForOffer
            };
          }
        }
      }
      
      if (editingOffer) {
        setOffers(prev => prev.map(o => o.id === finalOffer.id ? finalOffer : o));
        setOfferSuccessMessage(`L'offre "${finalOffer.title}" a été modifiée avec succès !`);
      } else {
        setOffers(prev => [...prev, finalOffer]);
        setOfferSuccessMessage(`Nouvelle offre "${finalOffer.title}" créée avec succès !`);
        
        if (skillForNewOffer) {
          setCompetenceAssignments(prev => {
            const existing = prev.find(a => a.skill === skillForNewOffer);
            if (existing) {
              return prev.map(a => 
                a.skill === skillForNewOffer && !a.offerIds.includes(finalOffer.id)
                  ? { ...a, offerIds: [...a.offerIds, finalOffer.id] }
                  : a
              );
            }
            return [...prev, { skill: skillForNewOffer, offerIds: [finalOffer.id] }];
          });
        }
      }
      
      setShowOfferSuccessModal(true);
      setShowOfferEditModal(false);
      setEditingOffer(undefined);
      setSkillForNewOffer('');
      
    } catch (error) {
      console.error('Erreur save offre:', error);
      setError('Erreur lors de la sauvegarde de l\'offre');
    }
  };

  const handleEditOffer = (offerId: string) => {
    const offer = offers.find(o => o.id === offerId);
    if (offer) {
      const offerSkills = competenceAssignments
        .filter(a => a.offerIds.includes(offerId))
        .map(a => a.skill);

      setEditingOffer({ ...offer, skills: offerSkills });
      setSkillForNewOffer('');
      setShowOfferEditModal(true);
    }
  };

  const handleRemoveOffer = (offerId: string) => {
    setOffers(prev => prev.filter(o => o.id !== offerId));
    
    setCompetenceAssignments(prev =>
      prev
        .map(assignment => ({
          ...assignment,
          offerIds: assignment.offerIds.filter(id => id !== offerId)
        }))
        .filter(assignment => assignment.offerIds.length > 0)
    );
  };

  const handleRemoveSkill = async (skill: string) => {    
    const isProfileSkill = profileSkills.includes(skill);
        
    if (isProfileSkill) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('Token manquant');
          setError('Erreur: Session expirée');
          return;
        }
        
        const response = await fetch('http://localhost:3001/api/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}`);
        }
        
        const profileResponse = await response.json();
        
        if (profileResponse.success && profileResponse.data.profile) {
          const currentProfile = profileResponse.data.profile;
          
          const updatedSkillsToTeach = (currentProfile.skillsToTeach || []).filter((s: string) => s !== skill);
          
          const saveResponse = await fetch('http://localhost:3001/api/profile/save', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              profileData: {
                ...currentProfile,
                skillsToTeach: updatedSkillsToTeach
              }
            })
          });
          
          if (!saveResponse.ok) {
            throw new Error(`Erreur sauvegarde HTTP ${saveResponse.status}`);
          }
        }
      } catch (error) {
        console.error('❌ Erreur suppression compétence de skillsToTeach:', error);
        setError(`Erreur: Impossible de supprimer la compétence "${skill}"`);
        return;
      }
    }
    
    setProfileSkills(prev => prev.filter(s => s !== skill));
    
    if (manualAddedSkills.includes(skill)) {
      setManualAddedSkills(prev => prev.filter(s => s !== skill));
    }
    
    if (aiDetectedSkills.includes(skill)) {
      setAiDetectedSkills(prev => prev.filter(s => s !== skill));
    }
    
    if (newManualSkills.includes(skill)) {
      setNewManualSkills(prev => prev.filter(s => s !== skill));
    }
    
    const updatedSkills = formData.selectedSkills.filter(s => s !== skill);
    setFormData(prev => ({
      ...prev,
      selectedSkills: updatedSkills
    }));
    
    setCompetenceAssignments(prev => prev.filter(a => a.skill !== skill));
    
    console.log(`✨ Compétence "${skill}" complètement supprimée`);
  };

  const handleCreateOfferFromAll = async (skills: string[]) => {
    if (skills.length === 0) return;
    
    try {
      setAiProcessing(true);
      // CORRECTION : Utiliser generateUniqueOfferTitle
      const uniqueOffer = await generateUniqueOfferTitle(skills, offers);
      
      const newOffer: Offer = {
        id: `offer-${Date.now()}`,
        title: uniqueOffer.title,
        description: uniqueOffer.description,
        isAIGenerated: true,
        skills: skills
      };
      
      setOffers(prev => [...prev, newOffer]);
      
      const newAssignments: CompetenceAssignment[] = skills.map(skill => ({
        skill,
        offerIds: [newOffer.id]
      }));
      
      setCompetenceAssignments(prev => [...prev, ...newAssignments]);
    } catch (error) {
      console.error('Erreur création offre:', error);
      setError('Erreur lors de la création de l\'offre');
    } finally {
      setAiProcessing(false);
    }
  };

  const handleSaveSkillsOnly = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Inclure les compétences des offres créées
      const offerSkills = offers.flatMap(o => o.skills || []);
      
      const allSkills = [...new Set([
        ...formData.selectedSkills,
        ...aiDetectedSkills,
        ...manualAddedSkills,
        ...offerSkills
      ])];
      
      const skillsToSave = allSkills.filter(skill => 
        !profileSkills.includes(skill)
      );
      
      if (skillsToSave.length === 0) {
        setError('Toutes ces compétences sont déjà enregistrées dans votre profil');
        setLoading(false);
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }
      
      const response = await fetch('http://localhost:3001/api/profile/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          profileData: {
            ...(profileData || {}),
            skillsToTeach: [...new Set([...profileSkills, ...skillsToSave])]
          },
          source: 'transform_modal_skills_to_teach'
        })
      });
      
      if (response.ok) {        
        const updatedProfileSkills = [...new Set([...profileSkills, ...skillsToSave])];
        setProfileSkills(updatedProfileSkills);
        
        setNewManualSkills([]);
        
        setFormData(prev => ({
          ...prev,
          selectedSkills: updatedProfileSkills
        }));
        
        setSuccessMessage(`${skillsToSave.length} compétence(s) enregistrée(s) avec succès !`);
        setShowSuccessModal(true);
        
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 3000);
      } else {
        setError('Erreur lors de l\'enregistrement des compétences à enseigner');
      }
    } catch (error: any) {
      setError(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string | string[] | number) => {
    if (questionId === 'skills') {
      if (Array.isArray(answer)) {
        setFormData(prev => ({ ...prev, selectedSkills: answer as string[] }));
      }
    } else if (questionId === 'levels') {
      let newLevels: string[];
      
      if (answer === 'Tous niveaux' || (Array.isArray(answer) && answer.includes('Tous niveaux'))) {
        newLevels = ['Tous niveaux'];
      } else if (Array.isArray(answer)) {
        newLevels = answer as string[];
      } else {
        newLevels = [answer as string];
      }
      
      setFormData(prev => ({ ...prev, levels: newLevels }));
    } else if (questionId === 'price') {
      setFormData(prev => ({ ...prev, hourlyRate: answer as number }));
    }
  };

  const handleSkillsChange = useCallback((newSkills: string[]) => {
    const allSkills = [...new Set(newSkills)];
    
    const trulyNewSkills = allSkills.filter(skill => 
      !profileSkills.includes(skill)
    );
    
    setManualAddedSkills(trulyNewSkills);
    
    setNewManualSkills(prev => {
      const combined = [...prev, ...trulyNewSkills];
      return [...new Set(combined)];
    });
    
    setFormData(prev => ({
      ...prev,
      selectedSkills: allSkills
    }));
  }, [profileSkills]);

  const handleRawTextChange = (text: string) => {
    setFormData(prev => ({ ...prev, rawText: text }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const canProceed = (): boolean => {
    const question = questions[currentStep];
    
    switch (question.id) {
      case 'skills':
        const allSkills = [
          ...formData.selectedSkills,
          ...manualAddedSkills,
          ...aiDetectedSkills,
          ...profileSkills
        ].filter(Boolean);
        
        if ([...new Set(allSkills)].length === 0) {
          return false;
        }
        
        const allAssignedSkills = competenceAssignments
          .filter(a => a.offerIds.length > 0)
          .map(a => a.skill);
        
        console.log('💡 Validation étape skills:');
        console.log('- Compétences disponibles:', [...new Set(allSkills)]);
        console.log('- Compétences assignées:', allAssignedSkills);
        console.log('- Nombre d\'offres:', offers.length);
        console.log('- competenceAssignments:', competenceAssignments);
        
        return allAssignedSkills.length > 0;
        
      case 'levels':
        return formData.levels.length > 0;
        
      case 'price':
        return formData.hourlyRate >= 10 && formData.hourlyRate <= 100;
        
      case 'confirmation':
        return true;
        
      default:
        return false;
    }
  };

  useEffect(() => {
    if (currentStep === 0) {
      const question = questions[currentStep];
      
      if (question.id === 'skills') {
        const allSkills = [
          ...formData.selectedSkills,
          ...manualAddedSkills,
          ...aiDetectedSkills,
          ...profileSkills
        ].filter(Boolean);
        
        if ([...new Set(allSkills)].length === 0) {
          setError('Veuillez ajouter au moins une compétence.');
          return;
        }
        
        const allAssignedSkills = competenceAssignments
          .filter(a => a.offerIds.length > 0)
          .map(a => a.skill);
        
        if (allAssignedSkills.length === 0) {
          setError('Veuillez assigner au moins une compétence à une offre en cliquant sur le bouton "+" à côté des compétences.');
        } else {
          setError(null);
        }
      }
    }
  }, [
    currentStep, 
    formData.selectedSkills, 
    manualAddedSkills, 
    aiDetectedSkills, 
    profileSkills, 
    competenceAssignments
  ]);

 const handleSubmit = async () => {
  if (!canProceed()) return;

  setLoading(true);
  setError(null);
  
  try {
    // Vérifier s'il y a des compétences assignées
    const allAssignedSkills = competenceAssignments
      .filter(a => a.offerIds.length > 0)
      .map(a => a.skill);
    
    if (allAssignedSkills.length === 0) {
      throw new Error('Aucune compétence assignée à des offres. Veuillez assigner des compétences à des offres en cliquant sur "+" à côté des compétences.');
    }

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    // ⭐ CORRECTION CRITIQUE : Déterminer teachingMode selon les valeurs de l'ENUM PostgreSQL
    let teachingMode = 'En ligne'; // Valeur par défaut POUR LA BASE DE DONNÉES
    
    // Récupérer la disponibilité
    const availability = profileData?.availability || 
                        profileData?.profile?.availability || 
                        profileData?.user?.availability || 
                        { online: false, inPerson: false };
    
    console.log('📊 Disponibilité finale:', availability);
    
    // Vérifier les valeurs booléennes
    const isOnline = Boolean(availability?.online);
    const isInPerson = Boolean(availability?.inPerson);
    
    // ⭐ CORRECTION : Utiliser les valeurs EXACTES de l'enum PostgreSQL
    if (isOnline && isInPerson) {
      teachingMode = 'Les deux';
    } else if (isOnline) {
      teachingMode = 'En ligne';
    } else if (isInPerson) {
      teachingMode = 'En présentiel';
    }
    
    console.log('✅ Mode d\'enseignement déterminé pour DB:', teachingMode);

    // ⭐ CORRECTION CRITIQUE : ÉLIMINER LES DOUBLONS avant de créer les annonces
    const uniqueOffers = offers.filter((offer, index, self) => {
      return index === self.findIndex(o => o.title === offer.title);
    });

    console.log('🧹 Nettoyage avant création:');
    console.log('- Offres avant:', offers.length);
    console.log('- Offres après nettoyage:', uniqueOffers.length);

    // Créer une annonce pour chaque offre UNIQUE
    const offersToCreate = uniqueOffers.filter(offer => {
      const offerSkills = competenceAssignments
        .filter(a => a.offerIds.includes(offer.id))
        .map(a => a.skill);
      return offerSkills.length > 0;
    });

    if (offersToCreate.length === 0) {
      throw new Error('Aucune offre valide à créer. Veuillez assigner des compétences à des offres en cliquant sur "+" à côté des compétences.');
    }

    // Vérifier les doublons de titre
    const seenTitles = new Set();
    const uniqueOffersToCreate: Offer[] = [];
    
    offersToCreate.forEach(offer => {
      if (!seenTitles.has(offer.title)) {
        seenTitles.add(offer.title);
        uniqueOffersToCreate.push(offer);
      } else {
        console.log('⚠️ Offre en double ignorée:', offer.title);
      }
    });

    console.log('🎯 Offres finales pour création API:', uniqueOffersToCreate.length);

    // Séparer les offres existantes des nouvelles
    const existingOffers = uniqueOffersToCreate.filter(offer => offer.id.startsWith('existing-'));
    const newOffers = uniqueOffersToCreate.filter(offer => !offer.id.startsWith('existing-'));

    console.log('📋 Analyse finale:', {
      existantes: existingOffers.length,
      nouvelles: newOffers.length,
      teachingMode: teachingMode
    });

    // 1. TRAITEMENT DES ANNONCES EXISTANTES (MODIFICATION)
    const existingPromises = existingOffers.map(offer => {
      const offerSkills = competenceAssignments
        .filter(a => a.offerIds.includes(offer.id))
        .map(a => a.skill);

      if (offerSkills.length === 0) return null;

      const existingAnnonceId = offer.id.replace('existing-', '');
      const existingAnnonce = existingAnnonces.find(a => a.id === existingAnnonceId);
      if (!existingAnnonce) {
        console.log('❌ Annonce existante non trouvée:', existingAnnonceId);
        return null;
      }

      const currentSkills = existingAnnonce.subjects || [];
      const newSkills = offerSkills.filter(skill => !currentSkills.includes(skill));
      if (newSkills.length === 0) return null;

      const firstSkill = offerSkills[0];
      if (!firstSkill || firstSkill.trim() === '') {
        throw new Error(`La première compétence est vide pour "${offer.title}"`);
      }

      // ⭐ CORRECTION : Utiliser le teachingMode existant ou le nouveau
      // Si l'annonce existe déjà, conserver sa valeur actuelle
      let finalTeachingMode = existingAnnonce.teachingMode || teachingMode;
      
      // ⭐ ASSURER que la valeur est valide pour l'enum PostgreSQL
      if (!['En ligne', 'En présentiel', 'Les deux'].includes(finalTeachingMode)) {
        // Convertir si nécessaire
        if (finalTeachingMode === 'online') finalTeachingMode = 'En ligne';
        else if (finalTeachingMode === 'in_person') finalTeachingMode = 'En présentiel';
        else if (finalTeachingMode === 'both') finalTeachingMode = 'Les deux';
        else finalTeachingMode = 'En ligne'; // Fallback
      }
      
      const payload = {
        title: offer.title,
        description: offer.description || existingAnnonce.description || `Cours de ${firstSkill}`,
        subject: firstSkill.trim(),
        subjects: offerSkills,
        level: formData.levels.join(', ') || existingAnnonce.level || 'Tous niveaux',
        hourlyRate: formData.hourlyRate || existingAnnonce.hourlyRate || 20,
        teachingMode: finalTeachingMode, // ⭐ Valeur CORRECTE pour PostgreSQL
        location: existingAnnonce.location || null,
        availability: existingAnnonce.availability || null,
        isActive: existingAnnonce.isActive
      };

      console.log(`📤 Modification annonce existante "${offer.title}"`, {
        teachingMode: payload.teachingMode,
        originalTeachingMode: existingAnnonce.teachingMode,
        type: typeof payload.teachingMode
      });

      return annonceService.updateAnnonce(existingAnnonceId, payload);
    }).filter(promise => promise !== null);

    // 2. TRAITEMENT DES NOUVELLES ANNONCES (CRÉATION)
    const newPromises = newOffers.map(offer => {
      const offerSkills = competenceAssignments
        .filter(a => a.offerIds.includes(offer.id))
        .map(a => a.skill);

      if (offerSkills.length === 0) return null;

      const firstSkill = offerSkills[0];
      if (!firstSkill || firstSkill.trim() === '') {
        throw new Error(`La première compétence est vide pour "${offer.title}"`);
      }

      // ⭐ CORRECTION : S'assurer que teachingMode est valide pour PostgreSQL
      let finalTeachingMode = teachingMode;
      if (!['En ligne', 'En présentiel', 'Les deux'].includes(finalTeachingMode)) {
        // Convertir si nécessaire
        if (finalTeachingMode === 'online') finalTeachingMode = 'En ligne';
        else if (finalTeachingMode === 'in_person') finalTeachingMode = 'En présentiel';
        else if (finalTeachingMode === 'both') finalTeachingMode = 'Les deux';
        else finalTeachingMode = 'En ligne'; // Fallback
      }
      
      const payload = {
        title: offer.title,
        description: offer.description || `Cours de ${firstSkill}`,
        subject: firstSkill.trim(),
        subjects: offerSkills,
        level: formData.levels.join(', ') || 'Tous niveaux',
        hourlyRate: formData.hourlyRate || 20,
        teachingMode: finalTeachingMode, // ⭐ Valeur CORRECTE pour PostgreSQL
        location: null,
        availability: null
      };

      console.log(`📤 Création nouvelle annonce "${offer.title}"`, {
        teachingMode: payload.teachingMode,
        type: typeof payload.teachingMode,
        rawValue: teachingMode,
        finalValue: finalTeachingMode
      });

      return annonceService.createAnnonce(payload);
    }).filter(promise => promise !== null);

    // 3. EXÉCUTER TOUTES LES PROMESSES
    const allPromises = [...existingPromises, ...newPromises];
    
    if (allPromises.length === 0) {
      throw new Error('Aucune opération à effectuer.');
    }

    console.log(`📤 Envoi de ${allPromises.length} opération(s) à l'API...`);

    const results = await Promise.all(allPromises as Promise<any>[]);
    console.log(`✅ ${results.length} opération(s) effectuée(s) avec succès`);
    
    // 4. METTRE À JOUR LES COMPÉTENCES DU PROFIL
    try {
      const allSkillsToSave = [...new Set([
        ...formData.selectedSkills,
        ...aiDetectedSkills,
        ...manualAddedSkills
      ])];
      
      const skillResponse = await fetch('http://localhost:3001/api/profile/skills/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ skills: allSkillsToSave })
      });
      
      if (skillResponse.ok) {
        console.log('✅ Compétences ajoutées au profil');
        
        // Mettre à jour le localStorage
        const savedProfile = localStorage.getItem('profileData');
        if (savedProfile) {
          try {
            const profileData = JSON.parse(savedProfile);
            profileData.skills = allSkillsToSave;
            localStorage.setItem('profileData', JSON.stringify(profileData));
          } catch (e) {
            console.warn('Erreur update profileData:', e);
          }
        }
      }
    } catch (skillError) {
      console.warn('⚠️ Erreur lors de l\'ajout des compétences au profil:', skillError);
    }
    
    // 5. SUCCÈS
    onCreated?.();
    onClose();
    
  } catch (error: any) {
    console.error('❌ Erreur création annonce(s):', error);
    
    // Afficher plus de détails sur l'erreur
    if (error.response) {
      console.error('📋 Détails de l\'erreur:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
      
      // Essayer d'afficher le message d'erreur du backend
      const backendError = error.response.data?.message || 
                          error.response.data?.error || 
                          'Erreur inconnue du serveur';
      setError(`Erreur ${error.response.status}: ${backendError}`);
    } else if (error.request) {
      setError('Pas de réponse du serveur. Vérifiez votre connexion.');
    } else {
      setError(error.message || 'Erreur lors de la création des annonces');
    }
  } finally {
    setLoading(false);
  }
};

  const renderQuestion = () => {
    const question = questions[currentStep];

    switch (question.type) {
      case 'skills':
        return (
          <div className={styles.skillsStep}>
            <SkillsInputWithAutocomplete
              initialSkills={formData.selectedSkills}
              onSkillsChange={handleSkillsChange}
              rawText={formData.rawText}
              onRawTextChange={handleRawTextChange}
              onAnalyzeWithAI={analyzeTextWithAI}
              isAnalyzing={aiProcessing}
              hasLargeText={hasLargeText}
              offers={offers}
              competenceAssignments={competenceAssignments}
              onAssignSkillToOffer={handleAssignSkillToOffer}
              onEditOffer={handleEditOffer}
              onRemoveOffer={handleRemoveOffer}
              onCreateOfferFromAll={handleCreateOfferFromAll}
              onSaveSkillsOnly={handleSaveSkillsOnly}
              aiSkills={aiDetectedSkills}
              manualSkills={manualAddedSkills}
              profileSkills={profileSkills}
              aiAnalysis={aiAnalysis}
              onAssignSkillFromOffer={handleAssignSkillFromOffer}
              onRemoveSkillFromOffer={handleRemoveSkillFromOffer}
              onRemoveSkill={(skill) => {
                handleRemoveSkill(skill);
              }}
              onAddManualSkill={handleAddManualSkill}
              newManualSkills={newManualSkills}
              setNewManualSkills={setNewManualSkills}
            />
            
            {aiProcessing && (
              <div className={styles.aiProcessing}>
                <div className={styles.spinner}></div>
                <span>Analyse IA en cours...</span>
              </div>
            )}
            
            {error && <div className={styles.errorMessage}>{error}</div>}
          </div>
        );

      case 'levels':
        return (
          <div className={styles.optionsGrid}>
            {question.options?.map((option, index) => {
              const isSelected = formData.levels.includes(option);
              const isAllLevels = option === 'Tous niveaux';
              
              return (
                <button
                  key={index}
                  className={`${styles.optionButton} ${isSelected ? styles.selected : ''} ${isAllLevels ? styles.allLevels : ''}`}
                  onClick={() => {
                    let newLevels: string[];
                    
                    if (isAllLevels) {
                      newLevels = ['Tous niveaux'];
                    } else if (isSelected) {
                      newLevels = formData.levels.filter(l => l !== option && l !== 'Tous niveaux');
                    } else {
                      newLevels = [...formData.levels.filter(l => l !== 'Tous niveaux'), option];
                    }
                    
                    handleAnswer('levels', newLevels);
                  }}
                >
                  <div className={styles.optionText}>{option}</div>
                  {isSelected && <span className={styles.checkmark}>✓</span>}
                </button>
              );
            })}
          </div>
        );

      case 'price':
        return (
          <PriceSlider
            min={question.min || 10}
            max={question.max || 100}
            step={question.step || 5}
            value={formData.hourlyRate}
            onChange={(value) => handleAnswer('price', value)}
          />
        );

      case 'confirmation':
        return (
          <ConfirmationStep
            formData={formData}
            aiAnalysis={aiAnalysis}
            hasLargeText={hasLargeText}
            offers={offers}
            competenceAssignments={competenceAssignments}
            onEditOffer={handleEditOffer}
            onRemoveSkill={handleRemoveSkill}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2>Créer une annonce de cours</h2>
            <button className={styles.closeButton} onClick={onClose} aria-label="Fermer">✕</button>
          </div>

          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }} />
          </div>
          <p className={styles.progressText}>
            <span>Étape {currentStep + 1}</span> sur {questions.length}
          </p>

          <div className={styles.modalBody}>
            <h3 className={styles.questionTitle}>{questions[currentStep].question}</h3>
            {renderQuestion()}
          </div>

          <div className={styles.modalFooter}>
            <button onClick={handleBack} disabled={currentStep === 0} className={styles.secondaryButton}>
              Retour
            </button>

            {currentStep === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                className={styles.primaryButton}
              >
                {loading ? (
                  <>
                    <div className={styles.loadingSpinnerSmall}></div>
                    Création en cours...
                  </>
                ) : (
                  `Créer ${offers.length > 1 ? 'les offres' : "l'annonce"}`
                )}
              </button>
            ) : (
              <button onClick={handleNext} disabled={!canProceed()} className={styles.primaryButton}>
                Suivant
              </button>
            )}
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <SuccessModal 
          message={successMessage} 
          onClose={() => setShowSuccessModal(false)} 
        />
      )}

      {showOfferEditModal && editingOffer && (
        <OfferEditModal
          skill={skillForNewOffer}
          offerToEdit={editingOffer}
          onClose={() => {
            setShowOfferEditModal(false);
            setEditingOffer(undefined);
            setSkillForNewOffer('');
          }}
          onSave={handleSaveOffer}
          aiAnalysis={aiAnalysis}
          currentSkills={editingOffer.skills || []}
        />
      )}

      {showAssignSkillModal && (
        <div className={styles.offerModalOverlay} onClick={() => setShowAssignSkillModal(false)}>
          <div className={styles.offerModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4>Assigner "{selectedSkillToAssign}" à quelle offre ?</h4>
              <button className={styles.closeButton} onClick={() => setShowAssignSkillModal(false)}>✕</button>
            </div>
            
            <div className={styles.offerList}>
              {offers.filter(o => o.id !== selectedCurrentOfferId).map(offer => (
                <div
                  key={offer.id}
                  className={`${styles.offerOption}`}
                  onClick={() => handleConfirmAssignmentFromModal(offer.id)}
                >
                  <div className={styles.offerHeader}>
                    <strong>{offer.title}</strong>
                    {offer.isAIGenerated && <span className={styles.aiLabel}>IA</span>}
                  </div>
                  <span className={styles.offerPreview}>{offer.description.substring(0, 80)}...</span>
                  <div className={styles.offerStats}>
                    <span className={styles.offerSkillCount}>{offer.skills?.length || 0} compétence(s)</span>
                  </div>
                </div>
              ))}
              
              <div
                className={`${styles.offerOption} ${styles.newOfferOption}`}
                onClick={() => handleConfirmAssignmentFromModal('new')}
              >
                <strong>+ Créer une nouvelle offre</strong>
                <span className={styles.offerPreview}>L'IA générera un titre basé sur cette compétence</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" onClick={() => setShowAssignSkillModal(false)} className={styles.cancelButton}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showOfferSuccessModal && (
        <div className={styles.successModalOverlay} onClick={() => setShowOfferSuccessModal(false)}>
          <div className={styles.successModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.successModalContent}>
              <h4>Succès !</h4>
              <p>{offerSuccessMessage}</p>
              <button 
                type="button" 
                onClick={() => setShowOfferSuccessModal(false)} 
                className={styles.successButton}
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TransformSkillToAnnonceModal;