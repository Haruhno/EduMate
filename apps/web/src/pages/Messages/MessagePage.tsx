import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import styles from './MessagePage.module.css';
import messageService, { type Conversation, type Message, type User } from '../../services/messageService';
import authService from '../../services/authService';

interface OnlineUser {
  id: string;
  name: string;
  role: string;
  isOnline: boolean;
  lastSeen?: string;
  profilePicture?: string;
}

const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const messageMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const user = authService.getCurrentUser();
        if (!user) {
          navigate('/connexion');
          return;
        }
        setCurrentUser(user);

        await loadConversations();
        await loadOnlineUsers();
        
      } catch (error: any) {
        console.error('Erreur lors du chargement initial:', error);
        if (error?.response?.status === 401) {
          try { authService.logout(); } catch (e) {}
          navigate('/connexion');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [navigate]);

  // Fermer les menus quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (messageMenuRef.current && !messageMenuRef.current.contains(event.target as Node)) {
        setShowMessageMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const response = await messageService.getConversations(1, 50);
      if (response.success) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await messageService.getAllUsers();
      if (response.success) {
        // Filtrer uniquement les utilisateurs qui possèdent un profil (plusieurs formes possibles)
        const usersWithProfiles = (response.data || []).filter((user: any) => {
          if (!user) return false;
          // Exclure l'utilisateur courant si présent
          if (currentUser && user.id === currentUser.id) return false;

          // Vérifications robustes pour différentes formes de données côté backend
          const hasProfileFlag = !!user.hasProfile;
          const hasProfileObj = !!user.profile || !!user.profileTutor || !!user.profileStudent;
          const hasProfileId = !!user.profileId || !!user.profile_tutor_id || !!user.profile_student_id;

          return hasProfileFlag || hasProfileObj || hasProfileId;
        });

        const usersWithStatus = usersWithProfiles.map((user: any, index: number) => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          profilePicture:
            user.profilePicture ||
            user.profile?.profilePicture ||
            user.profileTutor?.profilePicture ||
            user.profileStudent?.profilePicture ||
            undefined,
          // Simple simulation du status en dev — tu peux remplacer par vrai statut socket
          isOnline: index % 3 !== 0,
          lastSeen: index % 3 === 0 ? 'Il y a 2h' : undefined
        }));
        setOnlineUsers(usersWithStatus);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  const startConversation = async (recipientId: string) => {
    try {
      setIsLoading(true);
      const response = await messageService.startConversation(recipientId);
      if (response.success) {
        setSelectedConversation(response.data);
        setMessages([]);
        await loadConversations();
        setActiveTab('chats');
      }
    } catch (error: any) {
      console.error('Erreur lors du démarrage de la conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    try {
      setIsLoading(true);
      setSelectedConversation(conversation);
      const response = await messageService.getMessages(conversation._id, 1, 100);
      if (response.success) {
        setMessages(response.data);
        await messageService.markAsRead(conversation._id);
        await loadConversations();
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageContent.trim() || !selectedConversation) return;

    try {
      setIsLoading(true);
      const response = await messageService.sendMessage(
        selectedConversation._id,
        messageContent
      );
      if (response.success) {
        setMessageContent('');
        await selectConversation(selectedConversation);
        await loadConversations();
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditMessage = (message: Message) => {
    setEditingMessageId(message._id);
    setEditContent(message.content);
    setShowMessageMenu(null);
  };

  const saveEditMessage = async () => {
      if (!editingMessageId || !editContent.trim()) return;

      try {
          setIsLoading(true);
          const response = await messageService.editMessage(editingMessageId, editContent);
          if (response.success) {
              // Mettre à jour localement le message
              setMessages(prevMessages =>
                  prevMessages.map(msg =>
                      msg._id === editingMessageId
                          ? { ...msg, content: editContent, edited: true, editedAt: new Date().toISOString() }
                          : msg
                  )
              );

              // Mettre à jour le lastMessage de la conversation dans la liste
              setConversations(prevConvs =>
                  prevConvs.map(conv => {
                      if (conv._id === selectedConversation?._id) {
                          // Vérifier si c'est le dernier message
                          const lastMsg = messages[messages.length - 1];
                          if (lastMsg && lastMsg._id === editingMessageId) {
                              return {
                                  ...conv,
                                  lastMessage: {
                                      ...conv.lastMessage,
                                      content: editContent + ' (modifié)'
                                  }
                              };
                          }
                      }
                      return conv;
                  })
              );

              setEditingMessageId(null);
              setEditContent('');
          }
      } catch (error: any) {
          console.error('Erreur lors de la modification du message:', error);
      } finally {
          setIsLoading(false);
      }
  };


  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const deleteMessage = async (messageId: string) => {
      try {
          setIsLoading(true);
          const response = await messageService.deleteMessage(messageId);
          if (response.success) {
              // Mettre à jour le message localement
              setMessages(prevMessages =>
                  prevMessages.map(msg =>
                      msg._id === messageId
                          ? { ...msg, content: 'Message supprimé', messageType: 'system' as const }
                          : msg
                  )
              );

              // Mettre à jour le lastMessage si c'était le dernier
              setConversations(prevConvs =>
                  prevConvs.map(conv => {
                      if (conv._id === selectedConversation?._id) {
                          const lastMsg = messages[messages.length - 1];
                          if (lastMsg && lastMsg._id === messageId) {
                              return {
                                  ...conv,
                                  lastMessage: {
                                      ...conv.lastMessage,
                                      content: 'Message supprimé'
                                  }
                              };
                          }
                      }
                      return conv;
                  })
              );

              setShowMessageMenu(null);
          }
      } catch (error: any) {
          console.error('Erreur lors de la suppression du message:', error);
      } finally {
          setIsLoading(false);
      }
  };


  const uploadImage = async (file: File) => {
    if (!selectedConversation) return;

    try {
      setIsUploading(true);
      const mediaUrl = await messageService.uploadFile(file);
      const response = await messageService.sendMessage(
        selectedConversation._id,
        file.name,
        'image',
        mediaUrl
      );
      
      if (response.success) {
        await selectConversation(selectedConversation);
        await loadConversations();
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedConversation) {
      if (file.type.startsWith('image/')) {
        uploadImage(file);
      } else {
        alert('Veuillez sélectionner une image');
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    if (editingMessageId) {
      setEditContent(prev => prev + emojiData.emoji);
    } else {
      setMessageContent(prev => prev + emojiData.emoji);
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    if (!currentUser) return null;
    return conversation.participants.find(p => p.userId !== currentUser.id);
  };

  const getLastMessage = (): Message | null => {
    if (messages.length === 0) return null;
    return messages[messages.length - 1];
  };

  const isLastMessage = (message: Message): boolean => {
    const lastMessage = getLastMessage();
    return lastMessage ? lastMessage._id === message._id : false;
  };

  const isLastMessageRead = (): boolean => {
    const lastMessage = getLastMessage();
    if (!lastMessage || !currentUser || lastMessage.senderId !== currentUser.id) return false;
    
    const otherParticipant = getOtherParticipant(selectedConversation!);
    if (!otherParticipant) return false;

    return lastMessage.readBy.some(read => read.userId === otherParticipant.userId);
  };

  const getLastMessageReadTimestamp = (): string | null => {
    const lastMessage = getLastMessage();
    if (!lastMessage || !currentUser || lastMessage.senderId !== currentUser.id) return null;
    
    const otherParticipant = getOtherParticipant(selectedConversation!);
    if (!otherParticipant) return null;

    const readByOther = lastMessage.readBy.find(read => read.userId === otherParticipant.userId);
    return readByOther ? readByOther.readAt : null;
  };

  const formatReadTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const goToProfile = async (userId: string, userRole: string) => {
    try {
      if (userRole === 'student') return;
      if (userRole === 'tutor') {
        const response = await messageService.getTutorProfileByUserId(userId);
        if (response.success && response.data) {
          navigate(`/tuteur/${response.data.id}`);
        }
      }
    } catch (error) {
      console.error('Erreur navigation profil:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        saveEditMessage();
      } else {
        sendMessage();
      }
    }
  };

  const filteredConversations = conversations.filter(conversation => {
    const otherParticipant = getOtherParticipant(conversation);
    return otherParticipant?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           otherParticipant?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conversation.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredContacts = onlineUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && !conversations.length) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Chargement de vos messages...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        {/* En-tête utilisateur */}
        <div className={styles.userHeader}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {`${currentUser?.firstName?.[0] || ''}${currentUser?.lastName?.[0] || ''}`}
            </div>
            <div className={styles.userDetails}>
              <h3>{currentUser?.firstName} {currentUser?.lastName}</h3>
              <span className={styles.userStatus}>En ligne</span>
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className={styles.searchContainer}>
          <div className={styles.searchBox}>
            <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="#666">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className={styles.tabNavigation}>
          <button
            className={`${styles.tab} ${activeTab === 'chats' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            Conversations
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'contacts' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('contacts')}
          >
            Contacts
          </button>
        </div>

        {/* Liste des conversations/contacts */}
        <div className={styles.listContainer}>
          {activeTab === 'chats' ? (
            <>
              {filteredConversations.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>💬</div>
                  <h4>Aucune conversation</h4>
                </div>
              ) : (
                filteredConversations.map(conversation => {
                  const otherParticipant = getOtherParticipant(conversation);
                  const isUnread = conversation.unreadCount > 0;
                  
                  return (
                    <div
                      key={conversation._id}
                      className={`${styles.conversationItem} ${
                        selectedConversation?._id === conversation._id ? styles.activeConversation : ''
                      }`}
                      onClick={() => selectConversation(conversation)}
                    >
                      <div className={styles.avatarContainer}>
                        <div className={styles.conversationAvatar}>
                          {otherParticipant?.firstName?.[0] || 'U'}
                        </div>
                        {isUnread && <div className={styles.unreadIndicator}></div>}
                      </div>
                      <div className={styles.conversationInfo}>
                        <div className={styles.conversationHeader}>
                          <h4 className={styles.conversationName}>
                            {otherParticipant 
                              ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
                              : 'Utilisateur inconnu'
                            }
                          </h4>
                          <span className={styles.messageTime}>
                            {formatTime(conversation.updatedAt)}
                          </span>
                        </div>
                        <div className={styles.conversationPreview}>
                          <p className={`${styles.lastMessage} ${isUnread ? styles.unreadMessage : ''}`}>
                            {conversation.lastMessage?.content || 'Aucun message'}
                          </p>
                          {isUnread && (
                            <div className={styles.unreadBadge}>
                              {conversation.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          ) : (
            <>
              {filteredContacts.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>👥</div>
                  <h4>Aucun contact</h4>
                </div>
              ) : (
                filteredContacts.map(user => (
                  <div
                    key={user.id}
                    className={styles.contactItem}
                  >
                    <div className={styles.avatarContainer}>
                      <div className={styles.contactAvatar}>
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className={`${styles.statusIndicator} ${user.isOnline ? styles.online : styles.offline}`}></div>
                    </div>
                    <div className={styles.contactInfo}>
                      <h4 className={styles.contactName}>
                        {user.name}
                      </h4>
                      <span className={styles.contactRole}>{user.role}</span>
                    </div>
                    <button 
                      className={styles.messageButton} 
                      onClick={() => startConversation(user.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Zone de conversation principale */}
      <div className={styles.mainContent}>
        {selectedConversation ? (
          <>
            {/* En-tête de conversation */}
            <div className={styles.conversationHeader}>
              <div className={styles.conversationPartner}>
                <div 
                  className={styles.partnerAvatar}
                  onClick={() => {
                    const otherParticipant = getOtherParticipant(selectedConversation);
                    if (otherParticipant) {
                      goToProfile(otherParticipant.userId, otherParticipant.userType);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                  title="Voir le profil"
                >
                  {(() => {
                    const otherParticipant = getOtherParticipant(selectedConversation);
                    return otherParticipant?.firstName?.[0] || 'U';
                  })()}
                </div>
                <div className={styles.partnerInfo}>
                  <h3 
                    className={styles.partnerName}
                    onClick={() => {
                      const otherParticipant = getOtherParticipant(selectedConversation);
                      if (otherParticipant) {
                        goToProfile(otherParticipant.userId, otherParticipant.userType);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Voir le profil"
                  >
                    {getOtherParticipant(selectedConversation) 
                      ? `${getOtherParticipant(selectedConversation)?.firstName} ${getOtherParticipant(selectedConversation)?.lastName}`
                      : 'Utilisateur inconnu'
                    }
                  </h3>
                  <span className={styles.partnerStatus}>En ligne</span>
                </div>
              </div>
            </div>

            {/* Zone des messages */}
            <div className={styles.messagesContainer}>
              {messages.length === 0 ? (
                <div className={styles.emptyMessages}>
                  <div className={styles.emptyMessagesIcon}>💬</div>
                  <h3>Aucun message</h3>
                  <p>Envoyez le premier message</p>
                </div>
              ) : (
                messages.map(message => {
                  const isLastMessageOfConversation = isLastMessage(message);
                  const isRead = isLastMessageOfConversation && isLastMessageRead();
                  const readTimestamp = isLastMessageOfConversation ? getLastMessageReadTimestamp() : null;
                  const isDeleted = message.messageType === 'system' && message.content === 'Message supprimé';
                  const isMyMessage = message.senderId === currentUser?.id;
                  
                  return (
                    <div
                      key={message._id}
                      className={`${styles.message} ${
                        isMyMessage ? styles.sent : styles.received
                      }`}
                    >
                      {editingMessageId === message._id ? (
                        <div className={styles.editContainer}>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className={styles.editInput}
                            autoFocus
                          />
                          <div className={styles.editActions}>
                            <button onClick={cancelEdit} className={styles.cancelButton}>
                              Annuler
                            </button>
                            <button 
                              onClick={saveEditMessage} 
                              className={styles.saveButton}
                              disabled={!editContent.trim()}
                            >
                              Enregistrer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={styles.messageContent}>
                            {message.messageType === 'image' && message.mediaUrl ? (
                              <div className={styles.imageMessageWrapper}>
                                <img 
                                  src={message.mediaUrl} 
                                  alt="Image envoyée" 
                                  className={styles.imageMessage}
                                  onClick={() => window.open(message.mediaUrl, '_blank')}
                                />
                              </div>
                            ) : (
                              <div className={styles.messageText}>
                                {message.content}
                                {message.edited && (
                                  <span className={styles.editedBadge} title={`Modifié le ${new Date(message.editedAt!).toLocaleString('fr-FR')}`}>
                                    (modifié)
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Menu des trois points pour les messages de l'utilisateur */}
                            {isMyMessage && !isDeleted && (
                              <div className={styles.messageMenuContainer} ref={messageMenuRef}>
                                <button 
                                  className={styles.messageMenuButton}
                                  onClick={() => setShowMessageMenu(
                                    showMessageMenu === message._id ? null : message._id
                                  )}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                                  </svg>
                                </button>
                                
                                {showMessageMenu === message._id && (
                                  <div className={styles.messageMenu}>
                                    <button 
                                      className={styles.messageMenuItem}
                                      onClick={() => startEditMessage(message)}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                      </svg>
                                      Modifier
                                    </button>
                                    <button 
                                      className={styles.messageMenuItem}
                                      onClick={() => deleteMessage(message._id)}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                      </svg>
                                      Supprimer
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className={styles.messageFooter}>
                            <div className={styles.messageTime}>
                              {formatMessageTime(message.createdAt)}
                            </div>
                            {isMyMessage && isLastMessageOfConversation && (
                              <div className={styles.messageStatus}>
                                {isRead ? (
                                  <div className={styles.seenIndicator}>
                                    <span className={styles.seenText}>Vu</span>
                                    {readTimestamp && (
                                      <span 
                                        className={styles.seenTime}
                                        title={`Lu à ${formatReadTime(readTimestamp)}`}
                                      >
                                        • {formatReadTime(readTimestamp)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className={styles.sentIndicator}>
                                    <span className={styles.sentText}>Envoyé</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Zone de saisie */}
            <div className={styles.inputContainer}>
              <div className={styles.inputActions}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                
                <button 
                  className={styles.attachmentButton} 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <div className={styles.uploadingSpinner}></div>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/>
                    </svg>
                  )}
                </button>
                
                <div className={styles.emojiPickerContainer} ref={emojiPickerRef}>
                  <button 
                    className={styles.emojiButton}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                    </svg>
                  </button>
                  
                  {showEmojiPicker && (
                    <div className={styles.emojiPicker}>
                      <EmojiPicker 
                        onEmojiClick={onEmojiClick}
                        searchDisabled={false}
                        skinTonesDisabled={true}
                        height={350}
                        width={300}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.messageInputWrapper}>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tapez votre message..."
                  className={styles.messageInput}
                  rows={1}
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={sendMessage}
                className={styles.sendButton}
                disabled={!messageContent.trim() || isLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2v7z"/>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className={styles.noConversationSelected}>
            <div className={styles.welcomeIllustration}>
              <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
                <circle cx="100" cy="100" r="80" fill="#FBBF24" fillOpacity="0.1"/>
                <circle cx="100" cy="100" r="60" fill="#FBBF24" fillOpacity="0.2"/>
                <path d="M80 120C80 120 90 100 100 100C110 100 120 120 120 120" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="85" cy="90" r="5" fill="#F59E0B"/>
                <circle cx="115" cy="90" r="5" fill="#F59E0B"/>
                <path d="M70 70C70 70 80 60 100 60C120 60 130 70 130 70" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2>Bienvenue dans la messagerie</h2>
            <p>Sélectionnez une conversation ou démarrez-en une nouvelle</p>
            <button 
              className={styles.startChatButton}
              onClick={() => setActiveTab('contacts')}
            >
              Commencer une conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;