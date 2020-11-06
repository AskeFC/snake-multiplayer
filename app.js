'use strict';

const express = require('express');
const app = module.exports = express();
const serv = require('http').Server(app);
const colors = require('colors/safe');

//---------- Server settings ----------
const fps = 5;
const MAX_FOOD = 1500;
const config = {
    MAX_NAME_LENGTH: 32,
    MAP_WIDTH: 500,
    MAP_HEIGHT: 500,
    BACKGROUND_ID: Math.floor(Math.random() * (12 - 1) + 1)
};

//-------------------------------------

const debug = typeof v8debug === 'object' || /--debug/.test(process.execArgv.join(' '));

console.log(colors.green('[Snake] Starting server...'));
app.use(express.urlencoded({extended: true}));
app.use(express.json());  
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.get('/', (req, res) => {
	res.render(__dirname + '/client/index.html', config);
});

app.use('/client', express.static(__dirname + '/client'));

const port = process.env.PORT || 80;
if (process.env.PORT == undefined) {
	console.log(colors.blue('[Snake] No port defined using default (80)'));
}

const io = require('socket.io')(serv, {});
serv.listen(port);

console.log(colors.green('[Snake] Socket started on port ' + port));

let SOCKET_LIST = {};
let PLAYER_LIST = {};
let FOOD_LIST = {};

const Food = (id, x, y) => {
	const self = {
		id: id,
		color: Math.floor(Math.random() * 360),
        type: Math.floor(Math.random() * 11) + 1,
		x: x,
		y: y
	};
	return self;
};

const spawnFood = () => {
	const id = Math.random();
	FOOD_LIST[id] = Food(id, Math.floor(Math.random() * (config.MAP_WIDTH - 4)) + 2, Math.floor(Math.random() * (config.MAP_WIDTH - 4)) + 2);
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
		name: 'Unnamed player',
		color: 0
	};

	self.spawn = () => {
		self.x = Math.floor(Math.random() * (config.MAP_WIDTH - 20)) + 10;
		self.y = Math.floor(Math.random() * (config.MAP_WIDTH - 20)) + 10;
		self.color = self.y = Math.floor(Math.random() * 360);
		self.direction = Math.floor(Math.random() * 4);
		self.score = 0;
		self.inGame = true;
	};

    self.deleteTail = () => {
		for (let i = self.tailBlocks.length; i > 0; --i) {
			--self.tailBlocks.length;
		};
	};

	self.die = () => {
		self.inGame = false;
		self.deleteTail();
		
		try {
			SOCKET_LIST[self.id].emit('death', {
				score:self.score
			});
		} catch(err) {
			if(debug) {
				console.log(err);
			};
		};
	};

	self.update = () => {
        self.tailBlocks = [Tail(self.x, self.y, self.id, self.color), ...self.tailBlocks];
		// self.tailBlocks.unshift(Tail(self.x, self.y, self.id, self.color));
		while (self.score + 2 < self.tailBlocks.length) {
			--self.tailBlocks.length;
		};
		switch (self.direction) {
			case 0:
				--self.y;
				break;
			case 1:
				++self.x;
				break;
			case 2:
				++self.y;
				break;
			case 3:
				--self.x;
				break;
			default:
				self.direction = 0;
				break;
		};
		self.lastDirection = self.direction;

		if (self.x <= 0 || self.x >= config.MAP_WIDTH || self.y <= 0 || self.y >= config.MAP_WIDTH) {
			self.die();
			return;
		};

		for (let p in PLAYER_LIST) {
			const player = PLAYER_LIST[p];
			for (let t in player.tailBlocks) {
				const pTail = player.tailBlocks[t];
				if (self.x === pTail.x && self.y === pTail.y) {
					self.die();
					player.score += (5+(self.score / 2));
					return;
				};
			};
		};

		for (let f in FOOD_LIST) {
			const food = FOOD_LIST[f];
			if (self.x === food.x && self.y === food.y) {
				delete FOOD_LIST[food.id];
				++self.score;
			};
		};
	};

	return self;
};

const Tail = (x, y, playerId, color) => {
	const self = {
		x: x,
		y: y,
		playerId: playerId,
		color: color
	};
	return self;
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
			player.update();
			if (!player.inGame) { // Player died
				continue;
			};
			playerPack[playerPack.length] = {
				id: player.id,
				x: player.x,
				y: player.y,
				name: player.name,
				score: player.score,
				color: player.color
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
            type: food.type,
			color: food.color
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

    io.emit('gamestate', {
        leaderboard: leaderboard,
        players: playerPack,
        playerTails: tailPack,
        food: foodPack
    });
};

const spawnPlayer = (id) => {
	try {
		PLAYER_LIST[id].spawn();
		SOCKET_LIST[id].emit('spawn', {x: PLAYER_LIST[id].x, y: PLAYER_LIST[id].y});
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
	SOCKET_LIST[id].disconnect();
	delete SOCKET_LIST[id];
};

io.on('connection', (socket) => {
	socket.id = Math.random();

	SOCKET_LIST[socket.id] = socket;
	const player = Player(socket.id);

	PLAYER_LIST[socket.id] = player;
	socket.emit('id', {
		id: socket.id
	});
	console.log(colors.cyan('[Snake] Socket connection with id ' + socket.id));

	socket.on('disconnect', () => {
		try {
			delete PLAYER_LIST[socket.id];
			console.log(colors.cyan('[Snake] Player with id ' + socket.id + ' disconnected'));
			disconnectSocket(socket.id);
		} catch(err) {
			if (debug) {
				throw err;
			};
		};
	});

	socket.on('ping2', () => {
		socket.emit('pong2');
	});

	socket.on('spawn', (data) => {
		try {
			if (!PLAYER_LIST[socket.id].inGame) {
				if (data.name != undefined) {
					if (!(data.name.length < 1 || data.name.length > config.MAX_NAME_LENGTH)) {
						PLAYER_LIST[socket.id].name = data.name;
					};
				};
				spawnPlayer(socket.id);
			};
		} catch(err) {
			if (debug) {
				throw err;
			};
		};
	});

	socket.on('keyPress', (data) => {
        const inputId = data.inputId;
        (!(2 === Math.abs(inputId - player.lastDirection)) && (player.direction = inputId));
	});
});

setInterval(() => {
	update();
	if (FOOD_LIST.length < MAX_FOOD) {
		spawnFood();
	};
}, 1000 / fps);

console.log(colors.green('[Snake] Server started '));
if (debug) {
	console.log('Running in debug mode');
};