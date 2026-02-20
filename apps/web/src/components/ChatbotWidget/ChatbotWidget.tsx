import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ChatbotWidget.module.css";

type ChatMessage = { role: "user" | "assistant"; content: string };

const CHAT_ENDPOINT = "http://localhost:3006/api/chat";
const SITE_CONTEXT = `
EduMate – Plateforme de mise en relation élèves/tuteurs.

🔍 Mise en relation intelligente
Trouvez rapidement un professeur qualifié en fonction de la matière, de votre budget, de votre localisation et de vos disponibilités.

💻 Cours en ligne et présentiel
Choisissez le mode qui vous convient : suivez vos cours à distance via visioconférence ou en face-à-face avec le professeur.

📊 Suivi personnalisé
Recevez un accompagnement adapté à vos besoins, avec un suivi des progrès, des recommandations de cours et des ressources adaptées à votre niveau.

⚖️ Comparateur intelligent
Comparez facilement plusieurs professeurs selon leur tarif, leurs compétences, leurs avis et leur expérience.

🎯 Espace étudiant intuitif
Un tableau de bord clair et intuitif pour gérer vos cours, vos paiements et vos favoris.

🛡️ Sécurité et fiabilité
Tous nos professeurs sont vérifiés pour vous garantir des cours de qualité en toute confiance.

Processus en 4 étapes :
1. Créez votre profil (élève ou tuteur)
2. Trouvez ou proposez une séance avec nos filtres intelligents
3. Réservez et payez en EduCoins (sécurisé et flexible)
4. Apprenez et progressez avec suivi personnalisé
`;

const STORAGE_KEY = "edumate_chat_history_v1";

