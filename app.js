'use strict';

//---------- Required modules ----------
const express = require('express');
const app = module.exports = express();
const serv = require('http').Server(app);
// const io = require('socket.io')(serv, {});
const colours = require('colors/safe');
const { uniqueNamesGenerator, adjectives, animals, colors, countries, names, starWars } = require('unique-names-generator');
 

//---------- Server settings ----------
const fps = 3;
let halfTime = false;
const MAX_FOOD = 1400;
const config = {
    MAX_NAME_LENGTH: 32,
    MAP_WIDTH: 500,
    MAP_HEIGHT: 500,
    PIXEL_SIZE: 14,
    CAMERA_SPEED: 0.25
};
const dictionaries = [adjectives, animals, colors, countries, names, starWars];

//---------- Server startup ----------
const port = process.env.PORT || 80;
const debug = typeof v8debug === 'object' || /--debug/.test(process.execArgv.join(' '));

console.log(colours.green('[Snake] Starting server...'));
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

if (process.env.PORT == undefined) {
	console.log(colours.blue('[Snake] No port defined using default (80)'));
};

serv.listen(port);
console.log(colours.green('[Snake] Http started on port ' + port));

//---------- Game variables ----------
let SOCKET_LIST = {};
let PLAYER_LIST = {};
let FOOD_LIST = {};
let INVINCIBLE_FOOD_LIST = {};

const randomName = () => {
    const amount = ((Math.random() * 3) + 1) | 0;
    return uniqueNamesGenerator({
        dictionaries: [...(() => {
            let tmpDict = [];
            for (let i = 0; i < amount; (tmpDict[i] = dictionaries[(dictionaries.length * Math.random()) | 0]), ++i) {};
            return tmpDict;
        })()],
        separator: ' ',
        length: amount,
        style: 'capital'
    });
};

const randomCoordsOnGrid = () => {
    return {
        x: ((Math.random() * (config.MAP_WIDTH - 4)) + 2) | 0,
        y: ((Math.random() * (config.MAP_HEIGHT - 4)) + 2) | 0
    };
};

const typeScoreMap = {
    2: (+1),
    3: (+1),
    4: (+1),
    5: (+2),
    6: (+3),
    7: (+4),
    8: (+5),
    9: (-1)
};

const randomOrientation = () => {
    const val =  (Math.random() * 360) | 0;
    const arr = [0, 90, 180, 270];
    return arr[(val % 2)];
};

const Food = (id, x, y, type) => {
	return {
		id: id,
        type: type || ((Math.random() * 11) + 2) | 0,
		x: x,
		y: y
	};
};

const spawnFood = (type) => {
	const id = Math.random();
    const tmpCoords = randomCoordsOnGrid();
	FOOD_LIST[id] = Food(id, tmpCoords.x, tmpCoords.y, type || null);
};
const spawnInvincibleFood = () => {
	const id = Math.random();
    const tmpCoords = randomCoordsOnGrid();
	INVINCIBLE_FOOD_LIST[id] = Food(id, tmpCoords.x, tmpCoords.y, 1);
};

for (let i = MAX_FOOD; i > -1; --i) {
	spawnFood();
};

