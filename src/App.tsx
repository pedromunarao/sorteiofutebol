import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trophy, Trash2, Loader2, ScrollText, Copy, Check } from 'lucide-react';
import type { Player, Position, Team } from './types';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

function App() {
  const [players, setPlayers] = useState<Player[]>(() => {
    const savedPlayers = localStorage.getItem('footballPlayers');
    return savedPlayers ? JSON.parse(savedPlayers) : [];
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [position, setPosition] = useState<Position>('ZAG');
  const [rating, setRating] = useState<number>(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [copied, setCopied] = useState(false);
  const teamsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('footballPlayers', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    if (teams.length === 0) {
      setShowTeams(false);
    }
  }, [teams]);

  const rules = [
    "Cada time deve ter exatamente 6 jogadores",
    "Cada time deve ter 2 zagueiros, 2 atacantes, 1 estrela e 1 meia",
    "Máximo de 2 jogadores com 3 estrelas por time",
    "O número total de jogadores deve ser múltiplo de 6",
    "Mínimo de 6 e máximo de 24 jogadores no total"
  ];

  const generateWhatsAppMessage = () => {
    const message = teams.map(team => {
      const playerNames = team.players.map(p => p.name).join(', ');
      return `*${team.name}*\n${playerNames}`;
    }).join('\n\n-------------------\n\n');

    return `*⚽ Times Sorteados ⚽*\n\n${message}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateWhatsAppMessage());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (players.length >= 24) {
      alert('Máximo de 24 jogadores atingido!');
      return;
    }
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name,
      position,
      rating
    };
    setPlayers([...players, newPlayer]);
    setName('');
  };

  const deletePlayer = (id: string) => {
    setPlayers(players.filter(player => player.id !== id));
    setTeams([]);
  };

  const isValidTeamDistribution = (team: Player[]): boolean => {
    const threeStarPlayers = team.filter(player => player.rating === 3);
    return threeStarPlayers.length <= 2;
  };

  const movePlayer = (draggedId: string, targetId: string) => {
    const draggedPlayer = players.find(player => player.id === draggedId);
    const targetPlayer = players.find(player => player.id === targetId);

    if (draggedPlayer && targetPlayer) {
      const draggedTeam = teams.find(team => team.players.includes(draggedPlayer));
      const targetTeam = teams.find(team => team.players.includes(targetPlayer));

      if (draggedTeam && targetTeam && draggedTeam !== targetTeam) {
        setTeams(teams.map(team => {
          if (team === draggedTeam) {
            return { ...team, players: team.players.filter(player => player.id !== draggedId) };
          } else if (team === targetTeam) {
            return { ...team, players: [...team.players, draggedPlayer] };
          } else {
            return team;
          }
        }));
      }
    }
  };

  const generateTeams = async () => {
    if (players.length < 6) {
      alert('É necessário ter no mínimo 6 jogadores para formar times!');
      return;
    }
    if (players.length > 24) {
      alert('O máximo permitido é 24 jogadores!');
      return;
    }
    if (players.length % 6 !== 0) {
      alert('O número de jogadores deve ser múltiplo de 6!');
      return;
    }

    setIsGenerating(true);
    setShowTeams(false);
    setTeams([]);

    try {
      const numTeams = players.length / 6;
      let attempts = 0;
      const maxAttempts = 100;

      while (attempts < maxAttempts) {
        attempts++;
        
        // Separar jogadores por posição
        const playersByPosition = {
          ZAG: shuffle([...players.filter(p => p.position === 'ZAG')]),
          ATA: shuffle([...players.filter(p => p.position === 'ATA')]),
          MEIA: shuffle([...players.filter(p => p.position === 'MEIA')]),
          ESTRELAS: shuffle([...players.filter(p => p.position === 'ESTRELAS')])
        };

        // Criar times vazios
        const newTeams: Team[] = Array(numTeams).fill(null).map((_, index) => ({
          name: `Time ${index + 1}`,
          players: [],
          averageRating: 0
        }));

        let validDistribution = true;

        // Distribuir jogadores para cada time
        for (let i = 0; i < numTeams && validDistribution; i++) {
          const team = newTeams[i];
          const tempTeam: Player[] = [];

          // Função para pegar o próximo jogador disponível de uma posição
          const getNextPlayer = (position: Position, excludePositions: Position[] = []): Player | null => {
            const availablePlayers = playersByPosition[position];
            if (availablePlayers.length > 0) {
              // Verificar se adicionar este jogador não violaria a regra de 3 estrelas
              for (let j = 0; j < availablePlayers.length; j++) {
                const player = availablePlayers[j];
                if (isValidTeamDistribution([...tempTeam, player])) {
                  availablePlayers.splice(j, 1);
                  return player;
                }
              }
            }

            // Se não encontrou um jogador válido na posição desejada, procurar em outras posições
            const availablePositions = ['MEIA', 'ZAG', 'ATA', 'ESTRELAS'].filter(
              pos => !excludePositions.includes(pos as Position) && playersByPosition[pos as Position].length > 0
            );

            for (const pos of availablePositions) {
              const posPlayers = playersByPosition[pos as Position];
              for (let j = 0; j < posPlayers.length; j++) {
                const player = posPlayers[j];
                if (isValidTeamDistribution([...tempTeam, player])) {
                  posPlayers.splice(j, 1);
                  return player;
                }
              }
            }

            return null;
          };

          // Adicionar 2 zagueiros
          for (let j = 0; j < 2; j++) {
            const player = getNextPlayer('ZAG');
            if (player) tempTeam.push(player);
            else {
              validDistribution = false;
              break;
            }
          }

          // Adicionar 2 atacantes
          if (validDistribution) {
            for (let j = 0; j < 2; j++) {
              const player = getNextPlayer('ATA');
              if (player) tempTeam.push(player);
              else {
                validDistribution = false;
                break;
              }
            }
          }

          // Adicionar 1 estrela
          if (validDistribution) {
            const estrela = getNextPlayer('ESTRELAS');
            if (estrela) tempTeam.push(estrela);
            else {
              validDistribution = false;
            }
          }

          // Adicionar 1 meia
          if (validDistribution) {
            const meia = getNextPlayer('MEIA', ['ESTRELAS']);
            if (meia) tempTeam.push(meia);
            else {
              validDistribution = false;
            }
          }

          // Se a distribuição for válida, confirmar o time
          if (validDistribution && tempTeam.length === 6) {
            team.players = tempTeam;
            team.averageRating = Number(
              (tempTeam.reduce((acc, player) => acc + player.rating, 0) / tempTeam.length).toFixed(2)
            );
          } else {
            validDistribution = false;
            break;
          }
        }

        if (validDistribution) {
          // Simular um tempo de processamento para melhor feedback visual
          await new Promise(resolve => setTimeout(resolve, 1500));
          setTeams(newTeams);
          setShowTeams(true);
          if (teamsRef.current) {
            teamsRef.current.scrollIntoView({ behavior: 'smooth' });
          }
          return;
        }
      }

      alert('Não foi possível encontrar uma distribuição válida de times. Tente novamente ou ajuste os jogadores.');
    } finally {
      setIsGenerating(false);
    }
  };

  const shuffle = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  const getPositionName = (pos: Position): string => {
    const positions = {
      ZAG: 'Zagueiro',
      ATA: 'Atacante',
      MEIA: 'Meia',
      ESTRELAS: 'Estrela'
    };
    return positions[pos];
  };

  const DraggablePlayer: React.FC<{ player: Player; movePlayer: (draggedId: string, targetId: string) => void }> = ({ player, movePlayer }) => {
    const [, ref] = useDrag({
      type: 'PLAYER',
      item: { id: player.id },
    });

    const [, drop] = useDrop({
      accept: 'PLAYER',
      drop: (item: { id: string }) => movePlayer(item.id, player.id),
    });

    return (
      <div ref={(node) => ref(drop(node))}>
        {player.name} - {player.position} - {player.rating}
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">Sorteio de Times de Futebol</h1>

          {/* Regras */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <ScrollText className="text-blue-500" size={24} />
              <h2 className="text-xl font-semibold">Regras do Sorteio</h2>
            </div>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              {rules.map((rule, index) => (
                <li key={index}>{rule}</li>
              ))}
            </ul>
          </div>
          
          {/* Formulário de cadastro */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Adicionar Jogador ({players.length}/24)</h2>
            <form onSubmit={addPlayer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do jogador"
                  className="border rounded p-2"
                  required
                />
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as Position)}
                  className="border rounded p-2"
                >
                  <option value="ZAG">Zagueiro</option>
                  <option value="ATA">Atacante</option>
                  <option value="MEIA">Meia</option>
                  <option value="ESTRELAS">Estrela</option>
                </select>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="border rounded p-2"
                >
                  {[1, 2, 3].map(num => (
                    <option key={num} value={num}>{num} estrelas</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="bg-blue-500 text-white rounded p-2 flex items-center justify-center gap-2 hover:bg-blue-600"
                >
                  <Plus size={20} /> Adicionar
                </button>
              </div>
            </form>
          </div>

          {/* Lista de jogadores */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Jogadores ({players.length})</h2>
              <button
                onClick={generateTeams}
                disabled={players.length < 6 || players.length % 6 !== 0 || isGenerating}
                className="bg-green-500 text-white rounded p-2 flex items-center gap-2 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span className="animate-pulse">Sorteando times...</span>
                  </>
                ) : (
                  <>
                    <Trophy size={20} />
                    Sortear Times
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map(player => (
                <div key={player.id} className="border rounded p-3 flex justify-between items-center group">
                  <div>
                    <h3 className="font-semibold">{player.name}</h3>
                    <p className="text-sm text-gray-600">{getPositionName(player.position)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: player.rating }).map((_, i) => (
                        <span key={i} className="text-yellow-400">★</span>
                      ))}
                    </div>
                    <button
                      onClick={() => deletePlayer(player.id)}
                      className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Times sorteados */}
          {teams.length > 0 && (
            <>
              <div 
                ref={teamsRef} 
                className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-500 ${
                  showTeams ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                {teams.map((team, index) => (
                  <div 
                    key={index} 
                    className="bg-white rounded-lg shadow-md p-6 transition-all duration-500"
                    style={{
                      animationDelay: `${index * 200}ms`,
                      animation: showTeams ? 'slideIn 0.5s ease-out forwards' : 'none'
                    }}
                  >
                    <h2 className="text-xl font-semibold mb-4 flex justify-between">
                      {team.name}
                      <span className="text-gray-600">
                        Média: {team.averageRating} ★
                      </span>
                    </h2>
                    <div className="space-y-2">
                      {team.players.map((player, playerIndex) => (
                        <div 
                          key={player.id} 
                          className="flex justify-between items-center border-b py-1 transition-all duration-300"
                          style={{
                            animationDelay: `${(index * 6 + playerIndex) * 100}ms`,
                            animation: showTeams ? 'fadeIn 0.3s ease-out forwards' : 'none'
                          }}
                        >
                          <div>
                            <span className="font-medium">{player.name}</span>
                            <span className="text-sm text-gray-600 ml-2">({getPositionName(player.position)})</span>
                          </div>
                          <div className="text-yellow-400">
                            {'★'.repeat(player.rating)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={copyToClipboard}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-all ${
                    copied ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={20} />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={20} />
                      Copiar times para WhatsApp
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DndProvider>
  );
}

export default App;