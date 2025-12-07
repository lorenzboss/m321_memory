import { useEffect, useState } from "react";
import "./Card.css";

interface CardProps {
  id?: string;
  imageUrl: string;
  altText?: string;
  // Multiplayer-spezifische Props
  isFlipped?: boolean;
  isMatched?: boolean;
  isClickable?: boolean;
  onClick?: () => void;
  matchedBy?: string; // ID des Spielers, der das Match gemacht hat
  currentUserId?: string; // ID des aktuellen Spielers
}

export default function Card({
  id,
  imageUrl,
  altText = "Pokemon",
  isFlipped: externalIsFlipped,
  isMatched = false,
  isClickable = true,
  onClick,
  matchedBy,
  currentUserId,
}: CardProps) {
  const [internalIsFlipped, setInternalIsFlipped] = useState(false);

  // Reset des internen Zustands wenn sich die imageUrl ändert (neues Spiel)
  useEffect(() => {
    setInternalIsFlipped(false);
  }, [imageUrl]);

  // Flip-Status (extern für Multiplayer, intern für Singleplayer)
  const isFlipped =
    externalIsFlipped !== undefined ? externalIsFlipped : internalIsFlipped;

  // Nur klickbar, wenn nicht gematcht
  const effectiveClickable = isClickable && !isMatched;

  // Match-Klasse (eigenes Paar oder gegnerisches)
  const getMatchedClass = () => {
    if (!isMatched || !matchedBy) return "";
    return matchedBy === currentUserId ? "matched-own" : "matched-opponent";
  };

  const handleClick = () => {
    if (!effectiveClickable) return;

    if (onClick) {
      onClick();
    } else {
      setInternalIsFlipped(!internalIsFlipped);
    }
  };

  const containerClasses = [
    "card",
    isFlipped || isMatched ? "flipped" : "",
    !effectiveClickable ? "not-clickable" : "",
    isMatched ? "matched" : "", // wichtig für Hover-Disable
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={containerClasses}
      onClick={handleClick}
      data-card-id={id}
      role={effectiveClickable ? "button" : undefined}
      aria-disabled={!effectiveClickable || undefined}
      aria-pressed={isFlipped || isMatched || undefined}
    >
      <div className="card-inner">
        {/* FRONT */}
        <div className="card-face card-front" />

        {/* BACK */}
        <div
          className={`card-face card-back ${
            isMatched ? `matched ${getMatchedClass()}` : ""
          }`}
        >
          <img src={imageUrl} alt={altText} draggable="false" />
        </div>
      </div>
    </div>
  );
}
