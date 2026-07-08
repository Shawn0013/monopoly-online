const socket = io();
let myId = null;
let myTurn = false;

document.getElementById('joinBtn').onclick = () => {
    const name = document.getElementById('nameInput').value.trim();
    if (name) socket.emit('joinGame', name);
};
document.getElementById('startBtn').onclick = () => socket.emit('startGame');
document.getElementById('rollBtn').onclick = () => { if (myTurn) socket.emit('rollDice'); };
document.getElementById('buyBtn').onclick = () => socket.emit('buyProperty');
document.getElementById('buildBtn').onclick = () => socket.emit('buildHouse');
document.getElementById('endTurnBtn').onclick = () => { socket.emit('endTurn'); setButtons(false); };

socket.on('connect', () => { myId = socket.id; });
socket.on('updatePlayers', (players) => {
    const list = document.getElementById('playerList');
    list.innerHTML = '<h3>当前玩家:</h3>';
    for (let id in players) {
        list.innerHTML += `<p>👤 ${players[id].name} (💰${players[id].money})</p>`;
    }
    document.getElementById('startBtn').disabled = Object.keys(players).length < 2;
});

socket.on('gameStarted', (firstPlayerId) => {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    myTurn = (firstPlayerId === myId);
    updateTurnDisplay();
});

socket.on('nextTurn', (playerId) => {
    myTurn = (playerId === myId);
    updateTurnDisplay();
});

socket.on('updateGameState', (state) => {
    updateBoard(state);
    updatePlayersInfo(state);
});

socket.on('diceResult', (data) => {
    document.getElementById('diceResult').innerHTML = `🎲 ${data.dice[0]} + ${data.dice[1]} = ${data.dice[0]+data.dice[1]}`;
    setButtons(false);
});

socket.on('message', (msg) => {
    const log = document.getElementById('gameLog');
    log.innerHTML += `<p>${msg}</p>`;
    log.scrollTop = log.scrollHeight;
});

socket.on('error', (msg) => alert(msg));

function updateTurnDisplay() {
    const el = document.getElementById('turnIndicator');
    el.textContent = myTurn ? '✨ 轮到你了！' : '⏳ 等待其他玩家...';
    document.getElementById('rollBtn').style.display = myTurn ? 'block' : 'none';
    if (!myTurn) setButtons(false);
}

function setButtons(show) {
    document.getElementById('buyBtn').style.display = show ? 'block' : 'none';
    document.getElementById('buildBtn').style.display = show ? 'block' : 'none';
    document.getElementById('endTurnBtn').style.display = show ? 'block' : 'none';
}

const BOARD_DATA = [
    { name: "起点", type: "start" }, { name: "地中海大道", type: "property", color: "brown" },
    { name: "机会", type: "chance" }, { name: "波罗的海大道", type: "property", color: "brown" },
    { name: "所得税", type: "tax" }, { name: "铁路", type: "railroad" },
    { name: "东方大道", type: "property", color: "lightblue" }, { name: "机会", type: "chance" },
    { name: "佛蒙特大道", type: "property", color: "lightblue" }, { name: "康涅狄格大道", type: "property", color: "lightblue" },
    { name: "监狱/探视", type: "jail" }, { name: "圣查尔斯广场", type: "property", color: "pink" },
    { name: "电力公司", type: "utility" }, { name: "州立大道", type: "property", color: "pink" },
    { name: "弗吉尼亚大道", type: "property", color: "pink" }, { name: "铁路", type: "railroad" },
    { name: "圣詹姆斯广场", type: "property", color: "orange" }, { name: "命运", type: "community" },
    { name: "田纳西大道", type: "property", color: "orange" }, { name: "纽约大道", type: "property", color: "orange" },
    { name: "免费停车", type: "free" }, { name: "肯塔基大道", type: "property", color: "red" },
    { name: "机会", type: "chance" }, { name: "印第安纳大道", type: "property", color: "red" },
    { name: "伊利诺伊大道", type: "property", color: "red" }, { name: "铁路", type: "railroad" },
    { name: "大西洋大道", type: "property", color: "yellow" }, { name: "文特诺大道", type: "property", color: "yellow" },
    { name: "供水公司", type: "utility" }, { name: "马文花园", type: "property", color: "yellow" },
    { name: "进监狱", type: "gotojail" }, { name: "太平洋大道", type: "property", color: "green" },
    { name: "北卡罗来纳大道", type: "property", color: "green" }, { name: "命运", type: "community" },
    { name: "宾夕法尼亚大道", type: "property", color: "green" }, { name: "铁路", type: "railroad" },
    { name: "机会", type: "chance" }, { name: "公园广场", type: "property", color: "darkblue" },
    { name: "超级税", type: "tax" }, { name: "木桥", type: "property", color: "darkblue" },
];

function updateBoard(state) {
    const board = document.getElementById('board');
    board.innerHTML = '<div class="board-center">🎲<br>大富翁</div>';
    BOARD_DATA.forEach((cell, i) => {
        const div = document.createElement('div');
        div.className = `board-cell ${cell.type}`;
        if (cell.type === 'property') div.className += ` property-${cell.color}`;
        div.textContent = cell.name;
        const playersHere = [];
        for (let id in state.players) {
            if (state.players[id].position === i) {
                playersHere.push(id);
            }
        }
        if (playersHere.length > 0) {
            div.innerHTML += '<div>' + playersHere.map(() => '🔴').join('') + '</div>';
        }
        board.appendChild(div);
    });
}

function updatePlayersInfo(state) {
    const info = document.getElementById('playersInfo');
    info.innerHTML = '<h3>玩家信息</h3>';
    for (let id in state.players) {
        const p = state.players[id];
        info.innerHTML += `<p>${id === myId ? '👉' : '👤'} ${p.name}: 💰${p.money} | 🏠${p.properties.length}处地产</p>`;
    }
}