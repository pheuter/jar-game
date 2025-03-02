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
    const roundCompleteModal = document.getElementById('round-complete-modal');
    const modalRoundElement = document.getElementById('modal-round');
    const modalScoreElement = document.getElementById('modal-score');
    const modalHighScoreElement = document.getElementById('modal-high-score');

    // Audio context for all sound effects
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Play sound function using Web Audio API
    function playSound(type) {
        // Make sure to initialize audio context on user interaction
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        switch(type) {
            case 'openJar':
                playClickSound();
                break;
            case 'goodResult':
                playGoodSound();
                break;
            case 'badResult':
                playBadSound();
                break;
            case 'roundComplete':
                playCompleteSound();
                break;
        }
    }
    
    // Click/open jar sound
    function playClickSound() {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    }
    
    // Good result sound (finding marmalade)
    function playGoodSound() {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    }
    
    // Bad result sound (finding worms)
    function playBadSound() {
        // Create oscillators for the buzzing effect
        const oscillator1 = audioContext.createOscillator();
        oscillator1.type = 'sawtooth';
        oscillator1.frequency.value = 220;
        
        const oscillator2 = audioContext.createOscillator();
        oscillator2.type = 'square';
        oscillator2.frequency.value = 180;
        
        // Create gain nodes
        const gain1 = audioContext.createGain();
        gain1.gain.value = 0.15;
        
        const gain2 = audioContext.createGain();
        gain2.gain.value = 0.05;
        
        const mainGain = audioContext.createGain();
        mainGain.gain.value = 0.2;
        
        // Connect oscillators through gains
        oscillator1.connect(gain1);
        oscillator2.connect(gain2);
        
        gain1.connect(mainGain);
        gain2.connect(mainGain);
        mainGain.connect(audioContext.destination);
        
        // Start the oscillators
        oscillator1.start();
        oscillator2.start();
        
        // Set up envelope
        mainGain.gain.setValueAtTime(0, audioContext.currentTime);
        mainGain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
        mainGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
        
        // Stop the oscillators after 0.5 seconds
        setTimeout(() => {
            oscillator1.stop();
            oscillator2.stop();
        }, 500);
    }
    
    // Round complete sound
    function playCompleteSound() {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'triangle';
        
        // Play a little fanfare
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.6);
    }

    // Jar contents and their scores
    const jarContents = [
        { type: 'worms', score: -5, color: '#8B4513', emoji: '🪱', message: 'Oh no! Worms! Paddington won\'t like these!' },
        { type: 'orange-marmalade', score: 5, color: '#FFA500', emoji: '🍊', message: 'Paddington\'s favorite orange marmalade!' },
        { type: 'lemon-marmalade', score: 3, color: '#FFD700', emoji: '🍋', message: 'Tasty lemon marmalade for Paddington!' },
        { type: 'special-marmalade', score: 10, color: '#FF6B00', emoji: '🥪', message: 'A marmalade sandwich! Paddington\'s favorite!' }
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
            } else if (i < distribution.worms + distribution.orangeMarmalade + distribution.lemonMarmalade) {
                contentType = jarContents[2]; // Lemon marmalade
            } else {
                contentType = jarContents[3]; // Special marmalade sandwich
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
        let worms, orangeMarmalade, lemonMarmalade, specialMarmalade;
        
        switch (round) {
            case 1: // Balanced - Paddington's first adventure
                worms = 7;
                orangeMarmalade = 7;
                lemonMarmalade = 5;
                specialMarmalade = 1;
                break;
            case 2: // More worms - Paddington at the garden
                worms = 10;
                orangeMarmalade = 5;
                lemonMarmalade = 4;
                specialMarmalade = 1;
                break;
            case 3: // More orange marmalade - Paddington visits the pantry
                worms = 5;
                orangeMarmalade = 9;
                lemonMarmalade = 5;
                specialMarmalade = 1;
                break;
            case 4: // More lemon marmalade - Paddington's tea time
                worms = 5;
                orangeMarmalade = 5;
                lemonMarmalade = 8;
                specialMarmalade = 2;
                break;
            case 5: // Very risky - Paddington's adventure in the garden shed
                worms = 14;
                orangeMarmalade = 3;
                lemonMarmalade = 2;
                specialMarmalade = 1;
                break;
            default: // Random distribution for rounds beyond 5 - Paddington explores the world
                const total = gameState.maxJars;
                worms = Math.floor(Math.random() * (total - 4)) + 1; // At least 1 worm
                let remaining = total - worms;
                orangeMarmalade = Math.floor(Math.random() * (remaining - 3)) + 1; // At least 1 orange
                remaining -= orangeMarmalade;
                lemonMarmalade = Math.floor(Math.random() * (remaining - 2)) + 1; // At least 1 lemon
                specialMarmalade = total - worms - orangeMarmalade - lemonMarmalade; // The rest are special
                break;
        }
        
        return { worms, orangeMarmalade, lemonMarmalade, specialMarmalade };
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
            lidElement.innerHTML = '<span class="emoji">🐻</span>'; // Bear emoji for Paddington
            
            // Add label to the jar - Paddington-themed
            const labelElement = document.createElement('div');
            labelElement.className = 'jar-label';
            labelElement.textContent = 'MARMALADE';
            
            // Add to jar
            jarElement.appendChild(contentElement);
            jarElement.appendChild(lidElement);
            jarElement.appendChild(labelElement);
            
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
        playSound('openJar');
        
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
                playSound('goodResult');
            } else {
                playSound('badResult');
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
        playSound('roundComplete');
        
        // Check if it's a new high score
        const isHighScore = gameState.score > gameState.highScore - gameState.score;
        
        // Update modal content
        modalRoundElement.textContent = gameState.round;
        modalScoreElement.textContent = gameState.score;
        
        // Show/hide high score message
        if (isHighScore) {
            modalHighScoreElement.style.display = 'block';
        } else {
            modalHighScoreElement.style.display = 'none';
        }
        
        // Show brief message in the game area
        showMessage(`Paddington's Adventure #${gameState.round} complete!`);
        
        // Show the modal with animation
        setTimeout(() => {
            roundCompleteModal.classList.add('show');
        }, 500);
    }

    function startNextRound() {
        // Hide the modal with animation
        roundCompleteModal.classList.remove('show');
        
        // Increment round
        gameState.round++;
        
        // Reset attempts
        gameState.attempts = gameState.maxAttempts;
        
        // Generate new jars
        generateJars();
        
        // Update UI
        updateUI();
        
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