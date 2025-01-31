import type { PDFDocumentProxy } from "pdfjs-dist";
import type { EventBus, PDFViewer } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";
import type { PDFViewerOptions } from "pdfjs-dist/types/web/pdf_viewer";
import React, {
  type PointerEventHandler,
  PureComponent,
  type RefObject,
} from "react";
import { type Root, createRoot } from "react-dom/client";
import { debounce } from "ts-debounce";
import { scaledToViewport, viewportToScaled } from "../lib/coordinates";
import { getAreaAsPNG } from "../lib/get-area-as-png";
import { getBoundingRect } from "../lib/get-bounding-rect";
import { getClientRects } from "../lib/get-client-rects";
import {
  findOrCreateContainerLayer,
  getPageFromElement,
  getPagesFromRange,
  getWindow,
  isHTMLElement,
} from "../lib/pdfjs-dom";
import styles from "../style/PdfHighlighter.module.css";
import type {
  IHighlight,
  LTWH,
  LTWHP,
  Position,
  Scaled,
  ScaledPosition,
} from "../types";
import { HighlightLayer } from "./HighlightLayer";
import { MouseSelection } from "./MouseSelection";
import { TipContainer } from "./TipContainer";
import { CorrectionTooltip } from './CorrectionTooltip';

export type T_ViewportHighlight<T_HT> = { position: Position } & T_HT;

interface State<T_HT> {
  ghostHighlight: {
    position: ScaledPosition;
    content?: { text?: string; image?: string };
  } | null;
  isCollapsed: boolean;
  range: Range | null;
  tip: {
    highlight: T_ViewportHighlight<T_HT>;
    callback: (highlight: T_ViewportHighlight<T_HT>) => JSX.Element;
  } | null;
  tipPosition: Position | null;
  tipChildren: JSX.Element | null;
  isAreaSelectionInProgress: boolean;
  scrolledToHighlightId: string;
  activeTooltip: { 
    correction: string;
    error: string;
    error_type: string;
    position: { top: number; left: number }; 
  } | null;
  hoverTimeoutId: number | null;
  activeError?: {
    text: string;
    element: HTMLElement;
    position: ScaledPosition;
  };
  
}

interface Props<T_HT> {
  corrections?: Array<{
    error: string;
    correction: string;
    error_type: string;
  }>;
  highlightTransform: (
    highlight: T_ViewportHighlight<T_HT>,
    index: number,
    setTip: (
      highlight: T_ViewportHighlight<T_HT>,
      callback: (highlight: T_ViewportHighlight<T_HT>) => JSX.Element,
    ) => void,
    hideTip: () => void,
    viewportToScaled: (rect: LTWHP) => Scaled,
    screenshot: (position: LTWH) => string,
    isScrolledTo: boolean,
  ) => JSX.Element;
  highlights: Array<T_HT>;
  onScrollChange: () => void;
  scrollRef: (scrollTo: (highlight: T_HT) => void) => void;
  pdfDocument: PDFDocumentProxy;
  pdfScaleValue: string;
  onSelectionFinished: (
    position: ScaledPosition,
    content: { text?: string; image?: string },
    hideTipAndSelection: () => void,
    transformSelection: () => void,
  ) => JSX.Element | null;
  enableAreaSelection: (event: MouseEvent) => boolean;
  pdfViewerOptions?: PDFViewerOptions;
}

const EMPTY_ID = "empty-id";

const styles_correction = `
  .error-highlight {
    background-color: rgba(255, 0, 0, 0.2) !important;
    cursor: pointer;
  }
`;

export class PdfHighlighter<T_HT extends IHighlight> extends PureComponent<
  Props<T_HT>,
  State<T_HT>
