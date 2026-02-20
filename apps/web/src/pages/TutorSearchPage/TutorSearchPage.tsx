import React, { useState, useEffect, useRef } from 'react';
import styles from './TutorSearchPage.module.css';
import TutorCard from '../../components/TutorCard/TutorCard';
import SearchBar from '../../components/SearchBar/SearchBar';
import FiltersSidebar from '../../components/FiltersSideBar/FiltersSidebar';
import annonceService from '../../services/annonceService';
import type { AnnonceFromDB } from '../../services/annonceService';
import ragService from '../../services/rag-service';

export interface Annonce {
  id: string;
  tutorId: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  hourlyRate: number;
  teachingMode: string;
  location: any;
  availability: any;
  tutor: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      skillsToLearn?: string[];
    };
    rating: number;
    reviewsCount: number;
    profilePicture?: string;
    bio?: string;
    experience?: string;
    specialties: string[];
  };
}

export interface Filters {
  level: string;
  priceRange: [number, number];
  rating: number;
  availability: string;
  teachingMode: string;
  location: string;
}

const TutorSearchPage: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({
    level: '',
    priceRange: [7, 100],
    rating: 0,
    availability: '',
    teachingMode: '',
    location: ''
  });

  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSubjects, setFilteredSubjects] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAnnonces, setTotalAnnonces] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const annoncesPerPage = 9;
  
  const allSubjects: string[] = [
    'Mathématiques', 'Physique', 'Chimie', 'Français', 'Anglais',
    'Histoire-Géographie', 'SVT', 'Philosophie', 'Économie', 'Informatique',
    'Espagnol', 'Allemand', 'Italien', 'Latin', 'Grec ancien',
    'Sciences de l\'ingénieur', 'Technologie', 'Arts plastiques', 'Musique',
    'Éducation physique', 'Droit', 'Gestion', 'Marketing', 'Communication',
    'Programmation', 'Développement web', 'Intelligence artificielle',
    'Statistiques', 'Probabilités', 'Algèbre', 'Géométrie', 'Analyse',
    'Mécanique', 'Électricité', 'Optique', 'Thermodynamique',
    'Chimie organique', 'Biochimie', 'Géologie', 'Écologie'
  ];

  const levels: string[] = [
    'Primaire',
    'Collège', 
    'Lycée',
    'Prépa',
    'Licence',
    'Master', 
    'Doctorat'
  ];

  const teachingModes: string[] = ['En ligne', 'En présentiel', 'Les deux'];
  const availabilityOptions: string[] = ['Disponible maintenant', 'Cette semaine', 'Ce mois-ci'];

  // Fonction pour mapper les annonces vers le format Tutor
  const mapAnnonceToTutor = (annonce: AnnonceFromDB): any => {
    const specialties = annonce.subjects && annonce.subjects.length > 0 
      ? annonce.subjects 
      : ['Tutorat général'];

    const primarySubject = specialties[0];

    // Extraire les skillsToLearn du user
    const skillsToLearn = annonce.tutor?.user?.skillsToLearn || [];

    return {
      id: annonce.id,
      tutorId: annonce.tutorId,
      name: `${annonce.tutor?.user?.firstName || ''} ${annonce.tutor?.user?.lastName || ''}`.trim() || 'Tuteur Expert',
      annonceId: annonce.id,
      subject: primarySubject,
      subjects: specialties,
      rating: annonce.tutor?.rating || 4,
      reviews: annonce.tutor?.reviewsCount || 0,
      price: `🪙${annonce.hourlyRate || 30}`,
      emoji: "👨‍🏫",
      status: "Disponible",
      badge: getBadgeFromRating(annonce.tutor?.rating || 4),
      specialties: specialties,
      gradient: getGradientFromSubject(primarySubject),
      bio: annonce.tutor?.bio,
      experience: annonce.tutor?.experience,
      educationLevel: annonce.level,
      profilePicture: annonce.tutor?.profilePicture,
      // Ajouter les compétences recherchées depuis user
      skillsToLearn: Array.isArray(skillsToLearn) ? skillsToLearn : [],
      annonceData: {
        title: annonce.title,
        description: annonce.description,
        teachingMode: annonce.teachingMode,
        location: annonce.location
      }
    };
  };

  // Helper functions
  const getBadgeFromRating = (rating: number): string => {
    if (rating >= 4.8) return "Expert";
    if (rating >= 4.5) return "Populaire";
    if (rating >= 4.0) return "Nouveau";
    return "Free Trial";
  };

  const getGradientFromSubject = (subject: string): string => {
    const gradients = [
      "from-blue-500 to-indigo-500",
      "from-green-500 to-emerald-600", 
      "from-purple-500 to-pink-600",
      "from-orange-500 to-red-400",
      "from-cyan-400 to-sky-400",
      "from-amber-500 to-yellow-500",
      "from-teal-500 to-green-500",
      "from-gray-600 to-gray-800"
    ];
    
    const scienceSubjects = ['Physique', 'Chimie', 'SVT', 'Biologie', 'Mécanique'];
    const mathSubjects = ['Mathématiques', 'Algèbre', 'Géométrie', 'Analyse', 'Statistiques'];
    const languageSubjects = ['Français', 'Anglais', 'Espagnol', 'Allemand', 'Italien'];
    
    if (scienceSubjects.includes(subject)) return gradients[0];
    if (mathSubjects.includes(subject)) return gradients[1];
    if (languageSubjects.includes(subject)) return gradients[2];
    
    return gradients[Math.floor(Math.random() * gradients.length)];
  };

  // Récupérer les annonces avec recherche sémantique
  const fetchAnnonces = async (page: number = 1, subject?: string) => {
    setLoading(true);
    try {
      // DÉTERMINER LE MODE DE RECHERCHE
      const hasExplicitSearch = (subject || searchQuery || '').trim().length > 0;
      const query = (subject || searchQuery || '').trim();
      
      if (!hasExplicitSearch) {        
        const response = await annonceService.searchAnnonces({
          page: 1,
          limit: 100, // Limite très haute pour tout récupérer
          level: filters.level,
          minRating: filters.rating,
          maxPrice: filters.priceRange[1],
          minPrice: filters.priceRange[0],
          teachingMode: filters.teachingMode,
          location: filters.location
        });

        if (response.success && response.data?.annonces) {
          const dbAnnonces = response.data.annonces.map(mapAnnonceToTutor);
          setAnnonces(dbAnnonces);
          setTotalPages(1);
          setTotalAnnonces(dbAnnonces.length);
          setCurrentPage(1);
        }
      } else {
        // MODE SEARCH: Recherche sémantique RAG
        console.log('🔍 Mode SEARCH: recherche sémantique avec:', query);
        
        const response = await ragService.semanticSearch(
          query,
          {
            level: filters.level || undefined,
            minPrice: filters.priceRange[0],
            maxPrice: filters.priceRange[1],
            teachingMode: filters.teachingMode || undefined,
            location: filters.location || undefined
          },
          annoncesPerPage // Limite normale pour la recherche
        );

        if (response.success && response.data?.results) {
          const dbAnnonces = response.data.results.map((result: any) => 
            mapSemanticResultToTutor(result)
          );
          
          console.log('✅ SEARCH OK:', dbAnnonces.length, 'résultats');
          
          setAnnonces(dbAnnonces);
          setTotalPages(1);
          setTotalAnnonces(response.data.total || dbAnnonces.length);
          setCurrentPage(1);
        } else {
          // Fallback sur API traditionnelle si RAG échoue
          console.log('⚠️ RAG échoué, fallback API');
          const response = await annonceService.searchAnnonces({
            page: 1,
            limit: annoncesPerPage,
            subject: query,
            level: filters.level,
            minRating: filters.rating,
            maxPrice: filters.priceRange[1],
            minPrice: filters.priceRange[0],
            teachingMode: filters.teachingMode,
            location: filters.location
          });

          if (response.success && response.data?.annonces) {
            const dbAnnonces = response.data.annonces.map(mapAnnonceToTutor);
            setAnnonces(dbAnnonces);
            setTotalPages(response.data.totalPages || 1);
            setTotalAnnonces(response.data.totalAnnonces || 0);
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Erreur:', error.message);
      setAnnonces([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper pour transformer résultats RAG en format TutorCard
  const mapSemanticResultToTutor = (result: any): any => {
    const specialties = result.subjects && result.subjects.length > 0 
      ? result.subjects 
      : ['Tutorat général'];

    const primarySubject = specialties[0];

    return {
      id: result.annonceId,
      tutorId: result.tutorId,
      name: result.tutorName || 'Tuteur Expert',
      annonceId: result.annonceId,
      subject: primarySubject,
      subjects: specialties,
      rating: result.tutorRating || 4,
      reviews: 0,
      price: `🪙${result.hourlyRate || 30}`,
      emoji: "👨‍🏫",
      status: "Disponible",
      badge: getBadgeFromRating(result.tutorRating || 4),
      specialties: specialties,
      gradient: getGradientFromSubject(primarySubject),
      educationLevel: result.level,
      profilePicture: result.profilePicture || '', 
      skillsToLearn: Array.isArray(result.tutorSkillsToLearn) ? result.tutorSkillsToLearn : [],
      relevanceScore: result.relevanceScore,
      annonceData: {
        title: result.title,
        description: result.description,
        teachingMode: result.teachingMode,
        location: result.location
      }
    };
  };

  // Recherche principale
  const handleSearch = async (): Promise<void> => {
    await fetchAnnonces(1, searchQuery);
  };

  const handleReset = (): void => {
    setFilters({
      level: '',
      priceRange: [7, 100],
      rating: 0,
      availability: '',
      teachingMode: '',
      location: ''
    });
    setSearchQuery('');
    setCurrentPage(1);
    fetchAnnonces(1);
  };

  const handleSubjectSelect = (subject: string): void => {
    setSearchQuery(subject);
    setShowSuggestions(false);
    setCurrentPage(1);
    fetchAnnonces(1, subject);
  };

  const handleQuickSearch = (): void => {
    setCurrentPage(1);
    handleSearch();
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleQuickSearch();
    }
  };

  // Appliquer les filtres
  const handleApplyFilters = () => {
    setCurrentPage(1);
    handleSearch();
  };

  // Pagination
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      fetchAnnonces(page, searchQuery);
    }
  };

  // Chargement initial
  useEffect(() => {
    fetchAnnonces(1);
  }, []);

  // Générer les numéros de page
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <div className={styles.tutorSearchPage}>
      <div className={styles.searchHeader}>
        <div className={styles.headerText}>
          <h1>Trouvez votre tuteur</h1>
          <p>Des annonces de cours personnalisées pour vous accompagner dans votre réussite</p>
        </div>
      </div>

      <div className={`${styles.container} ${styles.mainContainer}`}>
        <div className={styles.layout}>
          <FiltersSidebar
            filters={filters}
            setFilters={setFilters}
            handleSearch={handleApplyFilters}
            handleReset={handleReset}
            loading={loading}
            levels={levels}
            teachingModes={teachingModes}
            availabilityOptions={availabilityOptions}
          />

          <div className={styles.mainContent}>
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              filteredSubjects={filteredSubjects}
              handleSubjectSelect={handleSubjectSelect}
              handleQuickSearch={handleQuickSearch}
              handleKeyPress={handleKeyPress}
              searchInputRef={searchInputRef}
            />

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={styles.filterToggle}
            >
              {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
            </button>

            {showFilters && (
              <div className={styles.mobileFilters}>
                <FiltersSidebar
                  filters={filters}
                  setFilters={setFilters}
                  handleSearch={handleApplyFilters}
                  handleReset={handleReset}
                  loading={loading}
                  levels={levels}
                  teachingModes={teachingModes}
                  availabilityOptions={availabilityOptions}
                  isMobile={true} 
                />
              </div>
            )}

            <div className={styles.resultsHeader}>
              <div className={styles.resultsInfo}>
                <h2 className={styles.resultsCount}>{totalAnnonces} annonces trouvées</h2>
                <p className={styles.resultsSubtitle}>
                  {searchQuery ? `Résultats pour "${searchQuery}"` : 'Toutes les annonces disponibles'}
                  {currentPage > 1 && ` - Page ${currentPage}`}
                </p>
              </div>
              <div className={styles.sortOptions}>
                <select className={styles.sortSelect}>
                  <option>Trier par: Pertinence</option>
                  <option>Note décroissante</option>
                  <option>Prix croissant</option>
                  <option>Prix décroissant</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className={styles.tutorsGrid}>
                {[...Array(annoncesPerPage)].map((_, i: number) => (
                  <div key={i} className={styles.skeletonLoader}>
                    <div className={styles.skeletonAvatar}></div>
                    <div className={`${styles.skeletonText} ${styles.short}`}></div>
                    <div className={`${styles.skeletonText} ${styles.medium}`}></div>
                    <div className={`${styles.skeletonText} ${styles.short}`}></div>
                  </div>
                ))}
              </div>
            ) : annonces.length > 0 ? (
              <>
                <div className={styles.tutorsGrid}>
                  {annonces.map((annonce: any) => (
                    <TutorCard key={annonce.annonceId} tutor={annonce} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button 
                      className={styles.paginationButton}
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Précédent
                    </button>
                    
                    {getPageNumbers().map(page => (
                      <button
                        key={page}
                        className={`${styles.paginationButton} ${currentPage === page ? styles.active : ''}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button 
                      className={styles.paginationButton}
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Suivant
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noResults}>
                <h3>Aucune annonce trouvée</h3>
                <p>Essayez de modifier vos critères de recherche ou vos filtres.</p>
                <div className={styles.noResultsActions}>
                  <button 
                    onClick={handleReset}
                    className={styles.resetButton}
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorSearchPage;