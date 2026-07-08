const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// 完整大富翁棋盘数据：0-39格
const BOARD = [
    { name: "起点", type: "start" },
    { name: "地中海大道", type: "property", price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, color: "brown" },
    { name: "机会", type: "chance" },
    { name: "波罗的海大道", type: "property", price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, color: "brown" },
    { name: "所得税", type: "tax", amount: 200 },
    { name: "铁路", type: "railroad", price: 200, rentBase: 25 },
    { name: "东方大道", type: "property", price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, color: "lightblue" },
    { name: "机会", type: "chance" },
    { name: "佛蒙特大道", type: "property", price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, color: "lightblue" },
    { name: "康涅狄格大道", type: "property", price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, color: "lightblue" },
    { name: "监狱/探视", type: "jail" },
    { name: "圣查尔斯广场", type: "property", price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, color: "pink" },
    { name: "电力公司", type: "utility", price: 150 },
    { name: "州立大道", type: "property", price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, color: "pink" },
    { name: "弗吉尼亚大道", type: "property", price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, color: "pink" },
    { name: "铁路", type: "railroad", price: 200, rentBase: 25 },
    { name: "圣詹姆斯广场", type: "property", price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, color: "orange" },
    { name: "命运", type: "community" },
    { name: "田纳西大道", type: "property", price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, color: "orange" },
    { name: "纽约大道", type: "property", price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, color: "orange" },
    { name: "免费停车", type: "free" },
    { name: "肯塔基大道", type: "property", price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, color: "red" },
    { name: "机会", type: "chance" },
    { name: "印第安纳大道", type: "property", price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, color: "red" },
    { name: "伊利诺伊大道", type: "property", price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, color: "red" },
    { name: "铁路", type: "railroad", price: 200, rentBase: 25 },
    { name: "大西洋大道", type: "property", price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, color: "yellow" },
    { name: "文特诺大道", type: "property", price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, color: "yellow" },
    { name: "供水公司", type: "utility", price: 150 },
    { name: "马文花园", type: "property", price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, color: "yellow" },
    { name: "进监狱", type: "gotojail" },
    { name: "太平洋大道", type: "property", price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, color: "green" },
    { name: "北卡罗来纳大道", type: "property", price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, color: "green" },
    { name: "命运", type: "community" },
    { name: "宾夕法尼亚大道", type: "property", price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, color: "green" },
    { name: "铁路", type: "railroad", price: 200, rentBase: 25 },
    { name: "机会", type: "chance" },
    { name: "公园广场", type: "property", price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, color: "darkblue" },
    { name: "超级税", type: "tax", amount: 100 },
    { name: "木桥", type: "property", price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, color: "darkblue" },
];

let gameState = {
    players: {},
    currentTurn: 0,
    playerOrder: [],
    gameStarted: false,
    lastDice: [1,1]
};

function getRent(space, gameState) {
    if (!space || space.type !== 'property') return 0;
    const owner = space.owner;
    if (!owner || !gameState.players[owner]) return 0;
    const houses = gameState.players[owner].properties.find(p => p.name === space.name)?.houses || 0;
    if (houses === 0) {
        const colorGroup = BOARD.filter(s => s.type === 'property' && s.color === space.color);
        const ownedAll = colorGroup.every(s => s.owner === owner);
        return ownedAll ? space.rent[0] * 2 : space.rent[0];
    }
    return space.rent[houses];
}

