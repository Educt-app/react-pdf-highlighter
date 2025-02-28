import React from "react";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";

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
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceAbove = position.top;
      const spaceBelow = viewportHeight - position.top;

      const tooltipElement = tooltipRef.current;

      if (spaceAbove >= tooltipRect.height) {
        // Enough space above, show above
        tooltipElement.style.top = `${position.top}px`;
        tooltipElement.style.transform = "translateY(-100%)";
      } else if (spaceBelow >= tooltipRect.height) {
        // Not enough space above but enough below, show below
        tooltipElement.style.top = `${position.top}px`;
        tooltipElement.style.transform = "translateY(20px)";
      } else {
        // Not enough space above or below, show where there's more space
        if (spaceAbove > spaceBelow) {
          tooltipElement.style.top = `${position.top}px`;
          tooltipElement.style.transform = "translateY(-100%)";
        } else {
          tooltipElement.style.top = `${position.top}px`;
          tooltipElement.style.transform = "translateY(20px)";
        }
      }
    }
  }, [position.top]);

  return (
    <div
      ref={tooltipRef}
      style={{
        position: "absolute",
        left: `${position.left}px`,
        transform: "translateY(-100%)",
        zIndex: 1000,
        backgroundColor: "white",
        border: "2px solid rgb(243 244 246)",
        borderRadius: "20px",
        padding: "15px 20px 17px 20px",
        // boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        minWidth: "200px",
        marginTop: "10px",
        fontFamily: "Inter, sans-serif",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div style={{ marginBottom: "20px" }}>
        <h1
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: "bold",
            fontSize: "11px",
            color: "#DE394D",
            letterSpacing: "0.5px",
          }}
        >
          ERRO ENCONTRADO
        </h1>
        <h1
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: "normal",
            fontSize: "17px",
            color: "black",
            marginTop: "-3px",
          }}
        >
          {error_type}
        </h1>
      </div>

      <hr
        style={{
          width: "100%",
          border: "1px solid rgb(243 244 246)",
        }}
      />

      {/* Ai Sugestion */}
      <div
        style={{
          backgroundColor: "#F6F6F6",
          borderRadius: "8px",
          border: "1px solid #6458D7",
          padding: "10px",
          marginTop: "20px",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            textAlign: "center",
            gap: "5px",
          }}
        >
          <AutoFixHighIcon style={{ color: "#6458D7", width: "22px" }} />
          <h1
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: "bold",
              fontSize: "12px",
              letterSpacing: "0.5px",
              color: "black",
              textAlign: "center",
              marginLeft: "5px",
            }}
          >
            Sugestão
          </h1>
        </div>

        <h1
          style={{
            marginTop: "3px",
            color: "#28273C",
            fontFamily: "Inter, sans-serif",
            fontSize: "18px",
            fontWeight: 400,
          }}
        >
          {correction}
        </h1>
      </div>

      <div
        style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}
      >
        <button
          onClick={onAccept}
          style={{
            padding: "3px 14px",
            borderRadius: "18px 0 0 18px",
            color: "black",
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            fontWeight: "bold",
            border: "2px solid rgb(243 244 246)",
            backgroundColor: "white",
            cursor: "pointer",
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
            width: "100%",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#B2FBA5")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "white")
          }
        >
          <CheckIcon style={{ color: "black" }} />
          <h1
            style={{
              color: "black",
              textAlign: "center",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              fontStyle: "normal",
              marginLeft: "5px",
              fontWeight: 500,
              letterSpacing: "0.7px",
            }}
          >
            Aceitar
          </h1>
        </button>
        <button
          onClick={onReject}
          style={{
            padding: "3px 14px",
            borderRadius: "0 18px 18px 0",
            color: "black",
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            fontWeight: "bold",
            border: "2px solid rgb(243 244 246)",
            backgroundColor: "white",
            cursor: "pointer",
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
            width: "100%",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#FF746C")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "white")
          }
        >
          <CloseIcon />
          <h1
            style={{
              color: "black",
              textAlign: "center",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              fontStyle: "normal",
              marginLeft: "5px",
              fontWeight: 500,
              letterSpacing: "0.7px",
            }}
          >
            Recusar
          </h1>
        </button>
      </div>
    </div>
  );
};
