import React from 'react';

interface CorrectionTooltipProps {
  correction: string;
  error: string;
  error_type: string;
  position: { top: number; left: number };
  onAccept: () => void;
  onReject: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const CorrectionTooltip: React.FC<CorrectionTooltipProps> = ({
  correction,
  error,
  error_type,
  position,
  onAccept,
  onReject,
  onMouseEnter,
  onMouseLeave,
}) => {
  console.log('Rendering CorrectionTooltip with:', {
    correction,
    error,
    error_type,
    position
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateY(-100%)',
        zIndex: 1000,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        minWidth: '200px',
        marginTop: '-10px',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div style={{ marginBottom: '8px', color: '#000' }}>
        <strong>Correção:</strong> {correction}
      </div>
      <div style={{ marginBottom: '8px', color: '#000' }}>
        <strong>Tipo:</strong> {error_type}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={onAccept}
          style={{
            padding: '4px 8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Aceitar
        </button>
        <button 
          onClick={onReject}
          style={{
            padding: '4px 8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Rejeitar
        </button>
      </div>
    </div>
  );
};