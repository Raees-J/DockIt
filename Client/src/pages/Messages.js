import React, { useEffect, useState, useRef } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { getSocket, connectSocket, disconnectSocket } from '../utils/socket';
import api from '../utils/api';
import './Messages.css';

const Messages = () => {
  const { projects, fetchProjects, currentProject, setCurrentProject } = useProjects();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [chatMode, setChatMode] = useState('projects'); // 'projects' or 'direct'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchProjects();
    connectSocket();
    socketRef.current = getSocket();

    // Join user's personal room for direct messages
    if (user) {
      socketRef.current.emit('join-dm', user._id);
    }

    return () => {
      if (currentProject) {
        socketRef.current.emit('leave-project', currentProject._id);
      }
      disconnectSocket();
    };
  }, [fetchProjects, user]);

  useEffect(() => {
    if (chatMode === 'projects') {
      if (projects.length > 0 && !currentProject) {
        setCurrentProject(projects[0]);
      }
    } else {
      loadConversations();
    }
  }, [projects, currentProject, setCurrentProject, chatMode]);

  useEffect(() => {
    if (chatMode === 'projects' && currentProject && socketRef.current) {
      // Leave previous room
      socketRef.current.emit('leave-project', currentProject._id);
      
      // Join new room
      socketRef.current.emit('join-project', currentProject._id);

      // Listen for existing messages
      socketRef.current.on('existing-messages', (msgs) => {
        setMessages(msgs);
      });

      // Listen for new messages
      socketRef.current.on('new-message', (message) => {
        setMessages(prev => [...prev, message]);
      });

      // Listen for typing indicator
      socketRef.current.on('user-typing', ({ userName }) => {
        setTypingUser(userName);
        setTyping(true);
        setTimeout(() => setTyping(false), 3000);
      });

      socketRef.current.on('user-stop-typing', () => {
        setTyping(false);
        setTypingUser('');
      });

      // Load messages from API as backup
      loadMessages();
    }

    if (chatMode === 'direct' && selectedUser && socketRef.current) {
      // Listen for new direct messages
      socketRef.current.on('new-direct-message', (message) => {
        if (
          (message.sender._id === selectedUser._id && message.recipient._id === user._id) ||
          (message.sender._id === user._id && message.recipient._id === selectedUser._id)
        ) {
          setMessages(prev => [...prev, message]);
        }
        loadConversations(); // Refresh conversation list
      });

      // Listen for typing in DM
      socketRef.current.on('dm-user-typing', ({ senderName }) => {
        setTypingUser(senderName);
        setTyping(true);
        setTimeout(() => setTyping(false), 3000);
      });

      socketRef.current.on('dm-user-stop-typing', () => {
        setTyping(false);
        setTypingUser('');
      });

      loadDirectMessages();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('existing-messages');
        socketRef.current.off('new-message');
        socketRef.current.off('user-typing');
        socketRef.current.off('user-stop-typing');
        socketRef.current.off('new-direct-message');
        socketRef.current.off('dm-user-typing');
        socketRef.current.off('dm-user-stop-typing');
      }
    };
  }, [currentProject, selectedUser, chatMode]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!currentProject) return;
    try {
      const response = await api.get(`/api/messages/${currentProject._id}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadDirectMessages = async () => {
    if (!selectedUser) return;
    try {
      const response = await api.get(`/api/direct-messages/${selectedUser._id}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading direct messages:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await api.get('/api/direct-messages/conversations/list');
      setConversations(response.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const searchUsers = async (query) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await api.get(`/api/auth/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (chatMode === 'projects' && currentProject) {
      const messageData = {
        projectId: currentProject._id,
        content: newMessage,
        userId: user._id
      };

      socketRef.current.emit('send-message', messageData);
      socketRef.current.emit('stop-typing', { projectId: currentProject._id });
    } else if (chatMode === 'direct' && selectedUser) {
      const messageData = {
        senderId: user._id,
        recipientId: selectedUser._id,
        content: newMessage
      };

      socketRef.current.emit('send-direct-message', messageData);
      socketRef.current.emit('dm-stop-typing', { recipientId: selectedUser._id });
    }
    
    setNewMessage('');
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (e.target.value && socketRef.current) {
      if (chatMode === 'projects' && currentProject) {
        socketRef.current.emit('typing', {
          projectId: currentProject._id,
          userName: user.name
        });
      } else if (chatMode === 'direct' && selectedUser) {
        socketRef.current.emit('dm-typing', {
          recipientId: selectedUser._id,
          senderName: user.name
        });
      }
    } else {
      if (chatMode === 'projects' && currentProject) {
        socketRef.current.emit('stop-typing', { projectId: currentProject._id });
      } else if (chatMode === 'direct' && selectedUser) {
        socketRef.current.emit('dm-stop-typing', { recipientId: selectedUser._id });
      }
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="messages-page">
      <div className="messages-header">
        <div>
          <h1>Messages</h1>
          <p>Real-time communication</p>
        </div>
        <div className="chat-mode-toggle">
          <button
            className={`mode-btn ${chatMode === 'projects' ? 'active' : ''}`}
            onClick={() => {
              setChatMode('projects');
              setSelectedUser(null);
              setMessages([]);
            }}
          >
            Project Chat
          </button>
          <button
            className={`mode-btn ${chatMode === 'direct' ? 'active' : ''}`}
            onClick={() => {
              setChatMode('direct');
              setCurrentProject(null);
              setMessages([]);
            }}
          >
            Direct Messages
          </button>
        </div>
      </div>

      <div className="messages-container">
        <div className="projects-sidebar">
          {chatMode === 'projects' ? (
            <>
              <h3>Projects</h3>
              <div className="projects-list">
                {projects.map(project => (
                  <div
                    key={project._id}
                    className={`project-item ${currentProject?._id === project._id ? 'active' : ''}`}
                    onClick={() => setCurrentProject(project)}
                  >
                    <div className="project-avatar">{project.title.charAt(0)}</div>
                    <div className="project-info">
                      <div className="project-name">{project.title}</div>
                      <div className="project-status">{project.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="dm-header">
                <h3>Direct Messages</h3>
                <button
                  className="btn-new-dm"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  +
                </button>
              </div>
              
              {showSearch && (
                <div className="user-search">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                  />
                  {searchResults.length > 0 && (
                    <div className="search-results">
                      {searchResults.map(u => (
                        <div
                          key={u._id}
                          className="search-result-item"
                          onClick={() => {
                            setSelectedUser(u);
                            setShowSearch(false);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                        >
                          <div className="user-avatar">{u.name.charAt(0).toUpperCase()}</div>
                          <div className="user-info">
                            <div className="user-name">{u.name}</div>
                            <div className="user-email">{u.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="conversations-list">
                {conversations.map(conv => (
                  <div
                    key={conv._id._id}
                    className={`conversation-item ${selectedUser?._id === conv._id._id ? 'active' : ''}`}
                    onClick={() => setSelectedUser(conv._id)}
                  >
                    <div className="user-avatar">{conv._id.name.charAt(0).toUpperCase()}</div>
                    <div className="conversation-info">
                      <div className="conversation-name">{conv._id.name}</div>
                      <div className="last-message">{conv.lastMessage}</div>
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="unread-badge">{conv.unreadCount}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="chat-area">
          {(chatMode === 'projects' && currentProject) || (chatMode === 'direct' && selectedUser) ? (
            <>
              <div className="chat-header">
                <div>
                  <h2>
                    {chatMode === 'projects' ? currentProject.title : selectedUser.name}
                  </h2>
                  <p>
                    {chatMode === 'projects' ? currentProject.description : selectedUser.email}
                  </p>
                </div>
              </div>

              <div className="messages-list">
                {messages.map((message, index) => {
                  const isOwnMessage = chatMode === 'projects'
                    ? message.sender._id === user._id
                    : message.sender._id === user._id;
                  const senderInfo = chatMode === 'projects'
                    ? message.sender
                    : message.sender;
                  
                  return (
                    <div
                      key={index}
                      className={`message-item ${isOwnMessage ? 'own-message' : 'other-message'}`}
                    >
                      {!isOwnMessage && (
                        <div className="message-avatar">
                          {senderInfo.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="message-content">
                        {!isOwnMessage && (
                          <div className="message-sender">{senderInfo.name}</div>
                        )}
                        <div className="message-bubble">
                          {message.content}
                        </div>
                        <div className="message-time">{formatTime(message.timestamp)}</div>
                      </div>
                    </div>
                  );
                })}
                {typing && typingUser && (
                  <div className="typing-indicator">
                    <span>{typingUser} is typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="message-input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="message-input"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={handleTyping}
                />
                <button type="submit" className="btn btn-primary">
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="no-project-selected">
              <div className="empty-icon">💬</div>
              <h2>
                {chatMode === 'projects'
                  ? 'Select a project to start chatting'
                  : 'Select a conversation or search for users'}
              </h2>
              <p>
                {chatMode === 'projects'
                  ? 'Choose a project from the sidebar to view and send messages'
                  : 'Click the + button to search for users to message'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
