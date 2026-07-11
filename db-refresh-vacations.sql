-- Refresh vacations catalog with mostly real places and image URLs.
-- Keeps schema intact and reuses seeded admin as creator.

SET @admin_id = (SELECT user_id FROM users WHERE email = 'admin@vacations.local' LIMIT 1);

DELETE FROM likes;
DELETE FROM bookings;
DELETE FROM reviews;
DELETE FROM vacations;

INSERT INTO vacations (title, description, destination, start_date, end_date, price, image_url, created_by) VALUES
('Paris City Lights', 'Classic Paris itinerary with Seine cruise and museum passes.', 'Paris, France', '2026-09-10', '2026-09-16', 1899.00, 'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1200', @admin_id),
('Rome Ancient Wonders', 'Explore the Colosseum, Roman Forum, and Vatican highlights.', 'Rome, Italy', '2026-10-02', '2026-10-08', 1720.00, 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200', @admin_id),
('Barcelona Architecture Escape', 'Gaudi landmarks, tapas tours, and Mediterranean beaches.', 'Barcelona, Spain', '2026-09-20', '2026-09-26', 1580.00, 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200', @admin_id),
('Tokyo Neon & Temples', 'Blend of modern city districts and traditional shrine visits.', 'Tokyo, Japan', '2026-11-05', '2026-11-12', 2390.00, 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200', @admin_id),
('Kyoto Autumn Trails', 'Historic temples, bamboo forests, and seasonal maple gardens.', 'Kyoto, Japan', '2026-11-15', '2026-11-21', 2140.00, 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=1200', @admin_id),
('London Royal Week', 'Royal landmarks, West End evening, and Thames-side walks.', 'London, UK', '2026-10-15', '2026-10-21', 1760.00, 'https://images.unsplash.com/photo-1488747279002-c8523379faaa?w=1200', @admin_id),
('New York Skyline Break', 'City pass access, Broadway night, and rooftop skyline tours.', 'New York, USA', '2026-12-01', '2026-12-07', 2050.00, 'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=1200', @admin_id),
('Vancouver Nature & City', 'Mountain viewpoints, harbor rides, and downtown food spots.', 'Vancouver, Canada', '2026-09-28', '2026-10-04', 1675.00, 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200', @admin_id),
('Swiss Alps Panorama', 'Scenic rail routes, alpine villages, and glacier excursions.', 'Interlaken, Switzerland', '2027-01-08', '2027-01-14', 2490.00, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200', @admin_id),
('Reykjavik Northern Lights', 'Aurora hunting, geothermal lagoons, and volcanic landscapes.', 'Reykjavik, Iceland', '2027-01-20', '2027-01-26', 2320.00, 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=1200', @admin_id),
('Cape Town Ocean & Peaks', 'Table Mountain cableway and Cape Peninsula day trips.', 'Cape Town, South Africa', '2026-12-10', '2026-12-16', 1980.00, 'https://images.unsplash.com/photo-1529528070131-eda9f3e90919?w=1200', @admin_id),
('Petra Desert Discovery', 'Guided ancient city trails and desert camp experience.', 'Petra, Jordan', '2026-10-25', '2026-10-30', 1490.00, 'https://images.unsplash.com/photo-1592409065737-4f3efdfce2ac?w=1200', @admin_id),
('Cloud City Spa Retreat', 'A fictional floating-city wellness journey with sky spas.', 'Cloud City (Fictional)', '2027-02-05', '2027-02-10', 2199.00, 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200', @admin_id),
('Moonlight Marshmallow Festival', 'A whimsical fictional moon-dune festival vacation.', 'Marshmallow Moonscape (Fictional)', '2027-02-18', '2027-02-22', 1299.00, 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200', @admin_id);
