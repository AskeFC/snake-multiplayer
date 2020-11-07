'use strict';

const ratioPixelSize = PIXEL_SIZE * window.devicePixelRatio;
// const adjustedWidth = Math.floor(ratioPixelSize * MAP_WIDTH);
// const adjustedHeight = Math.floor(ratioPixelSize * MAP_HEIGHT);

const socket = io();

let PLAYER_ID = -1;
let WORLD_SCALE = 1.0;
let STARS = [];

let backgroundImage;
let game;
let grid;
let cameraFollow;

let map;
let food;
let tails;
let players;
let names;

let toolKeys;
let wasdKeys;
let arrowKeys;
let powerKeys;

let elements = {};

/* Server ping */
let startTime;

setInterval(() => {
  startTime = Date.now();
  socket.emit('ping2');
}, 2000);

socket.on('pong2', () => {
	let latency = Date.now() - startTime;
    const fast = (latency < 100);
    elements.pingBadge.classList.remove((fast ? 'badge-danger' : 'badge-success'));
    elements.pingBadge.classList.add((fast ? 'badge-success' : 'badge-danger'));
	elements.serverPing.textContent = latency;
});

const emitKeyPress = (inputId) => {
    socket.emit('keyPress', {
        inputId: inputId,
        state: true
    });
};

/* Init game engine*/
const preload = () => {
//	game.load.image('background0', '/client/img/background/background.png');
//	game.load.image('background1', '/client/img/background/basic_stars.png');
//	game.load.image('background2', '/client/img/background/star1.jpg');
//	game.load.image('background3', '/client/img/background/star2.jpg');
//	game.load.image('background4', '/client/img/background/star3.jpg');
//	game.load.image('background5', '/client/img/background/star4.jpg');
//	game.load.image('background6', '/client/img/background/star5.jpg');
//	game.load.image('background7', '/client/img/background/star6.jpg');
//	game.load.image('background8', '/client/img/background/star7.jpg');
//	game.load.image('background9', '/client/img/background/star8.jpg');
//	game.load.image('background10', '/client/img/background/star9.jpg');
//	game.load.image('background11', '/client/img/background/star10.jpg');
//	game.load.image('background12', '/client/img/background/star11.jpg');
	game.load.image('FoodType0', '/client/img/sprite/FoodType0.png');
	game.load.image('FoodType1', '/client/img/sprite/FoodType1.png');
	game.load.image('FoodType2', '/client/img/sprite/FoodType2.png');
	game.load.image('FoodType3', '/client/img/sprite/FoodType3.png');
	game.load.image('FoodType4', '/client/img/sprite/FoodType4.png');
	game.load.image('FoodType5', '/client/img/sprite/FoodType5.png');
	game.load.image('FoodType6', '/client/img/sprite/FoodType6.png');
	game.load.image('FoodType7', '/client/img/sprite/FoodType7.png');
	game.load.image('FoodType8', '/client/img/sprite/FoodType8.png');
	game.load.image('FoodType9', '/client/img/sprite/FoodType9.png');
	game.load.image('FoodType10', '/client/img/sprite/FoodType10.png');
	game.load.image('FoodType11', '/client/img/sprite/FoodType11.png');
	game.load.image('FoodType12', '/client/img/sprite/FoodType12.png');
};

