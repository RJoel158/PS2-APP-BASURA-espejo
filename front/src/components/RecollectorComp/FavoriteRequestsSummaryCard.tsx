import React, { useCallback, useEffect, useState } from 'react';
import FavoriteMaterialsModal from './FavoriteMaterialsModal';
import './FavoriteRequestsSummaryCard.css';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/endpoints';

interface FavoriteRequestsSummaryCardProps {
  userId: number;
}

const FavoriteRequestsSummaryCard: React.FC<FavoriteRequestsSummaryCardProps> = ({ userId }) => {
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [matchingRequestsCount, setMatchingRequestsCount] = useState(0);

  const loadMatchingRequestsCount = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; data: { total: number } }>(
        API_ENDPOINTS.USER_MATERIALS.MATCHING_REQUESTS_COUNT(userId)
      );

      setMatchingRequestsCount(Number(response.data?.data?.total || 0));
    } catch (error) {
      console.error('[FavoriteRequestsSummaryCard] Error al cargar conteo de solicitudes:', error);
      setMatchingRequestsCount(0);
    }
  }, [userId]);

  useEffect(() => {
    void loadMatchingRequestsCount();
  }, [loadMatchingRequestsCount]);

  return (
    <>
      <div className="favorite-requests-card">
        <div className="favorite-requests-header">
          <h4 className="favorite-requests-title">Solicitudes que te pueden interesar</h4>
          <button
            type="button"
            className="favorite-requests-btn favorite-requests-btn-add"
            onClick={() => setIsFavoritesModalOpen(true)}
          >
            Agregar favoritos
          </button>
        </div>

        <div className="favorite-requests-count-wrapper">
          <p className="favorite-requests-count">{matchingRequestsCount}</p>
        </div>

        <button
          type="button"
          className="favorite-requests-btn favorite-requests-btn-view"
          onClick={() => {}}
        >
          Ver solicitudes
        </button>
      </div>

      <FavoriteMaterialsModal
        userId={userId}
        isOpen={isFavoritesModalOpen}
        onClose={() => setIsFavoritesModalOpen(false)}
        onSaved={() => {
          void loadMatchingRequestsCount();
        }}
      />
    </>
  );
};

export default FavoriteRequestsSummaryCard;
