import React, { useState, useEffect, useCallback, useRef } from "react";

import {
  AreaHighlight,
  Highlight,
  PdfHighlighter,
  PdfLoader,
  Popup,
  Tip,
} from "./react-pdf-highlighter";
import type {
  Content,
  IHighlight,
  NewHighlight,
  ScaledPosition,
} from "./react-pdf-highlighter";

import { Sidebar } from "./Sidebar";
import { Spinner } from "./Spinner";
import { testHighlights as _testHighlights } from "./test-highlights";

import "./style/App.css";
import "../../dist/style.css";

const testHighlights: Record<string, Array<IHighlight>> = _testHighlights;

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () =>
  document.location.hash.slice("#highlight-".length);

const resetHash = () => {
  document.location.hash = "";
};



const HighlightPopup = ({
  comment,
}: {
  comment: { text: string; emoji: string };
}) =>
  comment.text ? (
    <div className="Highlight__popup">
      {comment.emoji} {comment.text}
    </div>
  ) : null;

const PRIMARY_PDF_URL = "https://arxiv.org/pdf/1708.08021";
const SECONDARY_PDF_URL = "https://arxiv.org/pdf/1604.02480";

export function App() {
  const staticCorrections = [
    {
      "error": "In this paper we",
      "correction": "This paper presents",
      "error_type": "style"
    },
    {
      "error": "algorithms and systems infrastructure that we built to scale",
      "correction": "critical",
      "error_type": "word choice"
    }
  ];

  const [corrections, setCorrections] = useState<Array<{
    error: string;
    correction: string;
    error_type: string;
  }>>(staticCorrections); 
  const searchParams = new URLSearchParams(document.location.search);
  const initialUrl = searchParams.get("url") || PRIMARY_PDF_URL;

  const [url, setUrl] = useState(initialUrl);
  const [highlights, setHighlights] = useState<Array<IHighlight>>([]);
  const [comment, setComment] = useState<Array<{
    text: string;
    pageNumber: number;
    position: any;
    comment: string;
    emoji: string;
  }>>([]);

  const resetHighlights = () => {
    setHighlights([]);
  };

  const toggleDocument = () => {
    const newUrl =
      url === PRIMARY_PDF_URL ? SECONDARY_PDF_URL : PRIMARY_PDF_URL;
    setUrl(newUrl);
    setHighlights(testHighlights[newUrl] ? [...testHighlights[newUrl]] : []);
  };

  const scrollViewerTo = useRef((highlight: IHighlight) => {});

  const scrollToHighlightFromHash = useCallback(() => {
    const highlight = getHighlightById(parseIdFromHash());
    if (highlight) {
      scrollViewerTo.current(highlight);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", scrollToHighlightFromHash, false);
    return () => {
      window.removeEventListener(
        "hashchange",
        scrollToHighlightFromHash,
        false,
      );
    };
  }, [scrollToHighlightFromHash]);

  useEffect(() => {
    // Exemplo de carregamento do JSON
    const loadCorrections = async () => {
      try {
        const response = await fetch('/path/to/corrections.json');
        const data = await response.json();
        setCorrections(data);
      } catch (error) {
        console.error('Error loading corrections:', error);
      }
    };
  
    loadCorrections();
  }, [url]); // Recarrega quando a URL do PDF muda

  const getHighlightById = (id: string) => {
    return highlights.find((highlight) => highlight.id === id);
  };

  const addAIHighlight = (highlight: NewHighlight, errorText: string) => {
    console.log('Adding AI Highlight for text:', errorText);
    // Encontrar a correção específica que corresponde ao erro
    const matchingCorrection = corrections.find(
      correction => correction.error === errorText
    );
    console.log('Found matching correction:', matchingCorrection);
  
    if (matchingCorrection) {
      const newHighlight = {
        ...highlight,
        comment: {
          text: matchingCorrection.correction,
          emoji: ""
        },
        isAICorrection: true
      };
      console.log('Saving new highlight:', newHighlight);
      setHighlights(prev => [...prev, { ...newHighlight, id: getNextId() }]);
    }
  };

  const addHighlight = (highlight: NewHighlight) => {
    console.log("Saving highlight", highlight);
    setHighlights((prevHighlights) => [
      { ...highlight, id: getNextId() },
      ...prevHighlights,
    ]);
  };

  const updateHighlight = (
    highlightId: string,
    position: Partial<ScaledPosition>,
    content: Partial<Content>,
  ) => {
    console.log("Updating highlight", highlightId, position, content);
    setHighlights((prevHighlights) =>
      prevHighlights.map((h) => {
        const {
          id,
          position: originalPosition,
          content: originalContent,
          ...rest
        } = h;
        return id === highlightId
          ? {
              id,
              position: { ...originalPosition, ...position },
              content: { ...originalContent, ...content },
              ...rest,
            }
          : h;
      }),
    );
  };

  const extractComments = () => {
    const comments = highlights.map(highlight => ({
      text: highlight.content.text || '', // Extract highlighted text
      pageNumber: highlight.position.pageNumber, // Extract page number
      position: highlight.position, // Include the position details
      comment: highlight.comment.text || '', // Extract the comment text
      emoji: highlight.comment.emoji || '', // Extract emoji, if any
    }));

    setComment(comments);
  };

  useEffect(() => {
    extractComments();
  }, [highlights]);

  const downloadHighlights = () => {
    const highlightsJson = JSON.stringify(highlights, null, 2);
    const blob = new Blob([highlightsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'highlights.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="App" style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        highlights={highlights}
        resetHighlights={resetHighlights}
        toggleDocument={toggleDocument}
      />
      <div
        style={{
          height: "100vh",
          width: "75vw",
          position: "relative",
        }}
      >
        <PdfLoader url={url} beforeLoad={<Spinner />}>
          {(pdfDocument) => (
            <PdfHighlighter
              pdfDocument={pdfDocument}
              enableAreaSelection={(event) => event.altKey}
              onScrollChange={resetHash}
              corrections={corrections} // Nova prop
              scrollRef={(scrollTo) => {
                scrollViewerTo.current = scrollTo;
                scrollToHighlightFromHash();
              }}
              onSelectionFinished={(
                position,
                content,
                hideTipAndSelection,
                transformSelection
              ) => {
                console.log('Selection finished with content:', content);
                // Find the matching correction
                const matchingCorrection = corrections.find(
                  correction => content.text === correction.error
                );
                console.log('Matched correction:', matchingCorrection);
                console.log('Available corrections:', corrections);
              
                if (matchingCorrection) {
                  // AI correction highlight with the specific correction text
                  if (content.text) {
                    console.log('Attempting to add highlight for:', content.text);
                    addAIHighlight({
                      content,
                      position,
                      comment: { 
                        text: matchingCorrection.correction,
                        emoji: ""
                      }
                    }, content.text);
                    
                    hideTipAndSelection();
                    transformSelection();
                  }
                } else {
                  // Manual user highlight (unchanged)
                  return (
                    <Tip
                      onOpen={transformSelection}
                      onConfirm={(comment) => {
                        addHighlight({ content, position, comment, isAICorrection: false });
                        hideTipAndSelection();
                      }}
                    />
                  );
                }
                return null;
              }}
              highlightTransform={(
                highlight,
                index,
                setTip,
                hideTip,
                viewportToScaled,
                screenshot,
                isScrolledTo,
              ) => {
                const isTextHighlight = !highlight.content?.image;

                const component = isTextHighlight ? (
                  <Highlight
                    isScrolledTo={isScrolledTo}
                    position={highlight.position}
                    comment={highlight.comment}
                    isAICorrection={highlight.isAICorrection ?? false}
                  />
                ) : (
                  <AreaHighlight
                    isScrolledTo={isScrolledTo}
                    highlight={highlight}
                    onChange={(boundingRect) => {
                      updateHighlight(
                        highlight.id,
                        { boundingRect: viewportToScaled(boundingRect) },
                        { image: screenshot(boundingRect) },
                      );
                    }}
                  />
                );

                return (
                  <Popup
                    popupContent={<HighlightPopup {...highlight} />}
                    onMouseOver={(popupContent) =>
                      setTip(highlight, (highlight) => popupContent)
                    }
                    onMouseOut={hideTip}
                    key={index}
                  >
                    {component}
                  </Popup>
                );
              }}
              highlights={highlights}
            />
          )}
        </PdfLoader>
      </div>
      <div className="sidebar__buttons">
        <button onClick={resetHighlights}>Reset highlights</button>
        <button onClick={downloadHighlights}>Download Highlights</button>
        <button onClick={toggleDocument}>Toggle PDF</button>
      </div>
    </div>
  );
}
