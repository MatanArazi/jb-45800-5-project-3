import React from 'react';
import { Vacation } from '../types';
import VacationCard from './VacationCard';

interface VacationsGridProps {
  vacations: Vacation[];
  userLikes: Set<number>;
  toggleLike: (vacationId: number) => void;
  formatPrice: (price: string | number) => string;
  isAdmin?: boolean;
  onEdit?: (vacation: Vacation) => void;
  onDelete?: (vacationId: number) => void;
}

const VacationsGrid: React.FC<VacationsGridProps> = ({
  vacations,
  userLikes,
  toggleLike,
  formatPrice,
  isAdmin = false,
  onEdit,
  onDelete,
}) => {
  return (
    <section className="vacations-grid">
      {vacations.map((v) => (
        <VacationCard
          key={v.vacation_id}
          vacation={v}
          userLikes={userLikes}
          toggleLike={toggleLike}
          formatPrice={formatPrice}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </section>
  );
};

export default VacationsGrid;
