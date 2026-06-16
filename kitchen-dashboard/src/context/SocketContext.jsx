import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token, user, setUser, logout } = useAuth();
  const [socket, setSocket] = useState(null);
  const userRef = useRef(user);

  // Sync ref to always hold the latest user state without triggering websocket reconnections
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      auth: { token },
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('🔌 Kitchen Dashboard connected to WebSocket channel.');
      newSocket.emit('join-room', 'kitchen');
    });

    newSocket.on('user-update', (updatedUser) => {
      const currentUser = userRef.current;
      if (currentUser && updatedUser && parseInt(updatedUser.id) === parseInt(currentUser.id)) {
        console.log('🔄 Real-time user profile sync:', updatedUser);
        setUser(prev => {
          const newUser = { ...prev, ...updatedUser };
          localStorage.setItem('kitchen_user', JSON.stringify(newUser));
          return newUser;
        });
      }
    });

    newSocket.on('user-delete', (data) => {
      const currentUser = userRef.current;
      if (currentUser && data && parseInt(data.id) === parseInt(currentUser.id)) {
        console.warn('⚠️ Logged-in user deleted. Logging out...');
        logout();
      }
    });

    newSocket.on('attendance:updated', (data) => {
      const statusStr = data.status === 'clocked_in' ? 'clocked in' : 'clocked out';
      toast.success(`${data.name} (${data.role}) has ${statusStr}.`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
