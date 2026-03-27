import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
      
      const subscription = supabase
        .channel(`messages:${user.id}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.new.sender_id === selectedUser.id) {
              setMessages(prev => [...prev, payload.new]);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedUser]);

  const fetchConversations = async () => {
    try {
      const { data: sentMessages, error: sentError } = await supabase
        .from('messages')
        .select('receiver_id')
        .eq('sender_id', user.id);

      const { data: receivedMessages, error: receivedError } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', user.id);

      const userIds = new Set();
      sentMessages?.forEach(m => userIds.add(m.receiver_id));
      receivedMessages?.forEach(m => userIds.add(m.sender_id));

      const uniqueUserIds = Array.from(userIds);
      
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', uniqueUserIds);
        
        setConversations(profiles || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (!error) setMessages(data || []);
    
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', selectedUser.id);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: selectedUser.id,
        content: newMessage
      })
      .select()
      .single();

    if (!error) {
      setMessages(prev => [...prev, data]);
      setNewMessage('');
      
      if (!conversations.find(c => c.id === selectedUser.id)) {
        setConversations(prev => [...prev, selectedUser]);
      }
    }
  };

  if (loading) return <div className="loading-screen">Loading messages...</div>;

  return (
    <div className="messages-container">
      <div className="conversations-list">
        <div style={{ padding: '16px', borderBottom: '1px solid #dbdbdb' }}>
          <h3>Messages</h3>
        </div>
        {conversations.map(conv => (
          <div 
            key={conv.id} 
            onClick={() => setSelectedUser(conv)}
            className="conversation-item"
            style={{ background: selectedUser?.id === conv.id ? '#efefef' : 'white' }}
          >
            <img src={conv.avatar_url || `https://ui-avatars.com/api/?name=${conv.full_name}`} alt={conv.username} />
            <div>
              <strong>{conv.full_name}</strong>
              <div style={{ fontSize: '12px', color: '#8e8e8e' }}>@{conv.username}</div>
            </div>
          </div>
        ))}
        {conversations.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8e8e8e' }}>
            No messages yet. Start a conversation!
          </div>
        )}
      </div>
      
      {selectedUser ? (
        <div className="chat-area">
          <div className="chat-header">
            <h3>{selectedUser.full_name}</h3>
            <span style={{ color: '#8e8e8e', fontSize: '12px' }}>@{selectedUser.username}</span>
          </div>
          
          <div className="messages-list">
            {messages.map(msg => (
              <div 
                key={msg.id}
                className={`message ${msg.sender_id === user.id ? 'sent' : 'received'}`}
              >
                <p>{msg.content}</p>
                <small style={{ fontSize: '10px', opacity: 0.7 }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
              </div>
            ))}
          </div>
          
          <form onSubmit={sendMessage} className="message-input">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
            />
            <button type="submit">Send</button>
          </form>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e8e' }}>
          Select a conversation to start messaging
        </div>
      )}
    </div>
  );
                             }
