import React from 'react';
import { Vacation } from '../types';

interface VacationCardProps {
  vacation: Vacation;
  userLikes: Set<number>;
  toggleLike: (vacationId: number) => void;
  handleBooking: (vacationId: number) => void;
  formatPrice: (price: string | number) => string;
}

const VacationCard: React.FC<VacationCardProps> = ({
  vacation,
  userLikes,
  toggleLike,
  handleBooking,
  formatPrice,
}) => {
  return (
    <div key={vacation.vacation_id} className="vacation-card">
      {(vacation.displayImage || vacation.image_url) && (
        <img
          src={vacation.displayImage || vacation.image_url!}
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
          <button
            className={`like-button ${userLikes.has(vacation.vacation_id) ? 'liked' : ''}`}
            onClick={() => toggleLike(vacation.vacation_id)}
            title="Like this vacation"
          >
            ❤️ {vacation.total_likes}
          </button>

          <button
            className="book-button"
            onClick={() => handleBooking(vacation.vacation_id)}
            title="Book this vacation"
          >
            📝 Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default VacationCard;