> {

  state = {
    ...this.state,
    activeTooltip: null as { 
      correction: string; 
      position: { top: number; left: number }; 
    } | null,
    hoverTimeoutId: null,
  };


  // Isso aqui deu trabalho pra caralho, entao bora explicar como funciona
  addHighlightsFromJson = (json: Array<{ error: string; correction: string; error_type: string }>) => {
    const { pdfDocument } = this.props;
  
    json.forEach(async (errorData) => {
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
        await waitForTextLayer();
  
        const textLayer = document.querySelector(
          `.page[data-page-number="${pageNumber}"] .textLayer`
        );
        
        if (!textLayer) continue;
  
        // Get all text nodes in the layer
        const textNodes: Text[] = [];
        const walker = document.createTreeWalker(
          textLayer,
          NodeFilter.SHOW_TEXT,
          null
        );
  
        let node;
        // implementação da busca de nós na tree do DOM
        while ((node = walker.nextNode())) {
          textNodes.push(node as Text);
        }
  
        // combina o texto de todos os nodes
        const combinedText = textNodes.map(node => node.textContent).join('');
        
        // busca as ocorrências de texto no documento
        const errorRegex = new RegExp(errorData.error.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        let match;
        
        while ((match = errorRegex.exec(combinedText)) !== null) {
          // salva a posição inicial e final do match do texto
          const startPos = match.index;
          const endPos = startPos + errorData.error.length;
  
          let currentPos = 0;
          let startNode: Text | null = null;
          let startOffset = 0;
          let endNode: Text | null = null;
          let endOffset = 0;
  
          for (const node of textNodes) {
            // encontra os nodes correspondentes que contém o texto
            const nodeLength = node.textContent?.length || 0;
            
            if (!startNode && currentPos + nodeLength > startPos) {
              startNode = node;
              startOffset = startPos - currentPos;
            }
            
            if (!endNode && currentPos + nodeLength >= endPos) {
              endNode = node;
              endOffset = endPos - currentPos;
              break;
            }
            
            currentPos += nodeLength;
          }
  
          if (startNode && endNode) {
            const range = document.createRange();
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);
  
            // cria um span para destacar o texto
            const span = document.createElement('span');
            span.classList.add('error-highlight');
            
            // adiciona o span ao range definido com base na posição do match do texto
            range.surroundContents(span);
  
            span.addEventListener('mouseenter', (e) => 
              this.handleHighlightMouseEnter(e, errorData)
            );
            span.addEventListener('mouseleave', () =>
              this.handleHighlightMouseLeave()
            );
          }
        }
      }
    });
  };

  static defaultProps = {
    pdfScaleValue: "auto",
  };

  state: State<T_HT> = {
    ghostHighlight: null,
    isCollapsed: true,
    range: null,
    scrolledToHighlightId: EMPTY_ID,
    isAreaSelectionInProgress: false,
    tip: null,
    tipPosition: null,
    tipChildren: null,
    activeTooltip: null,
    hoverTimeoutId: null,
  };

  viewer!: PDFViewer;

  resizeObserver: ResizeObserver | null = null;
  containerNode?: HTMLDivElement | null = null;
  containerNodeRef: RefObject<HTMLDivElement>;
  highlightRoots: {
    [page: number]: { reactRoot: Root; container: Element };
  } = {};
  unsubscribe = () => {};

  constructor(props: Props<T_HT>) {
    super(props);
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

  attachRef = (eventBus: EventBus) => {
    const { resizeObserver: observer } = this;
    this.containerNode = this.containerNodeRef.current;
    this.unsubscribe();

    if (this.containerNode) {
      const { ownerDocument: doc } = this.containerNode;
      eventBus.on("textlayerrendered", this.onTextLayerRendered);
      eventBus.on("pagesinit", this.onDocumentReady);
      doc.addEventListener("selectionchange", this.onSelectionChange);
      doc.addEventListener("keydown", this.handleKeyDown);
      doc.defaultView?.addEventListener("resize", this.debouncedScaleValue);
      if (observer) observer.observe(this.containerNode);

      this.unsubscribe = () => {
        eventBus.off("pagesinit", this.onDocumentReady);
        eventBus.off("textlayerrendered", this.onTextLayerRendered);
        doc.removeEventListener("selectionchange", this.onSelectionChange);
        doc.removeEventListener("keydown", this.handleKeyDown);
        doc.defaultView?.removeEventListener(
          "resize",
          this.debouncedScaleValue,
        );
        if (observer) observer.disconnect();
      };
    }
  };

  componentDidUpdate(prevProps: Props<T_HT>) {
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
    const pdfjs = await import("pdfjs-dist/web/pdf_viewer.mjs");

    const eventBus = new pdfjs.EventBus();
    const linkService = new pdfjs.PDFLinkService({
      eventBus,
      externalLinkTarget: 2,
    });

    if (!this.containerNodeRef.current) {
      throw new Error("!");
    }

    this.viewer =
      this.viewer ||
      new pdfjs.PDFViewer({
        container: this.containerNodeRef.current,
        eventBus: eventBus,
        // enhanceTextSelection: true, // deprecated. https://github.com/mozilla/pdf.js/issues/9943#issuecomment-409369485
        textLayerMode: 2,
        removePageBorders: true,
        linkService: linkService,
        ...pdfViewerOptions,
      });

    linkService.setDocument(pdfDocument);
    linkService.setViewer(this.viewer);
    this.viewer.setDocument(pdfDocument);

    this.attachRef(eventBus);
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  findOrCreateHighlightLayer(page: number) {
    const { textLayer } = this.viewer.getPageView(page - 1) || {};

    if (!textLayer) {
      return null;
    }

    return findOrCreateContainerLayer(
      textLayer.div,
      `PdfHighlighter__highlight-layer ${styles.highlightLayer}`,
      ".PdfHighlighter__highlight-layer",
    );
  }

  groupHighlightsByPage(highlights: Array<T_HT>): {
    [pageNumber: string]: Array<T_HT>;
  } {
    const { ghostHighlight } = this.state;

    const allHighlights = [...highlights, ghostHighlight].filter(
      Boolean,
    ) as T_HT[];

    const pageNumbers = new Set<number>();
    for (const highlight of allHighlights) {
      pageNumbers.add(highlight.position.pageNumber);
      for (const rect of highlight.position.rects) {
        if (rect.pageNumber) {
          pageNumbers.add(rect.pageNumber);
        }
      }
    }

    const groupedHighlights: Record<number, T_HT[]> = {};

    for (const pageNumber of pageNumbers) {
      groupedHighlights[pageNumber] = groupedHighlights[pageNumber] || [];
      for (const highlight of allHighlights) {
        const pageSpecificHighlight = {
          ...highlight,
          position: {
            pageNumber,
            boundingRect: highlight.position.boundingRect,
            rects: [],
            usePdfCoordinates: highlight.position.usePdfCoordinates,
          } as ScaledPosition,
        };
        let anyRectsOnPage = false;
        for (const rect of highlight.position.rects) {
          if (
            pageNumber === (rect.pageNumber || highlight.position.pageNumber)
          ) {
            pageSpecificHighlight.position.rects.push(rect);
            anyRectsOnPage = true;
          }
        }
        if (anyRectsOnPage || pageNumber === highlight.position.pageNumber) {
          groupedHighlights[pageNumber].push(pageSpecificHighlight);
        }
      }
    }

    return groupedHighlights;
  }

  showTip(highlight: T_ViewportHighlight<T_HT>, content: JSX.Element) {
    const { isCollapsed, ghostHighlight, isAreaSelectionInProgress } =
      this.state;

    const highlightInProgress = !isCollapsed || ghostHighlight;

    if (highlightInProgress || isAreaSelectionInProgress) {
      return;
    }

    this.setTip(highlight.position, content);
  }

  scaledPositionToViewport({
    pageNumber,
    boundingRect,
    rects,
    usePdfCoordinates,
  }: ScaledPosition): Position {
    const viewport = this.viewer.getPageView(pageNumber - 1).viewport;

    return {
      boundingRect: scaledToViewport(boundingRect, viewport, usePdfCoordinates),
      rects: (rects || []).map((rect) =>
        scaledToViewport(rect, viewport, usePdfCoordinates),
      ),
      pageNumber,
    };
  }

  viewportPositionToScaled({
    pageNumber,
    boundingRect,
    rects,
  }: Position): ScaledPosition {
    const viewport = this.viewer.getPageView(pageNumber - 1).viewport;

    return {
      boundingRect: viewportToScaled(boundingRect, viewport),
      rects: (rects || []).map((rect) => viewportToScaled(rect, viewport)),
      pageNumber,
    };
  }

  screenshot(position: LTWH, pageNumber: number) {
    const canvas = this.viewer.getPageView(pageNumber - 1).canvas;

    return getAreaAsPNG(canvas, position);
  }

  hideTipAndSelection = () => {
    this.setState({
      tipPosition: null,
      tipChildren: null,
    });

    this.setState({ ghostHighlight: null, tip: null }, () =>
      this.renderHighlightLayers(),
    );
  };

  setTip(position: Position, inner: JSX.Element | null) {
    this.setState({
      tipPosition: position,
      tipChildren: inner,
    });
  }

  renderTip = () => {
    const { tipPosition, tipChildren } = this.state;
    if (!tipPosition) return null;

    const { boundingRect, pageNumber } = tipPosition;
    const page = {
      node: this.viewer.getPageView((boundingRect.pageNumber || pageNumber) - 1)
        .div,
      pageNumber: boundingRect.pageNumber || pageNumber,
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
      pageNumber: page.pageNumber,
    };

    return (
      <TipContainer
        scrollTop={this.viewer.container.scrollTop}
        pageBoundingRect={pageBoundingRect}
        style={{
          left:
            page.node.offsetLeft + boundingRect.left + boundingRect.width / 2,
          top: boundingRect.top + page.node.offsetTop,
          bottom: boundingRect.top + page.node.offsetTop + boundingRect.height,
        }}
      >
        {tipChildren}
      </TipContainer>
    );
  };

  onTextLayerRendered = () => {
    this.renderHighlightLayers();
  };

  scrollTo = (highlight: T_HT) => {
    const { pageNumber, boundingRect, usePdfCoordinates } = highlight.position;

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
          scaledToViewport(boundingRect, pageViewport, usePdfCoordinates).top -
            scrollMargin,
        ),
        0,
      ],
    });

    this.setState(
      {
        scrolledToHighlightId: highlight.id,
      },
      () => this.renderHighlightLayers(),
    );

    // wait for scrolling to finish
    setTimeout(() => {
      this.viewer.container.addEventListener("scroll", this.onScroll);
    }, 100);
  };

  onDocumentReady = () => {
    const { scrollRef } = this.props;

    this.handleScaleValue();

    scrollRef(this.scrollTo);
  };

  onSelectionChange = () => {
    const container = this.containerNode;
    if (!container) {
      return;
    }

    const selection = getWindow(container).getSelection();
    if (!selection) {
      return;
    }

    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (selection.isCollapsed) {
      this.setState({ isCollapsed: true });
      return;
    }

    if (
      !range ||
      !container ||
      !container.contains(range.commonAncestorContainer)
    ) {
      return;
    }

    this.setState({
      isCollapsed: false,
      range,
    });

    this.debouncedAfterSelection();
  };

  onScroll = () => {
    const { onScrollChange } = this.props;

    onScrollChange();

    this.setState(
      {
        scrolledToHighlightId: EMPTY_ID,
      },
      () => this.renderHighlightLayers(),
    );

    this.viewer.container.removeEventListener("scroll", this.onScroll);
  };

  onMouseDown: PointerEventHandler = (event) => {
    if (!(event.target instanceof Element) || !isHTMLElement(event.target)) {
      return;
    }

    if (event.target.closest("#PdfHighlighter__tip-container")) {
      return;
    }

    this.hideTipAndSelection();
  };

  handleKeyDown = (event: KeyboardEvent) => {
    if (event.code === "Escape") {
      this.hideTipAndSelection();
    }
  };

  afterSelection = () => {
    const { onSelectionFinished } = this.props;

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

    const boundingRect = getBoundingRect(rects);

    const viewportPosition: Position = {
      boundingRect,
      rects,
      pageNumber: pages[0].number,
    };

    const content = {
      text: range.toString(),
    };
    const scaledPosition = this.viewportPositionToScaled(viewportPosition);

    this.setTip(
      viewportPosition,
      onSelectionFinished(
        scaledPosition,
        content,
        () => this.hideTipAndSelection(),
        () =>
          this.setState(
            {
              ghostHighlight: { position: scaledPosition },
            },
            () => this.renderHighlightLayers(),
          ),
      ),
    );
  };

  debouncedAfterSelection: () => void = debounce(this.afterSelection, 500);

  toggleTextSelection(flag: boolean) {
    if (!this.viewer.viewer) {
      return;
    }
    this.viewer.viewer.classList.toggle(styles.disableSelection, flag);
  }

  handleScaleValue = () => {
    if (this.viewer) {
      this.viewer.currentScaleValue = this.props.pdfScaleValue; //"page-width";
    }
  };

  debouncedScaleValue: () => void = debounce(this.handleScaleValue, 500);

  handleHighlightMouseEnter = (e: MouseEvent, errorData: { 
    error: string;
    correction: string;
    error_type: string;
}) => {
    const targetElement = e.target as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const page = getPageFromElement(targetElement);
    
    if (!page) return;

    // Get viewer container position
    const viewerContainer = this.viewer.container;
    const viewerRect = viewerContainer.getBoundingClientRect();
    
    // Calculate absolute position considering viewer offset
    const absoluteLeft = rect.left - viewerRect.left + viewerContainer.scrollLeft;
    const absoluteTop = rect.top - viewerRect.top + viewerContainer.scrollTop;
    
    // Center horizontally relative to highlight
    const centerX = absoluteLeft + (rect.width / 2);
    
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
                top: absoluteTop - 5, // Small offset above highlight
                left: centerX - 100 // Assuming tooltip width is 200px
            }
        }
    });
};

  handleHighlightMouseLeave = () => {
    console.log('Mouse Leave Event');
    const timeoutId = window.setTimeout(() => {
      console.log('Hiding tooltip');
      this.setState({ activeTooltip: null });
    }, 200);
    
    this.setState({ hoverTimeoutId: timeoutId });
  };

  handleRejectCorrection = () => {
    const textElement = document.querySelector('.error-highlight') as HTMLElement;
    if (!textElement) return;
  
    // Remover o elemento destacado do DOM
    textElement.remove();
  
    // Atualizar o estado para garantir que o tooltip não seja renderizado novamente
    this.setState({ activeTooltip: null });
  };

  // Update handleAcceptCorrection to use the stored position
  handleAcceptCorrection = (correction: string) => {
    const { activeError } = this.state;
    if (!activeError) return;

    const content = {
      text: activeError.text
    };

    // Create new highlight using the stored position
    const newHighlight = {
      content,
      position: activeError.position,
      comment: {
        text: correction,
        emoji: ""
      }
    };

    // Pass the specific error data to selection handler
    this.props.onSelectionFinished(
      activeError.position,
      content,
      () => {
        this.hideTipAndSelection();
        this.setState({ 
          activeTooltip: null,
          activeError: undefined 
        });
        activeError.element.classList.remove('error-highlight');
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
      activeError: undefined
    });
  };

  render() {
    return (
      <>
        <div onPointerDown={this.onMouseDown}>
          <div
            ref={this.containerNodeRef}
            className={styles.container}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="pdfViewer" />
            {this.renderTip()}
            {typeof enableAreaSelection === "function" ? (
              <MouseSelection
                onDragStart={() => this.toggleTextSelection(true)}
                onDragEnd={() => this.toggleTextSelection(false)}
                onChange={(isVisible) =>
                  this.setState({ isAreaSelectionInProgress: isVisible })
                }
                shouldStart={(event) =>
                  enableAreaSelection(event) &&
                  event.target instanceof Element &&
                  isHTMLElement(event.target) &&
                  Boolean(event.target.closest(".page"))
                }
                onSelection={(startTarget, boundingRect, resetSelection) => {
                  const page = getPageFromElement(startTarget);

                  if (!page) {
                    return;
                  }

                  const pageBoundingRect = {
                    ...boundingRect,
                    top: boundingRect.top - page.node.offsetTop,
                    left: boundingRect.left - page.node.offsetLeft,
                    pageNumber: page.number,
                  };

                  const viewportPosition = {
                    boundingRect: pageBoundingRect,
                    rects: [],
                    pageNumber: page.number,
                  };

                  const scaledPosition =
                    this.viewportPositionToScaled(viewportPosition);

                  const image = this.screenshot(
                    pageBoundingRect,
                    pageBoundingRect.pageNumber,
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
                              content: { image },
                            },
                          },
                          () => {
                            resetSelection();
                            this.renderHighlightLayers();
                          },
                        );
                      },
                    ),
                  );
                }}
              />
            ) : null}
          </div>
        </div>
        {this.state.activeTooltip && (
          <CorrectionTooltip
            correction={this.state.activeTooltip.correction}
            error={this.state.activeTooltip.error}
            error_type={this.state.activeTooltip.error_type}
            position={this.state.activeTooltip.position}
            onAccept={() => {
              this.handleAcceptCorrection(
                this.state.activeTooltip!.correction,
                this.state.activeTooltip!.error,
                this.state.activeTooltip!.position
              );
            }}
            onReject={this.handleRejectCorrection}
            onMouseEnter={() => {
              if (this.state.hoverTimeoutId) {
                clearTimeout(this.state.hoverTimeoutId);
              }
            }}
            onMouseLeave={this.handleHighlightMouseLeave}
          />
        )}
      </>
    );
  }

  private renderHighlightLayers() {
    const { pdfDocument } = this.props;
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      const highlightRoot = this.highlightRoots[pageNumber];
      /** Need to check if container is still attached to the DOM as PDF.js can unload pages. */
      if (highlightRoot?.container.isConnected) {
        this.renderHighlightLayer(highlightRoot.reactRoot, pageNumber);
      } else {
        const highlightLayer = this.findOrCreateHighlightLayer(pageNumber);
        if (highlightLayer) {
          const reactRoot = createRoot(highlightLayer);
          this.highlightRoots[pageNumber] = {
            reactRoot,
            container: highlightLayer,
          };
          this.renderHighlightLayer(reactRoot, pageNumber);
        }
      }
    }
  }

  private renderHighlightLayer(root: Root, pageNumber: number) {
    const { highlightTransform, highlights } = this.props;
    const { tip, scrolledToHighlightId } = this.state;
    root.render(
      <HighlightLayer
        highlightsByPage={this.groupHighlightsByPage(highlights)}
        pageNumber={pageNumber.toString()}
        scrolledToHighlightId={scrolledToHighlightId}
        highlightTransform={highlightTransform}
        tip={tip}
        scaledPositionToViewport={this.scaledPositionToViewport.bind(this)}
        hideTipAndSelection={this.hideTipAndSelection.bind(this)}
        viewer={this.viewer}
        screenshot={this.screenshot.bind(this)}
        showTip={this.showTip.bind(this)}
        setTip={(tip) => {
          this.setState({ tip });
        }}
      />,
    );
  }
}
async function waitForTextLayer() {
  return new Promise<void>((resolve) => {
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

