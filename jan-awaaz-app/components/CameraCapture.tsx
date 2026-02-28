'use client';

import { useState, useRef } from 'react';
import { Language } from '@/lib/types';
import { getTranslation } from '@/lib/utils/translations';

interface CameraCaptureProps {
  language: Language;
  phoneNumber: string;
  schemes: any[];
  documentsRequired?: number;
  documentsUploaded?: number;
  onComplete: (allComplete: boolean, progress?: any) => void;
}

export default function CameraCapture({ 
  language, 
  phoneNumber,
  schemes, 
  documentsRequired = 1,
  documentsUploaded = 0,
  onComplete 
}: CameraCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Calculate current document number (1-based for display)
  const currentDocNumber = documentsUploaded + 1;

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert(getTranslation('cameraPermissionError', language));
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(imageData);

        // Stop camera
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  const uploadDocument = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    try {
      const base64Image = capturedImage.split(',')[1];

      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'uploadDocument',
          phoneNumber: phoneNumber,
          documentImage: base64Image,
          language,
        }),
      });

      const data = await response.json();
      console.log('Upload response:', data);
      
      setVerificationResult(data.verification);

      // Check if all documents are complete
      const allComplete = data.allDocumentsComplete || false;
      const progress = data.documentsProgress;

      console.log('Document upload result:', {
        allComplete,
        progress,
        nextAction: data.nextAction,
      });

      // Wait a moment to show result, then proceed
      setTimeout(() => {
        if (data.verification?.isValid) {
          // Valid document - check if more needed
          onComplete(allComplete, progress);
          
          // If more documents needed, reset for next capture
          if (!allComplete) {
            setCapturedImage(null);
            setVerificationResult(null);
            startCamera(); // Auto-start camera for next document
          }
        } else {
          // Invalid document - allow re-capture
          setCapturedImage(null);
          setVerificationResult(null);
          startCamera(); // Auto-start camera for retry
        }
      }, 2000);
    } catch (error) {
      console.error('Error uploading document:', error);
      alert(getTranslation('somethingWentWrong', language));
      setIsProcessing(false);
    }
  };

  const skipDocument = async () => {
    setIsProcessing(true);
    
    // Stop camera if it's running
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    try {
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'skipDocument',
          phoneNumber: phoneNumber,
          language,
        }),
      });

      const data = await response.json();
      console.log('Skip response:', data);

      // Check if all documents are complete
      const allComplete = data.allDocumentsComplete || false;
      const progress = data.documentsProgress;

      console.log('Document skip result:', {
        allComplete,
        progress,
        nextAction: data.nextAction,
      });

      // Reset state
      setCapturedImage(null);
      setVerificationResult(null);
      setIsProcessing(false);
      
      // Notify parent component
      onComplete(allComplete, progress);
      
      // Don't auto-start camera - let user decide for next document
    } catch (error) {
      console.error('Error skipping document:', error);
      alert(getTranslation('somethingWentWrong', language));
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 border-4 border-black">
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
        {getTranslation('documentUploadTitle', language)}
      </h2>
      
      {/* Document Progress */}
      {documentsRequired > 1 && (
        <div className="mb-6">
          <p className="text-center text-lg font-semibold text-blue-600 mb-2">
            {getTranslation('documentOf', language)} {currentDocNumber} of {documentsRequired}
          </p>
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${(documentsUploaded / documentsRequired) * 100}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-500 mt-1">
            {documentsUploaded} {getTranslation('completed', language)}, {documentsRequired - documentsUploaded} {getTranslation('remaining', language)}
          </p>
        </div>
      )}
      
      <p className="text-center text-gray-600 mb-8">
        {getTranslation('captureDocumentPhoto', language)}
      </p>

      <div className="flex flex-col items-center gap-6">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full max-w-md rounded-lg border-2 border-gray-300"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-4">
              {!stream ? (
                <>
                  <button
                    onClick={startCamera}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    {getTranslation('openCamera', language)}
                  </button>
                  <button
                    onClick={skipDocument}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-400"
                  >
                    {getTranslation('skip', language)}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={captureImage}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    {getTranslation('takePhoto', language)}
                  </button>
                  <button
                    onClick={skipDocument}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-400"
                  >
                    {getTranslation('skip', language)}
                  </button>
                </>
              )}
            </div>
            <p className="text-sm text-gray-500 text-center">
              {getTranslation('skipHelperText', language)}
            </p>
          </>
        ) : (
          <>
            <img
              src={capturedImage}
              alt="Captured document"
              className="w-full max-w-md rounded-lg border-2 border-gray-300"
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setCapturedImage(null);
                  startCamera();
                }}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                {getTranslation('retake', language)}
              </button>
              <button
                onClick={uploadDocument}
                disabled={isProcessing}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
              >
                {isProcessing ? getTranslation('uploading', language) : getTranslation('upload', language)}
              </button>
            </div>
          </>
        )}

        {/* Verification Result */}
        {verificationResult && (
          <div className={`w-full p-4 rounded-lg ${verificationResult.isValid ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'
            }`}>
            <p className="font-semibold mb-2">
              {verificationResult.isValid ? getTranslation('documentValid', language) : getTranslation('documentInvalid', language)}
            </p>
            {verificationResult.defects && verificationResult.defects.length > 0 && (
              <ul className="text-sm">
                {verificationResult.defects.map((defect: any, index: number) => (
                  <li key={index}>• {defect.description}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Patience Message */}
        <div className="w-full mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 text-center">
            {getTranslation('patienceMessage', language)}
          </p>
        </div>
      </div>
    </div>
  );
}
