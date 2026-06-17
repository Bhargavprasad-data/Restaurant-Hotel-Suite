import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';

const NotificationContext = createContext(null);

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const socket = useSocket();
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('hotel_admin_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('hotel_admin_notifications', JSON.stringify(notifications));
    } catch (err) {
      console.error('Failed to save notifications to localStorage', err);
    }
  }, [notifications]);

  const addNotification = (message, type) => {
    setNotifications(prev => [
      {
        id: Date.now() + Math.random().toString(36).slice(2),
        message,
        type,
        timestamp: new Date().toISOString(),
        read: false
      },
      ...prev.slice(0, 49) // Cap at last 50 notifications
    ]);

    // Play notification sound
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
      audio.volume = 0.15;
      audio.play().catch(() => {});
    } catch (_) {}
  };

  useEffect(() => {
    if (!socket) return;

    const handleBookingUpdated = (data) => {
      const customer = data.booking?.customer_name || 'A guest';
      const room = data.booking?.room_number || '';
      let message = '';
      
      if (data.action === 'create') {
        message = `New reservation request for Room #${room} by ${customer}`;
      } else if (data.action === 'payment_verified') {
        message = `Booking confirmed! Payment successful for ${customer} (Room #${room})`;
      } else if (data.action === 'cancel') {
        message = `Reservation for Room #${room} cancelled by ${customer}`;
      } else if (data.action === 'status_change') {
        message = `Stay status updated to ${data.booking?.booking_status} for ${customer} (Room #${room})`;
      } else {
        return;
      }

      addNotification(message, 'booking');
    };

    const handleRoomUpdated = (data) => {
      const roomNum = data.room?.room_number || data.id || '';
      let message = '';
      
      if (data.action === 'create') {
        message = `New Room #${roomNum} added to catalog`;
      } else if (data.action === 'update') {
        message = `Room #${roomNum} details updated`;
      } else if (data.action === 'delete') {
        message = `A room listing was removed from catalog`;
      } else {
        return;
      }

      addNotification(message, 'room');
    };

    const handleUserUpdated = (data) => {
      const name = data.user?.name || 'A guest';
      let message = '';
      
      if (data.action === 'update') {
        message = `Guest profile updated for ${name}`;
      } else if (data.action === 'delete') {
        message = `Guest account deleted`;
      } else {
        return;
      }

      addNotification(message, 'user');
    };

    const handleContactQuery = (data) => {
      const name = data.name || 'A guest';
      const subject = data.subject || 'Support Query';
      addNotification(`New support query from ${name}: "${subject}"`, 'user');
    };

    const handleReviewCreated = (data) => {
      const reviewer = data.reviewer_name || 'Guest';
      const rating = data.rating || 5;
      const roomNum = data.room_number || '';
      addNotification(`New ${rating}★ Review for Room #${roomNum} by ${reviewer}`, 'booking');
    };

    socket.on('booking:updated', handleBookingUpdated);
    socket.on('room:updated', handleRoomUpdated);
    socket.on('user:updated', handleUserUpdated);
    socket.on('contact:query', handleContactQuery);
    socket.on('review:created', handleReviewCreated);

    return () => {
      socket.off('booking:updated', handleBookingUpdated);
      socket.off('room:updated', handleRoomUpdated);
      socket.off('user:updated', handleUserUpdated);
      socket.off('contact:query', handleContactQuery);
      socket.off('review:created', handleReviewCreated);
    };
  }, [socket]);

  const unreadCount = notifications.filter(n => !n.read).length;
  
  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const clearOne = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAllRead,
      clearAll,
      clearOne,
      addNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
