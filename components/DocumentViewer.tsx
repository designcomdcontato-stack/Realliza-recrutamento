'use client';
import React from 'react';
import { X, Download, FileText, ExternalLink, Trash2, AlertTriangle } from 'lucide-react';
import { CandidateDocument } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DocumentViewerProps {
  document: CandidateDocument;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export function DocumentViewer({ document, onClose, onDelete }: DocumentViewerProps) {
  const [txtContent, setTxtContent] = React.useState<string | null>(null);

  const formatExt = document.fileFormat?.toLowerCase() || '';
  const isImage = (document.fileType && document.fileType.startsWith('image/')) || 
    ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(formatExt) || 
    /\.(png|jpg|jpeg|gif|svg)$/i.test(document.fileName);

  const isPDF = document.fileType === 'application/pdf' || 
    formatExt === 'pdf' || 
    document.fileName.toLowerCase().endsWith('.pdf');

  const isTxt = document.fileType === 'text/plain' || 
    formatExt === 'txt' || 
    document.fileName.toLowerCase().endsWith('.txt');

  React.useEffect(() => {
    if (isTxt && document.contentUrl) {
      try {
        const base64Parts = document.contentUrl.split(',');
        if (base64Parts.length > 1) {
          // Decode Base64 correctly handling UTF-8 special characters
          const decoded = decodeURIComponent(escape(atob(base64Parts[1])));
          setTxtContent(decoded);
        } else {
          if (document.contentUrl.startsWith('data:')) {
            setTxtContent("Formato de conteúdo não suportado.");
          } else {
            setTxtContent(document.contentUrl);
          }
        }
      } catch (e) {
        console.error("Failed to decode base64 txt file:", e);
        setTxtContent("Não foi possível carregar o conteúdo do arquivo de texto.");
      }
    }
  }, [isTxt, document.contentUrl]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-dark/40 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-5xl h-[90vh] bg-[#FAF9F6] rounded-[2.5rem] shadow-2xl border border-white/20 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 bg-white border-b border-border/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-coral/10 rounded-2xl text-brand-coral">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-brand-dark leading-tight">{document.fileName}</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {document.category} • {(document.fileSize / 1024 / 1024).toFixed(2)} MB • {format(new Date(document.createdAt), "dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (document.contentUrl) {
                  const link = window.document.createElement('a');
                  link.href = document.contentUrl;
                  link.download = document.fileName;
                  link.click();
                }
              }}
              className="flex items-center gap-2 bg-brand-bg text-brand-dark px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-coral hover:text-white transition-all shadow-sm"
            >
              <Download size={16} />
              Baixar
            </button>
            
            {onDelete && (
              <button 
                onClick={() => onDelete(document.id)}
                className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                title="Excluir documento"
              >
                <Trash2 size={20} />
              </button>
            )}
            
            <button 
              onClick={onClose}
              className="p-2.5 text-muted-foreground hover:bg-brand-bg rounded-xl transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Viewer Area */}
        <div className="flex-1 bg-brand-dark/5 p-4 lg:p-8 flex items-center justify-center overflow-auto">
          {document.contentUrl ? (
            <div className="w-full h-full bg-white rounded-2xl shadow-inner border border-border/30 overflow-hidden flex items-center justify-center">
              {isImage ? (
                <img 
                  src={document.contentUrl} 
                  alt={document.fileName} 
                  className="max-w-full max-h-full object-contain"
                />
              ) : isPDF ? (
                <iframe 
                  src={document.contentUrl} 
                  className="w-full h-full border-none"
                  title="PDF Viewer"
                />
              ) : isTxt ? (
                <div className="w-full h-full p-8 overflow-auto font-mono text-sm text-left bg-[#FCFBF9] text-brand-dark whitespace-pre-wrap select-text leading-relaxed">
                  {txtContent || 'Carregando conteúdo...'}
                </div>
              ) : (
                <div className="text-center p-12">
                  <div className="w-20 h-20 bg-brand-bg rounded-3xl flex items-center justify-center mx-auto mb-6 text-brand-coral">
                    <FileText size={40} />
                  </div>
                  <h4 className="text-xl font-black text-brand-dark mb-2">Visualização Indisponível</h4>
                  <p className="text-muted-foreground max-w-md mx-auto font-medium">
                    Não conseguimos renderizar este formato de arquivo ({document.fileFormat.toUpperCase()}) diretamente no navegador. Por favor, faça o download para visualizar.
                  </p>
                  <button 
                    onClick={() => {
                      const link = window.document.createElement('a');
                      link.href = document.contentUrl!;
                      link.download = document.fileName;
                      link.click();
                    }}
                    className="mt-8 flex items-center gap-2 bg-brand-dark text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-dark/90 transition-all mx-auto"
                  >
                    <Download size={18} />
                    Download agora
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-bg rounded-3xl flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
                <AlertTriangle size={40} />
              </div>
              <h4 className="text-xl font-black text-brand-dark mb-2">Conteúdo não localizado</h4>
              <p className="text-muted-foreground">O arquivo físico não está mais disponível no cache local.</p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-8 py-4 bg-white border-t border-border/50 text-[10px] font-bold text-muted-foreground flex justify-between uppercase tracking-widest">
          <span>Enviado por {document.user}</span>
          <span>ID: {document.id}</span>
        </div>
      </motion.div>
    </div>
  );
}
