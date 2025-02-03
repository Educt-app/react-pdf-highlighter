var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import React, { useState, useRef, useEffect, useCallback, PureComponent, Component } from "react";
import { createRoot } from "react-dom/client";
import { debounce } from "ts-debounce";
import { Rnd } from "react-rnd";
import { GlobalWorkerOptions, getDocument as getDocument$1 } from "pdfjs-dist";
const viewportToScaled = (rect, { width, height }) => {
  return {
    x1: rect.left,
    y1: rect.top,
    x2: rect.left + rect.width,
    y2: rect.top + rect.height,
    width,
    height,
    pageNumber: rect.pageNumber
  };
};
const pdfToViewport = (pdf, viewport) => {
  const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([
    pdf.x1,
    pdf.y1,
    pdf.x2,
    pdf.y2
  ]);
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y1 - y2),
    pageNumber: pdf.pageNumber
  };
};
const scaledToViewport = (scaled, viewport, usePdfCoordinates = false) => {
  const { width, height } = viewport;
  if (usePdfCoordinates) {
    return pdfToViewport(scaled, viewport);
  }
  if (scaled.x1 === void 0) {
    throw new Error("You are using old position format, please update");
  }
  const x1 = width * scaled.x1 / scaled.width;
  const y1 = height * scaled.y1 / scaled.height;
  const x2 = width * scaled.x2 / scaled.width;
  const y2 = height * scaled.y2 / scaled.height;
  return {
    left: x1,
    top: y1,
    width: x2 - x1,
    height: y2 - y1,
    pageNumber: scaled.pageNumber
  };
};
const getDocument = (element) => element.ownerDocument || document;
const getWindow = (element) => getDocument(element).defaultView || window;
const isHTMLElement = (element) => element != null && (element instanceof HTMLElement || element instanceof getWindow(element).HTMLElement);
const isHTMLCanvasElement = (element) => element instanceof HTMLCanvasElement || element instanceof getWindow(element).HTMLCanvasElement;
const getPageFromElement = (target) => {
  const node = target.closest(".page");
  if (!isHTMLElement(node)) {
    return null;
  }
  const number = Number(node.dataset.pageNumber);
  return { node, number };
};
const getPagesFromRange = (range) => {
  const startParentElement = range.startContainer.parentElement;
  const endParentElement = range.endContainer.parentElement;
  if (!isHTMLElement(startParentElement) || !isHTMLElement(endParentElement)) {
    return [];
  }
  const startPage = getPageFromElement(startParentElement);
  const endPage = getPageFromElement(endParentElement);
  if (!(startPage == null ? void 0 : startPage.number) || !(endPage == null ? void 0 : endPage.number)) {
    return [];
  }
  if (startPage.number === endPage.number) {
    return [startPage];
  }
  if (startPage.number === endPage.number - 1) {
    return [startPage, endPage];
  }
  const pages = [];
  let currentPageNumber = startPage.number;
  const document2 = startPage.node.ownerDocument;
  while (currentPageNumber <= endPage.number) {
    const currentPage = getPageFromElement(
      document2.querySelector(
        `[data-page-number='${currentPageNumber}'`
      )
    );
    if (currentPage) {
      pages.push(currentPage);
    }
    currentPageNumber++;
  }
  return pages;
};
const findOrCreateContainerLayer = (container2, className, selector) => {
  const doc = getDocument(container2);
  let layer = container2.querySelector(selector);
  if (!layer) {
    layer = doc.createElement("div");
    layer.className = className;
    container2.appendChild(layer);
  }
  return layer;
};
const getAreaAsPNG = (canvas, position) => {
  const { left, top, width, height } = position;
  const doc = canvas ? canvas.ownerDocument : null;
  const newCanvas = doc == null ? void 0 : doc.createElement("canvas");
  if (!newCanvas || !isHTMLCanvasElement(newCanvas)) {
    return "";
  }
  newCanvas.width = width;
  newCanvas.height = height;
  const newCanvasContext = newCanvas.getContext("2d");
  if (!newCanvasContext || !canvas) {
    return "";
  }
  const dpr = window.devicePixelRatio;
  newCanvasContext.drawImage(
    canvas,
    left * dpr,
    top * dpr,
    width * dpr,
    height * dpr,
    0,
    0,
    width,
    height
  );
  return newCanvas.toDataURL("image/png");
};
const getBoundingRect$1 = (clientRects) => {
  const rects = Array.from(clientRects).map((rect) => {
    const { left, top, width, height, pageNumber: pageNumber2 } = rect;
    const X02 = left;
    const X12 = left + width;
    const Y02 = top;
    const Y12 = top + height;
    return { X0: X02, X1: X12, Y0: Y02, Y1: Y12, pageNumber: pageNumber2 };
  });
  let firstPageNumber = Number.MAX_SAFE_INTEGER;
  for (const rect of rects) {
    firstPageNumber = Math.min(
      firstPageNumber,
      rect.pageNumber ?? firstPageNumber
    );
  }
  const rectsWithSizeOnFirstPage = rects.filter(
    (rect) => (rect.X0 > 0 || rect.X1 > 0 || rect.Y0 > 0 || rect.Y1 > 0) && rect.pageNumber === firstPageNumber
  );
  const optimal = rectsWithSizeOnFirstPage.reduce((res, rect) => {
    return {
      X0: Math.min(res.X0, rect.X0),
      X1: Math.max(res.X1, rect.X1),
      Y0: Math.min(res.Y0, rect.Y0),
      Y1: Math.max(res.Y1, rect.Y1),
      pageNumber: firstPageNumber
    };
  }, rectsWithSizeOnFirstPage[0]);
  const { X0, X1, Y0, Y1, pageNumber } = optimal;
  return {
    left: X0,
    top: Y0,
    width: X1 - X0,
    height: Y1 - Y0,
    pageNumber
  };
};
const sort = (rects) => rects.sort((A, B) => {
  const top = (A.pageNumber || 0) * A.top - (B.pageNumber || 0) * B.top;
  if (top === 0) {
    return A.left - B.left;
  }
  return top;
});
const overlaps = (A, B) => A.pageNumber === B.pageNumber && A.left <= B.left && B.left <= A.left + A.width;
const sameLine = (A, B, yMargin = 5) => A.pageNumber === B.pageNumber && Math.abs(A.top - B.top) < yMargin && Math.abs(A.height - B.height) < yMargin;
const inside = (A, B) => A.pageNumber === B.pageNumber && A.top > B.top && A.left > B.left && A.top + A.height < B.top + B.height && A.left + A.width < B.left + B.width;
const nextTo = (A, B, xMargin = 10) => {
  const Aright = A.left + A.width;
  const Bright = B.left + B.width;
  return A.pageNumber === B.pageNumber && A.left <= B.left && Aright <= Bright && B.left - Aright <= xMargin;
};
const extendWidth = (A, B) => {
  A.width = Math.max(B.width - A.left + B.left, A.width);
};
const optimizeClientRects = (clientRects) => {
  const rects = sort(clientRects);
  const toRemove = /* @__PURE__ */ new Set();
  const firstPass = rects.filter((rect) => {
    return rects.every((otherRect) => {
      return !inside(rect, otherRect);
    });
  });
  let passCount = 0;
  while (passCount <= 2) {
    for (const A of firstPass) {
      for (const B of firstPass) {
        if (A === B || toRemove.has(A) || toRemove.has(B)) {
          continue;
        }
        if (!sameLine(A, B)) {
          continue;
        }
        if (overlaps(A, B)) {
          extendWidth(A, B);
          A.height = Math.max(A.height, B.height);
          toRemove.add(B);
        }
        if (nextTo(A, B)) {
          extendWidth(A, B);
          toRemove.add(B);
        }
      }
    }
    passCount += 1;
  }
  return firstPass.filter((rect) => !toRemove.has(rect));
};
const isClientRectInsidePageRect = (clientRect, pageRect) => {
  if (clientRect.top < pageRect.top) {
    return false;
  }
  if (clientRect.bottom > pageRect.bottom) {
    return false;
  }
  if (clientRect.right > pageRect.right) {
    return false;
  }
  if (clientRect.left < pageRect.left) {
    return false;
  }
  return true;
};
const getClientRects = (range, pages, shouldOptimize = true) => {
  const clientRects = Array.from(range.getClientRects());
  const rects = [];
  for (const clientRect of clientRects) {
    for (const page of pages) {
      const pageRect = page.node.getBoundingClientRect();
      if (isClientRectInsidePageRect(clientRect, pageRect) && clientRect.width > 0 && clientRect.height > 0 && clientRect.width < pageRect.width && clientRect.height < pageRect.height) {
        const highlightedRect = {
          top: clientRect.top + page.node.scrollTop - pageRect.top,
          left: clientRect.left + page.node.scrollLeft - pageRect.left,
          width: clientRect.width,
          height: clientRect.height,
          pageNumber: page.number
        };
        rects.push(highlightedRect);
      }
    }
  }
  return shouldOptimize ? optimizeClientRects(rects) : rects;
};
const container = "_container_12oj9_1";
const highlightLayer = "_highlightLayer_12oj9_8";
const tipContainer$1 = "_tipContainer_12oj9_14";
const disableSelection = "_disableSelection_12oj9_19";
const styles$5 = {
  container,
  highlightLayer,
  tipContainer: tipContainer$1,
  disableSelection
};
function HighlightLayer({
  highlightsByPage,
  scaledPositionToViewport,
  pageNumber,
  scrolledToHighlightId,
  highlightTransform,
  tip,
  hideTipAndSelection,
  viewer,
  screenshot,
  showTip,
  setTip
}) {
  const currentHighlights = highlightsByPage[String(pageNumber)] || [];
  return /* @__PURE__ */ jsx("div", { children: currentHighlights.map((highlight2, index) => {
    const viewportHighlight = {
      ...highlight2,
      position: scaledPositionToViewport(highlight2.position)
    };
    if (tip && tip.highlight.id === String(highlight2.id)) {
      showTip(tip.highlight, tip.callback(viewportHighlight));
    }
    const isScrolledTo = Boolean(scrolledToHighlightId === highlight2.id);
    return highlightTransform(
      viewportHighlight,
      index,
      (highlight22, callback) => {
        setTip({ highlight: highlight22, callback });
        showTip(highlight22, callback(highlight22));
      },
      hideTipAndSelection,
      (rect) => {
        const viewport = viewer.getPageView(
          (rect.pageNumber || Number.parseInt(pageNumber)) - 1
        ).viewport;
        return viewportToScaled(rect, viewport);
      },
      (boundingRect) => screenshot(boundingRect, Number.parseInt(pageNumber)),
      isScrolledTo
    );
  }) });
}
const mouseSelection = "_mouseSelection_1p43j_1";
const styles$4 = {
  mouseSelection
};
const getBoundingRect = (start, end) => ({
  left: Math.min(end.x, start.x),
  top: Math.min(end.y, start.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y)
});
const shouldRender = (boundingRect) => boundingRect.width >= 1 && boundingRect.height >= 1;
function MouseSelection({
  onSelection,
  onDragStart,
  onDragEnd,
  shouldStart,
  onChange
}) {
  const [locked, setLocked] = useState(false);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const rootRef = useRef(null);
  const startRef = useRef(start);
  const lockedRef = useRef(locked);
  useEffect(() => {
    startRef.current = start;
  }, [start]);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);
  const reset = useCallback(() => {
    onDragEnd();
    setStart(null);
    setEnd(null);
    setLocked(false);
  }, [onDragEnd]);
  useEffect(() => {
    const isVisible = Boolean(start && end);
    onChange(isVisible);
  }, [start, end, onChange]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const container2 = root.parentElement;
    if (!container2 || !isHTMLElement(container2)) {
      return;
    }
    const containerCoords = (pageX, pageY) => {
      const containerBoundingRect = container2.getBoundingClientRect();
      return {
        x: pageX - containerBoundingRect.left + container2.scrollLeft,
        y: pageY - containerBoundingRect.top + container2.scrollTop - window.scrollY
      };
    };
    const mouseMoveHandler = (event) => {
      if (!startRef.current || lockedRef.current) {
        return;
      }
      setEnd(containerCoords(event.pageX, event.pageY));
    };
    const mouseDownHandler = (event) => {
      if (!shouldStart(event)) {
        reset();
        return;
      }
      const startTarget = event.target;
      if (!(startTarget instanceof Element) || !isHTMLElement(startTarget)) {
        return;
      }
      onDragStart();
      setStart(containerCoords(event.pageX, event.pageY));
      setEnd(null);
      setLocked(false);
      const mouseUpHandler = (event2) => {
        var _a;
        (_a = event2.currentTarget) == null ? void 0 : _a.removeEventListener("mouseup", mouseUpHandler);
        const currentStart = startRef.current;
        if (!currentStart) {
          return;
        }
        if (!(event2 instanceof MouseEvent)) {
          return;
        }
        const endCoords = containerCoords(event2.pageX, event2.pageY);
        const boundingRect = getBoundingRect(currentStart, endCoords);
        if (!(event2.target instanceof Element) || !isHTMLElement(event2.target) || !container2.contains(event2.target) || !shouldRender(boundingRect)) {
          reset();
          return;
        }
        setEnd(endCoords);
        setLocked(true);
        onSelection(startTarget, boundingRect, reset);
        onDragEnd();
      };
      const doc = container2.ownerDocument;
      if (doc == null ? void 0 : doc.body) {
        doc.body.addEventListener("mouseup", mouseUpHandler);
      }
    };
    container2.addEventListener("mousemove", mouseMoveHandler);
    container2.addEventListener("mousedown", mouseDownHandler);
    return () => {
      container2.removeEventListener("mousemove", mouseMoveHandler);
      container2.removeEventListener("mousedown", mouseDownHandler);
    };
  }, [shouldStart, onDragStart, onDragEnd, onSelection, reset]);
  return /* @__PURE__ */ jsx("div", { ref: rootRef, children: start && end && /* @__PURE__ */ jsx(
    "div",
    {
      className: styles$4.mouseSelection,
      style: getBoundingRect(start, end)
    }
  ) });
}
const tipContainer = "_tipContainer_f56kr_1";
const styles$3 = {
  tipContainer
};
function clamp(value, left, right) {
  return Math.min(Math.max(value, left), right);
}
function TipContainer({
  children,
  style,
  scrollTop,
  pageBoundingRect
}) {
  const [height, setHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const nodeRef = useRef(null);
  const updatePosition = useCallback(() => {
    if (!nodeRef.current) {
      return;
    }
    const { offsetHeight, offsetWidth } = nodeRef.current;
    setHeight(offsetHeight);
    setWidth(offsetWidth);
  }, []);
  useEffect(() => {
    setTimeout(updatePosition, 0);
  }, [updatePosition]);
  const isStyleCalculationInProgress = width === 0 && height === 0;
  const shouldMove = style.top - height - 5 < scrollTop;
  const top = shouldMove ? style.bottom + 5 : style.top - height - 5;
  const left = clamp(style.left - width / 2, 0, pageBoundingRect.width - width);
  const handleUpdate = useCallback(() => {
    setWidth(0);
    setHeight(0);
    setTimeout(updatePosition, 0);
  }, [updatePosition]);
  const childrenWithProps = React.Children.map(
    children,
    (child) => child != null ? React.cloneElement(child, {
      onUpdate: handleUpdate,
      popup: {
        position: shouldMove ? "below" : "above"
      }
    }) : null
  );
  return /* @__PURE__ */ jsx(
    "div",
    {
      id: "PdfHighlighter__tip-container",
      className: styles$3.tipContainer,
      style: {
        visibility: isStyleCalculationInProgress ? "hidden" : "visible",
        top,
        left
      },
      ref: nodeRef,
      children: childrenWithProps
    }
  );
}
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
const EMPTY_ID = "empty-id";
const styles_correction = `
  .error-highlight {
    background-color: rgba(255, 0, 0, 0.2) !important;
    cursor: pointer;
  }
`;
class PdfHighlighter extends PureComponent {
  constructor(props) {
    super(props);
    __publicField(this, "state", {
      ...this.state,
      activeTooltip: null,
      hoverTimeoutId: null
    });
    // Isso aqui deu trabalho pra caralho, entao bora explicar como funciona
    __publicField(this, "addHighlightsFromJson", (json) => {
      const { pdfDocument } = this.props;
      json.forEach(async (errorData) => {
        var _a;
        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
          await waitForTextLayer();
          const textLayer = document.querySelector(
            `.page[data-page-number="${pageNumber}"] .textLayer`
          );
          if (!textLayer) continue;
          const textNodes = [];
          const walker = document.createTreeWalker(
            textLayer,
            NodeFilter.SHOW_TEXT,
            null
          );
          let node;
          while (node = walker.nextNode()) {
            textNodes.push(node);
          }
          const combinedText = textNodes.map((node2) => node2.textContent).join("");
          const errorRegex = new RegExp(errorData.error.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
          let match;
          while ((match = errorRegex.exec(combinedText)) !== null) {
            const startPos = match.index;
            const endPos = startPos + errorData.error.length;
            let currentPos = 0;
            let startNode = null;
            let startOffset = 0;
            let endNode = null;
            let endOffset = 0;
            for (const node2 of textNodes) {
              const nodeLength = ((_a = node2.textContent) == null ? void 0 : _a.length) || 0;
              if (!startNode && currentPos + nodeLength > startPos) {
                startNode = node2;
                startOffset = startPos - currentPos;
              }
              if (!endNode && currentPos + nodeLength >= endPos) {
                endNode = node2;
                endOffset = endPos - currentPos;
                break;
              }
              currentPos += nodeLength;
            }
            if (startNode && endNode) {
              const range = document.createRange();
              range.setStart(startNode, startOffset);
              range.setEnd(endNode, endOffset);
              const span = document.createElement("span");
              span.classList.add("error-highlight");
              range.surroundContents(span);
              span.addEventListener(
                "mouseenter",
                (e) => this.handleHighlightMouseEnter(e, errorData)
              );
              span.addEventListener(
                "mouseleave",
                () => this.handleHighlightMouseLeave()
              );
            }
          }
        }
      });
    });
    __publicField(this, "state", {
      ghostHighlight: null,
      isCollapsed: true,
      range: null,
      scrolledToHighlightId: EMPTY_ID,
      isAreaSelectionInProgress: false,
      tip: null,
      tipPosition: null,
      tipChildren: null,
      activeTooltip: null,
      hoverTimeoutId: null
    });
    __publicField(this, "viewer");
    __publicField(this, "resizeObserver", null);
    __publicField(this, "containerNode", null);
    __publicField(this, "containerNodeRef");
    __publicField(this, "highlightRoots", {});
    __publicField(this, "unsubscribe", () => {
    });
    __publicField(this, "attachRef", (eventBus) => {
      var _a;
      const { resizeObserver: observer } = this;
      this.containerNode = this.containerNodeRef.current;
      this.unsubscribe();
      if (this.containerNode) {
        const { ownerDocument: doc } = this.containerNode;
        eventBus.on("textlayerrendered", this.onTextLayerRendered);
        eventBus.on("pagesinit", this.onDocumentReady);
        doc.addEventListener("selectionchange", this.onSelectionChange);
        doc.addEventListener("keydown", this.handleKeyDown);
        (_a = doc.defaultView) == null ? void 0 : _a.addEventListener("resize", this.debouncedScaleValue);
        if (observer) observer.observe(this.containerNode);
        this.unsubscribe = () => {
          var _a2;
          eventBus.off("pagesinit", this.onDocumentReady);
          eventBus.off("textlayerrendered", this.onTextLayerRendered);
          doc.removeEventListener("selectionchange", this.onSelectionChange);
          doc.removeEventListener("keydown", this.handleKeyDown);
          (_a2 = doc.defaultView) == null ? void 0 : _a2.removeEventListener(
            "resize",
            this.debouncedScaleValue
          );
          if (observer) observer.disconnect();
        };
      }
    });
    __publicField(this, "hideTipAndSelection", () => {
      this.setState({
        tipPosition: null,
        tipChildren: null
      });
      this.setState(
        { ghostHighlight: null, tip: null },
        () => this.renderHighlightLayers()
      );
    });
    __publicField(this, "renderTip", () => {
      const { tipPosition, tipChildren } = this.state;
      if (!tipPosition) return null;
      const { boundingRect, pageNumber } = tipPosition;
      const page = {
        node: this.viewer.getPageView((boundingRect.pageNumber || pageNumber) - 1).div,
        pageNumber: boundingRect.pageNumber || pageNumber
      };
      const pageBoundingClientRect = page.node.getBoundingClientRect();
      const pageBoundingRect = {
        bottom: pageBoundingClientRect.bottom,
        height: pageBoundingClientRect.height,
        left: pageBoundingClientRect.left,
        right: pageBoundingClientRect.right,
        top: pageBoundingClientRect.top,
        width: pageBoundingClientRect.width,
        x: pageBoundingClientRect.x,
        y: pageBoundingClientRect.y,
        pageNumber: page.pageNumber
      };
      return /* @__PURE__ */ jsx(
        TipContainer,
        {
          scrollTop: this.viewer.container.scrollTop,
          pageBoundingRect,
          style: {
            left: page.node.offsetLeft + boundingRect.left + boundingRect.width / 2,
            top: boundingRect.top + page.node.offsetTop,
            bottom: boundingRect.top + page.node.offsetTop + boundingRect.height
          },
          children: tipChildren
        }
      );
    });
    __publicField(this, "onTextLayerRendered", () => {
      this.renderHighlightLayers();
    });
    __publicField(this, "scrollTo", (highlight2) => {
      const { pageNumber, boundingRect, usePdfCoordinates } = highlight2.position;
      this.viewer.container.removeEventListener("scroll", this.onScroll);
      const pageViewport = this.viewer.getPageView(pageNumber - 1).viewport;
      const scrollMargin = 10;
      this.viewer.scrollPageIntoView({
        pageNumber,
        destArray: [
          null,
          { name: "XYZ" },
          ...pageViewport.convertToPdfPoint(
            0,
            scaledToViewport(boundingRect, pageViewport, usePdfCoordinates).top - scrollMargin
          ),
          0
        ]
      });
      this.setState(
        {
          scrolledToHighlightId: highlight2.id
        },
        () => this.renderHighlightLayers()
      );
      setTimeout(() => {
        this.viewer.container.addEventListener("scroll", this.onScroll);
      }, 100);
    });
    __publicField(this, "onDocumentReady", () => {
      const { scrollRef } = this.props;
      this.handleScaleValue();
      scrollRef(this.scrollTo);
    });
    __publicField(this, "onSelectionChange", () => {
      const container2 = this.containerNode;
      if (!container2) {
        return;
      }
      const selection = getWindow(container2).getSelection();
      if (!selection) {
        return;
      }
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      if (selection.isCollapsed) {
        this.setState({ isCollapsed: true });
        return;
      }
      if (!range || !container2 || !container2.contains(range.commonAncestorContainer)) {
        return;
      }
      this.setState({
        isCollapsed: false,
        range
      });
      this.debouncedAfterSelection();
    });
    __publicField(this, "onScroll", () => {
      const { onScrollChange } = this.props;
      onScrollChange();
      this.setState(
        {
          scrolledToHighlightId: EMPTY_ID
        },
        () => this.renderHighlightLayers()
      );
      this.viewer.container.removeEventListener("scroll", this.onScroll);
    });
    __publicField(this, "onMouseDown", (event) => {
      if (!(event.target instanceof Element) || !isHTMLElement(event.target)) {
        return;
      }
      if (event.target.closest("#PdfHighlighter__tip-container")) {
        return;
      }
      this.hideTipAndSelection();
    });
    __publicField(this, "handleKeyDown", (event) => {
      if (event.code === "Escape") {
        this.hideTipAndSelection();
      }
    });
    __publicField(this, "afterSelection", () => {
      const { onSelectionFinished: onSelectionFinished2 } = this.props;
      const { isCollapsed, range } = this.state;
      if (!range || isCollapsed) {
        return;
      }
      const pages = getPagesFromRange(range);
      if (!pages || pages.length === 0) {
        return;
      }
      const rects = getClientRects(range, pages);
      if (rects.length === 0) {
        return;
      }
      const boundingRect = getBoundingRect$1(rects);
      const viewportPosition = {
        boundingRect,
        rects,
        pageNumber: pages[0].number
      };
      const content = {
        text: range.toString()
      };
      const scaledPosition = this.viewportPositionToScaled(viewportPosition);
      this.setTip(
        viewportPosition,
        onSelectionFinished2(
          scaledPosition,
          content,
          () => this.hideTipAndSelection(),
          () => this.setState(
            {
              ghostHighlight: { position: scaledPosition }
            },
            () => this.renderHighlightLayers()
          )
        )
      );
    });
    __publicField(this, "debouncedAfterSelection", debounce(this.afterSelection, 500));
    __publicField(this, "handleScaleValue", () => {
      if (this.viewer) {
        this.viewer.currentScaleValue = this.props.pdfScaleValue;
      }
    });
    __publicField(this, "debouncedScaleValue", debounce(this.handleScaleValue, 500));
    __publicField(this, "handleHighlightMouseEnter", (e, errorData) => {
      const targetElement = e.target;
      const rect = targetElement.getBoundingClientRect();
      const page = getPageFromElement(targetElement);
      if (!page) return;
      const viewerContainer = this.viewer.container;
      const viewerRect = viewerContainer.getBoundingClientRect();
      const absoluteLeft = rect.left - viewerRect.left + viewerContainer.scrollLeft;
      const absoluteTop = rect.top - viewerRect.top + viewerContainer.scrollTop;
      const centerX = absoluteLeft + rect.width / 2;
      const pageBoundingRect = {
        left: rect.left - page.node.getBoundingClientRect().left,
        top: rect.top - page.node.getBoundingClientRect().top,
        width: targetElement.offsetWidth,
        height: targetElement.offsetHeight,
        pageNumber: page.number
      };
      const viewportPosition = {
        boundingRect: pageBoundingRect,
        rects: [pageBoundingRect],
        pageNumber: page.number
      };
      const scaledPosition = this.viewportPositionToScaled(viewportPosition);
      this.setState({
        activeError: {
          text: errorData.error,
          element: targetElement,
          position: scaledPosition
        },
        activeTooltip: {
          correction: errorData.correction,
          error: errorData.error,
          error_type: errorData.error_type,
          position: {
            top: absoluteTop - 5,
            // Small offset above highlight
            left: centerX - 100
            // Assuming tooltip width is 200px
          }
        }
      });
    });
    __publicField(this, "handleHighlightMouseLeave", () => {
      console.log("Mouse Leave Event");
      const timeoutId = window.setTimeout(() => {
        console.log("Hiding tooltip");
        this.setState({ activeTooltip: null });
      }, 200);
      this.setState({ hoverTimeoutId: timeoutId });
    });
    __publicField(this, "handleRejectCorrection", () => {
      const textElement = document.querySelector(".error-highlight");
      if (!textElement) return;
      textElement.remove();
      this.setState({ activeTooltip: null });
    });
    // Update handleAcceptCorrection to use the stored position
    __publicField(this, "handleAcceptCorrection", (correction) => {
      const { activeError } = this.state;
      if (!activeError) return;
      const content = {
        text: activeError.text
      };
      const newHighlight = {
        content,
        position: activeError.position,
        comment: {
          text: correction,
          emoji: ""
        }
      };
      this.props.onSelectionFinished(
        activeError.position,
        content,
        () => {
          this.hideTipAndSelection();
          this.setState({
            activeTooltip: null,
            activeError: void 0
          });
          activeError.element.classList.remove("error-highlight");
        },
        () => {
          this.setState(
            {
              ghostHighlight: newHighlight
            },
            () => this.renderHighlightLayers()
          );
        }
      );
      activeError.element.remove();
      this.setState({
        activeTooltip: null,
        activeError: void 0
      });
    });
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.debouncedScaleValue);
    }
    this.containerNodeRef = React.createRef();
  }
  componentDidMount() {
    this.init();
    if (this.props.corrections) {
      this.addHighlightsFromJson(this.props.corrections);
    }
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles_correction;
    document.head.appendChild(styleSheet);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.pdfDocument !== this.props.pdfDocument) {
      this.init();
      return;
    }
    if (prevProps.highlights !== this.props.highlights) {
      this.renderHighlightLayers();
    }
  }
  async init() {
    const { pdfDocument, pdfViewerOptions } = this.props;
    const pdfjs = await import("./pdf_viewer-BqBHufSc.js");
    const eventBus = new pdfjs.EventBus();
    const linkService = new pdfjs.PDFLinkService({
      eventBus,
      externalLinkTarget: 2
    });
    if (!this.containerNodeRef.current) {
      throw new Error("!");
    }
    this.viewer = this.viewer || new pdfjs.PDFViewer({
      container: this.containerNodeRef.current,
      eventBus,
      // enhanceTextSelection: true, // deprecated. https://github.com/mozilla/pdf.js/issues/9943#issuecomment-409369485
      textLayerMode: 2,
      removePageBorders: true,
      linkService,
      ...pdfViewerOptions
    });
    linkService.setDocument(pdfDocument);
    linkService.setViewer(this.viewer);
    this.viewer.setDocument(pdfDocument);
    this.attachRef(eventBus);
  }
  componentWillUnmount() {
    this.unsubscribe();
  }
  findOrCreateHighlightLayer(page) {
    const { textLayer } = this.viewer.getPageView(page - 1) || {};
    if (!textLayer) {
      return null;
    }
    return findOrCreateContainerLayer(
      textLayer.div,
      `PdfHighlighter__highlight-layer ${styles$5.highlightLayer}`,
      ".PdfHighlighter__highlight-layer"
    );
  }
  groupHighlightsByPage(highlights) {
    const { ghostHighlight } = this.state;
    const allHighlights = [...highlights, ghostHighlight].filter(
      Boolean
    );
    const pageNumbers = /* @__PURE__ */ new Set();
    for (const highlight2 of allHighlights) {
      pageNumbers.add(highlight2.position.pageNumber);
      for (const rect of highlight2.position.rects) {
        if (rect.pageNumber) {
          pageNumbers.add(rect.pageNumber);
        }
      }
    }
    const groupedHighlights = {};
    for (const pageNumber of pageNumbers) {
      groupedHighlights[pageNumber] = groupedHighlights[pageNumber] || [];
      for (const highlight2 of allHighlights) {
        const pageSpecificHighlight = {
          ...highlight2,
          position: {
            pageNumber,
            boundingRect: highlight2.position.boundingRect,
            rects: [],
            usePdfCoordinates: highlight2.position.usePdfCoordinates
          }
        };
        let anyRectsOnPage = false;
        for (const rect of highlight2.position.rects) {
          if (pageNumber === (rect.pageNumber || highlight2.position.pageNumber)) {
            pageSpecificHighlight.position.rects.push(rect);
            anyRectsOnPage = true;
          }
        }
        if (anyRectsOnPage || pageNumber === highlight2.position.pageNumber) {
          groupedHighlights[pageNumber].push(pageSpecificHighlight);
        }
      }
    }
    return groupedHighlights;
  }
  showTip(highlight2, content) {
    const { isCollapsed, ghostHighlight, isAreaSelectionInProgress } = this.state;
    const highlightInProgress = !isCollapsed || ghostHighlight;
    if (highlightInProgress || isAreaSelectionInProgress) {
      return;
    }
    this.setTip(highlight2.position, content);
  }
  scaledPositionToViewport({
    pageNumber,
    boundingRect,
    rects,
    usePdfCoordinates
  }) {
    const viewport = this.viewer.getPageView(pageNumber - 1).viewport;
    return {
      boundingRect: scaledToViewport(boundingRect, viewport, usePdfCoordinates),
      rects: (rects || []).map(
        (rect) => scaledToViewport(rect, viewport, usePdfCoordinates)
      ),
      pageNumber
    };
  }
  viewportPositionToScaled({
    pageNumber,
    boundingRect,
    rects
  }) {
    const viewport = this.viewer.getPageView(pageNumber - 1).viewport;
    return {
      boundingRect: viewportToScaled(boundingRect, viewport),
      rects: (rects || []).map((rect) => viewportToScaled(rect, viewport)),
      pageNumber
    };
  }
  screenshot(position, pageNumber) {
    const canvas = this.viewer.getPageView(pageNumber - 1).canvas;
    return getAreaAsPNG(canvas, position);
  }
  setTip(position, inner) {
    this.setState({
      tipPosition: position,
      tipChildren: inner
    });
  }
  toggleTextSelection(flag) {
    if (!this.viewer.viewer) {
      return;
    }
    this.viewer.viewer.classList.toggle(styles$5.disableSelection, flag);
  }
  render() {
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { onPointerDown: this.onMouseDown, children: /* @__PURE__ */ jsxs(
        "div",
        {
          ref: this.containerNodeRef,
          className: styles$5.container,
          onContextMenu: (e) => e.preventDefault(),
          children: [
            /* @__PURE__ */ jsx("div", { className: "pdfViewer" }),
            this.renderTip(),
            typeof enableAreaSelection === "function" ? /* @__PURE__ */ jsx(
              MouseSelection,
              {
                onDragStart: () => this.toggleTextSelection(true),
                onDragEnd: () => this.toggleTextSelection(false),
                onChange: (isVisible) => this.setState({ isAreaSelectionInProgress: isVisible }),
                shouldStart: (event) => enableAreaSelection(event) && event.target instanceof Element && isHTMLElement(event.target) && Boolean(event.target.closest(".page")),
                onSelection: (startTarget, boundingRect, resetSelection) => {
                  const page = getPageFromElement(startTarget);
                  if (!page) {
                    return;
                  }
                  const pageBoundingRect = {
                    ...boundingRect,
                    top: boundingRect.top - page.node.offsetTop,
                    left: boundingRect.left - page.node.offsetLeft,
                    pageNumber: page.number
                  };
                  const viewportPosition = {
                    boundingRect: pageBoundingRect,
                    rects: [],
                    pageNumber: page.number
                  };
                  const scaledPosition = this.viewportPositionToScaled(viewportPosition);
                  const image = this.screenshot(
                    pageBoundingRect,
                    pageBoundingRect.pageNumber
                  );
                  this.setTip(
                    viewportPosition,
                    onSelectionFinished(
                      scaledPosition,
                      { image },
                      () => this.hideTipAndSelection(),
                      () => {
                        console.log("setting ghost highlight", scaledPosition);
                        this.setState(
                          {
                            ghostHighlight: {
                              position: scaledPosition,
                              content: { image }
                            }
                          },
                          () => {
                            resetSelection();
                            this.renderHighlightLayers();
                          }
                        );
                      }
                    )
                  );
                }
              }
            ) : null
          ]
        }
      ) }),
      this.state.activeTooltip && /* @__PURE__ */ jsx(
        CorrectionTooltip,
        {
          correction: this.state.activeTooltip.correction,
          error: this.state.activeTooltip.error,
          error_type: this.state.activeTooltip.error_type,
          position: this.state.activeTooltip.position,
          onAccept: () => {
            this.handleAcceptCorrection(
              this.state.activeTooltip.correction,
              this.state.activeTooltip.error,
              this.state.activeTooltip.position
            );
          },
          onReject: this.handleRejectCorrection,
          onMouseEnter: () => {
            if (this.state.hoverTimeoutId) {
              clearTimeout(this.state.hoverTimeoutId);
            }
          },
          onMouseLeave: this.handleHighlightMouseLeave
        }
      )
    ] });
  }
  renderHighlightLayers() {
    const { pdfDocument } = this.props;
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      const highlightRoot = this.highlightRoots[pageNumber];
      if (highlightRoot == null ? void 0 : highlightRoot.container.isConnected) {
        this.renderHighlightLayer(highlightRoot.reactRoot, pageNumber);
      } else {
        const highlightLayer2 = this.findOrCreateHighlightLayer(pageNumber);
        if (highlightLayer2) {
          const reactRoot = createRoot(highlightLayer2);
          this.highlightRoots[pageNumber] = {
            reactRoot,
            container: highlightLayer2
          };
          this.renderHighlightLayer(reactRoot, pageNumber);
        }
      }
    }
  }
  renderHighlightLayer(root, pageNumber) {
    const { highlightTransform, highlights } = this.props;
    const { tip, scrolledToHighlightId } = this.state;
    root.render(
      /* @__PURE__ */ jsx(
        HighlightLayer,
        {
          highlightsByPage: this.groupHighlightsByPage(highlights),
          pageNumber: pageNumber.toString(),
          scrolledToHighlightId,
          highlightTransform,
          tip,
          scaledPositionToViewport: this.scaledPositionToViewport.bind(this),
          hideTipAndSelection: this.hideTipAndSelection.bind(this),
          viewer: this.viewer,
          screenshot: this.screenshot.bind(this),
          showTip: this.showTip.bind(this),
          setTip: (tip2) => {
            this.setState({ tip: tip2 });
          }
        }
      )
    );
  }
}
__publicField(PdfHighlighter, "defaultProps", {
  pdfScaleValue: "auto"
});
async function waitForTextLayer() {
  return new Promise((resolve) => {
    const checkTextLayer = () => {
      const textLayers = document.querySelectorAll(".textLayer");
      if (textLayers.length > 0) {
        resolve();
      } else {
        requestAnimationFrame(checkTextLayer);
      }
    };
    checkTextLayer();
  });
}
const compact = "_compact_1um8o_1";
const card = "_card_1um8o_10";
const styles$2 = {
  compact,
  card
};
class Tip extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "state", {
      compact: true,
      text: "",
      emoji: ""
    });
  }
  // for TipContainer
  componentDidUpdate(_, nextState) {
    const { onUpdate } = this.props;
    if (onUpdate && this.state.compact !== nextState.compact) {
      onUpdate();
    }
  }
  render() {
    const { onConfirm, onOpen } = this.props;
    const { compact: compact2, text, emoji: emoji2 } = this.state;
    return /* @__PURE__ */ jsx("div", { children: compact2 ? /* @__PURE__ */ jsx(
      "div",
      {
        className: styles$2.compact,
        onClick: () => {
          onOpen();
          this.setState({ compact: false });
        },
        children: "Adicionar comentário"
      }
    ) : /* @__PURE__ */ jsxs(
      "form",
      {
        className: styles$2.card,
        onSubmit: (event) => {
          event.preventDefault();
          onConfirm({ text, emoji: emoji2 });
        },
        children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(
              "textarea",
              {
                placeholder: "Seu comentário",
                autoFocus: true,
                value: text,
                onChange: (event) => this.setState({ text: event.target.value }),
                ref: (node) => {
                  if (node) {
                    node.focus();
                  }
                }
              }
            ),
            /* @__PURE__ */ jsx("div", { children: ["✅", "❌", "❗", "😍", "🤔", "⚠️", "🥳 "].map((_emoji) => /* @__PURE__ */ jsxs("label", { children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  checked: emoji2 === _emoji,
                  type: "radio",
                  name: "emoji",
                  value: _emoji,
                  onChange: (event) => this.setState({ emoji: event.target.value })
                }
              ),
              _emoji
            ] }, _emoji)) })
          ] }),
          /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("input", { type: "submit", value: "Salvar" }) })
        ]
      }
    ) });
  }
}
const highlight = "_highlight_3l4zw_1";
const emoji = "_emoji_3l4zw_5";
const parts = "_parts_3l4zw_12";
const part$1 = "_part_3l4zw_12";
const scrolledTo$1 = "_scrolledTo_3l4zw_23";
const styles$1 = {
  highlight,
  emoji,
  parts,
  part: part$1,
  scrolledTo: scrolledTo$1
};
function Highlight({
  position,
  onClick,
  onMouseOver,
  onMouseOut,
  comment,
  isScrolledTo
}) {
  const { rects, boundingRect } = position;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `Highlight ${styles$1.highlight} ${isScrolledTo ? styles$1.scrolledTo : ""}`,
      children: [
        comment ? /* @__PURE__ */ jsx(
          "div",
          {
            className: `Highlight__emoji ${styles$1.emoji}`,
            style: {
              left: 20,
              top: boundingRect.top
            },
            children: comment.emoji
          }
        ) : null,
        /* @__PURE__ */ jsx("div", { className: `Highlight__parts ${styles$1.parts}`, children: rects.map((rect, index) => /* @__PURE__ */ jsx(
          "div",
          {
            onMouseOver,
            onMouseOut,
            onClick,
            style: rect,
            className: `Highlight__part ${styles$1.part}`
          },
          index
        )) })
      ]
    }
  );
}
class MouseMonitor extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "container", null);
    __publicField(this, "unsubscribe", () => {
    });
    __publicField(this, "onMouseMove", (event) => {
      if (!this.container) {
        return;
      }
      const { onMoveAway, paddingX, paddingY } = this.props;
      const { clientX, clientY } = event;
      const { left, top, width, height } = this.container.getBoundingClientRect();
      const inBoundsX = clientX > left - paddingX && clientX < left + width + paddingX;
      const inBoundsY = clientY > top - paddingY && clientY < top + height + paddingY;
      const isNear = inBoundsX && inBoundsY;
      if (!isNear) {
        onMoveAway();
      }
    });
    __publicField(this, "attachRef", (ref) => {
      this.container = ref;
      this.unsubscribe();
      if (ref) {
        const { ownerDocument: doc } = ref;
        doc.addEventListener("mousemove", this.onMouseMove);
        this.unsubscribe = () => {
          doc.removeEventListener("mousemove", this.onMouseMove);
        };
      }
    });
  }
  render() {
    const { onMoveAway, paddingX, paddingY, children, ...restProps } = this.props;
    return /* @__PURE__ */ jsx("div", { ref: this.attachRef, children: React.cloneElement(children, restProps) });
  }
}
function Popup({
  onMouseOver,
  popupContent,
  onMouseOut,
  children
}) {
  const [mouseIn, setMouseIn] = useState(false);
  return /* @__PURE__ */ jsx(
    "div",
    {
      onMouseOver: () => {
        setMouseIn(true);
        onMouseOver(
          /* @__PURE__ */ jsx(
            MouseMonitor,
            {
              onMoveAway: () => {
                if (mouseIn) {
                  return;
                }
                onMouseOut();
              },
              paddingX: 60,
              paddingY: 30,
              children: popupContent
            }
          )
        );
      },
      onMouseOut: () => {
        setMouseIn(false);
      },
      children
    }
  );
}
const areaHighlight = "_areaHighlight_1ppoh_1";
const part = "_part_1ppoh_8";
const scrolledTo = "_scrolledTo_1ppoh_15";
const styles = {
  areaHighlight,
  part,
  scrolledTo
};
function AreaHighlight({
  highlight: highlight2,
  onChange,
  isScrolledTo,
  ...otherProps
}) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: `${styles.areaHighlight} ${isScrolledTo ? styles.scrolledTo : ""}`,
      children: /* @__PURE__ */ jsx(
        Rnd,
        {
          className: styles.part,
          onDragStop: (_, data) => {
            const boundingRect = {
              ...highlight2.position.boundingRect,
              top: data.y,
              left: data.x
            };
            onChange(boundingRect);
          },
          onResizeStop: (_mouseEvent, _direction, ref, _delta, position) => {
            var _a;
            const boundingRect = {
              top: position.y,
              left: position.x,
              width: ref.offsetWidth,
              height: ref.offsetHeight,
              pageNumber: ((_a = getPageFromElement(ref)) == null ? void 0 : _a.number) || -1
            };
            onChange(boundingRect);
          },
          position: {
            x: highlight2.position.boundingRect.left,
            y: highlight2.position.boundingRect.top
          },
          size: {
            width: highlight2.position.boundingRect.width,
            height: highlight2.position.boundingRect.height
          },
          onClick: (event) => {
            event.stopPropagation();
            event.preventDefault();
          },
          ...otherProps
        }
      )
    }
  );
}
class PdfLoader extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "state", {
      pdfDocument: null,
      error: null
    });
    __publicField(this, "documentRef", React.createRef());
  }
  componentDidMount() {
    this.load();
  }
  componentWillUnmount() {
    const { pdfDocument: discardedDocument } = this.state;
    if (discardedDocument) {
      discardedDocument.destroy();
    }
  }
  componentDidUpdate({ url }) {
    if (this.props.url !== url) {
      this.load();
    }
  }
  componentDidCatch(error) {
    const { onError } = this.props;
    if (onError) {
      onError(error);
    }
    this.setState({ pdfDocument: null, error });
  }
  load() {
    const { ownerDocument = document } = this.documentRef.current || {};
    const { url, cMapUrl, cMapPacked, workerSrc } = this.props;
    const { pdfDocument: discardedDocument } = this.state;
    this.setState({ pdfDocument: null, error: null });
    if (typeof workerSrc === "string") {
      GlobalWorkerOptions.workerSrc = workerSrc;
    }
    Promise.resolve().then(() => discardedDocument == null ? void 0 : discardedDocument.destroy()).then(() => {
      if (!url) {
        return;
      }
      const document2 = {
        ...this.props,
        ownerDocument,
        cMapUrl,
        cMapPacked
      };
      return getDocument$1(document2).promise.then((pdfDocument) => {
        this.setState({ pdfDocument });
      });
    }).catch((e) => this.componentDidCatch(e));
  }
  render() {
    const { children, beforeLoad } = this.props;
    const { pdfDocument, error } = this.state;
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("span", { ref: this.documentRef }),
      error ? this.renderError() : !pdfDocument || !children ? beforeLoad : children(pdfDocument)
    ] });
  }
  renderError() {
    const { errorMessage } = this.props;
    if (errorMessage) {
      return React.cloneElement(errorMessage, { error: this.state.error });
    }
    return null;
  }
}
__publicField(PdfLoader, "defaultProps", {
  workerSrc: "https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs"
});
export {
  AreaHighlight,
  Highlight,
  PdfHighlighter,
  PdfLoader,
  Popup,
  Tip
};
