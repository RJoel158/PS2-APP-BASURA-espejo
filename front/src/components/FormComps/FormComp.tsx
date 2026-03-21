/**
 * FormComp - Request Creation Form
 * 
 * CONTRATO API: POST /api/request (multipart/form-data)
 * 
 * CAMPOS REQUERIDOS (aplicación específica):
 * - idUser: string (from localStorage.user.id)
 * - description: string (max 150 chars, trimmed)
 * - materialId: string (dropdown selection)
 * - latitude: string (from map marker)
 * - longitude: string (from map marker)
 * - state: string (always "1" for REQUEST_STATE.OPEN)
 * - availableDays: string (JSON array: ["lun","mar","mie","jue","vie","sab","dom"])
 * - timeFrom: string (HH:MM format, 24-hour)
 * - timeTo: string (HH:MM format, 24-hour)
 * - photos: File[] (multipart, 1-5 files)
 */

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import './FormComp.css';
import MapPopup from "./MapPopup";
import MiniMapPreview from "./MiniMapPreview";
import { REQUEST_STATE } from '../../shared/constants';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/endpoints';

interface Material {
  id: number;
  name: string;
  description?: string;
  state?: number;
}

type RequestFormState = {
  materialId: number;
  description: string;
  photos: File[];
  availableDays: string[];
  timeFrom: string;
  timeTo: string;
};

// Interfaz para manejar la ubicación con dirección
interface LocationData {
  lat: number;
  lng: number;
  address?: string;
}

