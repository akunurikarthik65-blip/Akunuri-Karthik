import React, { useEffect, useRef, useState } from "react";

interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

interface LocationPickerProps {
  onLocationSelect: (locationData: LocationData) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationSelect }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Google Maps API key is missing. Please set VITE_GOOGLE_MAPS_API_KEY in your environment.");
      return;
    }

    // Load Google Maps Script
    const scriptId = "google-maps-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else if (window.google) {
      initMap();
    }

    return () => {
      // We don't necessarily want to remove the script if other components might use it,
      // but we should clean up listeners if we had any global ones.
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.google) return;

    // Default center
    const defaultCenter = { lat: 20.5937, lng: 78.9629 };

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 15,
      center: defaultCenter,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    });

    const markerInstance = new window.google.maps.Marker({
      map: mapInstance,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
    });

    // On marker drag end — reverse geocode
    markerInstance.addListener("dragend", () => {
      const pos = markerInstance.getPosition();
      reverseGeocode(pos.lat(), pos.lng());
    });

    // On map click — move marker
    mapInstance.addListener("click", (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      markerInstance.setPosition({ lat, lng });
      reverseGeocode(lat, lng);
    });

    setMap(mapInstance);
    setMarker(markerInstance);

    // Auto-detect user location
    getUserLocation(mapInstance, markerInstance);
  };

  const getUserLocation = (mapInstance: any, markerInstance: any) => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const pos = { lat, lng };

        if (mapInstance) {
          mapInstance.setCenter(pos);
          mapInstance.setZoom(17);
        }
        if (markerInstance) {
          markerInstance.setPosition(pos);
        }
        reverseGeocode(lat, lng);
      },
      (error) => {
        console.error("Location error:", error.message);
      }
    );
  };

  const reverseGeocode = (lat: number, lng: number) => {
    if (!window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
      if (status === "OK" && results[0]) {
        const fullAddress = results[0].formatted_address;
        setAddress(fullAddress);
        setCoords({ lat, lng });

        // Pass data to parent
        if (onLocationSelect) {
          onLocationSelect({ lat, lng, address: fullAddress });
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">📍 Select Issue Location</h3>
        <button
          type="button"
          onClick={() => getUserLocation(map, marker)}
          className="text-[10px] font-black uppercase tracking-widest text-brand-primary hover:underline"
        >
          🎯 Use My Current Location
        </button>
      </div>

      {/* Map Container */}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-64 rounded-3xl border-2 border-slate-100 overflow-hidden shadow-inner"
        />
        {error && (
          <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-sm flex items-center justify-center p-8 text-center rounded-3xl">
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-red-500">Map Error</p>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">{error}</p>
              <p className="text-[10px] text-slate-400 font-medium">
                Note: If you see "ApiNotActivatedMapError", please enable the "Maps JavaScript API" in your Google Cloud Console.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Location Info */}
      {address && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-xs font-bold text-slate-600">
            <span className="text-slate-400 uppercase tracking-widest mr-2">Address:</span> 
            {address}
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
