import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { haloService } from '../../services/haloService';
import { useAuthStore } from '../../stores/authStore';

export type CitationFormat = 'MLA' | 'APA' | 'Chicago' | 'Harvard' | 'IEEE';

export interface HALOOptions {
  rewrite: boolean;
  generate_citations: boolean;
  check_plagiarism: boolean;
  grammar_check: boolean;
}

interface HALOUploadProps {
  onFileSelect: (file: File | null) => void;
  onProcess: (result: any) => void;
  processing: boolean;
  setProcessing: (processing: boolean) => void;
}

export const HALOUpload: React.FC<HALOUploadProps> = ({
  onFileSelect,
  onProcess,
  processing,
  setProcessing
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const [format, setFormat] = useState<CitationFormat>('MLA');
  const [options, setOptions] = useState<HALOOptions>({
    rewrite: false,
    generate_citations: true,
    check_plagiarism: true,
    grammar_check: true,
  });
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const validExtensions = ['.pdf', '.docx', '.txt'];
    
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension)) {
      setError('Invalid file type. Please upload a PDF, DOCX, or TXT file.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    setFile(selectedFile);
    setFileType(fileExtension.substring(1)); // Remove the dot
    setError(null);
    onFileSelect(selectedFile);
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    if (!isAuthenticated || !identity) {
      setError('Please connect your wallet to use HALO.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Ensure service is initialized
      await haloService.init(identity);

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const fileData = Array.from(new Uint8Array(arrayBuffer));

      // Call backend service
      const result = await haloService.processDocument(
        fileData,
        fileType,
        format,
        options
      );

      onProcess(result);
    } catch (err: any) {
      setError(err.message || 'Failed to process document. Please try again.');
      setProcessing(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFileType('');
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        {/* Authentication Warning */}
        {!isAuthenticated && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-xl">
            <p className="text-yellow-200 text-sm">
              ⚠️ Please connect your wallet to use HALO Academic Writing Assistant
            </p>
          </div>
        )}

        {/* File Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
            dragActive
              ? 'border-purple-400 bg-purple-500/20'
              : 'border-white/30 hover:border-white/50'
          }`}
        >
          {!file ? (
            <>
              <Upload className="w-16 h-16 text-white/60 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">
                Upload Your Document
              </h3>
              <p className="text-gray-300 mb-6">
                Drag and drop your file here, or click to browse
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-block px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl cursor-pointer hover:from-purple-600 hover:to-indigo-700 transition-all"
              >
                Choose File
              </label>
              <p className="text-sm text-gray-400 mt-4">
                Supported formats: PDF, DOCX, TXT (Max 10MB)
              </p>
            </>
          ) : (
            <div className="flex items-center justify-between bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <FileText className="w-10 h-10 text-purple-400" />
                <div className="text-left">
                  <p className="text-white font-semibold">{file.name}</p>
                  <p className="text-gray-400 text-sm">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-200">{error}</p>
          </motion.div>
        )}

        {/* Format Selection */}
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-6"
          >
            <div>
              <label className="block text-white font-semibold mb-3">
                Citation Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as CitationFormat)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="MLA">MLA (Modern Language Association)</option>
                <option value="APA">APA (American Psychological Association)</option>
                <option value="Chicago">Chicago Manual of Style</option>
                <option value="Harvard">Harvard Referencing</option>
                <option value="IEEE">IEEE (Institute of Electrical and Electronics Engineers)</option>
              </select>
              <p className="text-gray-400 text-sm mt-2">
                Select the citation format required for your document
              </p>
            </div>

            {/* Options */}
            <div>
              <label className="block text-white font-semibold mb-3">
                Processing Options
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.rewrite}
                    onChange={(e) => setOptions({ ...options, rewrite: e.target.checked })}
                    className="w-5 h-5 rounded text-purple-600"
                  />
                  <span className="text-white">Rewrite in my own words</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.generate_citations}
                    onChange={(e) => setOptions({ ...options, generate_citations: e.target.checked })}
                    className="w-5 h-5 rounded text-purple-600"
                  />
                  <span className="text-white">Generate works cited</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.check_plagiarism}
                    onChange={(e) => setOptions({ ...options, check_plagiarism: e.target.checked })}
                    className="w-5 h-5 rounded text-purple-600"
                  />
                  <span className="text-white">Check for plagiarism</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.grammar_check}
                    onChange={(e) => setOptions({ ...options, grammar_check: e.target.checked })}
                    className="w-5 h-5 rounded text-purple-600"
                  />
                  <span className="text-white">Grammar & style check</span>
                </label>
              </div>
            </div>

            {/* Process Button */}
            <button
              onClick={handleProcess}
              disabled={processing}
              className="w-full px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Document...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Process Document
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

