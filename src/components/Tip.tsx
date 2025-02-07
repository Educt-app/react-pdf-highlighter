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
              backgroundColor: "#6c60df",
              border: "0px",
              borderRadius: "20px",
              padding: "15px",
            }}
          >
            <div>
              <Textarea
                name="Plain"
                placeholder="Digite aqui seu comentário"
                variant="plain"
                sx={{
                  backgroundColor: "#6c60df",
                  color: "white",
                  width: "100%",
                  padding: "5px 0px",
                  marginBottom: "18px",
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

            <div style={{ display: "flex", justifyContent: "center" }}>
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
