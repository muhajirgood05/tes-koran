/**
 * Tes Koran Pro - Advanced Version with Per-Play Details
 */

class TesKoran {
    constructor() {
        this.state = {
            view: 'menu',
            settings: {
                time: 1, // minutes
                type: 'acak', // acak, berurut
                format: 'vertikal', // vertikal, horizontal
                layout: '123' // 123, 789
            },
            currentPair: { n1: 0, n2: 0 },
            score: { benar: 0, salah: 0 },
            segments: [], // { time: 15, benar: x, salah: y }
            currentSegment: { benar: 0, salah: 0 },
            startTime: null,
            timerId: null,
            segmentTimerId: null,
            elapsedTime: 0,
            history: JSON.parse(localStorage.getItem('tesKoranHistory') || '[]')
        };

        this.init();
    }

    init() {
        this.views = {
            menu: document.getElementById('menu-view'),
            test: document.getElementById('test-view'),
            result: document.getElementById('result-view'),
            stats: document.getElementById('stats-view'),
            detail: document.getElementById('detail-view')
        };

        document.getElementById('open-settings').onclick = () => this.toggleModal(true);
        document.getElementById('stats-btn-main').onclick = () => this.showStats();
        document.getElementById('close-settings').onclick = () => this.toggleModal(false);
        document.getElementById('start-test-final').onclick = () => this.startTestFromSettings();
        document.getElementById('back-to-menu').onclick = () => this.switchView('menu');
        document.getElementById('retry-btn').onclick = () => this.toggleModal(true);
        document.getElementById('stats-back').onclick = () => this.switchView('menu');
        document.getElementById('detail-back').onclick = () => this.switchView('stats');
        document.getElementById('delete-history').onclick = () => this.deleteHistory();
        document.getElementById('close-test').onclick = () => this.endTest();

        document.querySelectorAll('.key').forEach(key => {
            key.onclick = () => this.handleInput(key.dataset.key);
        });

        window.onkeydown = (e) => {
            if (this.state.view === 'test' && /^[0-9]$/.test(e.key)) {
                this.handleInput(e.key);
            }
        };

        this.updateTopScore();
    }

    toggleModal(show) {
        document.getElementById('settings-modal').classList.toggle('active', show);
    }

    switchView(viewName) {
        this.state.view = viewName;
        Object.keys(this.views).forEach(key => {
            this.views[key].classList.toggle('active', key === viewName);
        });

        if (viewName === 'stats') this.renderHistory();
        if (viewName === 'menu') this.updateTopScore();
    }

    startTestFromSettings() {
        const timeRadio = document.querySelector('input[name="time"]:checked').value;
        const timeVal = timeRadio === 'custom' ? parseFloat(document.getElementById('custom-time-val').value) : parseFloat(timeRadio);
        
        this.state.settings = {
            time: timeVal,
            type: document.querySelector('input[name="type"]:checked').value,
            format: document.querySelector('input[name="format"]:checked').value,
            layout: document.querySelector('input[name="layout"]:checked').value
        };

        this.toggleModal(false);
        this.startTest();
    }

    startTest() {
        this.state.score = { benar: 0, salah: 0 };
        this.state.segments = [];
        this.state.currentSegment = { benar: 0, salah: 0 };
        this.state.elapsedTime = 0;
        this.setupTestUI();
        this.generatePair();
        this.switchView('test');
        this.startTimer();
    }

    setupTestUI() {
        const qBox = document.getElementById('q-box');
        qBox.className = `question-box ${this.state.settings.format}`;
        
        const keypad = document.getElementById('keypad-container');
        const layout = this.state.settings.layout;
        
        let keysHtml = '';
        const numOrder = layout === '123' ? [1,2,3,4,5,6,7,8,9] : [7,8,9,4,5,6,1,2,3];
        
        keysHtml = `
            <div class="keypad-grid">
                ${numOrder.map(n => `<div class="key" data-key="${n}">${n}</div>`).join('')}
            </div>
            <div class="keypad-bottom"><div class="key" data-key="0">0</div></div>
        `;
        keypad.innerHTML = keysHtml;
        
        keypad.querySelectorAll('.key').forEach(key => {
            key.onclick = () => this.handleInput(key.dataset.key);
        });
    }

