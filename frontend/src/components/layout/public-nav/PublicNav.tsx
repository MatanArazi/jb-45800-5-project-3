import React from 'react';

interface PublicNavProps {
  publicView: 'signin' | 'signup' | 'about';
  onChangeView: (nextView: 'signin' | 'signup' | 'about') => void;
}

const PublicNav: React.FC<PublicNavProps> = ({ publicView, onChangeView }) => {
  return (
    <div className="public-nav" aria-label="Public navigation">
      <button className={`nav-pill ${publicView === 'signin' ? 'active-filter' : ''}`} onClick={() => onChangeView('signin')}>Sign in</button>
      <button className={`nav-pill ${publicView === 'signup' ? 'active-filter' : ''}`} onClick={() => onChangeView('signup')}>Sign up</button>
      <button className={`nav-pill ${publicView === 'about' ? 'active-filter' : ''}`} onClick={() => onChangeView('about')}>About</button>
    </div>
  );
};

export default PublicNav;
