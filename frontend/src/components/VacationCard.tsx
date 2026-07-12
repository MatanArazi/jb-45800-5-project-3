import React from 'react';
import { Vacation } from '../types';
import petraFallback from './DHHXC2.avif';

interface VacationCardProps {
  vacation: Vacation;
  userLikes: Set<number>;
  toggleLike: (vacationId: number) => void;
  formatPrice: (price: string | number) => string;
  isAdmin?: boolean;
  onEdit?: (vacation: Vacation) => void;
  onDelete?: (vacationId: number) => void;
}

const VacationCard: React.FC<VacationCardProps> = ({
  vacation,
  userLikes,
  toggleLike,
  formatPrice,
  isAdmin = false,
  onEdit,
  onDelete,
}) => {
  const isPetra = vacation.destination.toLowerCase().includes('petra');
  const imageSrc = isPetra ? petraFallback : (vacation.displayImage || vacation.image_url);

  return (
    <div key={vacation.vacation_id} className="vacation-card">
      {imageSrc && (
        <img
          src={imageSrc}
          alt={vacation.title}
          className="vacation-image"
        />
      )}

      <div className="vacation-content">
        <h3>{vacation.title}</h3>

        <p className="destination">
          <span>📍</span> {vacation.destination}
        </p>
        <p className="description">{vacation.description}</p>

        <div className="date-range">
          <span>
            📅 {new Date(vacation.start_date).toLocaleDateString()} -{' '}
            {new Date(vacation.end_date).toLocaleDateString()}
          </span>
        </div>

        <div className="price-section">
          <span className="price">${formatPrice(vacation.price)}</span>
          <span className="person">/person</span>
        </div>

        <div className="actions">
          {!isAdmin && (
            <button
              className={`like-button ${userLikes.has(vacation.vacation_id) ? 'liked' : ''}`}
              onClick={() => toggleLike(vacation.vacation_id)}
              title="Like this vacation"
            >
              ❤️ {vacation.total_likes}
            </button>
          )}

          {isAdmin && (
            <>
              <button
                className="edit-button"
                onClick={() => onEdit?.(vacation)}
                title="Edit this vacation"
                style={{ backgroundColor: '#ffc107', color: '#000', padding: '8px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                ✏️ Edit
              </button>

              <button
                className="delete-button"
                onClick={() => onDelete?.(vacation.vacation_id)}
                title="Delete this vacation"
                style={{ backgroundColor: '#dc3545', color: '#fff', padding: '8px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                🗑️ Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VacationCard;
