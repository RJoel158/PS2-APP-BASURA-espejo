import React, { useEffect, useState } from 'react';
import './FavoriteMaterialsModal.css';
import api from '../../services/api';
import type { Material } from '../../services/materialService';
import { getAllMaterials } from '../../services/materialService';

interface FavoriteMaterialRow {
  userId: number;
  materialId: number;
  state: number;
  name: string;
  description: string;
}

interface FavoriteMaterialsModalProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (selectedMaterialIds: number[]) => void;
}

const FavoriteMaterialsModal: React.FC<FavoriteMaterialsModalProps> = ({
  userId,
  isOpen,
  onClose,
  onSaved
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [initialSelected, setInitialSelected] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const loadData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [allMaterials, favoritesResponse] = await Promise.all([
        getAllMaterials(),
        api.get<{ success: boolean; data: FavoriteMaterialRow[] }>(`/api/user-materials/${userId}`)
      ]);

      const favoriteIds = new Set(
        (favoritesResponse.data?.data || []).map((item) => Number(item.materialId))
      );

      setMaterials(Array.isArray(allMaterials) ? allMaterials : []);
      setInitialSelected(new Set(favoriteIds));
      setSelected(new Set(favoriteIds));
    } catch (requestError) {
      console.error('[FavoriteMaterialsModal] Error al cargar favoritos:', requestError);
      setError('No se pudo cargar la lista de favoritos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadData();
    } else {
      setError('');
    }
  }, [isOpen, userId]);

  const handleClose = () => {
    if (isSaving) return;
    setError('');
    onClose();
  };

  const toggleMaterial = (materialId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(materialId)) {
        next.delete(materialId);
      } else {
        next.add(materialId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const toAdd: number[] = [];
      const toRemove: number[] = [];

      selected.forEach((materialId) => {
        if (!initialSelected.has(materialId)) {
          toAdd.push(materialId);
        }
      });

      initialSelected.forEach((materialId) => {
        if (!selected.has(materialId)) {
          toRemove.push(materialId);
        }
      });

      await Promise.all([
        ...toAdd.map((materialId) => api.post('/api/user-materials', { userId, materialId })),
        ...toRemove.map((materialId) => api.delete(`/api/user-materials/${userId}/${materialId}`))
      ]);

      setInitialSelected(new Set(selected));
      onSaved?.(Array.from(selected));
      onClose();
    } catch (saveError) {
      console.error('[FavoriteMaterialsModal] Error al guardar favoritos:', saveError);
      setError('No se pudieron guardar los cambios. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="favorite-modal-overlay" onClick={handleClose}>
      <div className="favorite-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="favorite-modal-header">
          <h3>Selecciona tus materiales favoritos</h3>
        </div>

        <div className="favorite-modal-body">
          {isLoading ? (
            <p className="favorite-modal-state">Cargando materiales...</p>
          ) : materials.length === 0 ? (
            <p className="favorite-modal-state">No hay materiales disponibles.</p>
          ) : (
            <div className="favorite-modal-list">
              {materials.map((material) => {
                const isChecked = selected.has(material.id);

                return (
                  <button
                    key={material.id}
                    type="button"
                    className={`favorite-modal-item ${isChecked ? 'active' : ''}`}
                    onClick={() => toggleMaterial(material.id)}
                    disabled={isSaving}
                  >
                    {material.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <div className="favorite-modal-error">{error}</div>}

        <div className="favorite-modal-actions">
          <button
            className="favorite-modal-cancel-btn"
            type="button"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            className="favorite-modal-save-btn"
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FavoriteMaterialsModal;