const create = () => {
    game.stage.smoothed = false;
    game.stage.backgroundColor = "#000";
    game.world.scale.setTo(WORLD_SCALE, WORLD_SCALE);
    game.world.setBounds(0, 0, MAP_WIDTH * PIXEL_SIZE, MAP_HEIGHT * PIXEL_SIZE);

	game.scale.parentIsWindow = false;

    map = game.add.group();
	food = game.add.group();
	tails = game.add.group();
	players = game.add.group();
	names = game.add.group();
    game.world.sendToBack(map);
    game.world.bringToTop(food);
    game.world.bringToTop(tails);
    game.world.bringToTop(players);
    game.world.bringToTop(names);

	// backgroundSprite = game.add.tileSprite(0, 0, MAP_WIDTH * ratioPixelSize, MAP_HEIGHT * ratioPixelSize, 'background1');
    // backgroundSprite.alpha = 1;
    game.create.grid('grid', MAP_WIDTH * ratioPixelSize, MAP_HEIGHT * ratioPixelSize, ratioPixelSize, ratioPixelSize, 'rgba(255,255,255,0.2)', true, () => {
        grid = game.add.image(0, 0, 'grid', 0);
        map.add(grid);
    });

	game.camera.x = game.world.centerX;
	game.camera.y = game.world.centerY;
	game.camera.roundPx = false;
	cameraFollow = game.add.sprite(game.world.centerX, game.world.centerY);
	game.camera.follow(cameraFollow, Phaser.Camera.FOLLOW_LOCKON, (CAMERA_SPEED / PIXEL_SIZE), (CAMERA_SPEED / PIXEL_SIZE));

	let g = game.add.graphics(0, 0);

	g.beginFill(0xFF0000, 0.5);
	g.drawRect(0, 0, MAP_WIDTH * PIXEL_SIZE, PIXEL_SIZE);
	g.drawRect(0, 0, PIXEL_SIZE, MAP_HEIGHT * PIXEL_SIZE);

	g.drawRect(0, (MAP_HEIGHT - 1) * PIXEL_SIZE, MAP_WIDTH * PIXEL_SIZE, MAP_HEIGHT * PIXEL_SIZE);
	g.drawRect((MAP_WIDTH - 1) * PIXEL_SIZE, 0, (MAP_HEIGHT) * PIXEL_SIZE, MAP_HEIGHT * PIXEL_SIZE);
	g.endFill();
    map.add(g);

    for (let i = STARS.length - 1; i > -1; --i) {
        const tmpItem = STARS[i];
        const s = game.add.graphics(0, 0);
        s.beginFill(0xFFFFFF, tmpItem.b);
        s.drawCircle(tmpItem.x, tmpItem.y, tmpItem.d);
        s.endFill();
        map.add(s);
    };

    toolKeys = game.input.keyboard.addKeys({
        g: Phaser.Keyboard.G,
        minus: Phaser.Keyboard.MINUS,
        plus: Phaser.Keyboard.PLUS,
        numpadMinus: Phaser.Keyboard.NUMPAD_SUBTRACT,
        numpadPlus: Phaser.Keyboard.NUMPAD_ADD
    });
    toolKeys.g.onDown.add(() => { grid.visible = !grid.visible; });
    toolKeys.minus.onDown.add(() => { WORLD_SCALE -= 0.1; game.world.scale.setTo(WORLD_SCALE, WORLD_SCALE); });
    toolKeys.plus.onDown.add(() => { WORLD_SCALE += 0.1; game.world.scale.setTo(WORLD_SCALE, WORLD_SCALE); });
    toolKeys.numpadMinus.onDown.add(() => { WORLD_SCALE -= 0.1; game.world.scale.setTo(WORLD_SCALE, WORLD_SCALE); });
    toolKeys.numpadPlus.onDown.add(() => { WORLD_SCALE += 0.1; game.world.scale.setTo(WORLD_SCALE, WORLD_SCALE); });

    arrowKeys = game.input.keyboard.addKeys({
        up: Phaser.Keyboard.UP,
        down: Phaser.Keyboard.DOWN,
        left: Phaser.Keyboard.LEFT,
        right: Phaser.Keyboard.RIGHT
    });
    wasdKeys = game.input.keyboard.addKeys({
        up: Phaser.Keyboard.W,
        down: Phaser.Keyboard.S,
        left: Phaser.Keyboard.A,
        right: Phaser.Keyboard.D
    });
// Directions: 0 = up (-y), 1 = right (+x), 2 = down = (+y), 3 = left (-x)
    arrowKeys.up.onDown.add(() => { emitKeyPress(0); });
    arrowKeys.down.onDown.add(() => { emitKeyPress(2); });
    arrowKeys.left.onDown.add(() => { emitKeyPress(3); });
    arrowKeys.right.onDown.add(() => { emitKeyPress(1); });
    wasdKeys.up.onDown.add(() => { emitKeyPress(0); });
    wasdKeys.down.onDown.add(() => { emitKeyPress(2); });
    wasdKeys.left.onDown.add(() => { emitKeyPress(3); });
    wasdKeys.right.onDown.add(() => { emitKeyPress(1); });

    powerKeys = game.input.keyboard.addKeys({
        shift: Phaser.Keyboard.SHIFT
    });
    powerKeys.shift.onDown.add(() => { emitKeyPress(4); });
};

