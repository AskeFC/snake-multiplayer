'use strict';

const gameFiles = {
    '/client/manifest.json': 'application/json',
    '/client/css/game.css': 'text/css',
    '/client/js/floatingText.min.js': 'text/javascript',
    '/client/js/game.js': 'text/javascript',
    '/client/img/sprite/FoodType0.png': 'image/png',
    '/client/img/sprite/FoodType1.png': 'image/png',
    '/client/img/sprite/FoodType2.png': 'image/png',
    '/client/img/sprite/FoodType3.png': 'image/png',
    '/client/img/sprite/FoodType4.png': 'image/png',
    '/client/img/sprite/FoodType5.png': 'image/png',
    '/client/img/sprite/FoodType6.png': 'image/png',
    '/client/img/sprite/FoodType7.png': 'image/png',
    '/client/img/sprite/FoodType8.png': 'image/png',
    '/client/img/sprite/FoodType9.png': 'image/png',
    '/client/img/sprite/FoodType10.png': 'image/png',
    '/client/img/sprite/FoodType11.png': 'image/png',
    '/client/img/sprite/FoodType12.png': 'image/png',
    '/client/img/game/uiButtons.png': 'image/png'
};

//---------- Required modules and Initialising----------
const http2 = require('http2');
const fs = require('fs');
const ocsp = require('ocsp');

const express = require('express');
const app = module.exports = express();
const serv = require('http').Server(app);

const environment = process.env;
const prod = ('prod' === environment.NODE_ENV);

// const io = require('socket.io')(serv, {});
const colours = require('colors/safe');
const { uniqueNamesGenerator, adjectives, animals, colors, countries, names, starWars } = require('unique-names-generator');
 
const {
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_METHOD,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2.constants;

const certs = (prod) ? {
    key: fs.readFileSync(environment.MY_CERT_KEY, 'utf8'),
    cert: fs.readFileSync(environment.MY_CERT, 'utf8')
} : {};

const server = http2.createSecureServer(certs);
const ocspCache = new ocsp.Cache();

//---------- Server settings ----------
const fps = 3;
let halfTime = false;
const MAX_FOOD = 700;
const config = {
    MAX_NAME_LENGTH: 32,
    MAP_WIDTH: 250,
    MAP_HEIGHT: 250,
    PIXEL_SIZE: 14,
    CAMERA_SPEED: 0.50
};
const dictionaries = [adjectives, animals, colors, countries, names, starWars];

//---------- Server startup ----------
const port = environment.PORT || 80;
const debug = typeof v8debug === 'object' || /--debug/.test(process.execArgv.join(' '));

console.log(colours.green('[SpaceSnake] Starting server...'));
if (prod) {
    const respondToStreamError = (err, stream) => {
        console.log(colours.red(err));
        if ((err.code === 'NGHTTP2_REFUSED_STREAM') || (err.code === 'NGHTTP2_PROTOCOL_ERROR')) {
            return;
        };
        stream.respond({ ":status": (err.code === 'ENOENT') ? HTTP_STATUS_NOT_FOUND : HTTP_STATUS_INTERNAL_SERVER_ERROR});
        stream.end();
    };

    const pushFile = (stream, file, mime) => {
        stream.pushStream({ ':path': '/client' + file }, { exclusive: false, parent: stream }, (err, pushStream, headers) => {
            if (err) { return console.error(err); };

            pushStream.on('error', (err) => {
                respondToStreamError(err, pushStream);
            });
            if (!pushStream.destroyed) {
                pushStream.respondWithFile(__dirname + file, {
                    'content-type': mime
                }, {
                    onError: (err) => {
                        respondToStreamError(err, pushStream);
                    }
                });
            };
        });
    };

    server.on('error', (err) => console.error(colours.red(err)));

    server.on('OCSPRequest', (cert, issuer, callback) => {
        ocsp.getOCSPURI(cert, (err, uri) => {
            if (err) { return callback(err); };
            const req = ocsp.request.generate(cert, issuer);
            const options = {
                url: uri,
                ocsp: req.data
            };
            ocspCache.request(req.id, options, callback);
        });
    });

    server.on('stream', (stream, headers) => {
        const reqPath = headers[HTTP2_HEADER_PATH];
        const reqMethod = headers[HTTP2_HEADER_METHOD];

        if ('/' === reqPath) {
            stream.respondWithFile(__dirname + '/client/index.html', {
                'content-type': 'text/html'
            }, {
                onError: (err) => {
                    respondToStreamError(err, stream);
                }
            });
            const tmpFileArray = Object.entries(gameFiles);
            for (let i = 0, iEnd = tmpFileArray.length; i < iEnd; ++i) {
                const curItem = tmpFileArray[i];
                pushFile(stream, curItem[0], curItem[1]);
            };
        };

        const reqFile = gameFiles[reqPath] || null;
        if (reqFile) {
            stream.respondWithFile(__dirname + reqPath, {
                'content-type': reqFile
            }, {
                onError: (err) => {
                    respondToStreamError(err, stream);
                }
            });
        };

    });

    server.listen(port);
    console.log(colours.green('[SpaceSnake] Https started on port ' + port));
} else {
    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/client/index.html');
    });
    app.use('/client', express.static(__dirname + '/client'));

    serv.listen(port);
    console.log(colours.green('[SpaceSnake] Http started on port ' + port));
};