    generatePair() {
        if (this.state.settings.type === 'acak') {
            this.state.currentPair = {
                n1: Math.floor(Math.random() * 10),
                n2: Math.floor(Math.random() * 10)
            };
        } else {
            const prev = this.state.currentPair.n2;
            this.state.currentPair = { n1: prev, n2: (prev + 1) % 10 };
        }
        document.getElementById('num-top').textContent = this.state.currentPair.n1;
        document.getElementById('num-bottom').textContent = this.state.currentPair.n2;
    }

    handleInput(val) {
        if (this.state.view !== 'test') return;

        const sum = (this.state.currentPair.n1 + this.state.currentPair.n2) % 10;
        const isCorrect = parseInt(val) === sum;

        if (isCorrect) {
            this.state.score.benar++;
            this.state.currentSegment.benar++;
        } else {
            this.state.score.salah++;
            this.state.currentSegment.salah++;
            this.flashError();
        }

        document.getElementById('current-score').textContent = this.state.score.benar;
        this.generatePair();
    }

    flashError() {
        const box = document.getElementById('q-box');
        box.style.borderColor = 'var(--error)';
        setTimeout(() => box.style.borderColor = '#444', 150);
    }

    startTimer() {
        this.state.startTime = Date.now();
        const durationMs = this.state.settings.time * 60000;

        if (this.state.timerId) clearInterval(this.state.timerId);
        if (this.state.segmentTimerId) clearInterval(this.state.segmentTimerId);

        this.state.timerId = setInterval(() => {
            const now = Date.now();
            this.state.elapsedTime = now - this.state.startTime;
            const remaining = durationMs - this.state.elapsedTime;
            if (remaining <= 0) this.endTest();
            else this.updateTimerDisplay(remaining);
        }, 100);

        // Track segments every 15 seconds
        this.state.segmentTimerId = setInterval(() => {
            this.state.segments.push({...this.state.currentSegment});
            this.state.currentSegment = { benar: 0, salah: 0 };
        }, 15000);
    }

    updateTimerDisplay(ms) {
        const totalSecs = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        document.getElementById('timer').textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }

    endTest() {
        clearInterval(this.state.timerId);
        clearInterval(this.state.segmentTimerId);
        // Push final segment if any
        if (this.state.currentSegment.benar > 0 || this.state.currentSegment.salah > 0) {
            this.state.segments.push({...this.state.currentSegment});
        }
        this.saveResult();
        this.switchView('result');
        this.renderResult();
    }

    saveResult() {
        const duration = this.state.settings.time;
        const speed = Math.round(this.state.score.benar / duration);
        const total = this.state.score.benar + this.state.score.salah;
        const accuracy = total > 0 ? parseFloat(((this.state.score.benar / total) * 100).toFixed(2)) : 0;

        const session = {
            id: Date.now(),
            date: new Date().toISOString(),
            menit: duration,
            benar: this.state.score.benar,
            salah: this.state.score.salah,
            speed: speed,
            accuracy: accuracy,
            segments: this.state.segments
        };

        this.state.history.unshift(session);
        localStorage.setItem('tesKoranHistory', JSON.stringify(this.state.history));
    }

    renderResult() {
        const last = this.state.history[0];
        document.getElementById('res-correct').textContent = last.benar;
        document.getElementById('res-speed').textContent = last.speed;
    }

    showStats() {
        this.switchView('stats');
    }

    renderHistory() {
        const history = this.state.history;
        document.getElementById('stats-count').textContent = history.length;
        const tableBody = document.getElementById('history-table-body');
        tableBody.innerHTML = '';

        history.forEach((h, index) => {
            const nextH = history[index + 1];
            const speedTrend = nextH ? (h.speed > nextH.speed ? 'up' : 'down') : 'up';
            const accTrend = nextH ? (h.accuracy > nextH.accuracy ? 'up' : 'down') : 'up';

            const row = document.createElement('tr');
            row.onclick = () => this.showSessionDetail(h);
            row.innerHTML = `
                <td>
                    <div class="hist-date-row">${new Date(h.date).toLocaleDateString()}</div>
                    ${history.length - index}
                </td>
                <td>${h.menit}</td>
                <td>${h.benar}</td>
                <td>${h.salah}</td>
                <td>${h.speed} <span class="trend-icon trend-${speedTrend}">${speedTrend === 'up' ? '↑' : '↓'}</span></td>
                <td>${h.accuracy} <span class="trend-icon trend-${accTrend}">${accTrend === 'up' ? '↑' : '↓'}</span></td>
            `;
            tableBody.appendChild(row);
        });

        this.renderLargeChart();
    }