const update = () => {
    game.input.enabled = (game.input.activePointer.withinGame && (document.activeElement !== elements.name));
};

/* Socket events */
socket.on('id', (data) => {
	PLAYER_ID = data.id;
    STARS = data.stars;
	console.log('Your id is ' + PLAYER_ID);
});

socket.on('death', (data) => {
	elements.totalScore.textContent = data.score;
	elements.finalScore.style.display = 'block';
	elements.menu.style.display = 'block';
    setTimeout(() => {
        elements.menu.classList.remove('fadeOut', 'ms500');
        elements.playerInfo.classList.remove('fadeIn', 'ms500');
        elements.menu.classList.add('fadeIn', 'ms1000');
        elements.playerInfo.classList.add('fadeOut', 'ms1000');
        setTimeout(() => { elements.playerInfo.style.display = 'none'; }, 1000);
		elements.btnPlay.focus();
	}, 1000);
});

socket.on('spawn', (data) => {
    elements.menu.classList.remove('fadeIn', 'ms1000');
    elements.playerInfo.classList.remove('fadeOut', 'ms1000');
    elements.menu.classList.add('ms500', 'fadeOut');
    setTimeout(() => { elements.menu.style.display = 'none'; }, 500);
    elements.playerInfo.classList.add('ms500', 'fadeIn');
    elements.playerInfo.style.display = 'inline-block';
	try {
		game.camera.follow(null, Phaser.Camera.FOLLOW_LOCKON, 1, 1);
		game.camera.x = data.x * PIXEL_SIZE;
		game.camera.y = data.y * PIXEL_SIZE;
		game.camera.follow(cameraFollow, Phaser.Camera.FOLLOW_LOCKON, (CAMERA_SPEED / PIXEL_SIZE), (CAMERA_SPEED / PIXEL_SIZE));
	} catch(err) {
		console.log(err);
	};
});

socket.on('gamestate', (data) => {
    if (players == undefined || tails == undefined || food == undefined || names == undefined) {
		console.log('Waiting for engine to start...');
		return;
	};

    let leaderboardcontent = '';
	while (data.leaderboard.length > 0) {
		const entry = data.leaderboard.pop();
		leaderboardcontent += '<div class="lb-entry ' + ((entry.id === PLAYER_ID) ? 'lb-entry-self' : '') + '">' + (entry.place + 1) + ': ' + encodeHTML(entry.name) + '</div>';
	};

	elements.leaderboardContent.innerHTML = leaderboardcontent;

	food.removeAll();
	for (let i = data.food.length - 1; i > -1; --i) {
		const foodData = data.food[i];
		const g = game.add.sprite((foodData.x * PIXEL_SIZE) - 1, (foodData.y * PIXEL_SIZE) - 1, 'FoodType' + foodData.type);
        g.width = ratioPixelSize + 4;
        g.height = ratioPixelSize + 4;
        food.add(g);
	};

	tails.removeAll();
	for (let i = data.playerTails.length - 1; i > -1; --i) {
		const tail = data.playerTails[i];
		const g = game.add.graphics(tail.x * PIXEL_SIZE, tail.y * PIXEL_SIZE);
		g.beginFill(hslToHex(tail.color, 100, 25), 1);
		g.drawRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);
		g.endFill();
        tails.add(g);
	};

	players.removeAll();
	names.removeAll();
	for (let i = data.players.length - 1; i > -1; --i) {
		const player = data.players[i];
		const g = game.add.graphics(player.x* PIXEL_SIZE, player.y * PIXEL_SIZE);

		if (player.id === PLAYER_ID) {
			cameraFollow.x = (player.x * PIXEL_SIZE);
			cameraFollow.y = (player.y * PIXEL_SIZE);
			elements.playerScore.textContent = player.score;
			elements.position.textContent = "X: " + player.x + " Y: " + player.y;
		};

		g.beginFill(hslToHex(player.color, 100, 50), 1);
		g.drawRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);
		g.endFill();
        players.add(g);

		const t = game.add.text(player.x * PIXEL_SIZE, (player.y * PIXEL_SIZE) - 10, player.name, {fill: '#FFF', fontSize: '16px', stroke: '#000', strokeThickness: 1});
		t.anchor.setTo(0.5);
        t.smoothed = false;
        t.resolution = window.devicePixelRatio;
        if (player.invincible) {
            t.setStyle({
                fontSize: '20px',
                fill: 'rgba(255,243,0,1)',
                stroke: 'rgba(255,0,0,0.8)',
                strokeThickness: 9
            });
        };
        names.add(t);
	};
});

