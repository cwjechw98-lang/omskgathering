import * as React from 'react';
import { cn } from '@/lib/utils';

interface ModalOverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
  title?: string;
}

/**
 * Modal Overlay for choose/discover/look-top modes
 *
 * Features:
 * - Darkens background with backdrop blur
 * - Blocks interaction with game board
 * - Click outside to close (optional)
 * - ESC key to close
 * - Accessible with role="dialog" and aria-modal
 */
export function ModalOverlay({
  open,
  onClose,
  children,
  className,
  closeOnBackdrop = true,
  title,
}: ModalOverlayProps) {
  // Close on ESC
  React.useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={cn('modal-overlay-content', className)} onClick={(e) => e.stopPropagation()}>
        {title && (
          <h2
            id="modal-title"
            className="font-title text-xl md:text-2xl text-[#f0d68a] mb-4 text-center"
          >
            {title}
          </h2>
        )}

        <button
          className="modal-overlay-close"
          onClick={onClose}
          aria-label="Закрыть"
          title="Закрыть (ESC)"
        >
          ✕
        </button>

        {children}
      </div>
    </div>
  );
}