    renderLargeChart() {
        const ctx = document.getElementById('history-chart-large').getContext('2d');
        if (this.largeChart) this.largeChart.destroy();
        const data = [...this.state.history].reverse().slice(-15);
        this.largeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map((_, i) => i + 1),
                datasets: [
                    { label: 'Rata-rata', data: data.map(h => h.speed), borderColor: '#facc15', tension: 0.4 },
                    { label: 'Akurasi', data: data.map(h => h.accuracy), borderColor: '#f97316', tension: 0.4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    showSessionDetail(session) {
        this.switchView('detail');
        document.getElementById('detail-timestamp').textContent = new Date(session.date).toLocaleString();
        document.getElementById('det-benar').textContent = session.benar;
        document.getElementById('det-salah').textContent = session.salah;
        document.getElementById('det-waktu').textContent = `${session.menit} menit`;
        
        // Calculate Details
        const speedVal = session.speed;
        const accVal = session.accuracy;
        
        const speedLabel = speedVal > 80 ? 'Tinggi Sekali' : speedVal > 60 ? 'Tinggi' : 'Cukup';
        const accLabel = accVal > 95 ? 'Tinggi Sekali' : accVal > 85 ? 'Tinggi' : 'Cukup';

        document.getElementById('det-speed').textContent = `${speedVal} (${speedLabel})`;
        document.getElementById('det-acc').textContent = `${accVal}% (${accLabel})`;

        // Consistency (Keajegan) & Endurance (Ketahanan)
        const segs = session.segments || [];
        if (segs.length > 1) {
            const benars = segs.map(s => s.benar);
            const avg = benars.reduce((a,b) => a+b, 0) / benars.length;
            const diffs = benars.map(b => Math.abs(b - avg));
            const keajegan = (1 - (diffs.reduce((a,b) => a+b, 0) / (avg * benars.length))) * 100;
            
            const half = Math.floor(segs.length / 2);
            const firstHalf = benars.slice(0, half).reduce((a,b) => a+b, 0) / half;
            const secondHalf = benars.slice(half).reduce((a,b) => a+b, 0) / (benars.length - half);
            const ketahanan = (secondHalf / firstHalf) * 100;

            document.getElementById('det-keajegan').textContent = `${keajegan.toFixed(1)} (${keajegan > 90 ? 'Tinggi Sekali' : 'Cukup'})`;
            document.getElementById('det-ketahanan').textContent = `${ketahanan.toFixed(1)} (${ketahanan > 90 ? 'Tinggi Sekali' : 'Cukup'})`;
        } else {
            document.getElementById('det-keajegan').textContent = 'N/A';
            document.getElementById('det-ketahanan').textContent = 'N/A';
        }

        this.renderSessionChart(session);
    }

    renderSessionChart(session) {
        const ctx = document.getElementById('detail-session-chart').getContext('2d');
        if (this.sessionChart) this.sessionChart.destroy();

        const segs = session.segments || [];
        this.sessionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: segs.map((_, i) => i + 1),
                datasets: [
                    { label: 'Benar', data: segs.map(s => s.benar), borderColor: '#facc15', backgroundColor: 'rgba(250, 204, 21, 0.1)', fill: true, tension: 0.4 },
                    { label: 'Salah', data: segs.map(s => s.salah), borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.1)', fill: true, tension: 0.4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#333' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    updateTopScore() {
        if (this.state.history.length > 0) {
            const topSpeed = Math.max(...this.state.history.map(h => h.speed));
            const topAcc = this.state.history.find(h => h.speed === topSpeed).accuracy;
            document.getElementById('top-speed').textContent = topSpeed;
            document.getElementById('top-acc').textContent = topAcc;
        }
    }

    deleteHistory() {
        if (confirm('Hapus semua riwayat statistik?')) {
            this.state.history = [];
            localStorage.removeItem('tesKoranHistory');
            this.renderHistory();
            this.updateTopScore();
        }
    }
}

window.addEventListener('DOMContentLoaded', () => { new TesKoran(); });
