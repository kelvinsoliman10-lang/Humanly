import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, FileCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FileUpload = ({ onFileSelect, selectedFile, onClear, compact = false }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp']
    },
    multiple: false
  });

  if (compact) {
    return (
      <div {...getRootProps()} className={`compact-upload ${isDragActive ? 'active' : ''}`} style={{ cursor: 'pointer' }}>
        <input {...getInputProps()} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
          <Upload className="w-4 h-4" />
          <span>Subir Archivo</span>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-container">
      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            {...getRootProps()}
            className={`upload-zone ${isDragActive ? 'active' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="upload-content">
              <div className="icon-box blue">
                <Upload className="w-8 h-8" />
              </div>
              <div className="upload-text">
                <h3>Suelta tu documento aquí</h3>
                <p>Soporta PDF, DOCX, TXT e Imágenes (OCR)</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="file-badge"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="file-selected-badge"
          >
            <div className="icon-box blue">
              <FileText className="w-6 h-6" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>{selectedFile.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="btn-ghost"
              style={{ padding: '0.5rem', borderRadius: '12px' }}
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
