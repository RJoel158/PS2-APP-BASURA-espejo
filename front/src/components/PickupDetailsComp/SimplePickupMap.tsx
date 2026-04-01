import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix para los iconos de Leaflet - FORZADO
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const createGreenMarker = () => L.divIcon({
  className: 'green-marker',
  html: `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.17 0 0 7.17 0 16c0 8 16 24 16 24s16-16 16-24c0-8.83-7.17-16-16-16z" fill="white" stroke="white" stroke-width="2"/>
    <path d="M16 2C8.27 2 2 8.27 2 16c0 6.83 14 20.5 14 20.5s14-13.67 14-20.5c0-7.73-6.27-14-14-14z" fill="#22c55e"/>
    <circle cx="16" cy="14" r="4" fill="white"/>
  </svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
});

const pickupMarkerIcon = createGreenMarker();

interface SimplePickupMapProps {
  center?: [number, number];
  markerPosition?: [number, number];
  markerText?: string;
}

const SimplePickupMap: React.FC<SimplePickupMapProps> = ({ 
  center = [-17.393, -66.157], 
  markerPosition,
  markerText = "Punto de recojo"
  
}) => {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // MÚLTIPLES intentos de refresh del mapa
    const timers = [100, 300, 500, 1000].map(delay => 
      setTimeout(() => {
        if (mapRef.current) {
          console.log(`Intentando refresh del mapa en ${delay}ms`);
          mapRef.current.invalidateSize();
          mapRef.current.setView(markerPosition || center, 14);
        }
      }, delay)
    );

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [markerPosition, center]);

  const handleMapReady = (map: L.Map) => {
    console.log('Mapa inicializado correctamente');
    mapRef.current = map;
    
    // Forzar refresh inmediato
    setTimeout(() => {
      map.invalidateSize();
      console.log(' Tamaño del mapa invalidado');
    }, 50);
  };

  return (
    <div 
      style={{ 
        height: '100%', 
        width: '100%', 
        minHeight: '400px',
        position: 'relative',
        zIndex: 1
      }}
    >
      <MapContainer
        ref={mapRef}
        center={markerPosition || center}
        zoom={14}
        style={{ 
          height: '100%', 
          width: '100%',
          minHeight: '400px',
          zIndex: 1
        }}
        zoomControl={false}
        scrollWheelZoom={true}
        whenReady={() => {
          if (mapRef.current) {
            handleMapReady(mapRef.current);
          }
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {markerPosition && (
          <Marker position={markerPosition} icon={pickupMarkerIcon}>
            <Popup>{markerText}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};
export default SimplePickupMap;