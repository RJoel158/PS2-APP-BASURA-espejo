import React, { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Map.css';
import SchedulePickupModal from '../SchedulePickupComp/SchedulePickupModal';
import ImageCarousel from '../SchedulePickupComp/ImageCarousel';
import ReportRequestModal from '../ReportModalComp/ReportRequestModal';
import { config, apiUrl, debugLog } from '../../config/environment';
import { REQUEST_STATE } from '../../shared/constants';

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

const recyclingIcon = createGreenMarker();

// Crear icono para clusters (grupos de marcadores)
const createClusterIcon = (count: number) => {
  const size = count > 10 ? 50 : count > 5 ? 45 : 40;
  const svgIcon = `
    <div class="cluster-marker" style="
      width: ${size}px; 
      height: ${size}px; 
      background: linear-gradient(135deg, #4a7d25 0%, #5a8c2f 100%);
      border: 3px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-weight: bold;
      color: white;
      font-size: ${size > 45 ? '14px' : '12px'};
    ">
      ${count}
    </div>
  `;

  return new L.DivIcon({
    html: svgIcon,
    className: 'cluster-marker-container',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Interfaz para las requests
interface RecyclingRequest {
  id: number;
  description: string;
  latitude: number;
  longitude: number;
  materialId: number;
  materialName?: string;
  requesterName?: string;
  averageRating?: number;
  totalRatings?: number;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  images?: RequestImage[];
  idUser?: number;
  days?: string[];
  schedule?: unknown;
  registerDate: string;
  state: string;
}

interface RequestImage {
  id: number;
  image: string;
  uploadedDate: string;
}

// Interfaz para clusters de marcadores
interface MarkerCluster {
  id: string;
  latitude: number;
  longitude: number;
  requests: RecyclingRequest[];
  count: number;
}

// Interfaz para materiales
interface Material {
  id: number;
  name: string;
  description?: string;
}

interface MapViewState {
  zoom: number;
  bounds: L.LatLngBounds | null;
}

interface MapLocationState {
  favoriteMaterialIds?: number[];
}

const DAY_TO_SCHEDULE_KEYS: Record<string, string[]> = {
  lun: ['lun', 'lunes', 'monday', 'Monday'],
  mar: ['mar', 'martes', 'tuesday', 'Tuesday'],
  mie: ['mie', 'miércoles', 'miercoles', 'wednesday', 'Wednesday'],
  jue: ['jue', 'jueves', 'thursday', 'Thursday'],
  vie: ['vie', 'viernes', 'friday', 'Friday'],
  sab: ['sab', 'sábado', 'sabado', 'saturday', 'Saturday'],
  dom: ['dom', 'domingo', 'sunday', 'Sunday']
};

const DAY_FILTER_OPTIONS = [
  { value: 'lun', label: 'Lunes' },
  { value: 'mar', label: 'Martes' },
  { value: 'mie', label: 'Miércoles' },
  { value: 'jue', label: 'Jueves' },
  { value: 'vie', label: 'Viernes' },
  { value: 'sab', label: 'Sábado' },
  { value: 'dom', label: 'Domingo' }
] as const;

const RecyclingPointsMap: React.FC = () => {
  const location = useLocation();
  const locationState = (location.state as MapLocationState | null) || null;
  const [recyclingRequests, setRecyclingRequests] = useState<RecyclingRequest[]>([]);
  const [markerClusters, setMarkerClusters] = useState<MarkerCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RecyclingRequest | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [loadingRequestDetail, setLoadingRequestDetail] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [mapView, setMapView] = useState<MapViewState>({
    zoom: config.map.defaultZoom,
    bounds: null
  });
  //Para controlar el modal de Schedule Pickup
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // States para filtrado
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<{ materialIds: number[]; days: string[] }>({
    materialIds: [],
    days: []
  });
  const [favoriteMaterialFilterIds, setFavoriteMaterialFilterIds] = useState<number[]>([]);
  const hasFavoriteFilter = favoriteMaterialFilterIds.length > 0;
  const activeFilterCount =
    Number(filters.materialIds.length > 0 || hasFavoriteFilter) + Number(filters.days.length > 0);
  const hasActiveFilters = activeFilterCount > 0;

  const toggleMaterialFilter = (materialId: number) => {
    setFilters((prev) => {
      const exists = prev.materialIds.includes(materialId);
      return {
        ...prev,
        materialIds: exists
          ? prev.materialIds.filter((id) => id !== materialId)
          : [...prev.materialIds, materialId]
      };
    });
  };

  const toggleDayFilter = (dayValue: string) => {
    setFilters((prev) => {
      const exists = prev.days.includes(dayValue);
      return {
        ...prev,
        days: exists
          ? prev.days.filter((day) => day !== dayValue)
          : [...prev.days, dayValue]
      };
    });
  };

  const normalizeDayToken = (value: unknown): string => {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim().toLowerCase();
  };

  const isScheduleDayEnabled = (schedule: unknown, selectedDay: string): boolean => {
    if (!schedule || typeof schedule !== 'object') {
      return false;
    }

    const scheduleObj = schedule as Record<string, unknown>;
    const allowedKeys = DAY_TO_SCHEDULE_KEYS[selectedDay] || [];

    return allowedKeys.some((key) => {
      const scheduleValue = scheduleObj[key];
      return scheduleValue === 1 || scheduleValue === '1' || scheduleValue === true;
    });
  };

  const hasDayInArray = (days: unknown, selectedDay: string): boolean => {
    if (!Array.isArray(days)) {
      return false;
    }

    const allowedKeys = DAY_TO_SCHEDULE_KEYS[selectedDay] || [];
    const normalizedDays = days.map((day) => normalizeDayToken(day));
    return normalizedDays.some((day) => allowedKeys.includes(day));
  };

  const applyFilters = (requests: RecyclingRequest[]) => {
    const favoriteFilterSet = new Set(favoriteMaterialFilterIds);
    const manualMaterialFilterSet = new Set(filters.materialIds);

    return requests.filter(req => {
      let matchMaterial = true;
      let matchDay = true;

      if (manualMaterialFilterSet.size > 0) {
        matchMaterial = manualMaterialFilterSet.has(Number(req.materialId));
      } else if (favoriteFilterSet.size > 0) {
        matchMaterial = favoriteFilterSet.has(Number(req.materialId));
      }

      if (filters.days.length > 0) {
        matchDay = filters.days.some((selectedDayValue) => {
          const selectedDay = normalizeDayToken(selectedDayValue);
          return hasDayInArray(req.days, selectedDay) || isScheduleDayEnabled(req.schedule, selectedDay);
        });
      }

      return matchMaterial && matchDay;
    });
  };

  const normalizeImages = (images: unknown): RequestImage[] => {
    if (!Array.isArray(images)) {
      return [];
    }

    return images
      .map((item: any, index: number) => {
        const imagePath = typeof item?.image === 'string' ? item.image : '';
        if (!imagePath) {
          return null;
        }

        return {
          id: typeof item?.id === 'number' ? item.id : index + 1,
          image: imagePath,
          uploadedDate: typeof item?.uploadedDate === 'string' ? item.uploadedDate : ''
        };
      })
      .filter((item): item is RequestImage => item !== null);
  };

  // Función para calcular la distancia entre dos puntos en metros
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  };

  // Función para agrupar marcadores cercanos
  const clusterRequests = (requests: RecyclingRequest[], maxDistance: number = config.clustering.maxDistance): MarkerCluster[] => {
    debugLog('Starting clustering with requests:', requests);
    const clusters: MarkerCluster[] = [];
    const processed = new Set<number>();

    requests.forEach((request, index) => {
        debugLog(`Processing request ${index}:`, request);
        if (processed.has(index)) {
          debugLog(`Request ${index} already processed, skipping`);
          return;
        }      // Validar que las coordenadas sean números válidos antes de crear el cluster
      if (isNaN(request.latitude) || isNaN(request.longitude)) {
        if (config.dev.enableDebugLogs) {
          console.warn('Skipping request with invalid coordinates:', {
            id: request.id,
            latitude: request.latitude,
            longitude: request.longitude,
            latType: typeof request.latitude,
            lngType: typeof request.longitude
          });
        }
        return;
      }

      const cluster: MarkerCluster = {
        id: `cluster-${request.id}`,
        latitude: request.latitude,
        longitude: request.longitude,
        requests: [request],
        count: 1
      };

      // Buscar requests cercanas para agrupar
      requests.forEach((otherRequest, otherIndex) => {
        if (otherIndex === index || processed.has(otherIndex)) return;

        const distance = calculateDistance(
          request.latitude, request.longitude,
          otherRequest.latitude, otherRequest.longitude
        );

        if (distance <= maxDistance) {
          cluster.requests.push(otherRequest);
          cluster.count++;
          processed.add(otherIndex);

          // Calcular centroide del cluster
          const totalLat = cluster.requests.reduce((sum, req) => sum + req.latitude, 0);
          const totalLng = cluster.requests.reduce((sum, req) => sum + req.longitude, 0);
          cluster.latitude = totalLat / cluster.requests.length;
          cluster.longitude = totalLng / cluster.requests.length;
        }
      });

      processed.add(index);
      clusters.push(cluster);
      debugLog(`Created cluster:`, cluster);
    });

    debugLog('Clustering completed. Total clusters:', clusters.length);
    return clusters;
  };

  // Función para calcular si un punto está dentro del área visible del mapa
  const isPointInBounds = (lat: number, lng: number, bounds: L.LatLngBounds): boolean => {
    return bounds.contains([lat, lng]);
  };

  // Función para cargar marcadores basado en zoom y área visible
  const getVisibleRequests = (allRequests: RecyclingRequest[], zoom: number, bounds?: L.LatLngBounds): RecyclingRequest[] => {
    // Primero filtrar por área visible si hay bounds
    let filteredRequests = bounds 
      ? allRequests.filter(request => isPointInBounds(request.latitude, request.longitude, bounds))
      : allRequests;

    // Aplicar limitación basada en zoom SIEMPRE, independientemente de si hay bounds
    if (zoom < 10) {
      // Zoom muy bajo: solo mostrar algunos puntos representativos
      debugLog(`Applying zoom filter for zoom ${zoom}: showing max 20 points`);
      filteredRequests = filteredRequests.slice(0, 20);
    } else if (zoom < 12) {
      // Zoom medio: mostrar más puntos
      debugLog(`Applying zoom filter for zoom ${zoom}: showing max 50 points`);
      filteredRequests = filteredRequests.slice(0, 50);
    } else {
      // Zoom alto (>= 12): mostrar todos los puntos visibles
      debugLog(`Applying zoom filter for zoom ${zoom}: showing all ${filteredRequests.length} points`);
    }

    return filteredRequests;
  };

  // Componente para manejar eventos del mapa
  const MapEventHandler: React.FC = () => {
    useMapEvents({
      zoomend: (e) => {
        const map = e.target;
        setMapView({
          zoom: map.getZoom(),
          bounds: map.getBounds()
        });
      },
      moveend: (e) => {
        const map = e.target;
        setMapView({
          zoom: map.getZoom(),
          bounds: map.getBounds()
        });
      }
    });

    return null;
  };

  // Función para obtener materiales del backend
  const fetchMaterials = async (): Promise<Material[]> => {
    try {
      debugLog('Fetching materials from API...');
      const response = await fetch(apiUrl(config.api.endpoints.materials));
      if (response.ok) {
        const materials = await response.json();
        debugLog('Materials received from API:', materials);
        
        // Validar que sea un array
        if (Array.isArray(materials)) {
          return materials;
        } else {
          console.warn('Materials API returned non-array:', materials);
        }
      } else {
        console.warn('Materials API failed with status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    }

    // Sin fallback hardcodeado: solo materiales reales de DB.
    return [];
  };

  // Función para obtener el nombre del material por ID
  const getMaterialName = (materialId: number, materialsArray: Material[]): string => {
    // Validar que materialsArray sea un array
    if (!Array.isArray(materialsArray)) {
      console.error('getMaterialName: materialsArray is not an array:', materialsArray);
      return `Material ID: ${materialId}`;
    }
    
    const material = materialsArray.find(m => m.id === materialId);
    if (material && material.name) {
      return material.name;
    }
    
    return `Material #${materialId}`;
  };

  // Función para obtener las requests activas desde el backend
  const fetchActiveRequests = async () => {
    setLoading(true);
    setError(null);
    
    // Obtener materiales primero
    const materialsArray = await fetchMaterials();
    debugLog('Materials array for processing:', { materialsArray, isArray: Array.isArray(materialsArray) });
    
    // Guardar materiales en el estado para usar en popups
    setMaterials(materialsArray);
    
    try {
      const response = await fetch(apiUrl(config.api.endpoints.requests));

      if (!response.ok) {
        throw new Error('Error al obtener las solicitudes');
      }

      const result = await response.json();

      if (result.success) {
        // Usar los datos del API (reales o fallback)
        const requestsData = result.data || [];

        debugLog('Received requests data:', requestsData);
        debugLog('Total requests received:', requestsData.length);

        // Si el backend ya envía materialName, usarlo. Si no, usar getMaterialName como fallback
        const requestsWithMaterials = requestsData.map((request: any) => ({
          ...request,
          materialName: request.materialName || getMaterialName(request.materialId, materialsArray)
        }));

        // Filtrar solo las requests que tengan coordenadas válidas y estado OPEN (1)
        const activeRequests = requestsWithMaterials.filter((request: any) => {
          const lat = parseFloat(request.latitude);
          const lng = parseFloat(request.longitude);

          const hasValidCoordinates = !isNaN(lat) && !isNaN(lng) &&
            lat !== null && lng !== null &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180;

          // Solo mostrar requests con estado OPEN (1)
          const isOpen = request.state === REQUEST_STATE.OPEN || 
                         request.state === 1 || 
                         request.state === '1';

          console.log('Request filter check:', {
            id: request.id,
            latitude: request.latitude,
            longitude: request.longitude,
            parsedLat: lat,
            parsedLng: lng,
            state: request.state,
            hasValidCoordinates,
            isOpen,
            willInclude: hasValidCoordinates && isOpen
          });

          return hasValidCoordinates && isOpen;
        });

        debugLog('Filtered active requests:', activeRequests);
        debugLog('Total active requests:', activeRequests.length);

        // Normalizar las coordenadas de las requests para asegurar que sean números
        const normalizedRequests = activeRequests.map((request: any) => {
          const normalizedRequest = {
            ...request,
            latitude: parseFloat(request.latitude),
            longitude: parseFloat(request.longitude),
            images: normalizeImages(request.images)
          };

          console.log('Normalized request:', {
            id: request.id,
            originalLat: request.latitude,
            originalLng: request.longitude,
            normalizedLat: normalizedRequest.latitude,
            normalizedLng: normalizedRequest.longitude,
            isLatValid: !isNaN(normalizedRequest.latitude),
            isLngValid: !isNaN(normalizedRequest.longitude)
          });

          return normalizedRequest;
        });

        debugLog('All normalized requests:', normalizedRequests);
        setRecyclingRequests(normalizedRequests);

        // Materiales filtrables: solo los que existen en solicitudes reales cargadas.
        const materialMap = new Map<number, Material>();
        normalizedRequests.forEach((request: RecyclingRequest) => {
          if (!materialMap.has(request.materialId)) {
            materialMap.set(request.materialId, {
              id: request.materialId,
              name: request.materialName || getMaterialName(request.materialId, materialsArray)
            });
          }
        });

        const requestMaterials = Array.from(materialMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        setMaterials(requestMaterials);

        // Mostrar notificación si está usando datos de fallback
        if (result.fallback) {
          setError(`ℹ️ ${result.message || 'Mostrando datos de demostración'}`);
        }
      } else {
        throw new Error(result.error || 'Error al obtener solicitudes');
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('No se pudieron cargar los puntos de reciclaje');

      // Si falla API principal, dejamos materiales vacíos para no mostrar opciones inventadas.
      setMaterials([]);

      // Datos estáticos como fallback con algunos puntos cercanos para probar clustering
      const fallbackRequests = [
        {
          id: 1,
          description: "Cartón y papel para reciclaje",
          latitude: -17.393,
          longitude: -66.157,
          materialId: 2,
          materialName: getMaterialName(2, materialsArray),
          registerDate: "2025-01-01",
          state: "open"
        },
        {
          id: 2,
          description: "Botellas de plástico PET",
          latitude: -17.3931, // Muy cerca del punto 1
          longitude: -66.1571,
          materialId: 1,
          materialName: getMaterialName(1, materialsArray),
          registerDate: "2025-01-01",
          state: "open"
        },
        {
          id: 3,
          description: "Revistas y periódicos",
          latitude: -17.3929, // También cerca del punto 1
          longitude: -66.1569,
          materialId: 2,
          materialName: getMaterialName(2, materialsArray),
          registerDate: "2025-01-02",
          state: "open"
        },
        {
          id: 4,
          description: "Latas de aluminio",
          latitude: -17.400,
          longitude: -66.150,
          materialId: 5,
          materialName: getMaterialName(5, materialsArray),
          registerDate: "2025-01-01",
          state: "open"
        },
        {
          id: 5,
          description: "Botellas de vidrio",
          latitude: -17.390,
          longitude: -66.145,
          materialId: 4,
          materialName: getMaterialName(4, materialsArray),
          registerDate: "2025-01-01",
          state: "open"
        },
        {
          id: 6,
          description: "Envases de plástico",
          latitude: -17.3901, // Cerca del punto 5
          longitude: -66.1451,
          materialId: 1,
          materialName: getMaterialName(1, materialsArray),
          registerDate: "2025-01-03",
          state: "open"
        }
      ];

      setRecyclingRequests(fallbackRequests);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    debugLog('RecyclingPointsMap component mounted');
    fetchActiveRequests();
  }, []);

  useEffect(() => {
    const incomingFavoriteIds = Array.isArray(locationState?.favoriteMaterialIds)
      ? locationState.favoriteMaterialIds
      : [];

    const normalizedIds = Array.from(new Set(incomingFavoriteIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)));

    setFavoriteMaterialFilterIds(normalizedIds);

    if (normalizedIds.length > 0) {
      setFilters((prev) => ({
        ...prev,
        materialIds: normalizedIds
      }));
    }
  }, [locationState]);

  useEffect(() => {
    if (recyclingRequests.length === 0) {
      setMarkerClusters([]);
      return;
    }

    const filtered = applyFilters(recyclingRequests);
    const visible = getVisibleRequests(filtered, mapView.zoom, mapView.bounds || undefined);
    const clusterDistance = mapView.zoom >= config.clustering.minZoom ? 50 : config.clustering.maxDistance;
    const updatedClusters = clusterRequests(visible, clusterDistance);
    setMarkerClusters(updatedClusters);

    debugLog('Clusters recalculated after filter/view change', {
      totalRequests: recyclingRequests.length,
      filteredRequests: filtered.length,
      visibleRequests: visible.length,
      clusters: updatedClusters.length,
      zoom: mapView.zoom,
      hasBounds: Boolean(mapView.bounds)
    });
  }, [filters, favoriteMaterialFilterIds, recyclingRequests, mapView]);

  useEffect(() => {
    if (!selectedRequestId || recyclingRequests.length === 0) {
      return;
    }

    const filteredRequests = applyFilters(recyclingRequests);
    const stillVisibleByFilter = filteredRequests.some((request) => request.id === selectedRequestId);

    if (!stillVisibleByFilter) {
      setSelectedRequest(null);
      setSelectedRequestId(null);
      setLoadingRequestDetail(false);
      setShowPickupModal(false);
    }
  }, [filters, favoriteMaterialFilterIds, recyclingRequests, selectedRequestId]);

  useEffect(() => {
    if (!selectedRequestId) {
      setSelectedRequest(null);
      setLoadingRequestDetail(false);
      setShowPickupModal(false);
      return;
    }

    let isActive = true;

    const fetchRequestDetails = async () => {
      try {
        setLoadingRequestDetail(true);
        setSelectedRequest(null);

        const response = await fetch(apiUrl(`/api/request/${selectedRequestId}`));
        if (!response.ok) {
          if (isActive) {
            setLoadingRequestDetail(false);
          }
          return;
        }

        const result = await response.json();
        if (!result?.success || !result?.data || !isActive) {
          if (isActive) {
            setLoadingRequestDetail(false);
          }
          return;
        }

        const requestDetails = result.data;
        const updatedRequest: RecyclingRequest = {
          ...requestDetails,
          latitude: Number.isFinite(parseFloat(requestDetails.latitude))
            ? parseFloat(requestDetails.latitude)
            : 0,
          longitude: Number.isFinite(parseFloat(requestDetails.longitude))
            ? parseFloat(requestDetails.longitude)
            : 0,
          images: normalizeImages(requestDetails.images)
        };

        // Pequeña espera para evitar flicker visual y simular carga consistente.
        await new Promise((resolve) => setTimeout(resolve, 250));

        if (!isActive) {
          return;
        }

        setSelectedRequest(updatedRequest);
        setLoadingRequestDetail(false);
      } catch (detailError) {
        if (isActive) {
          setLoadingRequestDetail(false);
        }
        debugLog('No se pudo cargar detalle de solicitud para sidebar', detailError);
      }
    };

    fetchRequestDetails();

    return () => {
      isActive = false;
    };
  }, [selectedRequestId]);

  const selectedMaterialName = selectedRequest
    ? (selectedRequest.materialName || getMaterialName(selectedRequest.materialId, materials))
    : '';

  const selectedDate = selectedRequest
    ? new Date(selectedRequest.registerDate).toLocaleDateString()
    : '';

  const selectedRequesterName = selectedRequest
    ? (selectedRequest.requesterName || (selectedRequest.idUser ? `Usuario #${selectedRequest.idUser}` : 'No disponible'))
    : 'No disponible';

  const selectedAverageRating = selectedRequest
    ? Number(selectedRequest.averageRating || 0)
    : 0;

  const selectedTotalRatings = selectedRequest
    ? Number(selectedRequest.totalRatings || 0)
    : 0;

  const directionsUrl = selectedRequest
    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedRequest.latitude},${selectedRequest.longitude}&travelmode=driving`
    : '';

  const selectedPhone = selectedRequest?.userPhone || 'No disponible';

  const availableRequestsCount = useMemo(
    () => applyFilters(recyclingRequests).length,
    [recyclingRequests, filters, favoriteMaterialFilterIds]
  );


  if (loading) {
    return (
      <div className="recycling-points-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando puntos de reciclaje...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="recycling-points-container">
      <div className="map-fullscreen">
        <div className="map-stage fullscreen">
          <div className="map-info-card basic">
            <span className="map-info-text">
              {availableRequestsCount} solicitudes disponibles{hasActiveFilters ? ' (filtradas)' : ''}
            </span>
            <span className="map-info-subtext">Selecciona un marcador para abrir los detalles.</span>
          </div>

          <button
            type="button"
            className={`filter-trigger map-filter ${hasActiveFilters ? 'active' : ''}`}
            onClick={() => setShowFilterModal(true)}
          >
            <span>Filtrar</span>
            {hasActiveFilters && (
              <span className="filter-badge">{activeFilterCount}</span>
            )}
          </button>

          <div className="map-container fullscreen">
              <MapContainer
                center={[config.map.defaultCenter.lat, config.map.defaultCenter.lng]}
                zoom={config.map.defaultZoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  attribution={config.map.attribution}
                  url={config.map.tileUrl}
                  maxZoom={config.clustering.maxZoom}
                  tileSize={256}
                />
                
                <MapEventHandler />

                {markerClusters
                  .filter(cluster => !isNaN(cluster.latitude) && !isNaN(cluster.longitude))
                  .map((cluster) => (
                    <Marker
                      key={cluster.id}
                      position={[cluster.latitude, cluster.longitude]}
                      icon={cluster.count > 1 ? createClusterIcon(cluster.count) : recyclingIcon}

                      eventHandlers={{
                        click: () => {
                          if (cluster.count === 1) {
                            setSelectedRequestId(cluster.requests[0].id);
                            setShowPickupModal(false);
                          }
                        }
                      }}
                    >

                      {cluster.count > 1 && (
                        <Popup className="custom-popup">
                          <div className="popup-content">
                            <>
                              <h4>{cluster.count} Materiales Disponibles</h4>
                              <div className="cluster-requests-list">
                                {cluster.requests.map((request) => {
                                  const displayName = request.materialName || getMaterialName(request.materialId, materials);
                                  
                                  return (
                                  <div key={request.id} className="cluster-request-item">
                                    <div className="request-info">
                                      <p><strong>{displayName}</strong></p>
                                      <small>{new Date(request.registerDate).toLocaleDateString()}</small>
                                    </div>
                                    <button 
                                      className="view-request-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedRequestId(request.id);
                                        setShowPickupModal(false);
                                      }}
                                    >
                                      Ver Detalles
                                    </button>
                                  </div>
                                  );
                                })}
                              </div>
                              <div className="cluster-actions">
                                <small>Selecciona un material para ver más detalles</small>
                              </div>
                            </>
                          </div>
                        </Popup>
                      )}
                    </Marker>
                  ))}
              </MapContainer>

            {error && error.includes('ℹ️') && (
              <div className="db-status-indicator">
                <span className="status-dot offline"></span>
                <small>Modo offline - Datos de demostración</small>
              </div>
            )}
          </div>

          {(selectedRequestId !== null || selectedRequest) && (
            <aside className="request-sidebar map-sidebar">
              <div className="request-sidebar-header">
                <div className="request-sidebar-header-main">
                  <h3>Detalle de solicitud</h3>
                  <button
                    type="button"
                    className="header-report-btn"
                    onClick={() => setShowReportModal(true)}
                    title="Reportar solicitud"
                    disabled={!selectedRequest || loadingRequestDetail}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M12 2L1 21h22L12 2zm0 5.5a1 1 0 011 1v6a1 1 0 11-2 0v-6a1 1 0 011-1zm0 11a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" />
                    </svg>
                    Reportar
                  </button>
                </div>
                <button
                  type="button"
                  className="sidebar-close-btn"
                  onClick={() => {
                    setSelectedRequest(null);
                    setSelectedRequestId(null);
                    setLoadingRequestDetail(false);
                    setShowPickupModal(false);
                  }}
                  title="Quitar selección"
                >
                  ✕
                </button>
              </div>

              {loadingRequestDetail && (
                <div className="request-sidebar-loading">
                  <div className="request-sidebar-loading-spinner" />
                  <p>Cargando detalle de la solicitud...</p>
                </div>
              )}

              {!loadingRequestDetail && selectedRequest && (
                <>
                  {showPickupModal ? (
                    <div className="request-sidebar-content schedule-view">
                      <SchedulePickupModal
                        show={showPickupModal}
                        onClose={() => setShowPickupModal(false)}
                        selectedRequest={selectedRequest}
                        onScheduleSuccess={() => fetchActiveRequests()}
                        variant="inline"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="request-sidebar-content">
                        <div className="sidebar-pill-row">
                          <span className="sidebar-pill material">{selectedMaterialName}</span>
                          <span className="sidebar-pill state">Disponible</span>
                        </div>

                        <div className="sidebar-field sidebar-image-block">
                          <span className="sidebar-label">Imagenes</span>
                          <ImageCarousel
                            images={selectedRequest.images || []}
                            altText={`Solicitud #${selectedRequest.id} - ${selectedMaterialName || 'Material reciclable'}`}
                          />
                        </div>

                        <div className="sidebar-field">
                          <span className="sidebar-label">Descripción</span>
                          <p>{selectedRequest.description || 'Sin descripción'}</p>
                        </div>

                        <div className="sidebar-grid">
                          <div className="sidebar-card">
                            <span className="sidebar-label">Fecha</span>
                            <strong>{selectedDate}</strong>
                          </div>
                          <div className="sidebar-card">
                            <span className="sidebar-label">Celular</span>
                            <strong className="sidebar-phone">{selectedPhone}</strong>
                          </div>
                        </div>

                        <div className="sidebar-field">
                          <span className="sidebar-label">Solicitante</span>
                          <p className="sidebar-requester">{selectedRequesterName}</p>
                        </div>

                        <div className="sidebar-field">
                          <span className="sidebar-label">Calificacion promedio</span>
                          <p className="sidebar-rating-value">
                            {selectedAverageRating.toFixed(2)} / 5.00
                            <span className="sidebar-rating-count">({selectedTotalRatings} calificaciones)</span>
                          </p>
                        </div>

                        <div className="sidebar-field">
                          <span className="sidebar-label">Cómo llegar</span>
                          <a
                            className="sidebar-link"
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Abrir ruta en Google Maps
                          </a>
                        </div>
                      </div>

                      <div className="request-sidebar-actions">
                        <button
                          type="button"
                          className="sidebar-action-btn"
                          onClick={() => setShowPickupModal(true)}
                        >
                          Programar recojo
                        </button>
                      </div>
                    </>
                  )}
              </>
              )}
            </aside>
          )}
        </div>

        {error && !error.includes('ℹ️') && (
          <div className="error-message map-error-inline">
            <p>{error}</p>
            <button type="button" className="retry-button" onClick={fetchActiveRequests}>
              Reintentar
            </button>
          </div>
        )}
      </div>

        {showReportModal && selectedRequest && (
          <ReportRequestModal
            show={showReportModal}
            requestId={selectedRequest.id}
            onClose={() => setShowReportModal(false)}
            onSubmit={() => {
              setShowReportModal(false);
            }}
          />
        )}

        {showFilterModal && (
          <div className="filter-modal-overlay" onClick={() => setShowFilterModal(false)}>
            <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
              <div className="filter-modal-header">
                <h3>Opciones de Filtrado</h3>
              </div>

              <div className="filter-group">
                <label>Materiales:</label>
                <div className="filter-chip-grid">
                  {materials.map((material) => {
                    const isFavoritePreselected =
                      filters.materialIds.length === 0 && favoriteMaterialFilterIds.includes(material.id);
                    const isSelected = filters.materialIds.includes(material.id) || isFavoritePreselected;
                    return (
                      <button
                        key={material.id}
                        type="button"
                        className={`filter-chip ${isSelected ? 'active' : ''}`}
                        onClick={() => toggleMaterialFilter(material.id)}
                      >
                        {material.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="filter-group">
                <label>Días disponibles:</label>
                <div className="filter-chip-grid days">
                  {DAY_FILTER_OPTIONS.map((dayOption) => {
                    const isSelected = filters.days.includes(dayOption.value);
                    return (
                      <button
                        key={dayOption.value}
                        type="button"
                        className={`filter-chip day ${isSelected ? 'active' : ''}`}
                        onClick={() => toggleDayFilter(dayOption.value)}
                      >
                        {dayOption.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="filter-actions">
                <button
                  type="button"
                  className="filter-clear-btn"
                  onClick={()=>{
                    setFilters({ materialIds: [], days: [] });
                    setFavoriteMaterialFilterIds([]);
                    setShowFilterModal(false);
                  }}
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  className="filter-apply-btn"
                  onClick={()=>setShowFilterModal(false)}
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default RecyclingPointsMap;
