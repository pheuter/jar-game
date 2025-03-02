document.addEventListener('DOMContentLoaded', () => {
    // Game state
    const gameState = {
        score: 0,
        attempts: 10,
        round: 1,
        jars: [],
        maxJars: 20,
        maxAttempts: 10,
        highScore: localStorage.getItem('jarGameHighScore') || 0,
    };

    // DOM elements
    const scoreElement = document.getElementById('score');
    const attemptsElement = document.getElementById('attempts');
    const roundElement = document.getElementById('round');
    const jarsContainer = document.getElementById('jars-container');
    const messageElement = document.getElementById('message');
    const nextRoundButton = document.getElementById('next-round');

    // Sound effects
    const sounds = {
        openJar: new Audio('https://soundbible.com/mp3/Jar%20Lid%20Twist-SoundBible.com-1234258469.mp3'),
        goodResult: new Audio('https://soundbible.com/mp3/Electronic_Chime-KevanGC-495939803.mp3'),
        roundComplete: new Audio('https://soundbible.com/mp3/Ta Da-SoundBible.com-1884170640.mp3')
    };

    // For badResult, we'll create a custom worm/bug sound with Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let bugSound = null;

    // Function to create a bug buzzing sound
    function createBugSound() {
        // Create oscillators for the buzzing effect
        const oscillator1 = audioContext.createOscillator();
        oscillator1.type = 'sawtooth';
        oscillator1.frequency.value = 220;
        
        const oscillator2 = audioContext.createOscillator();
        oscillator2.type = 'square';
        oscillator2.frequency.value = 180;
        
        // Create a low-frequency oscillator for the wobble effect
        const lfo = audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 8;
        
        // Create gain nodes
        const gain1 = audioContext.createGain();
        gain1.gain.value = 0.15;
        
        const gain2 = audioContext.createGain();
        gain2.gain.value = 0.05;
        
        const mainGain = audioContext.createGain();
        mainGain.gain.value = 0.2;
        
        const lfoGain = audioContext.createGain();
        lfoGain.gain.value = 30;
        
        // Connect LFO to oscillator frequency for wobble
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator1.frequency);
        
        // Connect oscillators through gains
        oscillator1.connect(gain1);
        oscillator2.connect(gain2);
        
        gain1.connect(mainGain);
        gain2.connect(mainGain);
        mainGain.connect(audioContext.destination);
        
        // Start the oscillators
        oscillator1.start();
        oscillator2.start();
        lfo.start();
        
        // Set up envelope
        mainGain.gain.setValueAtTime(0, audioContext.currentTime);
        mainGain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
        mainGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.7);
        
        // Stop the oscillators after 0.7 seconds
        setTimeout(() => {
            oscillator1.stop();
            oscillator2.stop();
            lfo.stop();
        }, 700);
        
        return { oscillator1, oscillator2, lfo, mainGain };
    }

    // Preload other sounds
    Object.values(sounds).forEach(sound => {
        sound.load();
        sound.volume = 0.5;
    });

    // Jar contents and their scores
    const jarContents = [
        { type: 'worms', score: -5, color: '#8B4513', emoji: '🪱', message: 'Yuck! Worms!' },
        { type: 'orange-marmalade', score: 3, color: '#FFA500', emoji: '🍊', message: 'Delicious Orange Marmalade!' },
        { type: 'lemon-marmalade', score: 2, color: '#FFD700', emoji: '🍋', message: 'Tasty Lemon Marmalade!' }
    ];

    // Initialize the game
    initGame();

    // Event listeners
    nextRoundButton.addEventListener('click', startNextRound);

    // Functions
    function initGame() {
        generateJars();
        updateUI();
        animateTitle();
    }

    function animateTitle() {
        const title = document.querySelector('h1');
        title.innerHTML = title.textContent.split('').map(char => 
            char === ' ' ? ' ' : `<span class="letter">${char}</span>`
        ).join('');
        
        document.querySelectorAll('.letter').forEach((letter, index) => {
            letter.style.animationDelay = `${index * 0.1}s`;
            letter.classList.add('animate-in');
        });
    }

    function generateJars() {
        // Clear jars array
        gameState.jars = [];
        
        // Generate random distribution for current round
        const distribution = generateDistribution(gameState.round);
        
        // Create jars based on distribution
        for (let i = 0; i < gameState.maxJars; i++) {
            let contentType;
            if (i < distribution.worms) {
                contentType = jarContents[0]; // Worms
            } else if (i < distribution.worms + distribution.orangeMarmalade) {
                contentType = jarContents[1]; // Orange marmalade
            } else {
                contentType = jarContents[2]; // Lemon marmalade
            }
            
            gameState.jars.push({
                id: i,
                opened: false,
                content: contentType
            });
        }
        
        // Shuffle jars
        shuffleArray(gameState.jars);
        
        // Render jars
        renderJars();
    }

    function generateDistribution(round) {
        // Different distributions for each round
        let worms, orangeMarmalade, lemonMarmalade;
        
        switch (round) {
            case 1: // Balanced
                worms = 7;
                orangeMarmalade = 7;
                lemonMarmalade = 6;
                break;
            case 2: // More worms
                worms = 10;
                orangeMarmalade = 5;
                lemonMarmalade = 5;
                break;
            case 3: // More orange marmalade
                worms = 5;
                orangeMarmalade = 10;
                lemonMarmalade = 5;
                break;
            case 4: // More lemon marmalade
                worms = 5;
                orangeMarmalade = 5;
                lemonMarmalade = 10;
                break;
            case 5: // Very risky
                worms = 15;
                orangeMarmalade = 3;
                lemonMarmalade = 2;
                break;
            default: // Random distribution for rounds beyond 5
                const total = gameState.maxJars;
                worms = Math.floor(Math.random() * (total - 2)) + 1; // At least 1 worm
                const remaining = total - worms;
                orangeMarmalade = Math.floor(Math.random() * (remaining - 1)) + 1; // At least 1 orange
                lemonMarmalade = total - worms - orangeMarmalade; // The rest are lemon
                break;
        }
        
        return { worms, orangeMarmalade, lemonMarmalade };
    }

    function renderJars() {
        // Clear the container
        jarsContainer.innerHTML = '';
        
        // Create grid with animation delay
        gameState.jars.forEach((jar, index) => {
            const jarElement = document.createElement('div');
            jarElement.className = 'jar';
            jarElement.dataset.id = jar.id;
            jarElement.style.animationDelay = `${index * 0.05}s`;
            
            // Add entrance animation class
            jarElement.classList.add('jar-enter');
            
            // Create jar content
            const contentElement = document.createElement('div');
            contentElement.className = 'content';
            contentElement.style.backgroundColor = jar.content.color;
            contentElement.innerHTML = `<span class="emoji">${jar.content.emoji}</span>`;
            
            // Create jar lid
            const lidElement = document.createElement('div');
            lidElement.className = 'lid';
            lidElement.innerHTML = '<span class="emoji">🧢</span>';
            
            // Add to jar
            jarElement.appendChild(contentElement);
            jarElement.appendChild(lidElement);
            
            // Add class if jar is already opened
            if (jar.opened) {
                jarElement.classList.add('opened');
            } else {
                // Add click event only to unopened jars
                jarElement.addEventListener('click', () => openJar(jar.id));
            }
            
            // Add to container
            jarsContainer.appendChild(jarElement);
        });
    }

    function openJar(jarId) {
        // Check if we still have attempts
        if (gameState.attempts <= 0) return;
        
        // Find the jar
        const jar = gameState.jars.find(j => j.id === jarId);
        
        // Update jar state
        jar.opened = true;
        
        // Play sound
        sounds.openJar.currentTime = 0;
        sounds.openJar.play();
        
        // Get the jar element and add 'opened' class
        const jarElement = document.querySelector(`.jar[data-id="${jarId}"]`);
        jarElement.classList.add('opened');
        
        // Wait for animation to finish then update score
        setTimeout(() => {
            // Update game state
            gameState.score += jar.content.score;
            gameState.attempts--;
            
            // Update UI
            updateUI();
            
            // Show message based on content
            const emoji = jar.content.score > 0 ? '✨' : '😖';
            const scoreChange = jar.content.score > 0 ? `+${jar.content.score}` : `${jar.content.score}`;
            showMessage(`${emoji} ${jar.content.message} ${scoreChange} points`);
            
            // Play appropriate sound
            if (jar.content.score > 0) {
                sounds.goodResult.currentTime = 0;
                sounds.goodResult.play();
            } else {
                // Play the custom bug sound
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                bugSound = createBugSound();
            }
            
            // Add score popup animation
            const scorePopup = document.createElement('div');
            scorePopup.className = 'score-popup';
            scorePopup.textContent = scoreChange;
            scorePopup.style.color = jar.content.score > 0 ? '#2ecc71' : '#e74c3c';
            jarElement.appendChild(scorePopup);
            
            setTimeout(() => {
                scorePopup.remove();
            }, 1000);
            
            // Check if round is over
            if (gameState.attempts === 0) {
                endRound();
            }
        }, 600); // Animation duration
    }

    function updateUI() {
        scoreElement.textContent = gameState.score;
        attemptsElement.textContent = gameState.attempts;
        roundElement.textContent = gameState.round;
        
        // Update high score if needed
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem('jarGameHighScore', gameState.highScore);
        }
    }

    function showMessage(msg) {
        messageElement.innerHTML = msg;
        messageElement.style.display = 'block';
        
        // Add animation class
        messageElement.classList.remove('fade-in');
        void messageElement.offsetWidth; // Force reflow to restart animation
        messageElement.classList.add('fade-in');
    }

    function endRound() {
        sounds.roundComplete.currentTime = 0;
        sounds.roundComplete.play();
        
        // Check if it's a new high score
        const isHighScore = gameState.score > gameState.highScore - gameState.score;
        const highScoreMsg = isHighScore ? `<br>🏆 New High Score: ${gameState.score}!` : '';
        
        showMessage(`🎉 Round ${gameState.round} complete!<br>Your score: ${gameState.score}${highScoreMsg}`);
        nextRoundButton.style.display = 'inline-block';
        
        // Add animation to button
        nextRoundButton.classList.add('pulse');
    }

    function startNextRound() {
        // Remove animation
        nextRoundButton.classList.remove('pulse');
        
        // Increment round
        gameState.round++;
        
        // Reset attempts
        gameState.attempts = gameState.maxAttempts;
        
        // Generate new jars
        generateJars();
        
        // Update UI
        updateUI();
        
        // Hide next round button
        nextRoundButton.style.display = 'none';
        
        // Clear message
        messageElement.innerHTML = '';
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
});