// Directions: 0 = up (-y), 1 = right (+x), 2 = down = (+y), 3 = left (-x)
const Player = (id) => {
	const self = {
		id: id,
		direction: 0,
		lastDirection: 0,
		x: config.MAP_WIDTH / 2,
		y: config.MAP_HEIGHT / 2,
		score: 0,
		tailBlocks: [],
		inGame: false,
		invincible: false,
        hasQuasar: false,
        usingQuasar: false,
		name: randomName(),
		color: 0
	};
    const directionMap = [
        () => { --self.y; },
        () => { ++self.x; },
        () => { ++self.y; },
        () => { --self.x; }
    ];

	self.spawn = () => {
		self.x = ((Math.random() * (config.MAP_WIDTH - 20)) + 10) | 0;
		self.y = ((Math.random() * (config.MAP_WIDTH - 20)) + 10) | 0;
		self.color = self.y = (Math.random() * 360) | 0;
		self.direction = (Math.random() * 4) | 0;
		self.score = 0;
		self.inGame = true;
        spawnInvincibleFood();
	};

    self.deleteTail = () => {
		for (let i = self.tailBlocks.length; i > 0; --i) {
			--self.tailBlocks.length;
		};
	};

	self.die = () => {
		self.inGame = false;
		self.deleteTail();
        --INVINCIBLE_FOOD_LIST.length;
		
		try {
			// SOCKET_LIST[self.id].emit('death', {
			SOCKET_LIST[self.id].send(encode({
                t: 1,
				score: self.score
			}));
//			SOCKET_LIST[self.id].send('death', JSON.stringify({
//				score: self.score
//			}));
		} catch(err) {
			if(debug) {
				console.log(err);
			};
		};
	};

	self.update = () => {
        self.tailBlocks = [Tail(self.x, self.y, self.id, self.color), ...self.tailBlocks];

		while ((self.score + 2 < self.tailBlocks.length) && (self.tailBlocks.length !== 0)) {
			--self.tailBlocks.length;
		};

        directionMap[self.direction]();
		self.lastDirection = self.direction;

		if ((self.x <= 0) || (self.x >= config.MAP_WIDTH) || (self.y <= 0) || (self.y >= config.MAP_WIDTH)) {
			self.die();
			return;
		};

        if (!self.invincible) {
            for (let p in PLAYER_LIST) {
                const player = PLAYER_LIST[p];
                for (let t in player.tailBlocks) {
                    const pTail = player.tailBlocks[t];
                    if ((self.x === pTail.x) && (self.y === pTail.y)) {
                        self.die();
                        player.score += (5 + (self.score / 2));
                        return;
                    };
                };
            };

            for (let f in FOOD_LIST) {
                const food = FOOD_LIST[f];
                if (self.x === food.x && self.y === food.y) {
                    switch (food.type) {
                        // case 0: // not used
                        // case 1: // supernova - invincible
                        case 2: // rock - 1
                        case 3: // rock - 1
                        case 4: // rock - 1
                        case 5: // purple - 2 points
                        case 6: // green - 3 points
                        case 7: // almost habitable - 4 points
                        case 8: // earth - 5 points
                        case 9: // red dwarf - minus 1
                            delete FOOD_LIST[food.id];
                            self.score = self.score + typeScoreMap[food.type];
                            break;
                        case 10: // quasar - one-time speed
                            delete FOOD_LIST[food.id];
                            self.hasQuasar = true;
                            break;
                        case 11: // black hole - no tailblocks or die
                            if (self.tailBlocks.length < 3) {
                                self.die();
                            };
                            self.tailBlocks.length = 0;
                            self.score = (self.score > 0) ? 0 : self.score;
                            break;
                        case 12: // worm hole - random teleport
                            delete FOOD_LIST[food.id];
                            self.x = ((Math.random() * (config.MAP_WIDTH - 20)) + 10) | 0;
                            self.y = ((Math.random() * (config.MAP_WIDTH - 20)) + 10) | 0;
                            // self.direction = Math.floor(Math.random() * 4);
                            break;
                        default:
                    };
                };
            };

            for (let f in INVINCIBLE_FOOD_LIST) {
                const food = INVINCIBLE_FOOD_LIST[f];
                if (self.x === food.x && self.y === food.y) {
                    delete INVINCIBLE_FOOD_LIST[food.id];
                    self.invincible = true;
                    spawnInvincibleFood();
                    setTimeout(() => { self.invincible = false; }, self.tailBlocks.length * 1000);
                };
            };
        };
	};

	return self;
};

const Tail = (x, y, playerId, color) => {
	return {
		x: x,
		y: y,
		playerId: playerId,
		color: color
	};
};

const dynamicSort = (property) => {
	let sortOrder = 1;
	if (property[0] === "-") {
		sortOrder = -1;
		property = property.substr(1);
	};
	return (a,b) => {
		const result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
		return result * sortOrder;
	};
};

