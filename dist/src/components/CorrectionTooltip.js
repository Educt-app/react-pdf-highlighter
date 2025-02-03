import { jsxs, jsx } from "react/jsx-runtime";
const CorrectionTooltip = ({
  correction,
  error,
  error_type,
  position,
  onAccept,
  onReject,
  onMouseEnter,
  onMouseLeave
}) => {
  console.log("Rendering CorrectionTooltip with:", {
    correction,
    error,
    error_type,
    position
  });
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        position: "absolute",
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateY(-100%)",
        zIndex: 1e3,
        backgroundColor: "white",
        border: "1px solid #ccc",
        borderRadius: "4px",
        padding: "10px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        minWidth: "200px",
        marginTop: "-10px"
      },
      onMouseEnter,
      onMouseLeave,
      children: [
        /* @__PURE__ */ jsxs("div", { style: { marginBottom: "8px", color: "#000" }, children: [
          /* @__PURE__ */ jsx("strong", { children: "Correção:" }),
          " ",
          correction
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { marginBottom: "8px", color: "#000" }, children: [
          /* @__PURE__ */ jsx("strong", { children: "Tipo:" }),
          " ",
          error_type
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "8px" }, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onAccept,
              style: {
                padding: "4px 8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer"
              },
              children: "Aceitar"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onReject,
              style: {
                padding: "4px 8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer"
              },
              children: "Rejeitar"
            }
          )
        ] })
      ]
    }
  );
};
export {
  CorrectionTooltip
};
