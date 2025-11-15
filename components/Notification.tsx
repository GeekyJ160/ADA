
import React from 'react';

interface NotificationProps {
  message: string;
  show: boolean;
}

const Notification: React.FC<NotificationProps> = ({ message, show }) => {
  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 bg-sky-500/90 text-white py-2 px-6 rounded-full shadow-lg transition-all duration-500 ease-in-out z-50 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
      }`}
    >
      {message}
    </div>
  );
};

export default Notification;