/* Functions */
const encodeHTML = (s) => {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
};

const componentToHex = (c) => {
	const hex = c.toString(16);
	return hex.length === 1 ? '0' + hex : hex;
};

const hslToHex = (h,s,l) => {
	const rgb = Phaser.Color.HSLtoRGB(h / 360, s / 100, l / 100);
	return '0x'+componentToHex(rgb.r) + componentToHex(rgb.g) + componentToHex(rgb.b);
};

const rgbToHex = (r, g, b) => {
	return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

const play = () => {
	socket.emit('spawn', {name: elements.name.value});
};

/* Load */
document.addEventListener('DOMContentLoaded', () => {
    elements = {
        playerInfo: document.querySelector('#player-info'),
        playerScore: document.querySelector('#player-score'),
        finalScore: document.querySelector('#final-score'),
        totalScore: document.querySelector('#total-score'),
        btnPlay: document.querySelector('#btn_play'),
        form: document.querySelector('form'),
        name: document.querySelector('#name'),
        menu: document.querySelector('#menu'),
        position: document.querySelector('#position'),
        leaderboardContent: document.querySelector('#leaderboard-content'),
        serverPing: document.querySelector('#server-ping'),
        pingBadge: document.querySelector('#ping-badge'),
        snakeGame: document.querySelector("#snake-game")
    };

	elements.finalScore.style.display = 'none';
	elements.name.focus();

    elements.btnPlay.addEventListener('click', () => {
		play();
	}, {capture: true, once: false, passive: true});

	elements.form.addEventListener('submit',(e) => {
		e.preventDefault();
		play();
	}, {capture: true, once: false, passive: false});

    elements.name.addEventListener('change', () => {
        window.localStorage.setItem('MultiplayerSnake-name', elements.name.value);
    }, {capture: true, once: false, passive: true});

	game = new Phaser.Game({
        width: elements.snakeGame.clientWidth,
        height: elements.snakeGame.clientHeight,
        renderer: Phaser.CANVAS,
        parent: elements.snakeGame,
        transparent: false,
        antialias: false,
        multiTexture: false,
        backgroundColor: 'rgba(0,0,0,1)',
        clearBeforeRender: true,
        crisp: true,
        enableDebug: false,
        fullScreenScaleMode: Phaser.ScaleManager.RESIZE,
        resolution: window.devicePixelRatio,
        roundPixels: true,
        scaleMode: Phaser.ScaleManager.RESIZE,
        state: {
            preload: preload,
            create: create,
            update: update
        }
    });

	try {
        let name = window.localStorage.getItem('MultiplayerSnake-name');
		if (name && name.length > 0 && name.length <= 32) {
			console.log('Loaded name from localStorage: ' + name);
			elements.name.value = name;
		};
	} catch(err) {
		console.log(err);
	};
});