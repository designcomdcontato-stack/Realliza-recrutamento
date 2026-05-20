'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, Home, Settings, Database } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleUseLocal = () => {
    localStorage.setItem('database_provider_override', 'local');
    this.handleRetry();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl shadow-brand-dark/5 p-10 text-center border border-border/50">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-8 shadow-inner">
              <AlertCircle size={40} />
            </div>
            
            <h1 className="text-2xl font-black text-brand-dark tracking-tight mb-4 uppercase">
              Ops! Algo deu errado
            </h1>
            
            <p className="text-muted-foreground text-sm font-medium mb-8 leading-relaxed">
              Ocorreu um erro inesperado ao carregar este módulo. Não se preocupe, seus dados estão seguros.
            </p>

            {this.state.error && (
              <div className="bg-rose-50/50 rounded-2xl p-4 mb-8 text-left border border-rose-100 overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2">Detalhes do Erro</p>
                <p className="text-xs font-mono text-rose-600 break-words opacity-80 leading-tight">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={this.handleRetry}
                className="flex items-center justify-center gap-2 w-full py-4 bg-brand-coral text-white rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-brand-coral/20"
              >
                <RotateCcw size={18} />
                Tentar novamente
              </button>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => window.location.href = '/settings'}
                  className="flex items-center justify-center gap-2 py-3 border border-border rounded-2xl text-xs font-bold text-muted-foreground hover:bg-brand-bg transition-all"
                >
                  <Settings size={14} />
                  Configurações
                </button>
                <button
                  onClick={this.handleUseLocal}
                  className="flex items-center justify-center gap-2 py-3 border border-border rounded-2xl text-xs font-bold text-muted-foreground hover:bg-brand-bg transition-all"
                >
                  <Database size={14} />
                  Banco Local
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
