import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

const DEFAULT_WORDS = [
  'Hund', 'Katze', 'Tisch', 'Buch', 'Auto', 'Haus', 'Kind', 'Mann', 'Frau', 'Stadt',
  'Schule', 'Baum', 'Fenster', 'Stuhl', 'Wasser', 'Brot', 'Zeit', 'Tag', 'Nacht', 'Jahr',
  'Apfel', 'Mutter', 'Vater', 'Bruder', 'Schwester', 'Garten', 'Blume', 'Berg', 'Fluss', 'Meer',
]

const ARTICLES = {
  der: { label: 'DER', color: '#2563EB', light: '#EFF6FF' },
  die: { label: 'DIE', color: '#DC2626', light: '#FEF2F2' },
  das: { label: 'DAS', color: '#16A34A', light: '#F0FDF4' },
}

function Avatar({ name, color }) {
  return (
    <div className="avatar-wrap" style={{ '--avatar-color': color }}>
      <div className="avatar-ring">
        <div className="avatar-inner">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="22" r="12" fill="white" opacity="0.95" />
            <ellipse cx="32" cy="50" rx="18" ry="12" fill="white" opacity="0.95" />
          </svg>
        </div>
      </div>
    </div>
  )
}

function ScoreCard({ score, candidate, color, highlight }) {
  return (
    <div className={`candidate-card ${highlight ? 'highlight' : ''}`} style={{ '--card-color': color }}>
      <div className="candidate-name" style={{ borderColor: color }}>
        <span>{candidate}</span>
      </div>
      <Avatar color={color} />
      <div className="score-label">Score</div>
      <div className="score-box">
        <span className={`score-number ${highlight ? 'pop' : ''}`}>{score}</span>
      </div>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('game') // 'admin' | 'game'
  const [scores, setScores] = useState([0, 0])
  const [currentWord, setCurrentWord] = useState('')
  const [adminWord, setAdminWord] = useState('')
  const [customWords, setCustomWords] = useState('')
  const [timer, setTimer] = useState(0)
  const [timerDuration, setTimerDuration] = useState(30)
  const [timerRunning, setTimerRunning] = useState(false)
  const [candidateNames, setCandidateNames] = useState(['Candidat 1', 'Candidat 2'])
  const [highlight, setHighlight] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [correctArticle, setCorrectArticle] = useState('')
  const [wordList, setWordList] = useState(DEFAULT_WORDS)
  const [usedWords, setUsedWords] = useState([])
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [roundActive, setRoundActive] = useState(false)
  const timerRef = useRef(null)

  // Timer logic
  useEffect(() => {
    if (timerRunning && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            setTimerRunning(false)
            clearInterval(timerRef.current)
            return 0
          }
          return t - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [timerRunning])

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const startRound = () => {
    if (!adminWord.trim()) {
      setFeedbackMsg('⚠️ Veuillez saisir un mot !')
      setTimeout(() => setFeedbackMsg(''), 2000)
      return
    }
    setCurrentWord(adminWord.trim())
    setShowAnswer(false)
    setCorrectArticle('')
    setHighlight(null)
    setTimer(timerDuration)
    setTimerRunning(true)
    setRoundActive(true)
    setFeedbackMsg('')
  }

  const stopTimer = () => {
    setTimerRunning(false)
  }

  const resetRound = () => {
    setTimerRunning(false)
    setTimer(0)
    setRoundActive(false)
    setHighlight(null)
    setShowAnswer(false)
    setCorrectArticle('')
    setAdminWord('')
    setCurrentWord('')
    setFeedbackMsg('')
  }

  const givePoint = (candidateIdx) => {
    setScores(prev => {
      const next = [...prev]
      next[candidateIdx] += 1
      return next
    })
    setHighlight(candidateIdx)
    setFeedbackMsg(`✅ Point attribué à ${candidateNames[candidateIdx]} !`)
    setTimeout(() => {
      setHighlight(null)
      setFeedbackMsg('')
    }, 1500)
  }

  const removePoint = (candidateIdx) => {
    setScores(prev => {
      const next = [...prev]
      next[candidateIdx] = Math.max(0, next[candidateIdx] - 1)
      return next
    })
  }

  const resetScores = () => {
    setScores([0, 0])
    setHighlight(null)
  }

  const revealAnswer = () => {
    setShowAnswer(!showAnswer)
  }

  // Tire un mot non encore utilisé ET lance le round immédiatement
  const nextWord = () => {
    clearInterval(timerRef.current)
    const available = wordList.filter(w => !usedWords.includes(w))
    let w
    if (available.length === 0) {
      // Tous les mots ont été utilisés → on repart sur la liste complète
      const fresh = [...wordList]
      w = fresh[Math.floor(Math.random() * fresh.length)]
      setUsedWords([w])
      setFeedbackMsg('🔄 Tous les mots utilisés — liste réinitialisée !')
      setTimeout(() => setFeedbackMsg(''), 2500)
    } else {
      w = available[Math.floor(Math.random() * available.length)]
      setUsedWords(prev => [...prev, w])
    }
    // Lancer le round avec ce mot
    setAdminWord(w)
    setCurrentWord(w)
    setShowAnswer(false)
    setCorrectArticle('')
    setHighlight(null)
    setTimer(timerDuration)
    setTimerRunning(true)
    setRoundActive(true)
  }

  // Saisie manuelle + bouton Lancer
  const drawRandomWord = () => nextWord()

  const timerPercent = timerDuration > 0 ? (timer / timerDuration) * 100 : 0
  const timerColor = timerPercent > 50 ? '#16A34A' : timerPercent > 25 ? '#D97706' : '#DC2626'

  return (
    <div className="app-layout">
      {/* ─── SIDEBAR ─── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-logo">🎯</span>
          <div>
            <div className="sidebar-title">ADMIN</div>
            <div className="sidebar-subtitle">GAME 1</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-btn ${view === 'game' ? 'active' : ''}`}
            onClick={() => setView('game')}
          >
            <span>🎮</span> Jeu
          </button>
          <button
            className={`nav-btn ${view === 'admin' ? 'active' : ''}`}
            onClick={() => setView('admin')}
          >
            <span>⚙️</span> Admin
          </button>
        </nav>

        {/* Score controls in sidebar */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Scores</div>
          <div className="score-controls">
            <div className="score-ctrl-row">
              <span className="score-ctrl-name" style={{ color: '#2563EB' }}>
                {candidateNames[0].split(' ')[0]}
              </span>
              <button className="ctrl-btn minus" onClick={() => removePoint(0)}>−</button>
              <span className="ctrl-score">{scores[0]}</span>
              <button className="ctrl-btn plus" onClick={() => givePoint(0)}>+</button>
            </div>
            <div className="score-ctrl-row">
              <span className="score-ctrl-name" style={{ color: '#DC2626' }}>
                {candidateNames[1].split(' ')[0]}
              </span>
              <button className="ctrl-btn minus" onClick={() => removePoint(1)}>−</button>
              <span className="ctrl-score">{scores[1]}</span>
              <button className="ctrl-btn plus" onClick={() => givePoint(1)}>+</button>
            </div>
            <button className="reset-scores-btn" onClick={resetScores}>
              🔄 Reset scores
            </button>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Réponse</div>
          <div className="article-btns">
            {Object.entries(ARTICLES).map(([key, val]) => (
              <button
                key={key}
                className={`article-reveal-btn ${correctArticle === key ? 'selected' : ''}`}
                style={{ '--art-color': val.color, '--art-light': val.light }}
                onClick={() => {
                  setCorrectArticle(key)
                  setShowAnswer(true)
                }}
              >
                {val.label}
              </button>
            ))}
          </div>
          {correctArticle && showAnswer && (
            <div className="answer-badge" style={{ background: ARTICLES[correctArticle].light, color: ARTICLES[correctArticle].color }}>
              ✓ {ARTICLES[correctArticle].label} {currentWord}
            </div>
          )}
          {/* Bouton Suivant */}
          <button className="btn-suivant" onClick={nextWord}>
            ➜ Suivant
          </button>
          {/* Compteur mots restants */}
          <div className="words-remaining">
            {Math.max(0, wordList.length - usedWords.length)} mot{wordList.length - usedWords.length !== 1 ? 's' : ''} restant{wordList.length - usedWords.length !== 1 ? 's' : ''}
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content">
        {view === 'game' ? (
          <GameView
            scores={scores}
            candidateNames={candidateNames}
            currentWord={currentWord}
            timer={timer}
            timerDuration={timerDuration}
            timerRunning={timerRunning}
            timerPercent={timerPercent}
            timerColor={timerColor}
            highlight={highlight}
            showAnswer={showAnswer}
            correctArticle={correctArticle}
            adminWord={adminWord}
            setAdminWord={setAdminWord}
            startRound={startRound}
            stopTimer={stopTimer}
            resetRound={resetRound}
            nextWord={nextWord}
            feedbackMsg={feedbackMsg}
            formatTime={formatTime}
            roundActive={roundActive}
          />
        ) : (
          <AdminView
            candidateNames={candidateNames}
            setCandidateNames={setCandidateNames}
            timerDuration={timerDuration}
            setTimerDuration={setTimerDuration}
            customWords={customWords}
            setCustomWords={setCustomWords}
            wordList={wordList}
            setWordList={setWordList}
            setUsedWords={setUsedWords}
          />
        )}
      </main>
    </div>
  )
}

// ─── GAME VIEW ───
function GameView({
  scores, candidateNames, currentWord, timer, timerDuration, timerRunning,
  timerPercent, timerColor, highlight, showAnswer, correctArticle,
  adminWord, setAdminWord, startRound, stopTimer, resetRound,
  nextWord, feedbackMsg, formatTime, roundActive
}) {
  const candidate1Color = '#2563EB'
  const candidate2Color = '#DC2626'

  return (
    <div className="game-view">
      {/* Feedback toast */}
      {feedbackMsg && (
        <div className="feedback-toast">{feedbackMsg}</div>
      )}

      {/* Candidates row */}
      <div className="candidates-row">
        <ScoreCard
          candidate={candidateNames[0]}
          score={scores[0]}
          color={candidate1Color}
          highlight={highlight === 0}
        />
        <div className="vs-badge">VS</div>
        <ScoreCard
          candidate={candidateNames[1]}
          score={scores[1]}
          color={candidate2Color}
          highlight={highlight === 1}
        />
      </div>

      {/* Word display */}
      <div className="word-section">
        <div className="word-label">MOT</div>
        <div className={`word-box ${currentWord ? 'has-word' : ''} ${showAnswer && correctArticle ? 'answered' : ''}`}
          style={showAnswer && correctArticle ? {
            borderColor: ARTICLES[correctArticle].color,
            background: ARTICLES[correctArticle].light
          } : {}}>
          {currentWord ? (
            <div className="word-content">
              {showAnswer && correctArticle && (
                <span className="article-display" style={{ color: ARTICLES[correctArticle].color }}>
                  {ARTICLES[correctArticle].label}
                </span>
              )}
              <span className="word-text">{currentWord}</span>
            </div>
          ) : (
            <span className="word-placeholder">
              {'─'.repeat(20)}
            </span>
          )}
        </div>
      </div>

      {/* Timer */}
      <div className="timer-section">
        <div className="timer-progress-bar">
          <div
            className="timer-progress-fill"
            style={{ width: `${timerPercent}%`, background: timerColor }}
          />
        </div>
        <div className="timer-display" style={{ color: timer === 0 && roundActive ? '#DC2626' : timerColor }}>
          TIME: {formatTime(timer)}
        </div>
        {timer === 0 && roundActive && (
          <div className="time-up">⏰ TEMPS ÉCOULÉ !</div>
        )}
      </div>

      {/* Controls */}
      <div className="game-controls">
        <div className="word-input-row">
          <input
            className="word-input"
            type="text"
            placeholder="Saisir un mot..."
            value={adminWord}
            onChange={e => setAdminWord(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && startRound()}
          />
          <button className="btn-random" onClick={nextWord} title="Mot aléatoire — lance automatiquement">
            🎲
          </button>
        </div>
        <div className="control-btns">
          <button className="btn-start" onClick={startRound} disabled={timerRunning}>
            ▶ Lancer
          </button>
          <button className="btn-stop" onClick={stopTimer} disabled={!timerRunning}>
            ⏸ Pause
          </button>
          <button className="btn-reset" onClick={resetRound}>
            🔄 Reset
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ADMIN VIEW ───
function AdminView({
  candidateNames, setCandidateNames, timerDuration, setTimerDuration,
  customWords, setCustomWords, wordList, setWordList, setUsedWords
}) {
  const [saved, setSaved] = useState(false)

  const handleSaveWords = () => {
    if (customWords.trim()) {
      const newWords = customWords.split('\n').map(w => w.trim()).filter(Boolean)
      setWordList(newWords)
      setUsedWords([])
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="admin-view">
      <h1 className="admin-title">⚙️ Paramètres du Jeu</h1>

      <div className="admin-grid">
        {/* Noms candidats */}
        <div className="admin-card">
          <h2>👤 Noms des Candidats</h2>
          <div className="admin-field">
            <label>Candidat 1</label>
            <input
              type="text"
              value={candidateNames[0]}
              onChange={e => setCandidateNames(p => [e.target.value, p[1]])}
              placeholder="Candidat 1"
            />
          </div>
          <div className="admin-field">
            <label>Candidat 2</label>
            <input
              type="text"
              value={candidateNames[1]}
              onChange={e => setCandidateNames(p => [p[0], e.target.value])}
              placeholder="Candidat 2"
            />
          </div>
        </div>

        {/* Timer */}
        <div className="admin-card">
          <h2>⏱ Durée du Timer</h2>
          <div className="admin-field">
            <label>Secondes par question</label>
            <div className="timer-input-row">
              <input
                type="number"
                min="5"
                max="300"
                value={timerDuration}
                onChange={e => setTimerDuration(Number(e.target.value))}
              />
              <span className="timer-unit">sec</span>
            </div>
          </div>
          <div className="timer-presets">
            {[15, 30, 45, 60, 90].map(s => (
              <button
                key={s}
                className={`preset-btn ${timerDuration === s ? 'active' : ''}`}
                onClick={() => setTimerDuration(s)}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>

        {/* Liste de mots */}
        <div className="admin-card wide">
          <h2>📝 Liste de Mots</h2>
          <p className="admin-hint">Un mot par ligne. La liste remplacera les mots par défaut.</p>
          <div className="current-list">
            <strong>Liste actuelle ({wordList.length} mots) :</strong>
            <div className="word-chips">
              {wordList.slice(0, 20).map((w, i) => (
                <span key={i} className="word-chip">{w}</span>
              ))}
              {wordList.length > 20 && <span className="word-chip more">+{wordList.length - 20}</span>}
            </div>
          </div>
          <textarea
            className="words-textarea"
            rows={8}
            placeholder={"Hund\nKatze\nTisch\nBuch\n..."}
            value={customWords}
            onChange={e => setCustomWords(e.target.value)}
          />
          <button className={`btn-save ${saved ? 'saved' : ''}`} onClick={handleSaveWords}>
            {saved ? '✅ Sauvegardé !' : '💾 Sauvegarder la liste'}
          </button>
        </div>

        {/* Guide */}
        <div className="admin-card wide guide-card">
          <h2>📖 Guide du Jeu</h2>
          <div className="guide-steps">
            <div className="guide-step">
              <span className="step-num">1</span>
              <p>Allez dans la vue <strong>Jeu</strong> et saisissez un mot (ou cliquez 🎲 pour aléatoire)</p>
            </div>
            <div className="guide-step">
              <span className="step-num">2</span>
              <p>Cliquez <strong>▶ Lancer</strong> pour démarrer le timer</p>
            </div>
            <div className="guide-step">
              <span className="step-num">3</span>
              <p>Les candidats doivent donner l'article allemand : <strong className="art-der">DER</strong> / <strong className="art-die">DIE</strong> / <strong className="art-das">DAS</strong></p>
            </div>
            <div className="guide-step">
              <span className="step-num">4</span>
              <p>Révélez la bonne réponse depuis la sidebar, puis attribuez le point avec <strong>+</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