//---------- Game variables ----------
let SOCKET_LIST = {};
let PLAYER_LIST = [];
let FOOD_LIST = [];
let INVINCIBLE_FOOD_LIST = {};

const randomId = () => {
    return parseInt(Math.random().toString().substring(2), 10);
};

const randomName = () => {
    const amount = ((Math.random() * 3) + 1) | 0;
    return uniqueNamesGenerator({
        dictionaries: [...(() => {
            let tmpDict = [];
            for (let i = amount; i > -1; (tmpDict[i] = dictionaries[(dictionaries.length * Math.random()) | 0]), --i) {};
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
	const id = randomId();
    const tmpCoords = randomCoordsOnGrid();
	FOOD_LIST[id] = Food(id, tmpCoords.x, tmpCoords.y, type || null);
};
const spawnInvincibleFood = () => {
	const id = randomId();
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
			}), true, true);
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

        if (self.invincible) {
            return;
        };

        for (let i = PLAYER_LIST.length - 1; i > -1; --i) {
            const player = PLAYER_LIST[i];
            for (let c = player.tailBlocks.length -1; c > -1; --c) {
                const pTail = player.tailBlocks[c];
                if ((self.x === pTail.x) && (self.y === pTail.y)) {
                    self.die();
                    player.score += (5 + (self.score / 2));
                    return;
                };
            };
        };

        for (let f in FOOD_LIST) {
            const food = FOOD_LIST[f];
            (self.x === food.x && self.y === food.y) && (() => {
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
            })();
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

        if (!player.inGame) { // Player died
            continue;
        };
        ((!halfTime) && (player.update())) || ((halfTime && player.usingQuasar) && (player.update()));
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
        for (let i = player.tailBlocks.length -1; i > -1; --i) {
            const tail = player.tailBlocks[i];
            tailPack[tailPack.length] = {
                x: tail.x,
                y: tail.y,
                color: tail.color
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

    wsApp.publish('gamestate', encode({
        t: 0,
        leaderboard: leaderboard,
        players: playerPack,
        playerTails: tailPack,
        food: foodPack
    }), true, true);
//    wsApp.publish('gamestate', JSON.stringify({
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
        }), true, true);
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
		if (PLAYER_LIST[id] !== undefíned) {
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

process.env['ALIEN_UWS'] = 1;
const uWS = require('uWebSockets.js');
const decode = (msg = []) => {
    const tmpMsg = msg;
    const decoder = new TextDecoder('utf8');
    const str = decoder.decode(tmpMsg);
    return JSON.parse(str);
};
const encode = (msg = {}) => {
    const strMsg = JSON.stringify(msg);
    const encoder = new TextEncoder();
    return encoder.encode(strMsg);
};
const msgTypeMap = {
    0: (ws, msg) => { // keypress
        const inputId = msg.key;
        const player = PLAYER_LIST[ws.id];
        (inputId < 4) && (!(2 === Math.abs(inputId - player.lastDirection)) && (player.direction = inputId));
        (((inputId === 4) && player.hasQuasar && !player.usingQuasar) && (() => {
            player.usingQuasar = true;
            setTimeout(() => {
                player.usingQuasar = false;
                player.hasQuasar = false;
            }, 10000);
        })());
    },
    1: (ws) => { // ping
        // ws.send(JSON.stringify({t: 4}));
        ws.send(encode({t: 4}), true, true);
    },
    2: (ws, msg) => { // spawn
		try {
			if (PLAYER_LIST[ws.id].inGame) {
                return;
			};
            const name = msg.name;
            PLAYER_LIST[ws.id].name = ((name === undefined) || (name.length < 1 || name.length > config.MAX_NAME_LENGTH)) ? randomName() : name;
            spawnPlayer(ws.id);
		} catch(err) {
			if (debug) {
				throw err;
			};
		};
    }
};

//let wsApp = null;
//if (prod) {
//    wsApp = uWS.SSLApp({
//        cert_file_name: environment.MY_CERT,
//        key_file_name: environment.MY_CERT_KEY
//    });
//} else {
//    wsApp = uWS.App();
//};
const wsApp = uWS[prod ? "SSLApp" : "App"]({...(prod ? {
    cert_file_name: environment.MY_CERT,
    key_file_name: environment.MY_CERT_KEY
} : {})});
wsApp.ws('/ws', {
    // config
    compression: 0,
    maxPayloadLength: 128 * 1024 * 1024,
    idleTimeout: 360,

    upgrade: (res, req, context) => {
        console.log('An Http connection wants to become WebSocket, URL: ' + req.getUrl() + '!');

        /* This immediately calls open handler, you must not use res after this call */
        res.upgrade({
                url: req.getUrl()
            },
            /* Spell these correctly */
            req.getHeader('sec-websocket-key'),
            req.getHeader('sec-websocket-protocol'),
            req.getHeader('sec-websocket-extensions'),
            context
        );
    },

    open: (ws, req) => {
        // this handler is called when a client opens a ws connection with the server
        // console.log('open', ws, req);
        ws.id = randomId();
        SOCKET_LIST[ws.id] = ws;

        const player = Player(ws.id);
        PLAYER_LIST[ws.id] = player;

        ws.send(encode({
            t: 3,
            pId: ws.id,
            conf: config
        }), true, true);
        ws.subscribe('gamestate');
        console.log(colours.cyan('[SpaceSnake] Socket connection with id ' + ws.id));
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
            if (PLAYER_LIST[ws.id].inGame && !(PLAYER_LIST.length > INVINCIBLE_FOOD_LIST.length)) {
                --INVINCIBLE_FOOD_LIST.length;
            };
            delete PLAYER_LIST[ws.id];
            console.log(colours.cyan('[SpaceSnake] Player with id ' + ws.id + ' disconnected'));
            disconnectSocket(ws.id);
        } catch(err) {
            if (debug) {
                throw err;
            };
        };
    }
})
.listen(8443, (listensocket) => {
    listensocket ?
        console.log(colours.cyan('[SpaceSnake] Websocket listening to port 8443')) :
        console.log(colours.cyan('[SpaceSnake] Websocket failed to listen to port 8443'));
});

//--------------------------------------

setInterval(() => {
    update();
    (!halfTime) && (Object.keys(FOOD_LIST).length < MAX_FOOD) && spawnFood();
    halfTime = !halfTime;
}, 1000 / (fps * 2));

console.log(colours.green('[SpaceSnake] Server started '));
if (debug) {
	console.log('Running in debug mode');
};
