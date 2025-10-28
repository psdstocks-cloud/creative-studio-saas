import React from 'react';
import Auth, { type AuthView } from './Auth';
import { XMarkIcon } from './icons/Icons';

interface AuthModalProps {
  isOpen: boolean;
  initialView?: AuthView;
  onClose: () => void;
}

const AuthModal = ({ isOpen, initialView = 'signIn', onClose }: AuthModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="relative" onClick={(event) => event.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -right-4 -top-4 rounded-full bg-gray-800 p-1 text-white transition hover:bg-gray-700"
          aria-label="Close modal"
        >
          <XMarkIcon />
        </button>
        <Auth initialView={initialView} />
      </div>
    </div>
  );
};

export default AuthModal;
