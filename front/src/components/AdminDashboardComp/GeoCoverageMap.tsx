import { MapContainer, TileLayer, Rectangle, Circle, CircleMarker, useMapEvents } from 'react-leaflet';
import { useMemo, useState } from 'react';
import type { GeoBoundingBox, GeoZoneBox } from '../../services/appConfigService';
import 'leaflet/dist/leaflet.css';

interface GeoCoverageMapProps {
  boliviaBbox: GeoBoundingBox;
  zones: GeoZoneBox[];
  onCreateZone: (zone: GeoZoneBox) => void;
}

type LatLngTuple = [number, number];
type DrawMode = 'rectangle' | 'circle';

const toRectBounds = (box: GeoBoundingBox): [LatLngTuple, LatLngTuple] => ([
  [box.minLat, box.minLng],
  [box.maxLat, box.maxLng],
]);

const normalizeZoneFromCorners = (
  firstCorner: LatLngTuple,
  secondCorner: LatLngTuple,
  zoneNumber: number,
): GeoZoneBox => ({
  id: Date.now(),
  name: `Zona ${zoneNumber}`,
  shapeType: 'rectangle',
  minLat: Math.min(firstCorner[0], secondCorner[0]),
  maxLat: Math.max(firstCorner[0], secondCorner[0]),
  minLng: Math.min(firstCorner[1], secondCorner[1]),
  maxLng: Math.max(firstCorner[1], secondCorner[1]),
});

const distanceMeters = (from: LatLngTuple, to: LatLngTuple) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;

  const dLat = toRad(to[0] - from[0]);
  const dLng = toRad(to[1] - from[1]);
  const lat1 = toRad(from[0]);
  const lat2 = toRad(to[0]);

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const normalizeCircleAsBox = (
  center: LatLngTuple,
  edge: LatLngTuple,
  zoneNumber: number,
): GeoZoneBox => {
  const deltaLat = Math.abs(edge[0] - center[0]);
  const deltaLng = Math.abs(edge[1] - center[1]);

  return {
    id: Date.now(),
    name: `Zona circular ${zoneNumber}`,
    shapeType: 'circle',
    centerLat: center[0],
    centerLng: center[1],
    radiusMeters: distanceMeters(center, edge),
    minLat: center[0] - deltaLat,
    maxLat: center[0] + deltaLat,
    minLng: center[1] - deltaLng,
    maxLng: center[1] + deltaLng,
  };
};

function ZoneClickHandler({
  firstCorner,
  drawMode,
  onSetFirstCorner,
  onCreateZone,
  zonesCount,
}: {
  firstCorner: LatLngTuple | null;
  drawMode: DrawMode;
  onSetFirstCorner: (value: LatLngTuple | null) => void;
  onCreateZone: (zone: GeoZoneBox) => void;
  zonesCount: number;
}) {
  useMapEvents({
    click(event) {
      const clickedPoint: LatLngTuple = [event.latlng.lat, event.latlng.lng];

      if (!firstCorner) {
        onSetFirstCorner(clickedPoint);
        return;
      }

      if (drawMode === 'circle') {
        onCreateZone(normalizeCircleAsBox(firstCorner, clickedPoint, zonesCount + 1));
      } else {
        onCreateZone(normalizeZoneFromCorners(firstCorner, clickedPoint, zonesCount + 1));
      }

      onSetFirstCorner(null);
    },
    contextmenu() {
      onSetFirstCorner(null);
    },
  });

  return null;
}

export default function GeoCoverageMap({ boliviaBbox, zones, onCreateZone }: GeoCoverageMapProps) {
  const [firstCorner, setFirstCorner] = useState<LatLngTuple | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>('rectangle');

  const mapCenter = useMemo<LatLngTuple>(() => [
    (boliviaBbox.minLat + boliviaBbox.maxLat) / 2,
    (boliviaBbox.minLng + boliviaBbox.maxLng) / 2,
  ], [boliviaBbox]);

  return (
    <div className="geo-map-shell">
      <div className="geo-map-help">
        Haz clic dos veces para crear una zona. Clic derecho para cancelar la selección actual.
      </div>
      <div className="geo-map-tools" role="group" aria-label="Modo de dibujo">
        <button
          type="button"
          className={`geo-map-tool-btn ${drawMode === 'rectangle' ? 'is-active' : ''}`}
          onClick={() => {
            setDrawMode('rectangle');
            setFirstCorner(null);
          }}
        >
          Rectangulo
        </button>
        <button
          type="button"
          className={`geo-map-tool-btn ${drawMode === 'circle' ? 'is-active' : ''}`}
          onClick={() => {
            setDrawMode('circle');
            setFirstCorner(null);
          }}
        >
          Circulo
        </button>
      </div>
      <MapContainer center={mapCenter} zoom={6} className="geo-map-canvas" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Rectangle
          bounds={toRectBounds(boliviaBbox)}
          pathOptions={{ color: '#2563eb', weight: 2, fillColor: '#60a5fa', fillOpacity: 0.07 }}
        />

        {zones.map((zone) => (
          <Rectangle
            key={zone.id ?? `${zone.minLat}-${zone.minLng}-${zone.maxLat}-${zone.maxLng}`}
            bounds={toRectBounds(zone)}
            pathOptions={{ color: '#16a34a', weight: 2, fillColor: '#34d399', fillOpacity: 0.2 }}
          />
        ))}

        {firstCorner && (
          <>
            <CircleMarker
              center={firstCorner}
              radius={6}
              pathOptions={{ color: '#f97316', fillColor: '#fb923c', fillOpacity: 0.95 }}
            />
            {drawMode === 'circle' && (
              <Circle
                center={firstCorner}
                radius={1200}
                pathOptions={{ color: '#f97316', weight: 1, dashArray: '6 4', fillOpacity: 0.06 }}
              />
            )}
          </>
        )}

        <ZoneClickHandler
          firstCorner={firstCorner}
          drawMode={drawMode}
          onSetFirstCorner={setFirstCorner}
          onCreateZone={onCreateZone}
          zonesCount={zones.length}
        />
      </MapContainer>
    </div>
  );
}
