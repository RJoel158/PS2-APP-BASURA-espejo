import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import type { LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";

// ��� IMPORTA TU IMAGEN LOCAL
import reciclajeIconImage from "../../assets/icons/location3.png";

const reciclajeIcon = new L.Icon({
  iconUrl: reciclajeIconImage,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

interface MapPopupProps {
  onSelect: (lat: number, lng: number, address?: string) => void;
  initialCoords?: [number, number];
}

const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`
    );

    if (response.ok) {
      const data = await response.json();
      const address = data.address || {};
      const parts = [];

      if (address.house_number && address.road) parts.push(`${address.road} ${address.house_number}`);
      else if (address.road) parts.push(address.road);

      if (address.neighbourhood || address.suburb || address.quarter) {
        parts.push(address.neighbourhood || address.suburb || address.quarter);
      }
      if (address.city || address.town || address.village) {
        parts.push(address.city || address.town || address.village);
      }

      if (parts.length === 0 && data.display_name) {
        return data.display_name.split(',').slice(0, 3).join(', ').trim();
      }

      return parts.join(', ') || 'Ubicación seleccionada';
    } else {
      return 'Ubicación seleccionada';
    }
  } catch (error) {
    return 'Ubicación seleccionada';
  }
};

function LocationMarker({ onSelect, initialPosition }: { onSelect: (lat: number, lng: number, address?: string) => void, initialPosition?: [number, number] }) {
  const [position, setPosition] = React.useState<[number, number] | null>(initialPosition || null);
  const [isLoadingAddress, setIsLoadingAddress] = React.useState(false);
  const map = useMap();

  const handleLocationUpdate = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    setIsLoadingAddress(true);
    try {
      const address = await getAddressFromCoords(lat, lng);
      onSelect(lat, lng, address);
    } catch {
      onSelect(lat, lng, 'Ubicación seleccionada');
    } finally {
      setIsLoadingAddress(false);
    }
  };

  useMapEvents({
    click(e: LeafletMouseEvent) {
      handleLocationUpdate(e.latlng.lat, e.latlng.lng);
    },
    locationfound(e) {
      map.flyTo(e.latlng, map.getZoom());
      handleLocationUpdate(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <>
      {position && <Marker position={position} icon={reciclajeIcon} />}
      {isLoadingAddress && (
        <div style={{
          position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 16px',
          borderRadius: '4px', zIndex: 1000, fontSize: '14px'
        }}>
          Obteniendo dirección...
        </div>
      )}
    </>
  );
}

function LocateControl() {
  const map = useMap();
  return (
    <button
      type="button"
      onClick={() => map.locate()}
      style={{
        position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000,
        backgroundColor: '#4CAF50', color: 'white', border: 'none',
        borderRadius: '50%', width: '50px', height: '50px', cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
      title="Encontrar mi ubicación"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    </button>
  );
}

export default function MapPopup({ onSelect, initialCoords }: MapPopupProps) {
  return (
    <div style={{ height: "400px", width: "100%", position: "relative" }}>
      <MapContainer
        center={initialCoords || [-17.393, -66.157]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onSelect={onSelect} initialPosition={initialCoords} />
        <LocateControl />
      </MapContainer>
    </div>
  );
}
