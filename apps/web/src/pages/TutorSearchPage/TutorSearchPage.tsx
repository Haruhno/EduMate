// TutorSearchPage.tsx - VERSION CORRIGÉE SANS BOUTON TEST
import React, { useState, useEffect, useRef } from 'react';
import styles from './TutorSearchPage.module.css';
import TutorCard from '../../components/TutorCard/TutorCard';
import SearchBar from '../../components/SearchBar/SearchBar';
import FiltersSidebar from '../../components/FiltersSideBar/FiltersSidebar';
import tutorService from '../../services/tutorService';
import type { TutorFromDB } from '../../services/tutorService';


export interface Tutor {
  id: string;
  name: string;
  subject: string;
  rating: number;
  reviews: number;
  price: string;
  emoji: string;
  status: string;
  badge: string;
  specialties: string[];
  gradient: string;
  bio?: string;
  experience?: string;
  educationLevel?: string;
  profilePicture?: string;
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

  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSubjects, setFilteredSubjects] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTutors, setTotalTutors] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const tutorsPerPage = 9;
  
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
    'Collège', 'Seconde', 'Première', 'Terminale', 'Licence', 'Master', 'Doctorat'
  ];

  const teachingModes: string[] = ['En ligne', 'En présentiel', 'Les deux'];
  const availabilityOptions: string[] = ['Disponible maintenant', 'Cette semaine', 'Ce mois-ci'];

  // Fonction pour mapper les données de la BDD vers le format frontend
  const mapTutorFromDB = (tutor: TutorFromDB): Tutor => {
    const availability = typeof tutor.availability === 'string' 
      ? JSON.parse(tutor.availability) 
      : tutor.availability;
    
    return {
      id: tutor.id,
      name: `${tutor.user?.firstName || ''} ${tutor.user?.lastName || ''}`.trim() || 'Tuteur Expert',
      subject: tutor.specialties?.[0] || 'Tutorat général',
      rating: tutor.rating || 4,
      reviews: tutor.reviewsCount || 0,
      price: `€${tutor.hourlyRate || 30}`,
      emoji: "👨‍🏫",
      status: availability?.online ? "En ligne" : "Disponible",
      badge: getBadgeFromRating(tutor.rating || 4),
      specialties: tutor.specialties || [],
      gradient: getGradientFromSpecialties(tutor.specialties || []),
      bio: tutor.bio,
      experience: tutor.experience,
      educationLevel: tutor.educationLevel,
      profilePicture: tutor.profilePicture
    };
  };

  // Récupérer les tuteurs avec pagination et filtres
  const fetchTutors = async (page: number = 1, subject?: string) => {
    setLoading(true);
    try {
      const response = await tutorService.searchTutors({
        page,
        limit: tutorsPerPage,
        subject: subject || searchQuery,
        level: filters.level,
        minRating: filters.rating,
        maxPrice: filters.priceRange[1],
        teachingMode: filters.teachingMode,
        location: filters.location
      });

      if (response.success) {
        const dbTutors = response.data.tutors.map(mapTutorFromDB);
        
        console.log('Tutors from DB:', dbTutors);
        
        setTutors(dbTutors);
        setTotalPages(response.data.totalPages || 1);
        setTotalTutors(response.data.totalTutors || 0);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des tuteurs:', error);
      setTutors([]);
      setTotalPages(1);
      setTotalTutors(0);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getBadgeFromRating = (rating: number): string => {
    if (rating >= 4.8) return "Expert";
    if (rating >= 4.5) return "Populaire";
    if (rating >= 4.0) return "Nouveau";
    return "Free Trial";
  };

  const getGradientFromSpecialties = (specialties: string[]): string => {
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
    
    if (specialties.some(s => scienceSubjects.includes(s))) return gradients[0];
    if (specialties.some(s => mathSubjects.includes(s))) return gradients[1];
    if (specialties.some(s => languageSubjects.includes(s))) return gradients[2];
    
    return gradients[Math.floor(Math.random() * gradients.length)];
  };

  // Gestion des suggestions de recherche
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSubjects(allSubjects.slice(0, 8));
      setShowSuggestions(false);
    } else {
      const filtered = allSubjects.filter(subject =>
        subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSubjects(filtered.slice(0, 10));
      setShowSuggestions(true);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recherche principale
  const handleSearch = async (): Promise<void> => {
    await fetchTutors(1, searchQuery);
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
    fetchTutors(1);
  };

  const handleSubjectSelect = (subject: string): void => {
    setSearchQuery(subject);
    setShowSuggestions(false);
    setCurrentPage(1);
    fetchTutors(1, subject);
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
      fetchTutors(page, searchQuery);
    }
  };

  // Chargement initial
  useEffect(() => {
    fetchTutors(1);
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
          <p>Des tuteurs experts pour vous accompagner dans votre réussite</p>
        </div>
        {/* Bouton de test supprimé */}
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
                <h2 className={styles.resultsCount}>{totalTutors} tuteurs trouvés</h2>
                <p className={styles.resultsSubtitle}>
                  {searchQuery ? `Résultats pour "${searchQuery}"` : 'Tous les tuteurs disponibles'}
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
                {[...Array(tutorsPerPage)].map((_, i: number) => (
                  <div key={i} className={styles.skeletonLoader}>
                    <div className={styles.skeletonAvatar}></div>
                    <div className={`${styles.skeletonText} ${styles.short}`}></div>
                    <div className={`${styles.skeletonText} ${styles.medium}`}></div>
                    <div className={`${styles.skeletonText} ${styles.short}`}></div>
                  </div>
                ))}
              </div>
            ) : tutors.length > 0 ? (
              <>
                <div className={styles.tutorsGrid}>
                  {tutors.map((tutor: Tutor) => (
                    <TutorCard key={tutor.id} tutor={tutor} />
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
                <h3>Aucun tuteur trouvé</h3>
                <p>Essayez de modifier vos critères de recherche ou vos filtres.</p>
                <div className={styles.noResultsActions}>
                  <button 
                    onClick={handleReset}
                    className={styles.resetButton}
                  >
                    Réinitialiser les filtres
                  </button>
                  {/* Bouton de test supprimé ici aussi */}
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