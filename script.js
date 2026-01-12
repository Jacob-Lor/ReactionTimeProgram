class ReactionTimeLab {
    constructor() {
        this.currentScreen = 'instructions';
        this.gameState = 'idle';
        this.currentRound = 0;
        this.totalRounds = 8;
        
        // Lab structure: 2 practice rounds + 6 test rounds (alternating pattern)
        this.rounds = [
            // Practice rounds (fixed order)
            { type: 'visual', isPractice: true, name: 'Practice' },
            { type: 'auditory', isPractice: true, name: 'Practice' },
            // Test rounds (alternating pattern)
            { type: 'visual', isPractice: false, name: 'Test' },
            { type: 'auditory', isPractice: false, name: 'Test' },
            { type: 'visual', isPractice: false, name: 'Test' },
            { type: 'auditory', isPractice: false, name: 'Test' },
            { type: 'visual', isPractice: false, name: 'Test' },
            { type: 'auditory', isPractice: false, name: 'Test' }
        ];
        
        this.results = [];
        this.stimulusStartTime = null;
        this.graceTimeout = null;
        
        // Audio context for sound stimulus
        this.audioContext = null;
        this.initAudio();
        
        this.initEventListeners();
        // No need to shuffle since we're using alternating pattern
    }

    initAudio() {
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
    }

    initEventListeners() {
        document.getElementById('begin-btn').addEventListener('click', () => this.startLab());
        document.getElementById('start-test-btn').addEventListener('click', () => this.startCurrentTest());
        document.getElementById('continue-btn').addEventListener('click', () => this.nextRound());
        document.getElementById('retry-btn').addEventListener('click', () => this.retryRound());
        document.getElementById('view-stats-btn').addEventListener('click', () => this.showFinalResults());
        document.getElementById('restart-lab-btn').addEventListener('click', () => this.restartLab());
        document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());

        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
            }
        });
    }

    handleKeyPress(e) {
        if (e.code === 'Space') {
            if (this.gameState === 'grace-period') {
                // Early press - disqualify the test
                this.disqualifyTest();
            } else if (this.gameState === 'waiting-for-response') {
                this.recordReaction();
            }
        }
    }

    startLab() {
        this.currentRound = 0;
        this.results = [];
        this.showPreTest();
    }

    showPreTest() {
        if (this.currentRound >= this.totalRounds) {
            this.showFinalResults();
            return;
        }

        const round = this.rounds[this.currentRound];
        const roundNumber = this.currentRound + 1;
        
        // Update pre-test screen content
        document.getElementById('pre-test-title').textContent = 
            `${round.isPractice ? 'Practice' : 'Test'} Round ${roundNumber} - ${round.type === 'visual' ? 'Visual' : 'Auditory'} Test`;
        
        document.getElementById('test-type').textContent = 
            round.type === 'visual' ? 'Visual' : 'Auditory';
        
        document.getElementById('grace-period').textContent = '7-12 seconds';
        
        // Set specific instructions based on test type
        const instructionsDiv = document.getElementById('test-instructions');
        if (round.type === 'visual') {
            instructionsDiv.innerHTML = `
                <p>Watch the screen carefully. It will change from black to red.</p>
                <p>Press SPACEBAR immediately when you see the color change.</p>
                <div class="advice-highlight">
                    <p>💡 Keep your eyes focused on the center of the screen</p>
                    <p>⚠️ Do NOT press spacebar until you see the color change</p>
                </div>
            `;
        } else {
            instructionsDiv.innerHTML = `
                <p>Listen carefully for a bell sound while the screen remains black.</p>
                <p>Press SPACEBAR immediately when you hear the sound.</p>
                <div class="advice-highlight">
                    <p>💡 Close your eyes to focus entirely on listening</p>
                    <p>This will help eliminate visual distractions</p>
                    <p>⚠️ Do NOT press spacebar until you hear the bell sound</p>
                </div>
            `;
        }
        
        this.showScreen('pre-test');
    }

    startCurrentTest() {
        this.gameState = 'grace-period';
        this.showScreen('stimulus');
        
        // Random delay between 7-12 seconds
        const delay = Math.random() * 5000 + 7000; // 7-12 seconds
        
        this.graceTimeout = setTimeout(() => {
            this.showStimulus();
        }, delay);
    }

    disqualifyTest() {
        // Clear the grace timeout
        if (this.graceTimeout) {
            clearTimeout(this.graceTimeout);
            this.graceTimeout = null;
        }
        
        this.gameState = 'disqualified';
        
        // Clean up stimulus screen
        const stimulusScreen = document.getElementById('stimulus');
        stimulusScreen.classList.remove('visual-stimulus');
        stimulusScreen.classList.remove('auditory-stimulus');
        
        this.showScreen('disqualified');
    }

    retryRound() {
        // Don't increment round, just retry the same round
        this.showPreTest();
    }

    showStimulus() {
        const round = this.rounds[this.currentRound];
        this.stimulusStartTime = performance.now();
        this.gameState = 'waiting-for-response';
        
        if (round.type === 'visual') {
            this.showVisualStimulus();
        } else {
            this.showAuditoryStimulus();
        }
    }

    showVisualStimulus() {
        const stimulusScreen = document.getElementById('stimulus');
        stimulusScreen.classList.add('visual-stimulus');
    }

    showAuditoryStimulus() {
        const stimulusScreen = document.getElementById('stimulus');
        stimulusScreen.classList.add('auditory-stimulus');
        this.playBellSound();
    }

    playBellSound() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator1.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator2.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        oscillator1.start(this.audioContext.currentTime);
        oscillator2.start(this.audioContext.currentTime);
        oscillator1.stop(this.audioContext.currentTime + 0.5);
        oscillator2.stop(this.audioContext.currentTime + 0.5);
    }

    recordReaction() {
        if (this.gameState !== 'waiting-for-response') return;
        
        const reactionEndTime = performance.now();
        const reactionTime = Math.round(reactionEndTime - this.stimulusStartTime);
        const round = this.rounds[this.currentRound];
        
        this.gameState = 'completed';
        
        // Save result
        this.results.push({
            round: this.currentRound + 1,
            type: round.type,
            isPractice: round.isPractice,
            reactionTime: reactionTime,
            timestamp: new Date().toISOString()
        });
        
        // Clean up stimulus screen
        const stimulusScreen = document.getElementById('stimulus');
        stimulusScreen.classList.remove('visual-stimulus');
        stimulusScreen.classList.remove('auditory-stimulus');
        
        this.showRoundResults(reactionTime, round);
    }

    showRoundResults(reactionTime, round) {
        document.getElementById('round-info').textContent = 
            `Round ${this.currentRound + 1} of ${this.totalRounds} - ${round.isPractice ? 'Practice' : 'Test'}`;
        document.getElementById('stimulus-type').textContent = 
            `Stimulus: ${round.type === 'visual' ? 'Visual (Red Screen)' : 'Auditory (Bell Sound)'}`;
        document.getElementById('reaction-time').textContent = `${reactionTime}ms`;
        document.getElementById('performance-rating').textContent = this.getPerformanceRating(reactionTime);
        
        // Show appropriate button
        if (this.currentRound < this.totalRounds - 1) {
            document.getElementById('continue-btn').classList.remove('hidden');
            document.getElementById('view-stats-btn').classList.add('hidden');
        } else {
            document.getElementById('continue-btn').classList.add('hidden');
            document.getElementById('view-stats-btn').classList.remove('hidden');
        }
        
        this.showScreen('results');
    }

    nextRound() {
        this.currentRound++;
        this.showPreTest();
    }

    getPerformanceRating(time) {
        if (time < 200) return "🚀 Exceptional!";
        if (time < 250) return "⚡ Excellent!";
        if (time < 300) return "👍 Very Good!";
        if (time < 400) return "👌 Good";
        if (time < 500) return "📊 Average";
        return "🐌 Needs improvement";
    }

    showFinalResults() {
        this.calculateStatistics();
        this.showScreen('statistics');
    }

    calculateStatistics() {
        const visualResults = this.results.filter(r => r.type === 'visual');
        const auditoryResults = this.results.filter(r => r.type === 'auditory');
        
        const visualPractice = visualResults.find(r => r.isPractice);
        const auditoryPractice = auditoryResults.find(r => r.isPractice);
        
        const visualTests = visualResults.filter(r => !r.isPractice);
        const auditoryTests = auditoryResults.filter(r => !r.isPractice);
        
        // Update visual statistics
        document.getElementById('visual-practice').textContent = 
            visualPractice ? `${visualPractice.reactionTime}ms` : '-';
        document.getElementById('visual-tests').textContent = 
            visualTests.map(r => `${r.reactionTime}ms`).join(', ');
        document.getElementById('visual-avg').textContent = 
            visualTests.length > 0 ? 
            `${Math.round(visualTests.reduce((sum, r) => sum + r.reactionTime, 0) / visualTests.length)}ms` : '-';
        document.getElementById('visual-best').textContent = 
            visualTests.length > 0 ? `${Math.min(...visualTests.map(r => r.reactionTime))}ms` : '-';
        
        // Update auditory statistics
        document.getElementById('auditory-practice').textContent = 
            auditoryPractice ? `${auditoryPractice.reactionTime}ms` : '-';
        document.getElementById('auditory-tests').textContent = 
            auditoryTests.map(r => `${r.reactionTime}ms`).join(', ');
        document.getElementById('auditory-avg').textContent = 
            auditoryTests.length > 0 ? 
            `${Math.round(auditoryTests.reduce((sum, r) => sum + r.reactionTime, 0) / auditoryTests.length)}ms` : '-';
        document.getElementById('auditory-best').textContent = 
            auditoryTests.length > 0 ? `${Math.min(...auditoryTests.map(r => r.reactionTime))}ms` : '-';
        
        // Comparison
        if (visualTests.length > 0 && auditoryTests.length > 0) {
            const visualAvg = visualTests.reduce((sum, r) => sum + r.reactionTime, 0) / visualTests.length;
            const auditoryAvg = auditoryTests.reduce((sum, r) => sum + r.reactionTime, 0) / auditoryTests.length;
            const difference = Math.abs(visualAvg - auditoryAvg);
            
            if (visualAvg < auditoryAvg) {
                document.getElementById('faster-stimulus').textContent = 
                    `Visual stimulus was faster on average`;
                document.getElementById('difference').textContent = 
                    `Difference: ${Math.round(difference)}ms faster`;
            } else {
                document.getElementById('faster-stimulus').textContent = 
                    `Auditory stimulus was faster on average`;
                document.getElementById('difference').textContent = 
                    `Difference: ${Math.round(difference)}ms faster`;
            }
        }
    }

    exportData() {
        const data = {
            timestamp: new Date().toISOString(),
            totalRounds: this.totalRounds,
            results: this.results
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reaction-time-lab-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    restartLab() {
        this.currentRound = 0;
        this.results = [];
        this.gameState = 'idle';
        this.showScreen('instructions');
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        document.getElementById(screenName).classList.remove('hidden');
        this.currentScreen = screenName;
    }

    cleanup() {
        if (this.graceTimeout) {
            clearTimeout(this.graceTimeout);
            this.graceTimeout = null;
        }
    }
}

// Initialize lab when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ReactionTimeLab();
});