const update = async () => {
	let playerPack = [];
	let tailPack = [];
	let foodPack = [];

	let leaderboardPlayers = [];

	for (let p in PLAYER_LIST) {
		const player = PLAYER_LIST[p];

		if (player.inGame) {
            if (!halfTime) {
                player.update();
            } else if (halfTime && player.usingQuasar) {
                player.update();
            };

			if (!player.inGame) { // Player died
				continue;
			};
			playerPack[playerPack.length] = {
				id: player.id,
				x: player.x,
				y: player.y,
				name: player.name,
				score: player.score,
				color: player.color,
                invincible: player.invincible,
                usingQuasar: player.usingQuasar
			};
			leaderboardPlayers[leaderboardPlayers.length] = player;
			for (let t in player.tailBlocks) {
				const tail = player.tailBlocks[t];
				tailPack[tailPack.length] = {
					x: tail.x,
					y: tail.y,
					color: tail.color
				};
			};
		};
	};

	for (let f in FOOD_LIST) {
		const food = FOOD_LIST[f];
		foodPack[foodPack.length] = {
			x: food.x,
			y: food.y,
            type: food.type
		};
	};
	for (let f in INVINCIBLE_FOOD_LIST) {
		const food = INVINCIBLE_FOOD_LIST[f];
		foodPack[foodPack.length] = {
			x: food.x,
			y: food.y,
            type: food.type
		};
	};

	let leaderboard = [];

	leaderboardPlayers.sort(dynamicSort('score'));
	while (leaderboardPlayers.length > 10) {
		--leaderboardPlayers.length;
	};

	for (let i = 0, iEnd = leaderboardPlayers.length, c = leaderboard.length; i < iEnd; ++i) {
        const tmpItem = leaderboardPlayers[i];
		leaderboard[c + i] = {place: i, name: tmpItem.name, id: tmpItem.id};
	};
//    io.emit('gamestate', {
//        leaderboard: leaderboard,
//        players: playerPack,
//        playerTails: tailPack,
//        food: foodPack
//    });

    tmpApp.publish('gamestate', encode({
        t: 0,
        leaderboard: leaderboard,
        players: playerPack,
        playerTails: tailPack,
        food: foodPack
    }));
//    tmpApp.publish('gamestate', JSON.stringify({
//        t: 0,
//        leaderboard: leaderboard,
//        players: playerPack,
//        playerTails: tailPack,
//        food: foodPack
//    }));
};

const spawnPlayer = (id) => {
	try {
		PLAYER_LIST[id].spawn();
		// SOCKET_LIST[id].emit('spawn', {x: PLAYER_LIST[id].x, y: PLAYER_LIST[id].y});
        SOCKET_LIST[id].send(encode({
            t: 2,
            x: PLAYER_LIST[id].x,
            y: PLAYER_LIST[id].y
        }));
//        SOCKET_LIST[id].send(JSON.stringify({
//            t: 2,
//            x: PLAYER_LIST[id].x,
//            y: PLAYER_LIST[id].y
//        }));
	} catch(err) {
		if(debug) {
			throw err;
		};
	};
};

const disconnectSocket = (id) => {
	try {
		if (PLAYER_LIST[id] != undefíned) {
			PLAYER_LIST[id].deleteTail();
			delete PLAYER_LIST[id];
		};
	} catch(err) {
	};
	// SOCKET_LIST[id].disconnect();
    SOCKET_LIST[id].close();
	delete SOCKET_LIST[id];
};

//io.on('connection', (socket) => {
//	socket.id = Math.random();
//
//	SOCKET_LIST[socket.id] = socket;
//	const player = Player(socket.id);
//
//	PLAYER_LIST[socket.id] = player;
//	socket.emit('id', {
//		id: socket.id,
//        config: config
//	});
//	console.log(colours.cyan('[Snake] Socket connection with id ' + socket.id));

//	socket.on('keyPress', (data) => {
//        const inputId = data.inputId;
//        (inputId < 4) && (!(2 === Math.abs(inputId - player.lastDirection)) && (player.direction = inputId));
//        if ((inputId === 4) && player.hasQuasar && !player.usingQuasar) {
//            player.usingQuasar = true;
//            setTimeout(() => {
//                player.usingQuasar = false;
//                player.hasQuasar = false;
//            }, 10000);
//        };
//	});

//	socket.on('ping2', () => {
//		socket.emit('pong2');
//	});

//	socket.on('disconnect', () => {
//		try {
//            if (PLAYER_LIST[socket.id].inGame) {
//                --INVINCIBLE_FOOD_LIST.length;
//            };
//			delete PLAYER_LIST[socket.id];
//			console.log(colours.cyan('[Snake] Player with id ' + socket.id + ' disconnected'));
//			disconnectSocket(socket.id);
//		} catch(err) {
//			if (debug) {
//				throw err;
//			};
//		};
//	});

