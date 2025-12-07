import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/card/Card";
import { pokemons } from "../../pokemons";
import "./PracticePage.css";

interface GameCard {
  id: string;
  pokemon: {
    name: string;
    img: string;
  };
}

function buildDeck(): GameCard[] {
  // 8 zufällige Pokémon doppeln und mischen
  const shuffled = [...pokemons].sort(() => Math.random() - 0.5);
  const pick = shuffled.slice(0, 8);
  const pairs: GameCard[] = [];

  pick.forEach((p, idx) => {
    pairs.push({ id: `${idx}-a`, pokemon: p });
    pairs.push({ id: `${idx}-b`, pokemon: p });
  });

  return pairs.sort(() => Math.random() - 0.5);
}

export default function PracticePage() {
  const navigate = useNavigate();
  const [gameCards, setGameCards] = useState<GameCard[]>([]);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    setGameCards(buildDeck());
  }, []);

  const handleReplay = () => {
    // nur neu mischen – keine extra Spiel-Logik
    setGameCards(buildDeck());
    setGameKey((prev) => prev + 1);
  };

  const handleExit = () => {
    navigate("/");
  };

  return (
    <div className="sp-game-container">
      <div className="sp-shell">
        {/* Header */}
        <header className="sp-header glass glow">
          <div className="sp-header-main">
            <h2 className="sp-title">Practice Mode</h2>
            <p className="sp-subtle">
              Flip cards to train your memory. No pressure, just practice!
            </p>
          </div>

          <div className="sp-actions">
            <button className="game-button btn-muted" onClick={handleReplay}>
              Replay
            </button>
            <button className="game-button btn-danger" onClick={handleExit}>
              Exit
            </button>
          </div>
        </header>

        {/* Board */}
        <section className="sp-board glass glow">
          <div className="cards-container">
            {gameCards.map((card) => (
              <Card
                key={`${gameKey}-${card.id}`}
                imageUrl={card.pokemon.img}
                altText={card.pokemon.name}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