const ChatbotWidget: React.FC = () => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
        role: "assistant",
        content:
            "Bonjour 👋 Je suis l'assistant EduMate. Posez-moi vos questions sur la plateforme, nos services, ou votre apprentissage. Je suis là pour vous aider !",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    // Charger l'historique depuis localStorage
    useEffect(() => {
        try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setMessages(JSON.parse(raw));
        } catch {}
    }, []);

    // Sauvegarder l'historique dans localStorage
    useEffect(() => {
        try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } catch {}
    }, [messages]);

    // Auto-scroll vers le dernier message
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Fermer avec Échap
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Parser les liens
    const parseMessageWithLinks = (text: string) => {
        const lines = text.split('\n');
        const parts: React.ReactNode[] = [];
        let keyIndex = 0;

        lines.forEach((line, lineIndex) => {
            if (!line.trim()) {
            parts.push(<br key={`br-${keyIndex++}`} />);
            return;
            }

            // Diviser la ligne par les marqueurs de gras __texte__
            const sections = line.split(/(__[^_]+__)/);
            const lineParts: React.ReactNode[] = [];

            sections.forEach((section) => {
            if (!section) return;

            // Si c'est un marqueur de gras
            if (section.startsWith('__') && section.endsWith('__')) {
                const boldText = section.slice(2, -2);
                lineParts.push(
                <strong key={`bold-${keyIndex++}`}>{boldText}</strong>
                );
                return;
            }

            // Traiter les liens |tuteur|tutorId|annonceId|
            const parts2 = section.split(/(\|tuteur\|[^|]+\|[^|]*\|)/);
            
            parts2.forEach((part) => {
                if (!part) return;

                // Vérifier si c'est un lien
                const linkMatch = part.match(/^\|tuteur\|(.+?)\|(.*)?\|$/);
                if (linkMatch) {
                const tutorId = linkMatch[1];
                const annonceId = linkMatch[2] || '';

                lineParts.push(
                    <a
                    key={`link-${keyIndex++}`}
                    href={`/tuteur/${tutorId}`}
                   onClick={(e) => {
                        e.preventDefault();
                        // Récupérer les données du tuteur depuis sessionStorage
                        const tutorKey = `tutor_data_${tutorId}`;
                        const tutorData = sessionStorage.getItem(tutorKey);
                        
                        if (tutorData) {
                            console.log('✅ Données tuteur trouvées pour navigation');
                            const tutor = JSON.parse(tutorData);
                            
                            // Stocker aussi dans la clé générique pour TutorProfilePage
                            sessionStorage.setItem('chatbot_tutor_data', JSON.stringify({
                            ...tutor,
                            tutorId,
                            annonceId,
                            fromChatbot: true
                            }));
                        } else {
                            console.log('⚠️ Aucune donnée tuteur, stockage minimal');
                            sessionStorage.setItem('chatbot_tutor_data', JSON.stringify({
                            tutorId,
                            annonceId,
                            fromChatbot: true,
                            fromSearch: true,
                            timestamp: Date.now()
                            }));
                        }
                        
                        navigate(`/tuteur/${tutorId}`, {
                            state: {
                            annonceId: annonceId || undefined,
                            fromSearch: true,
                            tutorId: tutorId,
                            fromChatbot: true
                            }
                        });
                        }}
                    style={{
                        color: '#3b82f6',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                    >
                    👉 Voir le profil complet
                    </a>
                );
                } else {
                lineParts.push(
                    <span key={`text-${keyIndex++}`}>{part}</span>
                );
                }
            });
            });

            parts.push(
            <div key={`line-${lineIndex}`} style={{ marginBottom: '4px' }}>
                {lineParts}
            </div>
            );
        });

        return <>{parts}</>;
    };

  // Réponses de fallback intelligentes
  const fallbackReply = (text: string): string => {
    const t = text.toLowerCase();
    
    if (t.includes("service") || t.includes("offre")) {
      return "📋 Nos Services :\n- 🔍 Mise en relation intelligente\n- 💻 Cours en ligne et présentiel\n- 📊 Suivi personnalisé\n- ⚖️ Comparateur intelligent\n- 🎯 Espace étudiant intuitif\n- 🛡️ Sécurité et fiabilité\n\nQuel service vous intéresse ?";
    }
    
    if (t.includes("educoin") || t.includes("paiement") || t.includes("recharge")) {
      return "💰 Système de Paiement EduCoins :\nLe paiement se fait via EduCoins :\n✅ Recharge simple par carte bancaire\n✅ Crédits sécurisés et flexibles\n✅ Libérés après la séance\n✅ Échange entre élèves et tuteurs\n\nVoulez-vous recharger vos crédits ?";
    }
    
    if (t.includes("inscription") || t.includes("profil") || t.includes("créer")) {
      return "📝 Créer votre Profil :\nInscrivez-vous en quelques clics !\n\n👨‍🎓 En tant qu'élève :\n- Indiquez votre niveau scolaire\n- Sélectionnez vos matières\n- Définissez vos objectifs\n\n👨‍🏫 En tant que tuteur :\n- Présentez votre parcours\n- Listez vos matières\n- Définissez vos disponibilités\n- Fixez votre tarif en EduCoins\n\nVous êtes élève ou tuteur ?";
    }
    
    if (t.includes("comment") || t.includes("fonctionn") || t.includes("marche")) {
      return "🎯 Comment ça Marche en 4 Étapes :\n\n1️⃣ Créez votre profil - Inscrivez-vous en quelques clics\n2️⃣ Trouvez une séance - Utilisez nos filtres ou l'IA\n3️⃣ Réservez - Payez en EduCoins sécurisés\n4️⃣ Apprenez - Progressez avec suivi personnalisé\n\nPrêt à commencer ?";
    }
    
    if (t.includes("tuteur") || t.includes("professeur") || t.includes("recherche")) {
      return "🔍 Rechercher un Tuteur :\nVous pouvez filtrer par :\n- 📚 Matière\n- 💵 Prix\n- 🌍 Localisation\n- 📅 Disponibilités\n- 🗣️ Langue\n\nChaque tuteur a sa fiche avec diplômes, expériences, notes et avis.\n\nVoulez-vous chercher un tuteur maintenant ?";
    }
    
    if (t.includes("sécurité") || t.includes("confiance") || t.includes("vérif")) {
      return "🛡️ Sécurité et Fiabilité :\n✅ Tous nos professeurs sont vérifiés\n✅ Cours de qualité garantie\n✅ Paiement sécurisé avec EduCoins\n✅ Crédits bloqués jusqu'à la fin du cours\n✅ Évaluations transparentes\n\nVotre confiance est notre priorité !";
    }

    return "Je peux répondre aux questions sur EduMate, nos services, les tuteurs, les réservations, EduCoins et bien plus. Que puis-je faire pour vous ?";
  };

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || loading) return;

        const userMsg: ChatMessage = { role: "user", content: trimmed };
        const history = [...messages, userMsg];

        setMessages(history);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch(CHAT_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: trimmed,
                history,
                context: SITE_CONTEXT,
            }),
            });

            if (!res.ok) throw new Error("bad_status");
            const data = await res.json().catch(() => ({}));
            const reply = data.reply || data.answer || data.content || data.message || null;

            // Stocker les données RAG si présentes
            if (data.ragResults && data.ragResults.tutors && data.ragResults.tutors.length > 0) {
            console.log('📦 Stockage des données RAG dans sessionStorage:', data.ragResults.tutors);
            // Stocker tous les tuteurs trouvés
            data.ragResults.tutors.forEach((tutor: any) => {
                const tutorKey = `tutor_data_${tutor.tutorId || tutor.id}`;
                sessionStorage.setItem(tutorKey, JSON.stringify(tutor));
            });
            }

            setMessages((prev) => [
            ...prev,
            { role: "assistant", content: reply || fallbackReply(trimmed) },
            ]);
        } catch (error) {
            setMessages((prev) => [
            ...prev,
            { role: "assistant", content: fallbackReply(trimmed) },
            ]);
        } finally {
            setLoading(false);
        }
        };

  return (
    <>
      {/* Bouton flottant - caché quand le chatbot est ouvert */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`${styles.toggleButton} ${open ? styles.hidden : ""}`}
        aria-label="Ouvrir le chatbot"
      >
        💬 Assistant
      </button>

      {/* Panneau du chatbot */}
      {open && (
        <aside className={styles.chatPanel}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.title}>EduMate Assistant</div>
            <button
              onClick={() => setOpen(false)}
              className={styles.closeButton}
              aria-label="Fermer"
            >
              ×
            </button>
          </header>

            {/* Messages */}
            <div className={styles.messagesContainer}>
                {messages.map((m, i) => (
                <div
                    key={i}
                    className={`${styles.messageWrapper} ${
                    m.role === "user" ? styles.userMessage : styles.assistantMessage
                    }`}
                >
                <div className={styles.messageBubble} style={{ whiteSpace: 'pre-wrap' }}>
                    {m.role === "assistant" 
                        ? parseMessageWithLinks(m.content)
                        : m.content
                    }
                    </div>
              </div>
            ))}
            {loading && (
              <div className={styles.loadingIndicator}>
                L'assistant réfléchit…
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className={styles.inputContainer}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Posez votre question…"
              className={styles.input}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className={styles.sendButton}
            >
              {loading ? "⏳" : "↑"}
            </button>
          </div>
        </aside>
      )}
    </>
  );
};

export default ChatbotWidget;