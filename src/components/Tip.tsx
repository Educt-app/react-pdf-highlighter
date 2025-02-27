import { Component } from "react";
import styles from "../style/Tip.module.css";
import Textarea from "@mui/joy/Textarea";

interface State {
  compact: boolean;
  text: string;
  emoji: string;
}

interface Props {
  onConfirm: (comment: { text: string; emoji: string }) => void;
  onOpen: () => void;
  onUpdate?: () => void;
}

export class Tip extends Component<Props, State> {
  state: State = {
    compact: true,
    text: "",
    emoji: "",
  };

  // for TipContainer
  componentDidUpdate(_: Props, nextState: State) {
    const { onUpdate } = this.props;

    if (onUpdate && this.state.compact !== nextState.compact) {
      onUpdate();
    }
  }

  render() {
    const { onConfirm, onOpen } = this.props;
    const { compact, text, emoji } = this.state;
    const emojis = ["✅", "❌", "❗", "😍", "🤔", "🥳 "];

    return (
      <div>
        {compact ? (
          <div
            className={styles.compact}
            onClick={() => {
              onOpen();
              this.setState({ compact: false });
            }}
          >
            Adicionar comentário
          </div>
        ) : (
          <form
            className={styles.card}
            onSubmit={(event) => {
              event.preventDefault();
              onConfirm({ text, emoji });
            }}
            style={{
              zIndex: 1000,
              backgroundColor: "white",
              border: "2px solid rgb(243 244 246)",
              borderRadius: "20px",
              padding: "15px",
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: "bold",
                  fontSize: "11px",
                  color: "#6458D7",
                  letterSpacing: "0.5px",
                }}
              >
                ADICIONAR COMENTÁRIO
              </h1>
              <Textarea
                name="Plain"
                placeholder="Digite aqui seu comentário"
                variant="plain"
                sx={{
                  backgroundColor: "white",
                  color: "black",
                  width: "100%",
                  padding: "5px 0px",
                  marginBottom: "15px",
                  "--Textarea-focusedThickness": "0rem",
                  "&:hover": {
                    color: "#d3d3d3",
                  },
                }}
                required
                autoFocus
                value={text}
                onChange={(event) =>
                  this.setState({ text: event.target.value })
                }
                ref={(node) => {
                  if (node) {
                    node.focus();
                  }
                }}
              />

              <hr
                style={{
                  width: "100%",
                  border: "1px solid rgb(243 244 246)",
                }}
              />

              <div className={styles.emojiGrid}>
                {emojis.map((_emoji) => (
                  <label key={_emoji} className={styles.emojiLabel}>
                    <input
                      className={styles.emojiInput}
                      checked={emoji === _emoji}
                      type="radio"
                      name="emoji"
                      value={_emoji}
                      onChange={(event) =>
                        this.setState({ emoji: event.target.value })
                      }
                    />
                    <span className={styles.emojiDisplay}>{_emoji}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: "4px" }}>
              <input
                type="submit"
                value="Salvar"
                className={styles.submitButton}
              />
            </div>
          </form>
        )}
      </div>
    );
  }
}