io.on('connection', (socket) => {
    console.log('玩家连接:', socket.id);

    socket.on('joinGame', (playerName) => {
        if (gameState.gameStarted) {
            socket.emit('error', '游戏已经开始，请等待下一局');
            return;
        }
        if (Object.keys(gameState.players).length >= 4) {
            socket.emit('error', '房间已满');
            return;
        }
        gameState.players[socket.id] = {
            id: socket.id,
            name: playerName,
            money: 1500,
            position: 0,
            properties: [],
            inJail: false,
            jailTurns: 0
        };
        gameState.playerOrder.push(socket.id);
        io.emit('updatePlayers', gameState.players);
        io.emit('message', `${playerName} 加入了游戏`);
    });

    socket.on('startGame', () => {
        if (Object.keys(gameState.players).length < 2) {
            socket.emit('error', '至少需要2名玩家');
            return;
        }
        gameState.gameStarted = true;
        gameState.currentTurn = 0;
        io.emit('gameStarted', gameState.playerOrder[0]);
        io.emit('message', '游戏开始！');
    });

    socket.on('rollDice', () => {
        if (!gameState.gameStarted) return;
        const currentPlayerId = gameState.playerOrder[gameState.currentTurn];
        if (socket.id !== currentPlayerId) return;

        const player = gameState.players[socket.id];
        if (player.inJail) {
            player.jailTurns++;
            if (player.jailTurns >= 3) {
                player.inJail = false;
                player.jailTurns = 0;
                io.emit('message', `${player.name} 出狱了！`);
            } else {
                io.emit('message', `${player.name} 还在监狱里，等待 ${3 - player.jailTurns} 回合`);
                advanceTurn();
                return;
            }
        }

        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        gameState.lastDice = [d1, d2];
        io.emit('diceResult', { dice: [d1, d2], player: player.name });

        player.position = (player.position + d1 + d2) % 40;
        if (player.position < (player.position - d1 - d2 + 40) % 40) {
            player.money += 200;
            io.emit('message', `${player.name} 经过起点，获得200元`);
        }

        handleLanding(socket.id);
        io.emit('updateGameState', gameState);
    });

    socket.on('buyProperty', () => {
        const player = gameState.players[socket.id];
        const space = BOARD[player.position];
        if (!space || space.type !== 'property' || space.owner) return;
        if (player.money < space.price) {
            socket.emit('error', '资金不足');
            return;
        }
        player.money -= space.price;
        space.owner = socket.id;
        player.properties.push({ name: space.name, houses: 0, color: space.color });
        io.emit('message', `${player.name} 购买了 ${space.name}`);
        io.emit('updateGameState', gameState);
    });

    socket.on('buildHouse', () => {
        const player = gameState.players[socket.id];
        const space = BOARD[player.position];
        if (!space || space.type !== 'property' || space.owner !== socket.id) return;
        const prop = player.properties.find(p => p.name === space.name);
        if (!prop || prop.houses >= 5) return;
        if (player.money < space.houseCost) {
            socket.emit('error', '资金不足');
            return;
        }
        const colorGroup = BOARD.filter(s => s.type === 'property' && s.color === space.color);
        const ownedAll = colorGroup.every(s => s.owner === socket.id);
        if (!ownedAll) {
            socket.emit('error', '必须拥有同色全部地产才能建房');
            return;
        }
        player.money -= space.houseCost;
        prop.houses++;
        io.emit('message', `${player.name} 在 ${space.name} 建造了房屋 (${prop.houses}级)`);
        io.emit('updateGameState', gameState);
    });

    socket.on('endTurn', () => {
        advanceTurn();
    });

    socket.on('disconnect', () => {
        console.log('玩家离开:', socket.id);
        if (gameState.players[socket.id]) {
            io.emit('message', `${gameState.players[socket.id].name} 离开了游戏`);
        }
        delete gameState.players[socket.id];
        gameState.playerOrder = gameState.playerOrder.filter(id => id !== socket.id);
        io.emit('updatePlayers', gameState.players);
    });

    function handleLanding(playerId) {
        const player = gameState.players[playerId];
        const space = BOARD[player.position];
        io.emit('message', `${player.name} 到达了 ${space.name}`);

        switch(space.type) {
            case 'property':
            case 'railroad':
            case 'utility':
                if (space.owner && space.owner !== playerId) {
                    let rent = 0;
                    if (space.type === 'property') {
                        rent = getRent(space, gameState);
                    } else if (space.type === 'railroad') {
                        const ownerRailroads = gameState.players[space.owner].properties.filter(p => {
                            const s = BOARD.find(b => b.name === p.name);
                            return s && s.type === 'railroad';
                        }).length;
                        rent = space.rentBase * Math.pow(2, ownerRailroads - 1);
                    } else if (space.type === 'utility') {
                        const ownerUtils = gameState.players[space.owner].properties.filter(p => {
                            const s = BOARD.find(b => b.name === p.name);
                            return s && s.type === 'utility';
                        }).length;
                        rent = (gameState.lastDice[0] + gameState.lastDice[1]) * (ownerUtils === 2 ? 10 : 4);
                    }
                    player.money -= rent;
                    gameState.players[space.owner].money += rent;
                    io.emit('message', `${player.name} 支付了 ${rent}元 租金给 ${gameState.players[space.owner].name}`);
                }
                break;
            case 'tax':
                player.money -= space.amount;
                io.emit('message', `${player.name} 支付了税费 ${space.amount}元`);
                break;
            case 'chance':
                const chanceCards = [
                    { text: "银行支付你50元", amount: 50 },
                    { text: "支付罚款150元", amount: -150 },
                    { text: "前进到起点", moveTo: 0 },
                    { text: "获得100元", amount: 100 },
                    { text: "支付维修费100元", amount: -100 },
                ];
                const card = chanceCards[Math.floor(Math.random() * chanceCards.length)];
                if (card.amount) {
                    player.money += card.amount;
                }
                if (card.moveTo !== undefined) {
                    player.position = card.moveTo;
                }
                io.emit('message', `${player.name} 抽到机会: ${card.text}`);
                break;
            case 'community':
                const communityCards = [
                    { text: "生日快乐！每人给你10元", perPlayer: 10 },
                    { text: "银行错误，获得200元", amount: 200 },
                    { text: "支付医院费100元", amount: -100 },
                    { text: "获得25元", amount: 25 },
                ];
                const cCard = communityCards[Math.floor(Math.random() * communityCards.length)];
                if (cCard.perPlayer) {
                    const otherPlayers = Object.keys(gameState.players).filter(id => id !== playerId);
                    otherPlayers.forEach(id => {
                        gameState.players[id].money -= cCard.perPlayer;
                        player.money += cCard.perPlayer;
                    });
                } else if (cCard.amount) {
                    player.money += cCard.amount;
                }
                io.emit('message', `${player.name} 抽到命运: ${cCard.text}`);
                break;
            case 'gotojail':
                player.position = 10;
                player.inJail = true;
                player.jailTurns = 0;
                io.emit('message', `${player.name} 被送进监狱！`);
                break;
        }

        if (player.money < 0) {
            io.emit('message', `${player.name} 破产了！`);
            delete gameState.players[playerId];
            gameState.playerOrder = gameState.playerOrder.filter(id => id !== playerId);
        }
    }

    function advanceTurn() {
        if (gameState.playerOrder.length <= 1) {
            const winner = gameState.players[gameState.playerOrder[0]];
            io.emit('message', `游戏结束！${winner ? winner.name : '无人'} 获胜！`);
            gameState.gameStarted = false;
            return;
        }
        gameState.currentTurn = (gameState.currentTurn + 1) % gameState.playerOrder.length;
        const nextPlayerId = gameState.playerOrder[gameState.currentTurn];
        io.emit('nextTurn', nextPlayerId);
        io.emit('updateGameState', gameState);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`大富翁服务器运行在端口 ${PORT}`);
});
