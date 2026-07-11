import React from 'react';
import { Vacation } from '../types';
import VacationCard from './VacationCard';

interface VacationsGridProps {
  vacations: Vacation[];
  userLikes: Set<number>;
  toggleLike: (vacationId: number) => void;
  handleBooking: (vacationId: number) => void;
  formatPrice: (price: string | number) => string;
}

const VacationsGrid: React.FC<VacationsGridProps> = ({
  vacations,
  userLikes,
  toggleLike,
  handleBooking,
  formatPrice,
}) => {
  return (
    <section className="vacations-grid">
      {vacations.map((v) => (
        <VacationCard
          key={v.vacation_id}
          vacation={v}
          userLikes={userLikes}
          toggleLike={toggleLike}
          handleBooking={handleBooking}
          formatPrice={formatPrice}
        />
      ))}
    </section>
  );
};

export default VacationsGrid;