//    socket.on('spawn', (data) => {
//		try {
//			if (!PLAYER_LIST[socket.id].inGame) {
//                PLAYER_LIST[socket.id].name = ((data.name == undefined) || (data.name.length < 1 || data.name.length > config.MAX_NAME_LENGTH)) ? randomName() : data.name;
//				spawnPlayer(socket.id);
//			};
//		} catch(err) {
//			if (debug) {
//				throw err;
//			};
//		};
//	});
//});


//--------------------------------------


const uWS = require('uWebSockets.js');
const decode = (msg = []) => {
    const tmpMsg = msg;
    const buffer = Buffer.from(tmpMsg);
    const str = buffer.toString('utf-8');
    return JSON.parse(str);
};
const encode = (msg = {}) => {
    const strMsg = JSON.stringify(msg);
    const buffer = Buffer.from(strMsg, 'utf8');
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};
const msgTypeMap = {
    0: (ws, msg) => { // keypress
        const inputId = msg.key;
        const player =PLAYER_LIST[ws.id];
        (inputId < 4) && (!(2 === Math.abs(inputId - player.lastDirection)) && (player.direction = inputId));
        if ((inputId === 4) && player.hasQuasar && !player.usingQuasar) {
            player.usingQuasar = true;
            setTimeout(() => {
                player.usingQuasar = false;
                player.hasQuasar = false;
            }, 10000);
        };        
    },
    1: (ws) => { // ping
        // ws.send(JSON.stringify({t: 4}));
        ws.send(encode({t: 4}));
    },
    2: (ws, msg) => { // spawn
		try {
			if (!PLAYER_LIST[ws.id].inGame) {
                const name = msg.name;
                PLAYER_LIST[ws.id].name = ((name == undefined) || (name.length < 1 || name.length > config.MAX_NAME_LENGTH)) ? randomName() : name;
				spawnPlayer(ws.id);
			};
		} catch(err) {
			if (debug) {
				throw err;
			};
		};
    }
};
//const tmpApp = uWS.SSLApp({
//        cert_file_name: '/certs/spacesnake.askefc.net.crt',
//        key_file_name: '/certs/spacesnake.askefc.net.key'
//    })
const tmpApp = uWS.App()
    .ws('/*', {
        // config
        compression: 1,
        maxPayloadLength: 16 * 1024 * 1024,
        idleTimeout: 60,

        open: (ws, req) => {
            // this handler is called when a client opens a ws connection with the server
            // console.log('open', ws, req);
            ws.id = parseInt(Math.random().toString().substring(2), 10);
            SOCKET_LIST[ws.id] = ws;

            const player = Player(ws.id);
            PLAYER_LIST[ws.id] = player;

            ws.send(encode({
                t: 3,
                pId: ws.id,
                conf: config
            }));
            ws.subscribe('gamestate');
            console.log(colours.cyan('[Snake] Socket connection with id ' + ws.id));
        },
        
        ping: (ws) => {
            console.log('ping', ws);
        },
        pong: (ws) => {
            console.log('pong', ws);
        },
        drain: (ws) => {
            console.log('drain', ws);
        },

        message: (ws, message, isBinary) => {
            // console.log('message', ws, message, isBinary);
            // called when a client sends a message
            // const msg = JSON.parse(decoder.decode(message));
            const msg = decode(message);
            // console.log('msg', ws, msg, isBinary);
            msgTypeMap[msg.t](ws, msg);
        },

        close: (ws, code, message) => {
            // called when a ws connection is closed
            // console.log('close', ws, code, message);
            try {
                if (PLAYER_LIST[ws.id].inGame) {
                    --INVINCIBLE_FOOD_LIST.length;
                };
                delete PLAYER_LIST[ws.id];
                console.log(colours.cyan('[Snake] Player with id ' + ws.id + ' disconnected'));
                disconnectSocket(ws.id);
            } catch(err) {
                if (debug) {
                    throw err;
                };
            };
        }
    })
    .listen(1337, (listensocket) => {
        listensocket ?
            console.log(colours.cyan('[Snake] Websocket listening to port 1337')) :
            console.log(colours.cyan('[Snake] Websocket failed to listen to port 1337'));
});

//--------------------------------------

setInterval(() => {
    if (halfTime) {
        update();
    } else {
        update();
        if (FOOD_LIST.length < MAX_FOOD) {
            spawnFood();
        };
    };
    halfTime = !halfTime;
}, 1000 / (fps * 2));

console.log(colours.green('[Snake] Server started '));
if (debug) {
	console.log('Running in debug mode');
};
