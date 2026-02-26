'use client';

import { useState, useEffect } from 'react';
import { Language } from '@/lib/types';

interface MapDisplayProps {
  language: Language;
  onComplete: (office: any, card: any) => void;
}

export default function MapDisplay({ language, onComplete }: MapDisplayProps) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [office, setOffice] = useState<any>(null);
  const [directions, setDirections] = useState<any>(null);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('कृपया लोकेशन की अनुमति दें / Please allow location access');
        }
      );
    }
  };

  const generateReferralCard = async () => {
    if (!location) return;

    setIsLoading(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        },
        body: JSON.stringify({
          action: 'generateReferral',
          phoneNumber: localStorage.getItem('jan-awaaz-phone'),
          location,
          language,
        }),
      });

      const data = await response.json();
      setOffice(data.office);
      setDirections(data.directions);

      // Play response audio
      if (data.responseAudio) {
        const audio = new Audio(`data:audio/mp3;base64,${data.responseAudio}`);
        audio.play();
      }

      setTimeout(() => {
        onComplete(data.office, data.card);
      }, 2000);
    } catch (error) {
      console.error('Error generating referral card:', error);
      alert('कुछ गलत हो गया। कृपया पुनः प्रयास करें / Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        निकटतम कार्यालय
      </h2>

      {!location ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📍</div>
          <p className="text-gray-600">आपका स्थान प्राप्त किया जा रहा है...</p>
        </div>
      ) : !office ? (
        <div className="flex flex-col items-center gap-6">
          <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <p className="text-gray-600">
                अक्षांश: {location.latitude.toFixed(4)}<br />
                देशांतर: {location.longitude.toFixed(4)}
              </p>
            </div>
          </div>
          <button
            onClick={generateReferralCard}
            disabled={isLoading}
            className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 text-lg font-semibold"
          >
            {isLoading ? '⏳ खोज रहे हैं...' : '🔍 निकटतम कार्यालय खोजें'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Office Details */}
          <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-500">
            <h3 className="text-xl font-bold mb-4">{office.name}</h3>
            <div className="space-y-2 text-gray-700">
              <p>📍 {office.address}</p>
              <p>📞 {office.contactNumber}</p>
              <p>🕐 {office.workingHours}</p>
              <p>📏 दूरी: {office.distanceKm} किमी</p>
            </div>
          </div>

          {/* Map Link */}
          {directions && (
            <a
              href={directions.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-6 py-3 bg-green-500 text-white text-center rounded-lg hover:bg-green-600"
            >
              🗺️ मानचित्र में दिशा-निर्देश देखें
            </a>
          )}

          <button
            onClick={() => onComplete(office, null)}
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            ✓ आगे बढ़ें
          </button>
        </div>
      )}
    </div>
  );
}
