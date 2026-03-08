import React from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";

// 👈 IMPORTA TU IMAGEN LOCAL (cambia 'tu-imagen.png' por el nombre real)
import reciclajeIconImage from "../../assets/icons/location3.png";

const reciclajeIcon = new L.Icon({
  iconUrl: reciclajeIconImage, // 👈 USA LA IMAGEN IMPORTADA
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

interface MapPopupProps {
  onSelect: (lat: number, lng: number, address?: string) => void;
  initialCoords?: [number, number];
}

// Función para obtener dirección de las coordenadas
const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`
    );
    
    if (response.ok) {
      const data = await response.json();
      
      // Construir dirección de forma más legible
      const address = data.address || {};
      const parts = [];
      
      // Agregar número y calle
      if (address.house_number && address.road) {
        parts.push(`${address.road} ${address.house_number}`);
      } else if (address.road) {
        parts.push(address.road);
      }
      
      // Agregar barrio o zona
      if (address.neighbourhood || address.suburb || address.quarter) {
        parts.push(address.neighbourhood || address.suburb || address.quarter);
      }
      
      // Agregar ciudad
      if (address.city || address.town || address.village) {
        parts.push(address.city || address.town || address.village);
      }
      
      // Si no hay partes específicas, usar display_name simplificado
      if (parts.length === 0 && data.display_name) {
        // Tomar las primeras partes más relevantes del display_name
        const displayParts = data.display_name.split(',').slice(0, 3);
        return displayParts.join(', ').trim();
      }
      
      return parts.join(', ') || 'Ubicación seleccionada';
    } else {
      console.warn('Error en la geocodificación:', response.status);
      return 'Ubicación seleccionada';
    }
  } catch (error) {
    console.error('Error obteniendo dirección:', error);
    return 'Ubicación seleccionada';
  }
};

function LocationMarker({ onSelect }: { onSelect: (lat: number, lng: number, address?: string) => void }) {
  const [position, setPosition] = React.useState<[number, number] | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = React.useState(false);

  useMapEvents({
    async click(e: LeafletMouseEvent) {
      const newPosition: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPosition);
      setIsLoadingAddress(true);
      
      try {
        // Obtener dirección de las coordenadas
        const address = await getAddressFromCoords(e.latlng.lat, e.latlng.lng);
        onSelect(e.latlng.lat, e.latlng.lng, address);
      } catch (error) {
        console.error('Error obteniendo dirección:', error);
        onSelect(e.latlng.lat, e.latlng.lng, 'Ubicación seleccionada');
      } finally {
        setIsLoadingAddress(false);
      }
    },
  });

  return (
    <>
      {position && <Marker position={position} icon={reciclajeIcon} />}
      {isLoadingAddress && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '4px',
          zIndex: 1000,
          fontSize: '14px'
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
        <LocationMarker onSelect={onSelect} />
      </MapContainer>
    </div>
  );
}