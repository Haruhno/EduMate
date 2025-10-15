import React, { useState, useEffect, useRef } from 'react';
import styles from './TutorSearchPage.module.css';
import TutorCard from '../../components/TutorCard/TutorCard';
import SearchBar from '../../components/SearchBar/SearchBar';
import FiltersSidebar from '../../components/FiltersSideBar/FiltersSidebar';

export interface Tutor {
  id: number;
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
}

export interface Filters {
  level: string;
  priceRange: [number, number];
  rating: number;
  availability: string;
  teachingMode: string;
  location: string;
}

// Données mock directement dans le fichier
const mockTutors: Tutor[] = [
  {
    id: 1,
    name: "Mr. Chibani",
    subject: "Professeur en informatique",
    rating: 5,
    reviews: 128,
    price: "€100",
    emoji: "👨‍🏫",
    status: "En ligne",
    badge: "Free Trial",
    specialties: ["Python", "JavaScript", "Algorithmes", "Base de données"],
    gradient: "from-blue-500 to-indigo-500"
  },
  {
    id: 2,
    name: "Dr. Sarah Chen",
    subject: "Mathématiques avancées",
    rating: 5,
    reviews: 89,
    price: "€85",
    emoji: "👩‍🔬",
    status: "Disponible",
    badge: "Populaire",
    specialties: ["Algèbre", "Analyse", "Statistiques", "Probabilités"],
    gradient: "from-green-500 to-emerald-600"
  },
  {
    id: 3,
    name: "Prof. Martinez",
    subject: "Physique & Chimie",
    rating: 5,
    reviews: 67,
    price: "€75",
    emoji: "👨‍🔬",
    status: "En ligne",
    badge: "Nouveau",
    specialties: ["Mécanique", "Thermodynamique", "Chimie organique"],
    gradient: "from-purple-500 to-pink-600"
  },
  {
    id: 4,
    name: "Mme. Dubois",
    subject: "Langues étrangères",
    rating: 5,
    reviews: 203,
    price: "€65",
    emoji: "👩‍🏫",
    status: "Disponible",
    badge: "Économique",
    specialties: ["Anglais", "Espagnol", "Préparation examens"],
    gradient: "from-orange-500 to-red-400"
  },
  {
    id: 5,
    name: "Mr. Tanaka",
    subject: "Sciences économiques",
    rating: 5,
    reviews: 156,
    price: "€90",
    emoji: "👨‍💼",
    status: "En ligne",
    badge: "Expert",
    specialties: ["Microéconomie", "Macroéconomie", "Finance"],
    gradient: "from-cyan-400 to-sky-400"
  },
  {
    id: 6,
    name: "Dr. Laurent",
    subject: "Philosophie & Lettres",
    rating: 5,
    reviews: 94,
    price: "€70",
    emoji: "👨‍🎓",
    status: "Disponible",
    badge: "Mentor",
    specialties: ["Dissertation", "Culture générale", "Méthodologie"],
    gradient: "from-amber-500 to-yellow-500"
  },
  {
    id: 7,
    name: "Mme. Kowalski",
    subject: "Biologie & Médecine",
    rating: 5,
    reviews: 78,
    price: "€95",
    emoji: "👩‍⚕️",
    status: "En ligne",
    badge: "Expert",
    specialties: ["Anatomie", "Physiologie", "Biochimie", "Génétique"],
    gradient: "from-teal-500 to-green-500"
  },
  {
    id: 8,
    name: "Mr. Schmidt",
    subject: "Ingénierie",
    rating: 5,
    reviews: 112,
    price: "€110",
    emoji: "👨‍🔧",
    status: "Disponible",
    badge: "Populaire",
    specialties: ["Mécanique", "Électricité", "Automatisme", "Robotique"],
    gradient: "from-gray-600 to-gray-800"
  },
  {
    id: 9,
    name: "Dr. Garcia",
    subject: "Chimie avancée",
    rating: 5,
    reviews: 63,
    price: "€80",
    emoji: "👨‍🔬",
    status: "En ligne",
    badge: "Nouveau",
    specialties: ["Chimie organique", "Chimie analytique", "Spectroscopie"],
    gradient: "from-purple-600 to-indigo-600"
  }
];

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
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Toutes les matières disponibles
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

  // Filtrage des matières qui commencent par la recherche
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSubjects(allSubjects.slice(0, 8));
      setShowSuggestions(false);
    } else {
      const filtered = allSubjects.filter(subject =>
        subject.toLowerCase().startsWith(searchQuery.toLowerCase())
      );
      setFilteredSubjects(filtered.slice(0, 10));
      setShowSuggestions(true);
    }
  }, [searchQuery]);

  // Fermer les suggestions quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (): Promise<void> => {
    setLoading(true);
    setTimeout(() => {
      setTutors(mockTutors);
      setLoading(false);
    }, 1000);
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
  };

  const handleSubjectSelect = (subject: string): void => {
    setSearchQuery(subject);
    setShowSuggestions(false);
  };

  const handleQuickSearch = (): void => {
    if (searchQuery.trim()) {
      handleSearch();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleQuickSearch();
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  return (
    <div className={styles.tutorSearchPage}>
      {/* Header */}
      <div className={styles.searchHeader}>
        <div className={styles.headerText}>
          <h1>Trouvez votre tuteur</h1>
          <p>Des tuteurs experts pour vous accompagner dans votre réussite</p>
        </div>
      </div>

      <div className={`${styles.container} ${styles.mainContainer}`}>
        <div className={styles.layout}>
          {/* Sidebar Filtres */}
          <FiltersSidebar
            filters={filters}
            setFilters={setFilters}
            handleSearch={handleSearch}
            handleReset={handleReset}
            loading={loading}
            levels={levels}
            teachingModes={teachingModes}
            availabilityOptions={availabilityOptions}
          />

          {/* Contenu principal */}
          <div className={styles.mainContent}>
            {/* Barre de recherche */}
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

            {/* Bouton filtres mobile */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={styles.filterToggle}
            >
              {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
            </button>

            {/* Filtres mobile */}
            {showFilters && (
              <div className={styles.mobileFilters}>
                <FiltersSidebar
                  filters={filters}
                  setFilters={setFilters}
                  handleSearch={handleSearch}
                  handleReset={handleReset}
                  loading={loading}
                  levels={levels}
                  teachingModes={teachingModes}
                  availabilityOptions={availabilityOptions}
                  isMobile={true} 
                />
              </div>
            )}

            {/* Résultats */}
            <div className={styles.resultsHeader}>
              <div className={styles.resultsInfo}>
                <h2 className={styles.resultsCount}>{tutors.length} tuteurs trouvés</h2>
                <p className={styles.resultsSubtitle}>
                  {searchQuery ? `Résultats pour "${searchQuery}"` : 'Tous les tuteurs disponibles'}
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

            {/* Grille des tuteurs */}
            {loading ? (
              <div className={styles.tutorsGrid}>
                {[...Array(6)].map((_, i: number) => (
                  <div key={i} className={styles.skeletonLoader}>
                    <div className={styles.skeletonAvatar}></div>
                    <div className={`${styles.skeletonText} ${styles.short}`}></div>
                    <div className={`${styles.skeletonText} ${styles.medium}`}></div>
                    <div className={`${styles.skeletonText} ${styles.short}`}></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.tutorsGrid}>
                {tutors.map((tutor: Tutor) => (
                  <TutorCard key={tutor.id} tutor={tutor} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {tutors.length > 0 && (
              <div className={styles.pagination}>
                <button className={styles.paginationButton}>Précédent</button>
                <button className={`${styles.paginationButton} ${styles.active}`}>1</button>
                <button className={styles.paginationButton}>2</button>
                <button className={styles.paginationButton}>3</button>
                <button className={styles.paginationButton}>Suivant</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorSearchPage;