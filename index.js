if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {

        let aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () { },
            fBound = function () {
                return fToBind.apply(this instanceof fNOP && oThis
                    ? this
                    : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        return fBound;
    };
}

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['sea-battle'], factory);
    } else {
        root.Battleship = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    function Battleship(zoneGameId) {
        this.gameFieldBorderX = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        this.gameFieldBorderY = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
        this.zoneGame = document.getElementById(zoneGameId);
        this.zoneGame.innerHTML = "";
        this.shipsConfiguration = [
            { maxShips: 1, pointCount: 4 },
            { maxShips: 2, pointCount: 3 },
            { maxShips: 3, pointCount: 2 },
            { maxShips: 4, pointCount: 1 }
        ];
        this.userName = null;
        this.pcName = null;
        this.pcDelay = 800;

        this._blowForWin = 0;
        for (let i = 0; i < this.shipsConfiguration.length; i++) {
            this._blowForWin = +this._blowForWin + (this.shipsConfiguration[i].maxShips * this.shipsConfiguration[i].pointCount);
        }

        this._pcShipsMap = null;
        this._userShipsMap = null;
        this._gameStopped = false;

        this.CELL_WITH_SHIP = 1;
        this.CELL_EMPTY = 0;


        this.pcInfo = null;
        this.userInfo = null;
        this.toolbar = null;
        this.startGameButton = null;
        this.pcGameField = null;
        this.userGameField = null;
    }

    Battleship.prototype = {

        run: function () {
            this.createToolbar();
            this.createGameFields();
            this.createFooter();
        },
        createToolbar: function () {
            this.toolbar = document.createElement('div');
            this.toolbar.setAttribute('class', 'toolbar');
            this.zoneGame.appendChild(this.toolbar);
        },
        createGameFields: function () {
            let pczoneGame = document.createElement('div');
            pczoneGame.setAttribute('class', 'pczoneGame');
            this.zoneGame.appendChild(pczoneGame);

            let userzoneGame = document.createElement('div');
            userzoneGame.setAttribute('class', 'userzoneGame');
            this.zoneGame.appendChild(userzoneGame);

            this.pcInfo = document.createElement('div');
            pczoneGame.appendChild(this.pcInfo);

            this.userInfo = document.createElement('div');
            userzoneGame.appendChild(this.userInfo);

            this.pcGameField = document.createElement('div');
            this.pcGameField.setAttribute('class', 'gameField');
            this.userGameField = document.createElement('div');
            this.userGameField.setAttribute('class', 'gameField');
            pczoneGame.appendChild(this.pcGameField);
            userzoneGame.appendChild(this.userGameField);
        },
        createFooter: function () {
            let footer = document.createElement('div');
            footer.setAttribute('class', 'footer');

            this.startGameButton = document.createElement('button');
            this.startGameButton.innerHTML = 'S T A R T';
            this.startGameButton.setAttribute('class', 'btn');
            this.startGameButton.onclick = function () {
                this.startNewGame();
            }.bind(this);
            footer.appendChild(this.startGameButton);

            this.zoneGame.appendChild(footer);
        },
        startNewGame: function () {
            this.userName = this.userName || prompt('What is your name?', '');
            this.pcName = this.pcName || prompt('What is the opponents name?', '');

            if (!this.userName || !this.pcName) {
                alert('Incorrect name!');
                return;
            }

            this.startGameButton.innerHTML = 'Play again...';
            this.pcInfo.innerHTML = this.pcName + ' (opponent)';
            this.userInfo.innerHTML = this.userName + ' (you)';

            this._pcShipsMap = this.generateRandomShipMap();
            this._userShipsMap = this.generateRandomShipMap();
            this._pcShotMap = this.generateShotMap();
            this._userHits = 0;
            this._pcHits = 0;
            this._blockHeight = null;
            this._gameStopped = false;
            this._pcGoing = false;

            this.drawGamePoints();
            this.updateToolbar();
        },


        drawGamePoints: function () {
            for (let yPoint = 0; yPoint < this.gameFieldBorderY.length; yPoint++) {
                for (let xPoint = 0; xPoint < this.gameFieldBorderX.length; xPoint++) {
                    let pcPointBlock = this.getOrCreatePointBlock(yPoint, xPoint);
                    pcPointBlock.onclick = function (e) {
                        this.userFire(e);
                    }.bind(this);

                    let userPointBlock = this.getOrCreatePointBlock(yPoint, xPoint, 'user');
                    if (this._userShipsMap[yPoint][xPoint] === this.CELL_WITH_SHIP) {
                        userPointBlock.setAttribute('class', 'ship');
                    }
                }
            }
        },


        _blockHeight: null,

        getOrCreatePointBlock: function (yPoint, xPoint, type) {
            let id = this.getPointBlockIdByCoords(yPoint, xPoint, type);
            let block = document.getElementById(id);
            if (block) {
                block.innerHTML = '';
                block.setAttribute('class', '');
            } else {
                block = document.createElement('div');
                block.setAttribute('id', id);
                block.setAttribute('data-x', xPoint);
                block.setAttribute('data-y', yPoint);
                if (type && type === 'user') {
                    this.userGameField.appendChild(block);
                } else {
                    this.pcGameField.appendChild(block);
                }
            }
            block.style.width = (100 / this.gameFieldBorderY.length) + '%';
            if (!this._blockHeight) {
                this._blockHeight = block.clientWidth;
            }
            block.style.height = this._blockHeight + 'px';
            block.style.lineHeight = this._blockHeight + 'px';
            block.style.fontSize = this._blockHeight + 'px';
            return block;
        },


        getPointBlockIdByCoords: function (yPoint, xPoint, type) {
            if (type && type === 'user') {
                return 'user_x' + xPoint + '_y' + yPoint;
            }
            return 'pc_x' + xPoint + '_y' + yPoint;
        },


        generateShotMap: function () {
            let map = [];
            for (let yPoint = 0; yPoint < this.gameFieldBorderY.length; yPoint++) {
                for (let xPoint = 0; xPoint < this.gameFieldBorderX.length; xPoint++) {
                    map.push({ y: yPoint, x: xPoint });
                }
            }
            return map;
        },


        generateRandomShipMap: function () {
            let map = [];
            for (let yPoint = -1; yPoint < (this.gameFieldBorderY.length + 1); yPoint++) {
                for (let xPoint = -1; xPoint < (this.gameFieldBorderX.length + 1); xPoint++) {
                    if (!map[yPoint]) {
                        map[yPoint] = [];
                    }
                    map[yPoint][xPoint] = this.CELL_EMPTY;
                }
            }


            let shipsConfiguration = JSON.parse(JSON.stringify(this.shipsConfiguration));
            let allShipsPlaced = false;
            while (allShipsPlaced === false) {
                let xPoint = this.getRandomInt(0, this.gameFieldBorderX.length);
                let yPoint = this.getRandomInt(0, this.gameFieldBorderY.length);
                if (this.isPointFree(map, xPoint, yPoint) === true) {
                    if (this.canPutHorizontal(map, xPoint, yPoint, shipsConfiguration[0].pointCount, this.gameFieldBorderX.length)) {
                        for (let i = 0; i < shipsConfiguration[0].pointCount; i++) {
                            map[yPoint][xPoint + i] = this.CELL_WITH_SHIP;
                        }
                    } else if (this.canPutVertical(map, xPoint, yPoint, shipsConfiguration[0].pointCount, this.gameFieldBorderY.length)) {
                        for (let i = 0; i < shipsConfiguration[0].pointCount; i++) {
                            map[yPoint + i][xPoint] = this.CELL_WITH_SHIP;
                        }
                    } else {
                        continue;
                    }


                    shipsConfiguration[0].maxShips--;
                    if (shipsConfiguration[0].maxShips < 1) {
                        shipsConfiguration.splice(0, 1);
                    }
                    if (shipsConfiguration.length === 0) {
                        allShipsPlaced = true;
                    }
                }
            }
            return map;
        },
        getRandomInt: function (min, max) {
            return Math.floor(Math.random() * (max - min)) + min;
        },

        isPointFree: function (map, xPoint, yPoint) {

            if (map[yPoint][xPoint] === this.CELL_EMPTY
                && map[yPoint - 1][xPoint] === this.CELL_EMPTY
                && map[yPoint - 1][xPoint + 1] === this.CELL_EMPTY
                && map[yPoint][xPoint + 1] === this.CELL_EMPTY
                && map[yPoint + 1][xPoint + 1] === this.CELL_EMPTY
                && map[yPoint + 1][xPoint] === this.CELL_EMPTY
                && map[yPoint + 1][xPoint - 1] === this.CELL_EMPTY
                && map[yPoint][xPoint - 1] === this.CELL_EMPTY
                && map[yPoint - 1][xPoint - 1] === this.CELL_EMPTY
            ) {
                return true;
            }
            return false;
        },

        canPutHorizontal: function (map, xPoint, yPoint, shipLength, coordLength) {
            let freePoints = 0;
            for (let x = xPoint; x < coordLength; x++) {

                if (map[yPoint][x] === this.CELL_EMPTY
                    && map[yPoint - 1][x] === this.CELL_EMPTY
                    && map[yPoint - 1][x + 1] === this.CELL_EMPTY
                    && map[yPoint][x + 1] === this.CELL_EMPTY
                    && map[yPoint + 1][x + 1] === this.CELL_EMPTY
                    && map[yPoint + 1][x] === this.CELL_EMPTY
                ) {
                    freePoints++;
                } else {
                    break;
                }
            }
            return freePoints >= shipLength;
        },


        canPutVertical: function (map, xPoint, yPoint, shipLength, coordLength) {
            let freePoints = 0;
            for (let y = yPoint; y < coordLength; y++) {

                if (map[y][xPoint] === this.CELL_EMPTY
                    && map[y + 1][xPoint] === this.CELL_EMPTY
                    && map[y + 1][xPoint + 1] === this.CELL_EMPTY
                    && map[y + 1][xPoint] === this.CELL_EMPTY
                    && map[y][xPoint - 1] === this.CELL_EMPTY
                    && map[y - 1][xPoint - 1] === this.CELL_EMPTY
                ) {
                    freePoints++;
                } else {
                    break;
                }
            }
            return freePoints >= shipLength;
        },


        userFire: function (event) {
            if (this.stopToGame() || this.isPCGoing()) {
                return;
            }
            let e = event || window.event;
            let firedEl = e.target || e.srcElement;
            let x = firedEl.getAttribute('data-x');
            let y = firedEl.getAttribute('data-y');
            if (this._pcShipsMap[y][x] === this.CELL_EMPTY) {
                firedEl.innerHTML = this.getFireFailTemplate();
                this.prepareToPcFire();
            } else {
                firedEl.innerHTML = this.getFireSuccessTemplate();
                firedEl.setAttribute('class', 'ship');
                this._userHits++;
                this.updateToolbar();
                if (this._userHits >= this._blowForWin) {
                    this.stopGame();
                }
            }
            firedEl.onclick = null;
        },
        _pcGoing: false,
        isPCGoing: function () {
            return this._pcGoing;
        },


        prepareToPcFire: function () {
            this._pcGoing = true;
            this.updateToolbar();
            setTimeout(function () {
                this.pcFire();
            }.bind(this), this.pcDelay);
        },


        pcFire: function () {
            if (this.stopToGame()) {
                return;
            }

            let randomShotIndex = this.getRandomInt(0, this._pcShotMap.length);
            let randomShot = JSON.parse(JSON.stringify(this._pcShotMap[randomShotIndex]));

            this._pcShotMap.splice(randomShotIndex, 1);

            let firedEl = document.getElementById(this.getPointBlockIdByCoords(randomShot.y, randomShot.x, 'user'));
            if (this._userShipsMap[randomShot.y][randomShot.x] === this.CELL_EMPTY) {
                firedEl.innerHTML = this.getFireFailTemplate();
            } else {
                firedEl.innerHTML = this.getFireSuccessTemplate();
                this._pcHits++;
                this.updateToolbar();
                if (this._pcHits >= this._blowForWin) {
                    this.stopGame();
                } else {
                    this.prepareToPcFire();
                }
            }
            this._pcGoing = false;
            this.updateToolbar();
        },

        stopGame: function () {
            this._gameStopped = true;
            this._pcGoing = false;
            this.startGameButton.innerHTML = 'try again';
            this.updateToolbar();
        },
        stopToGame: function () {
            return this._gameStopped;
        },
        getFireSuccessTemplate: function () {
            return '&#10060;';
        },
        getFireFailTemplate: function () {
            return '&#183;';
        },


        updateToolbar: function () {
            this.toolbar.innerHTML = 'Point - ' + this._userHits + ':' + this._pcHits;
            if (this.stopToGame()) {
                if (this._userHits >= this._blowForWin) {
                    this.toolbar.innerHTML += ', you are win';
                } else {
                    this.toolbar.innerHTML += ', your opponent won';
                }
            } else if (this.isPCGoing()) {
                this.toolbar.innerHTML += ', opponents move';
            } else {
                this.toolbar.innerHTML += ',  your turn';
            }
        },
    };

    return Battleship;
}));
