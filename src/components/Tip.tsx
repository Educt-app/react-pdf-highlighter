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
                placeholder="Digite seu comentário"
                variant="plain"
                sx={{
                  backgroundColor: "#6c60df",
                  color: "white",
                  width: "100%",
                  padding: "5px 0px",
                  marginBottom: "8px",

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

              <div>
                {["✅", "❌", "❗", "😍", "🤔", "🥳 "].map((_emoji) => (
                  <label key={_emoji}>
                    <input
                      checked={emoji === _emoji}
                      type="radio"
                      name="emoji"
                      value={_emoji}
                      onChange={(event) =>
                        this.setState({ emoji: event.target.value })
                      }
                    />
                    {_emoji}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <input type="submit" value="Salvar" />
            </div>
          </form>
        )}
      </div>
    );
  }
}
