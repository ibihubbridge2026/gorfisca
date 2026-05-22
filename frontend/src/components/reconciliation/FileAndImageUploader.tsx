import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, FileText, Image as ImageIcon, X } from 'lucide-react';

interface FileAndImageUploaderProps {
  onFileSelected: (file: File) => void;
  onImageSelected: (file: File) => void;
}

export default function FileAndImageUploader({ onFileSelected, onImageSelected }: FileAndImageUploaderProps) {
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFilePreview(file.name);
      onFileSelected(file);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
      onImageSelected(file);
      console.log('Image sélectionnée:', file.name, 'Taille:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-xl shadow-sm border border-slate-100">
      {/* SECTION 1 : IMPORT DU COMPTE EN BANQUE / CSV */}
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-6 hover:border-indigo-500 transition-colors bg-slate-50/50">
        <UploadCloud className="h-10 w-10 text-slate-400 mb-2" />
        <p className="text-sm font-semibold text-slate-700">Relevé Bancaire ou Mobile Money</p>
        <p className="text-xs text-slate-400 mb-4">Formats acceptés : CSV, XLS (Max 5MB)</p>
        
        {filePreview ? (
          <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md text-xs font-medium">
            <FileText className="h-4 w-4" />
            <span className="truncate max-w-[150px]">{filePreview}</span>
            <button onClick={() => setFilePreview(null)}><X className="h-3 w-3 hover:text-red-500" /></button>
          </div>
        ) : (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50"
          >
            Choisir le fichier
          </button>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,.xlsx,.xls" className="hidden" />
      </div>

      {/* SECTION 2 : CAPTURE PHOTO / PREUVE MOBILE MONEY */}
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-6 hover:border-emerald-500 transition-colors bg-slate-50/50">
        <Camera className="h-10 w-10 text-slate-400 mb-2" />
        <p className="text-sm font-semibold text-slate-700">Capture du reçu Mobile Money</p>
        <p className="text-xs text-slate-400 mb-4">Prendre une photo ou upload un screenshot</p>

        {imagePreview ? (
          <div className="relative w-32 h-20 rounded-md overflow-hidden border border-slate-200">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            <button 
              onClick={() => setImagePreview(null)}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {/* Déclenche la caméra native sur Smartphone */}
            <button 
              onClick={() => imageInputRef.current?.click()}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-emerald-700 flex items-center gap-1"
            >
              <Camera className="h-4 w-4" /> Scanner / Photo
            </button>
          </div>
        )}
        {/* L'attribut capture="environment" force l'ouverture de la caméra arrière sur smartphone */}
        <input type="file" ref={imageInputRef} onChange={handleImageChange} accept="image/*" capture="environment" className="hidden" />
      </div>
    </div>
  );
}
