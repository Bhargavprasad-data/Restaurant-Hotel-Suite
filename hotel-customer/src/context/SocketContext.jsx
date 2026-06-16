import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Navbar from '../components/Navbar';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 3000,
      timeout: 10000
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Connected to socket server:', socketInstance.id);
      socketInstance.emit('join-room', 'hotel');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Disconnected from socket server');
      setConnected(false);
    });

    socketInstance.on('connect_error', () => {
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] dark:bg-slate-950 flex flex-col transition-colors duration-300 relative overflow-hidden">
        <Navbar isConnecting={true} />

        <div className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto pt-[90px]">
          <div className="skeleton h-[320px] rounded-2xl w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-4 space-y-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className="skeleton aspect-[4/3] rounded-xl w-full" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="skeleton h-8 w-28 rounded-xl pt-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
