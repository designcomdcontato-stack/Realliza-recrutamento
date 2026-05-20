'use client';
import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({ 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  variant = 'danger',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar' 
}: ConfirmModalProps) {
  const colors = {
    danger: 'bg-rose-50 text-rose-600 border-rose-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    info: 'bg-blue-50 text-blue-600 border-blue-100'
  };

  const btnColors = {
    danger: 'bg-rose-600 hover:bg-rose-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    info: 'bg-blue-600 hover:bg-blue-700'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl scale-in-center">
        <div className="flex justify-between items-start mb-6">
          <div className={`p-3 rounded-2xl border ${colors[variant]}`}>
            <AlertCircle size={28} />
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-muted-foreground leading-relaxed mb-8">{message}</p>
        
        <div className="flex gap-4">
          <button 
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-border rounded-xl font-bold hover:bg-gray-50 transition-all"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 px-6 py-3 ${btnColors[variant]} text-white rounded-xl font-bold transition-all shadow-lg`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
