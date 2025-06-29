import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Container, Row, Col, ListGroup, Form, Button, Card, InputGroup, Spinner } from 'react-bootstrap';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const ChatPage = () => {
    // State management
    const [user, setUser] = useState(null);
    const [socket, setSocket] = useState(null);
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    // NEW: State to specifically hold the ID of the other user in the chat (for admin view)
    const [otherParticipantId, setOtherParticipantId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [typing, setTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Effect for initial setup: authentication and socket connection
    useEffect(() => {
        const storedUser = {
            token: localStorage.getItem('token'),
            id: localStorage.getItem('userId'),
            role: localStorage.getItem('role')
        };
        let newSocket;
        if (storedUser.token && storedUser.id && storedUser.role) {
            setUser(storedUser);
            newSocket = io(BACKEND_URL, { auth: { token: storedUser.token } });
            setSocket(newSocket);
        }
        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, []);

    // Effect for fetching initial chat data
    useEffect(() => {
        if (!user || !socket) return;

        const fetchAdminData = async () => {
            try {
                const { data } = await axios.get(`${BACKEND_URL}/api/chats`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setChats(data);
            } catch (error) {
                console.error("Failed to fetch chats", error);
            }
        };

        const fetchUserData = async () => {
            try {
                const { data } = await axios.post(`${BACKEND_URL}/api/chats`, {}, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setActiveChat(data);
                socket.emit('joinChat', data._id);
            } catch (error) {
                console.error("Failed to start chat", error);
            }
        };

        if (user.role === 'admin') {
            fetchAdminData();
        } else {
            fetchUserData();
        }
    }, [user, socket]);

    // Effect to set messages when activeChat changes
    useEffect(() => {
        if (activeChat) {
            setMessages(activeChat.messages);
            // NEW: When admin selects a chat, identify the other user
            if (user?.role === 'admin') {
                const otherUser = activeChat.participants.find(p => p.role === 'user');
                setOtherParticipantId(otherUser?._id);
            }
        }
    }, [activeChat, user?.role]);


    // Effect for handling real-time socket events
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (message) => {
            // Update the main chats list for the admin to show new last message
            if (user?.role === 'admin') {
                setChats(prevChats =>
                    prevChats.map(chat =>
                        chat._id === message.chatId
                            ? { ...chat, messages: [...chat.messages, message] }
                            : chat
                    )
                );
            }
            // Update the active chat window if it's open
            if (activeChat && message.chatId === activeChat._id) {
                setMessages(prevMessages => [...prevMessages, message]);
            }
        };

        const handleUpdateChatList = () => {
            if (user?.role === 'admin') {
                axios.get(`${BACKEND_URL}/api/chats`, { headers: { Authorization: `Bearer ${user.token}` } })
                    .then(({ data }) => setChats(data));
            }
        };

        socket.on('receiveMessage', handleReceiveMessage);
        socket.on('updateChatList', handleUpdateChatList);

        return () => {
            socket.off('receiveMessage', handleReceiveMessage);
            socket.off('updateChatList', handleUpdateChatList);
        };
    }, [socket, activeChat, user]);

    // Effect to scroll to the bottom of the messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    const selectChatForAdmin = (chat) => {
        setActiveChat(chat);
        socket.emit('joinChat', chat._id);
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (newMessage.trim() && activeChat && user) {
            const messageData = {
                chatId: activeChat._id,
                senderId: user.id,
                content: newMessage.trim(),
            };
            socket.emit('sendMessage', messageData);
            setNewMessage('');
        }
    };

    if (!user) {
        return <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}><Spinner animation="border" /></Container>;
    }

    // Determine the sender ID for the "received" messages
    const receivedSenderId = user.role === 'admin' ? otherParticipantId : activeChat?.participants.find(p => p.role === 'admin')?._id;

    return (
        <>
            <style type="text/css">{`
                .message-list { height: 65vh; overflow-y: auto; padding: 10px; }
                .message-row { display: flex; margin-bottom: 10px; }
                .message { padding: 8px 12px; border-radius: 18px; max-width: 70%; word-wrap: break-word; }
                .message-sent { background-color: #0d6efd; color: white; }
                .message-received { background-color: #e9ecef; color: black; }
                .chat-list-item.active { background-color: #0d6efd !important; color: white !important; border-color: #0d6efd !important; }
            `}</style>
            <Container fluid className="py-3">
                <Row>
                    {user.role === 'admin' && (
                        <Col md={4}>
                            <Card>
                                <Card.Header as="h5">Conversations</Card.Header>
                                <ListGroup variant="flush" style={{ height: '75vh', overflowY: 'auto' }}>
                                    {chats.map(chat => {
                                        const otherUser = chat.participants.find(p => p.role === 'user');
                                        const lastMsg = chat.messages[chat.messages.length - 1];
                                        return (
                                            <ListGroup.Item
                                                key={chat._id}
                                                action
                                                onClick={() => selectChatForAdmin(chat)}
                                                className={`chat-list-item ${activeChat?._id === chat._id ? 'active' : ''}`}
                                            >
                                                <div className="fw-bold">{otherUser?.name || 'Deleted User'}</div>
                                                <small className="text-muted">{lastMsg?.content.substring(0, 30) || 'No messages yet'}{lastMsg?.content.length > 30 ? '...' : ''}</small>
                                            </ListGroup.Item>
                                        );
                                    })}
                                </ListGroup>
                            </Card>
                        </Col>
                    )}

                    <Col md={user.role === 'admin' ? 8 : 12}>
                        {!activeChat ? (
                            <div className="d-flex justify-content-center align-items-center h-100"><Card><Card.Body>
                                <Card.Text>{user.role === 'admin' ? "Select a conversation to begin." : "Loading chat..."}</Card.Text>
                            </Card.Body></Card></div>
                        ) : (
                            <Card>
                                <Card.Header as="h5">
                                    Chat with {user.role === 'admin' ? activeChat.participants.find(p => p.role === 'user')?.name : 'Admin'}
                                </Card.Header>
                                <Card.Body className="message-list">
                                    {messages.map((msg, index) => {
                                        // --- START OF DEBUGGING BLOCK ---
                                        if (index === 0) { // Log header only for the first message to avoid clutter
                                            console.log("--- CHAT MESSAGE DEBUGGER ---");
                                            console.log("Currently logged-in user:", user);
                                            console.log("ID of the other participant in this chat:", receivedSenderId);
                                            console.log("---------------------------------");
                                        }

                                        console.log(`[Message Content: "${msg.content}"]`);
                                        console.log("  - Full sender object (msg.sender):", msg.sender);
                                        console.log("  - Is sender object populated? ->", msg.sender && typeof msg.sender === 'object' && msg.sender !== null);

                                        const isSentByMe = String(msg.sender?._id) === String(user.id);
                                        const isReceivedFromOther = String(msg.sender?._id) === String(receivedSenderId);

                                        console.log(`  - Comparing sender ID '${msg.sender?._id}' with my ID '${user.id}' -> Sent by me? ${isSentByMe}`);
                                        console.log(`  - Comparing sender ID '${msg.sender?._id}' with other participant ID '${receivedSenderId}' -> Received? ${isReceivedFromOther}`);
                                        // --- END OF DEBUGGING BLOCK ---

                                        // Determine the final message type based on our debugged logic
                                        const messageType = isSentByMe ? 'sent' : 'received';

                                        return (
                                            <div key={msg._id} className={`message-row justify-content-${messageType === 'sent' ? 'end' : 'start'}`}>
                                                <div className={`message message-${messageType}`}>
                                                    <div>{msg.content}</div>
                                                    <small className="text-muted d-block mt-1" style={{ color: messageType === 'sent' ? '#f0f0f0' : '#6c757d' }}>
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </small>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {typing && <div className="text-muted">...</div>}
                                    <div ref={messagesEndRef} />
                                </Card.Body>
                                <Card.Footer>
                                    <Form onSubmit={handleSendMessage}>
                                        <InputGroup>
                                            <Form.Control
                                                type="text"
                                                placeholder="Type a message..."
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                autoComplete="off"
                                            />
                                            <Button variant="primary" type="submit">Send</Button>
                                        </InputGroup>
                                    </Form>
                                </Card.Footer>
                            </Card>
                        )}
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default ChatPage;