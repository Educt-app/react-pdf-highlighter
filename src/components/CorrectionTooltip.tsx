import React from "react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";

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
  console.log("Rendering CorrectionTooltip with:", {
    correction,
    error,
    error_type,
    position,
  });

  return (
    <div
      style={{
        position: "absolute",
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateY(-100%)",
        zIndex: 1000,
        backgroundColor: "#6c60df",
        // border: "3px solid black",
        borderRadius: "20px",
        padding: "20px 20px 15px 20px",
        // boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        minWidth: "200px",
        marginTop: "-2px",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        style={{
          fontFamily: "Inter",
          letterSpacing: "0.5px",
          marginBottom: "8px",
          color: "#FAF9F6",
        }}
      >
        <strong>Sugestão:</strong> {correction}
      </div>
      <div
        style={{
          fontFamily: "Inter",
          letterSpacing: "0.5px",
          marginBottom: "14px",
          color: "#FAF9F6",
        }}
      >
        <strong>Tipo de Erro:</strong> {error_type}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={onAccept}
          style={{
            padding: "3px 14px",
            borderRadius: "8px",
            color: "#FAF9F6",
            fontFamily: "Inter",
            fontSize: "14px",
            fontWeight: "bold",
            border: "0px solid #4cdd97",
            backgroundColor: "#4cdd97",
            cursor: "pointer",
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#3cbf7a")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#4cdd97")
          }
        >
          <CheckCircleOutlineIcon />
        </button>
        <button
          onClick={onReject}
          style={{
            padding: "3px 14px",
            borderRadius: "8px",
            color: "#FAF9F6",
            fontFamily: "Inter",
            fontSize: "14px",
            fontWeight: "bold",
            border: "0px solid #CA6F6F",
            backgroundColor: "#CA6F6F",
            cursor: "pointer",
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#9F7272")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#CA6F6F")
          }
        >
          <RemoveCircleOutlineIcon />
        </button>
      </div>
    </div>
  );
};
