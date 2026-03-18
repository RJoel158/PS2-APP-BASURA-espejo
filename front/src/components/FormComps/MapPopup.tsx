import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import type { LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";

// Crear marcador verde sencillo con reborde blanco
const createGreenMarker = () => L.divIcon({
  className: "green-marker",
  html: `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Reborde blanco exterior -->
    <path d="M16 0C7.17 0 0 7.17 0 16c0 8 16 24 16 24s16-16 16-24c0-8.83-7.17-16-16-16z" fill="white" stroke="white" stroke-width="2"/>
    <!-- Pin verde interior -->
    <path d="M16 2C8.27 2 2 8.27 2 16c0 6.83 14 20.5 14 20.5s14-13.67 14-20.5c0-7.73-6.27-14-14-14z" fill="#22c55e"/>
    <!-- Punto central -->
    <circle cx="16" cy="14" r="4" fill="white"/>
  </svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
});

const greenMarker = createGreenMarker();

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
    locationerror() {
      // Si falla la geolocalización, mostrar feedback al usuario
      console.warn("No se pudo obtener la geolocalización");
      setIsLoadingAddress(false);
    },
  });

  return (
    <>
      {position && <Marker position={position} icon={greenMarker} />}
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
      </MapContainer>
    </div>
  );
}
