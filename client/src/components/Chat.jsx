import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import api from '../utils/api';
import { Avatar } from '@mui/material';
import M3LoadingIndicator from './M3LoadingIndicator';
import { format } from 'date-fns';

const Chat = () => {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, socket } = useAuth();

    // The friend object passed from the Friends page state
    const [friend, setFriend] = useState(location.state?.friend || null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);

    const messagesEndRef = useRef(null);

    // If friend wasn't passed in state, we should fetch basic friend details... 
    // for simplicity, we assume it's passed, or we just render generic "Friend"

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get(`/api/messages/${roomId}`);
                setMessages(res.data);
            } catch (err) {
                console.error("Failed to load chat history", err);
            } finally {
                setLoading(false);
            }
        };

        if (roomId) fetchHistory();
    }, [roomId]);

    // Connect to global socket for chat
    useEffect(() => {
        if (!socket || !friend) return;

        socket.emit('accept_chat', { roomId });
        socket.emit('mark_read', { roomId, senderId: friend._id });

        const handleReceive = (msg) => {
            setMessages(prev => {
                const isMe = msg.sender === user._id || msg.senderId === user._id;
                if (isMe) {
                    // Replace the optimistic temp message if it exists
                    const tempIdx = prev.findIndex(m => m._id && m._id.startsWith('temp_') && m.content === (msg.content || msg.text));
                    if (tempIdx !== -1) {
                        const updated = [...prev];
                        updated[tempIdx] = msg;
                        return updated;
                    }
                }
                return [...prev, msg];
            });
            if (msg.senderId === friend._id || msg.sender === friend._id) {
                socket.emit('mark_read', { roomId, senderId: friend._id });
            }
        };

        socket.on('receive_message', handleReceive);

        const handleMessagesRead = ({ roomId: readRoomId, readAt }) => {
            if (readRoomId === roomId) {
                setMessages(prev => prev.map(msg => {
                    const isMe = msg.sender === user._id || msg.senderId === user._id;
                    if (isMe && msg.status !== 'read') {
                        return { ...msg, status: 'read', readAt: readAt };
                    }
                    return msg;
                }));
            }
        };
        socket.on('messages_read', handleMessagesRead);

        return () => {
            socket.off('receive_message', handleReceive);
            socket.off('messages_read', handleMessagesRead);
        };
    }, [socket, roomId, friend]);

    // Scroll to bottom when messages update
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket || !friend) return;

        const trimmed = newMessage.trim();

        // Detect seed bot: email ends with @konnect.com
        const isBot = friend.email?.endsWith('@konnect.com') || friend.isBot === true;

        const tempMsg = {
            _id: `temp_${Date.now()}`,
            sender: user._id,
            senderId: user._id,
            senderName: user.displayName,
            receiver: friend._id,
            content: trimmed,
            text: trimmed,
            // For bots: immediately show as read (blue ticks); for real users: sent
            status: isBot ? 'read' : 'sent',
            readAt: isBot ? new Date().toISOString() : null,
            createdAt: new Date().toISOString(),
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);

        socket.emit('send_message', {
            roomId,
            message: trimmed,
            receiverId: friend._id
        });

        setNewMessage('');
    };

    if (loading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center gap-4">
                <M3LoadingIndicator size={56} />
            </div>
        );
    }

    return (
        <div className="h-full w-full max-w-4xl mx-auto p-4 md:p-6 lg:py-8 animate-fade-in relative z-10 flex flex-col" style={{ maxHeight: 'calc(100vh - 8rem)' }}>

            {/* Header */}
            <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl rounded-t-sq-2xl p-4 shadow-sm border border-black/5 dark:border-white/5 flex items-center justify-between shrink-0 mb-1 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/friends')} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 rounded-sq-md transition-colors active:scale-95 shrink-0">
                        <span className="material-symbols-outlined font-bold text-gray-700 dark:text-gray-300">arrow_back</span>
                    </button>
                    <Avatar src={friend?.profilePhoto} sx={{ width: 44, height: 44, borderRadius: '14px' }} variant="rounded" />
                    <div>
                        <h2 className="text-xl font-black text-[#1a100f] dark:text-white tracking-tight">{friend?.displayName || 'Chat'}</h2>
                        <p className={`text-xs font-bold leading-tight ${friend?.isOnline ? 'text-primary' : 'text-gray-400'}`}>
                            {friend?.isOnline ? 'Active Now' : 'Offline'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-white dark:bg-[#141218]/80 dark:backdrop-blur-xl border border-black/5 dark:border-white/5 p-4 md:p-6 space-y-4 custom-scrollbar shadow-inner">
                {messages.length === 0 ? (
                    <div className="h-full w-full flex flex-col items-center justify-center opacity-50">
                        <span className="material-symbols-outlined text-6xl mb-4">forum</span>
                        <p className="font-bold tracking-tight">Send a message to start the conversation.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.sender === user._id || msg.senderId === user._id;
                        return (
                            <div key={idx} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl flex flex-col ${isMe ? 'bg-primary text-white rounded-br-sm shadow-md' : 'bg-gray-100 dark:bg-white/10 text-[#1a100f] dark:text-[#E6E1E5] rounded-bl-sm border border-black/5 dark:border-white/5'}`}>
                                    {!isMe && (
                                        <span className="text-[11px] font-black text-primary/80 dark:text-primary/50 mb-1">
                                            {msg.senderName || friend?.displayName || 'User'}
                                        </span>
                                    )}
                                    <p className="text-[15px] leading-relaxed break-words">{msg.content || msg.text}</p>
                                    <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                                        <span className="text-[10px] font-bold">
                                            {format(new Date(msg.createdAt || msg.timestamp), 'h:mm a')}
                                        </span>
                                        {isMe && (
                                            <span className={`material-symbols-outlined text-[14px] ${msg.status === 'read' ? 'text-blue-200' : ''}`} style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}>
                                                {msg.status === 'read' ? 'done_all' : (msg.status === 'delivered' ? 'done_all' : 'check')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl rounded-b-sq-2xl p-4 shadow-xl border border-black/5 dark:border-white/5 shrink-0 z-20">
                <form onSubmit={handleSend} className="flex gap-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-100 dark:bg-[#141218] border border-transparent dark:border-white/10 rounded-sq-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 text-[#1a100f] dark:text-white font-medium placeholder-gray-500 transition-all font-body"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-primary hover:bg-primary/90 text-white rounded-sq-lg px-6 font-bold shadow-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                        <span className="material-symbols-outlined">send</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
