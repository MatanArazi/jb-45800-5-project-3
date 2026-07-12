import React from 'react';

interface AboutPanelProps {
  isPublic?: boolean;
}

const developerName = 'Matan Arazi';
const developerCollege = 'John Bryce';

const AboutPanel: React.FC<AboutPanelProps> = ({ isPublic = false }) => {
  return (
    <section className={`panel-section${isPublic ? ' about-panel-public' : ''}`}>
      <h2>About Vacation Paradise</h2>
      <p>
        Vacation Paradise is a role-based vacation management platform where registered users can browse destinations
        and like vacations, while admins can manage vacation packages and monitor reports.
      </p>
      <p>
        The system uses a React + TypeScript frontend, an Express + TypeScript backend, a MySQL database,
        and Docker-ready infrastructure for full local deployment.
      </p>
      <div className="about-meta">
        <h3>Developer Information</h3>
        <p><strong>Name:</strong> {developerName}</p>
        <p><strong>College:</strong> {developerCollege}</p>
      </div>
    </section>
  );
};

export default AboutPanel;