const FormComp: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false); // Estado para geolocalización en progreso
  const [mensaje, setMensaje] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [formData, setFormData] = useState<RequestFormState>({
    materialId: 0,
    description: '',
    photos: [],
    availableDays: [],
    timeFrom: '',
    timeTo: ''
  });

  // Estado para las URLs de vista previa de las fotos
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  // Estados para el mapa - ahora con dirección
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  const days = [
    { key: 'lun', label: 'Lun' },
    { key: 'mar', label: 'Mar' },
    { key: 'mie', label: 'Mié' },
    { key: 'jue', label: 'Jue' },
    { key: 'vie', label: 'Vie' },
    { key: 'sab', label: 'Sáb' },
    { key: 'dom', label: 'Dom' }
  ];

  const fallbackMaterials: Material[] = [
    { id: 1, name: 'Plástico PET', description: 'Botellas de plástico' },
    { id: 2, name: 'Cartón', description: 'Cajas de cartón' },
    { id: 3, name: 'Papel', description: 'Papel de oficina' },
    { id: 4, name: 'Vidrio', description: 'Botellas de vidrio' },
    { id: 5, name: 'Metal', description: 'Latas de aluminio' }
  ];

  const checkServerHealth = async () => {
    try {
      console.log("Verificando salud del servidor...");
      const response = await api.get(API_ENDPOINTS.SYSTEM.HEALTH);
      
      console.log("Respuesta del health check:", {
        status: response.status,
        statusText: response.statusText
      });
      
      if (response.status === 200) {
        console.log("Datos del health check:", response.data);
      }
      
      return response.status === 200;
    } catch (error) {
      console.error("Error en health check:", error);
      return false;
    }
  };

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setApiError(null);
        setLoading(true);
        
        console.log("Intentando obtener materiales...");
        
        // Verificar salud del servidor primero
        const serverAvailable = await checkServerHealth();
        
        if (!serverAvailable) {
          console.warn("Servidor no disponible, usando materiales de ejemplo");
          setMaterials(fallbackMaterials);
          setApiError("Servidor no disponible. Usando materiales de ejemplo.");
          setLoading(false);
          return;
        }

        // Intentar obtener materiales reales
        const response = await api.get(API_ENDPOINTS.MATERIALS.GET_ALL, {
          signal: AbortSignal.timeout(10000)
        });

        console.log("Respuesta de materiales:", {
          status: response.status,
          statusText: response.statusText
        });

        if (response.status === 200) {
          const materialsData = response.data;
          console.log("Materiales recibidos:", materialsData);
          
          if (Array.isArray(materialsData) && materialsData.length > 0) {
            // Filtrar solo materiales ACTIVOS (state === 1)
            const activeMaterials = materialsData.filter((m: Material) => m.state === 1);
            setMaterials(activeMaterials);
            console.log("Materiales activos cargados:", activeMaterials.length);
          } else if (materialsData.data && Array.isArray(materialsData.data)) {
            // Filtrar solo materiales ACTIVOS (state === 1)
            const activeMaterials = materialsData.data.filter((m: Material) => m.state === 1);
            setMaterials(activeMaterials);
            console.log("Materiales activos cargados:", activeMaterials.length);
          } else {
            console.warn("Formato de materiales incorrecto, usando fallback");
            setMaterials(fallbackMaterials);
            setApiError("Formato de datos incorrecto. Usando materiales de ejemplo.");
          }
        } else {
          console.error("Error del servidor:", response.status, response.statusText);
          setMaterials(fallbackMaterials);
          setApiError(`Error del servidor (${response.status}). Usando materiales de ejemplo.`);
        }
      } catch (error) {
        console.error("Error completo al obtener materiales:", error);
        setMaterials(fallbackMaterials);
        setApiError("Error de conexión. Usando materiales de ejemplo.");
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, []);

  // Limpiar URLs de vista previa cuando el componente se desmonta
  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoPreviewUrls]);

  const retryLoadMaterials = () => {
    setLoading(true);
    setApiError(null);
    // Recargar la página para reintentar
    window.location.reload();
  };

  // Contrato API: materialId (number, requerido - seleccionable de lista)
  const handleMaterialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, materialId: parseInt(e.target.value) });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let value = e.target.value;
    
    // Contrato API: description (string, max 150 chars, trim whitespace)
    if (value.length <= 150) {
      // Reemplazar múltiples espacios con un solo espacio
      value = value.replace(/\s+/g, ' ');
      setFormData({ ...formData, description: value });
    }
  };

  // Contrato API: photos (File array, 1-5 files required, multipart/form-data)
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const currentPhotos = formData.photos;
      const currentPreviews = photoPreviewUrls;
      
      // Verificar cuántas fotos se pueden agregar (máximo 5 total)
      const remainingSlots = 5 - currentPhotos.length;
      
      if (remainingSlots <= 0) {
        setMensaje("Ya has alcanzado el límite máximo de 5 fotos");
        e.target.value = ''; // Limpiar el input
        return;
      }
      
      // Si hay más archivos nuevos de los que se pueden agregar, tomar solo los primeros
      const filesToAdd = newFiles.slice(0, remainingSlots);
      
      if (newFiles.length > remainingSlots) {
        setMensaje(`Solo se pueden agregar ${remainingSlots} foto(s) más. Límite máximo: 5 fotos`);
      } else {
        // Limpiar mensaje si todo está bien
        if (mensaje.includes("foto")) {
          setMensaje("");
        }
      }
      
      // Crear URLs de vista previa para las nuevas fotos
      const newPreviewUrls = filesToAdd.map(file => URL.createObjectURL(file));
      
      // Combinar fotos existentes con las nuevas
      const updatedPhotos = [...currentPhotos, ...filesToAdd];
      const updatedPreviews = [...currentPreviews, ...newPreviewUrls];
      
      // Actualizar el estado
      setFormData({ ...formData, photos: updatedPhotos });
      setPhotoPreviewUrls(updatedPreviews);
      
      // Limpiar el input para permitir seleccionar las mismas fotos de nuevo si es necesario
      e.target.value = '';
    }
  };

  // Función para eliminar una foto específica
  const removePhoto = (index: number) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    const newPreviewUrls = photoPreviewUrls.filter((_, i) => i !== index);
    
    // Revocar la URL de la foto eliminada
    URL.revokeObjectURL(photoPreviewUrls[index]);
    
    setFormData({ ...formData, photos: newPhotos });
    setPhotoPreviewUrls(newPreviewUrls);
    
    // Limpiar mensaje de límite si hay espacio disponible ahora
    if (mensaje.includes("límite") && newPhotos.length < 5) {
      setMensaje("");
    }
  };

  // Contrato API: availableDays (array de strings como JSON, e.g., ["lun","mar","vie"])
  const handleDayToggle = (day: string) => {
    const updatedDays = formData.availableDays.includes(day)
      ? formData.availableDays.filter(d => d !== day)
      : [...formData.availableDays, day];
    setFormData({ ...formData, availableDays: updatedDays });
  };

  // Contrato API: timeFrom y timeTo (formato HH:MM, timeFrom < timeTo)
  const handleTimeChange = (field: 'timeFrom' | 'timeTo', value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  // Función separada para abrir el mapa
  const openMapModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMap(true);
  };

  // Función para seleccionar ubicación con dirección
  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setSelectedLocation({ lat, lng, address });
    setShowMap(false); // Siempre cierra el modal
  };

  /**
   * Usa la geolocalización del navegador para obtener coordenadas actuales
   * Llamada desde el botón "Usar mi ubicación" en el modal del mapa
   */
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      Swal.fire({
        icon: 'error',
        title: 'Geolocalización no disponible',
        text: 'Tu navegador no soporta geolocalización',
      });
      return;
    }

    // Mostrar indicador de progreso en el botón
    setLocating(true);
    // Cerrar el modal inmediatamente
    setShowMap(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Obtener dirección desde coordenadas
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`
          );
          const data = await response.json();
          const address = data.address || {};
          const parts = [];

          if (address.house_number && address.road)
            parts.push(`${address.road} ${address.house_number}`);
          else if (address.road) parts.push(address.road);

          if (address.neighbourhood || address.suburb || address.quarter) {
            parts.push(address.neighbourhood || address.suburb || address.quarter);
          }
          if (address.city || address.town || address.village) {
            parts.push(address.city || address.town || address.village);
          }

          const addressString =
            parts.length > 0 ? parts.join(', ') : 'Ubicación actual';

          // Actualizar ubicación
          setSelectedLocation({ lat, lng, address: addressString });
          
          // Mostrar confirmación
          Swal.fire({
            icon: 'success',
            title: '¡Ubicación obtenida!',
            text: addressString,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500
          });
        } catch (error) {
          // Actualizar ubicación sin dirección
          setSelectedLocation({ lat, lng, address: 'Ubicación actual' });
          
          Swal.fire({
            icon: 'success',
            title: '¡Ubicación obtenida!',
            text: 'Ubicación actual seleccionada',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500
          });
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        // No mostrar error modal, solo quitar el spinner después del timeout
        // El usuario verá el spinner emulado hasta que expire
        setLocating(false);
        
        // Si es rechazo de permisos, solo mostrar un toast informativo
        if (error.code === error.PERMISSION_DENIED) {
          Swal.fire({
            icon: 'info',
            title: 'Permiso requerido',
            text: 'Por favor, selecciona manualmente en el mapa',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleBack = () => {
    window.history.back();
  };

  /**
   * Validaciones específicas para el contrato API /api/request
   * Retorna array de errores si hay alguno
   */
  const validateAPIContract = (): string[] => {
    const errors: string[] = [];

    // Material: debe ser seleccionado
    if (formData.materialId === 0) {
      errors.push("materialId es requerido");
    }

    // Description: max 150 chars, debe estar presente
    if (!formData.description.trim()) {
      errors.push("description es requerida");
    } else if (formData.description.length > 150) {
      errors.push("description no puede exceder 150 caracteres");
    }

    // Photos: 1-5 files requeridos
    if (formData.photos.length === 0) {
      errors.push("Se requiere al menos 1 foto");
    } else if (formData.photos.length > 5) {
      errors.push("Máximo 5 fotos permitidas");
    }

    // Available Days: array no vacío
    if (formData.availableDays.length === 0) {
      errors.push("availableDays es requerido (selecciona al menos 1 día)");
    }

    // Time Range: ambos campos y validación HH:MM
    if (!formData.timeFrom) {
      errors.push("timeFrom es requerido (formato HH:MM)");
    }
    if (!formData.timeTo) {
      errors.push("timeTo es requerido (formato HH:MM)");
    }
    if (formData.timeFrom && formData.timeTo) {
      if (formData.timeFrom >= formData.timeTo) {
        errors.push("timeFrom debe ser menor que timeTo");
      }
    }

    // Location: latitude y longitude requeridos
    if (!selectedLocation) {
      errors.push("selectedLocation es requerida (latitude, longitude)");
    }

    return errors;
  };

  /**
   * Construye FormData exactamente según contrato API
   * Campo a campo con tipos correctos
   */
  const buildAPIFormData = (user: any): FormData => {
    const formDataToSend = new FormData();

    // User identification (from localStorage)
    formDataToSend.append('idUser', user.id.toString());

    // Material & Description (Step 1)
    formDataToSend.append('materialId', formData.materialId.toString());
    formDataToSend.append('description', formData.description.trim());

    // Location (Step 3 - Map)
    formDataToSend.append('latitude', selectedLocation!.lat.toString());
    formDataToSend.append('longitude', selectedLocation!.lng.toString());

    // Schedule (Step 3 - Availability)
    formDataToSend.append('timeFrom', formData.timeFrom);
    formDataToSend.append('timeTo', formData.timeTo);
    // availableDays como JSON string (e.g., '["lun","mar","vie"]')
    formDataToSend.append('availableDays', JSON.stringify(formData.availableDays));

    // State (always REQUEST_STATE.OPEN = 1)
    formDataToSend.append('state', REQUEST_STATE.OPEN.toString());

    // Photos (Step 2 - multipart files)
    formData.photos.forEach((photo) => {
      formDataToSend.append('photos', photo);
    });

    return formDataToSend;
  };

  const handleSubmit = async () => {
    // Validar contrato API
    const validationErrors = validateAPIContract();
    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.join("\n• ");
      setMensaje(`Errores de validación:\n• ${errorMessage}`);
      return;
    }

    setSubmitting(true);
    setMensaje("");

    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        setMensaje("Debes iniciar sesión para crear una solicitud");
        setSubmitting(false);
        return;
      }

      const user = JSON.parse(userStr);

      // Construir FormData según contrato API exacto
      const formDataToSend = buildAPIFormData(user);

      console.log("Enviando solicitud POST /api/request con FormData...");
      console.log("Validación pasada: ✓ (Contrato API completo)");

      const response = await api.post(API_ENDPOINTS.REQUESTS.CREATE, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log("Respuesta API:", {
        status: response.status,
        data: response.data
      });

      const data = response.data;

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Solicitud creada!',
          text: 'Tu solicitud ha sido registrada exitosamente.',
          confirmButtonColor: '#4CAF50'
        });

        // Reset form a estado inicial
        setFormData({
          materialId: 0,
          description: '',
          photos: [], 
          availableDays: [], 
          timeFrom: '', 
          timeTo: '' 
        });
        setSelectedLocation(null);
        photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
        setPhotoPreviewUrls([]);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error en solicitud',
          text: data.error || "Error desconocido al crear la solicitud",
        });
        setMensaje(data.error || "Error desconocido");
      }
    } catch (error) {
      console.error("Error API:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo conectar al servidor',
      });
      setMensaje("Error de conexión con el servidor");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="recycle-form-container">
      <h1 className="form-title">Registra tu material de reciclaje</h1>

      <button className="btn-back-top btn btn-outline-success" onClick={handleBack}>
        ← Volver
      </button>

      {apiError && (
        <div className="alert alert-warning mb-3">
          {apiError}
          <button type="button" onClick={retryLoadMaterials} className="btn btn-sm btn-outline-primary ms-2">
            Reintentar
          </button>
        </div>
      )}

      <div className="form-card">
        <div className="form-steps">
          {/* Paso 1 - Material y Descripción */}
          <div className="step">
            <div className="step-header">
              <span className="step-number">1</span>
              <h3>Cuenta lo que quieres reciclar</h3>
            </div>

            <div className="form-group">
              <label htmlFor="material">Material</label>
              <select 
                id="material" 
                value={formData.materialId} 
                onChange={handleMaterialChange} 
                className="select-input" 
                disabled={loading}
              >
                <option value={0}>
                  {loading ? 'Cargando materiales...' : 'Selecciona un material'}
                </option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name} {material.description ? `- ${material.description}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="description">Descripción</label>
              <textarea 
                id="description" 
                value={formData.description} 
                onChange={handleDescriptionChange} 
                className="textarea-input" 
                placeholder="Describe el material..." 
                maxLength={150}
              />
              <div 
                style={{ 
                  fontSize: '12px', 
                  color: formData.description.length >= 150 ? '#dc3545' : '#666',
                  marginTop: '4px',
                  textAlign: 'right'
                }}
              >
                {formData.description.length}/150 caracteres
              </div>
            </div>
          </div>

          {/* Paso 2 - Fotos CON LÍMITE DE 5 */}
          <div className="step">
            <div className="step-header">
              <span className="step-number">2</span>
              <h3>Comparte imágenes de los materiales</h3>
            </div>

            <div className={`photo-upload-section ${formData.photos.length >= 5 ? 'limit-reached' : ''}`}>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handlePhotoChange} 
                className="file-input" 
                id="photo-upload"
                disabled={formData.photos.length >= 5}
              />
              <label 
                htmlFor="photo-upload" 
                className={`upload-label ${formData.photos.length >= 5 ? 'upload-disabled' : ''}`}
              >
                {formData.photos.length >= 5 ? 'Límite alcanzado' : 'Subir fotos'}
              </label>
              
              <div className="photo-count-container">
                {formData.photos.length > 0 && (
                  <p className={`photo-count ${formData.photos.length >= 5 ? 'limit-reached' : ''}`}>
                    {formData.photos.length} de 5 foto(s) seleccionada(s)
                  </p>
                )}
                <p className="photo-limit-text">Máximo 5 fotos permitidas</p>
              </div>

              {/* Vista previa de las fotos */}
              {photoPreviewUrls.length > 0 && (
                <div className="photo-preview-container">
                  {photoPreviewUrls.map((url, index) => (
                    <div key={index} className="photo-preview">
                      <img 
                        src={url} 
                        alt={`Vista previa ${index + 1}`} 
                        className="preview-image"
                      />
                      <button 
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="remove-photo-button"
                        aria-label={`Eliminar foto ${index + 1}`}
                      >
                        ✕
                      </button>
                      <div className="photo-info">
                        <span className="photo-name">
                          {formData.photos[index]?.name || `Imagen ${index + 1}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Paso 3 - Ubicación y Disponibilidad */}
          <div className="step">
            <div className="step-header">
              <span className="step-number">3</span>
              <h3>Danos tu disponibilidad</h3>
            </div>

            {/* SECCIÓN DE UBICACIÓN - MEJORADA CON MINI MAPA */}
            <div className="location-container">
              <h4>Ubicación de recojo</h4>
              
              {!selectedLocation ? (
                <div className="location-selector">
                  <p>Selecciona dónde pueden recoger el material</p>
                  <button 
                    type="button" 
                    onClick={openMapModal}
                    className="map-open-button"
                  >
                    Abrir mapa para seleccionar ubicación
                  </button>
                </div>
              ) : (
                <div className="location-selected">
                  {/* Mini mapa de vista previa */}
                  <MiniMapPreview 
                    lat={selectedLocation.lat} 
                    lng={selectedLocation.lng} 
                    address={selectedLocation.address}
                  />
                  
                  <button 
                    type="button" 
                    onClick={openMapModal}
                    className="map-change-button"
                    style={{ width: '100%', marginTop: '10px' }}
                  >
                    Cambiar ubicación
                  </button>
                </div>
              )}
            </div>

            {/* Días disponibles */}
            <div className="availability-section">
              <h4>Días disponibles</h4>
              <div className="days-selector">
                {days.map((day) => (
                  <button 
                    key={day.key} 
                    type="button" 
                    className={`day-button ${formData.availableDays.includes(day.key) ? 'selected' : ''}`} 
                    onClick={() => handleDayToggle(day.key)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Horario */}
            <div className="time-section">
              <h4>Posible horario</h4>
              <div className="time-selector">
                <div className="time-input-group">
                  <label htmlFor="time-from">Desde:</label>
                  <input 
                    id="time-from"
                    type="time" 
                    value={formData.timeFrom} 
                    onChange={(e) => handleTimeChange('timeFrom', e.target.value)} 
                    className="time-input" 
                  />
                </div>
                <div className="time-input-group">
                  <label htmlFor="time-to">Hasta:</label>
                  <input 
                    id="time-to"
                    type="time" 
                    value={formData.timeTo} 
                    onChange={(e) => handleTimeChange('timeTo', e.target.value)} 
                    className="time-input" 
                  />
                </div>
              </div>
            </div>

            <button 
              type="button" 
              onClick={handleSubmit} 
              className="confirm-button" 
              disabled={submitting}
            >
              {submitting ? "Enviando..." : "Confirmar"}
            </button>

            {mensaje && (
              <div className={`alert mt-3 ${mensaje.includes("exitosamente") ? "alert-success" : "alert-danger"}`}>
                {mensaje}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DEL MAPA - RENDERIZADO CONDICIONALMENTE */}
      {showMap && (
        <div className="map-overlay">
          <div className="map-modal-container">
            <div className="map-modal-header">
              <h3>Selecciona tu ubicación</h3>
              <button 
                type="button"
                className="map-close-button" 
                onClick={() => setShowMap(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="map-content">
              <MapPopup
                onSelect={handleLocationSelect}
                initialCoords={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : undefined}
              />
            </div>
            
            <div className="map-modal-actions">
              <button 
                type="button"
                className={`locate-button ${locating ? 'locating' : ''}`}
                onClick={handleUseCurrentLocation}
                disabled={locating}
                title="Usar tu ubicación actual del dispositivo"
              >
                {locating ? (
                  <>
                    <span className="locating-spinner"></span>
                    Obteniendo ubicación...
                  </>
                ) : (
                  <>
                    📍 Usar mi ubicación
                  </>
                )}
              </button>
              <button 
                type="button"
                className="cancel-button" 
                onClick={() => setShowMap(false)}
                disabled={locating}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormComp;