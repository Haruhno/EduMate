import React, { useState } from 'react';
import styles from './ReviewModal.module.css';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (review: ReviewData) => Promise<void>;
  reviewerType: 'tutor' | 'student';
  targetName: string;
  bookingId: string;
  targetUserId: string; // L'ID de l'utilisateur à évaluer
}

export interface ReviewData {
  targetUserId: string;
  comment: string;
  rating?: number;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  reviewerType,
  targetName,
  bookingId,
  targetUserId
}) => {
  const [step, setStep] = useState<'form' | 'confirmation'>('form');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmitForm = async () => {
    setError('');

    if (!comment.trim()) {
      setError('Veuillez saisir un avis');
      return;
    }

    if (reviewerType === 'student' && rating === 0) {
      setError('Veuillez donner une note (1-5 étoiles)');
      return;
    }

    // Aller à l'étape de confirmation
    setStep('confirmation');
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const reviewData: ReviewData = {
        targetUserId,
        comment,
        rating: reviewerType === 'student' ? rating : undefined
      };

      await onSubmit(reviewData);
      
      // Reset et fermer
      setComment('');
      setRating(0);
      setStep('form');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setComment('');
    setRating(0);
    setError('');
    setStep('form');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>
            {step === 'form' ? 'Confirmer le cours' : 'Êtes-vous sûr?'}
          </h2>
          <button
            className={styles.closeBtn}
            onClick={handleCancel}
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        {step === 'form' && (
          <>
            <div className={styles.body}>
              <div className={styles.section}>
                <label className={styles.label}>
                  Avis sur {targetName}
                </label>
                <textarea
                  className={styles.textarea}
                  placeholder="Partagez votre expérience avec ce cours..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  disabled={isLoading}
                />
                <div className={styles.charCount}>
                  {comment.length}/500
                </div>
              </div>

              {reviewerType === 'student' && (
                <>
                  <div className={styles.section}>
                    <label className={styles.label}>Note (1-5 étoiles)</label>
                    <div className={styles.ratingContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          className={`${styles.star} ${star <= rating ? styles.active : ''}`}
                          onClick={() => setRating(star)}
                          disabled={isLoading}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <p className={styles.ratingValue}>{rating}/5</p>
                    )}
                  </div>
                </>
              )}

              {error && (
                <div className={styles.error}>{error}</div>
              )}
            </div>

            <div className={styles.footer}>
              <button
                className={styles.btnCancel}
                onClick={handleCancel}
                disabled={isLoading}
              >
                Annuler
              </button>
              <button
                className={styles.btnSubmit}
                onClick={handleSubmitForm}
                disabled={isLoading || !comment.trim()}
              >
                {isLoading ? 'Traitement...' : 'Suivant'}
              </button>
            </div>
          </>
        )}

        {step === 'confirmation' && (
          <>
            <div className={styles.body}>
              <div className={styles.confirmationContent}>
                <p className={styles.confirmationText}>
                  ⚠️ Êtes-vous sûr(e) de votre avis?
                </p>
                <p className={styles.confirmationDesc}>
                  Une fois confirmé, cet avis ne pourra pas être modifié.
                </p>
                
                <div className={styles.reviewSummary}>
                  <h3>Résumé de votre avis</h3>
                  <p className={styles.summaryComment}>
                    <strong>Avis:</strong> {comment}
                  </p>
                  {reviewerType === 'student' && (
                    <p className={styles.summaryRating}>
                      <strong>Note:</strong> {'★'.repeat(rating)}{' '}
                      {rating}/5
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className={styles.error}>{error}</div>
              )}
            </div>

            <div className={styles.footer}>
              <button
                className={styles.btnCancel}
                onClick={() => setStep('form')}
                disabled={isLoading}
              >
                Retour
              </button>
              <button
                className={styles.btnConfirm}
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? 'Confirmation...' : 'Confirmer définitivement'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;
