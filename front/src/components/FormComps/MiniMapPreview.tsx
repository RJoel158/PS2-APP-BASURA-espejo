import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Marcador verde sencillo con reborde blanco (mismo estilo que MapPopup)
const createGreenMarker = () => L.divIcon({
  className: "green-marker",
  html: `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.17 0 0 7.17 0 16c0 8 16 24 16 24s16-16 16-24c0-8.83-7.17-16-16-16z" fill="white" stroke="white" stroke-width="2"/>
    <path d="M16 2C8.27 2 2 8.27 2 16c0 6.83 14 20.5 14 20.5s14-13.67 14-20.5c0-7.73-6.27-14-14-14z" fill="#22c55e"/>
    <circle cx="16" cy="14" r="4" fill="white"/>
  </svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
});

const greenMarker = createGreenMarker();

interface MiniMapPreviewProps {
  lat: number;
  lng: number;
  address?: string;
}

// Componente para actualizar el centro del mapa cuando cambian las coordenadas
const UpdateMapCenter: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView([lat, lng], 16);
  }, [map, lat, lng]);
  
  return null;
};

const MiniMapPreview: React.FC<MiniMapPreviewProps> = ({ lat, lng, address }) => {
  // Crear una key única para forzar re-render cuando cambien las coordenadas
  const mapKey = `${lat}-${lng}`;
  
  return (
    <div className="mini-map-container">
      <div className="mini-map-header">
        <span className="mini-map-title">📍 Ubicación seleccionada</span>
      </div>
      
      <div className="mini-map-wrapper">
        <MapContainer
          key={mapKey} // 👈 CLAVE: Esto fuerza re-render completo
          center={[lat, lng]}
          zoom={16}
          style={{ height: "150px", width: "100%" }}
          zoomControl={false}
          dragging={false}
          touchZoom={false}
          doubleClickZoom={false}
          scrollWheelZoom={false}
          boxZoom={false}
          keyboard={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]} icon={greenMarker} />
          <UpdateMapCenter lat={lat} lng={lng} />
        </MapContainer>
      </div>
      
      <div className="mini-map-address">
        <p className="address-text">
          {address || 'Ubicación seleccionada'}
        </p>
        <p className="coordinates-text">
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
      </div>
    </div>
  );
};

export default MiniMapPreview;