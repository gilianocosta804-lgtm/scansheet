import React, { useState } from 'react';
import { UserCheck, ArrowRight, User } from 'lucide-react';

interface OperatorModalProps {
  isOpen: boolean;
  currentName: string;
  onSave: (name: string) => void;
  onClose?: () => void;
  canDismiss?: boolean;
}

export const OperatorModal: React.FC<OperatorModalProps> = ({
  isOpen,
  currentName,
  onSave,
  onClose,
  canDismiss = false,
}) => {
  const [name, setName] = useState(currentName || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
        {/* Glow Top Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-md">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Identificação do Colaborador
            </h3>
            <p className="text-xs text-slate-400">
              Digite seu nome ou matrícula para iniciar as leituras
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nome ou Matrícula do Operador: <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Silva ou MAT-4819"
                autoFocus
                required
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner font-medium"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            {canDismiss && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                Voltar
              </button>
            )}
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>Acessar e Iniciar Leituras</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
