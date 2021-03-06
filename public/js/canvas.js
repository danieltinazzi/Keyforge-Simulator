let deckNumber;
let deckNumbers;
let allyDeckNumber;
let numberOfPlayers;

let cardSize;
let cardScale;
let tokenScale;
let handHeight;
let grid;
let screenRatio;

let cardCountTexts;
let cardCount;

const decks = {};

function startCanvas(decks, deckNums, deckNum, _cardCount, allyDeckNum, usernames) {
    console.log(_cardCount);

    numberOfPlayers = 0;
    cardSize = window.innerHeight / 7;
    cardScale = cardSize / 420;
    tokenScale = cardScale * 3 / 2;
    handHeight = cardSize + cardSize / 4;
    grid = 10;
    screenRatio = 2;

    cardCountTexts = {};
    cardCount = _cardCount;
    deckNumber = deckNum;
    deckNumbers = deckNums;
    if (allyDeckNum !== null)
        allyDeckNumber = allyDeckNum;
    else
        allyDeckNumber = deckNum;
    
    initCanvas();
    addBackground();

    decks.forEach(function(deck) {
        addDeck(deck, null, null, deckNumbers[deck], usernames[deckNumbers[deck]]);
    });

    addTokens();
    listenCanvas();

    canvas.requestRenderAll();
}

function initCanvas() {
    const c = $('#canvas')[0];
    c.height = window.innerHeight;
    c.width = window.innerWidth;

    canvas = this.__canvas = new fabric.Canvas('canvas', {
        hoverCursor: 'pointer',
        hasControls: false,
        targetFindTolerance: 2,
        preserveObjectStacking: true
    });
}

function addBackground() {
    const rect1 = new fabric.Rect({
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight,
        fill: '#f6f6f6'
    });

    const rect2 = new fabric.Rect({
        left: window.innerWidth / 6,
        //left: cardScale * 300 + cardSize / 4,
        top: handHeight + 10,
        //width: window.innerWidth - cardScale * 300 * 2 - cardSize / 2,
        width: window.innerWidth * 2 / 3,
        height: 5,
        fill: '#cccccc'
    });
    const rect3 = new fabric.Rect({
        left: window.innerWidth / 6,
        //left: cardScale * 300 + cardSize / 4,
        top: window.innerHeight - (handHeight + 15),
        //width: window.innerWidth - cardScale * 300 * 2 - cardSize / 2,
        width: window.innerWidth * 2 / 3,
        height: 5,
        fill: '#cccccc'
    });

    const group = new fabric.Group([ rect1, rect2, rect3 ], { left: 0, top: 0 });
    canvas.setBackgroundImage(group);
    //canvas.setBackgroundImage(rect1);
}

function addTokens(token, top, left) {
    let tokens;
    let keys = [];
    if (token) {
        tokens = [token];
    } else {
        tokens = ['strength', 'enrage', 'protect', 'stun', 'amber', 'dmg1','dmg3','dmg5'];
        //tokens = ['amber','strength','dmg1','dmg3','dmg5','enrage','protect','stun'];
        keys = ['forged-blue','forged-yellow','forged-red'];
    }

    let i = 0;
    let j = 0;
    let k = 0;

    tokens.forEach((token, index) => {
        let top1, left1;

        if (!top) {
            console.log(i);
            top1 = (window.innerHeight / 2) - ((tokens.length / 2 - 1) * cardSize / 8) + i;
            left1 = cardSize / 4 + k;
        }
        
        fabric.Image.fromURL('img/tokens/' + token + '.png', function(img) {

            _addTokens(token, img, top, left, top1, left1);
        });
        i += cardSize / 4;

        if (index == Math.floor(tokens.length / 2) - 1) {
            i = 0;
            k = cardSize / 4;
        }
    });

    keys.forEach(token => {
        
        let top1, left1;
        if (!top) {
            top1 = (window.innerHeight / 2) - ((keys.length - 1) * cardSize / 5) + j;
            left1 = window.innerWidth - (cardSize / 10 * 3);
        }
        
        fabric.Image.fromURL('img/tokens/' + token + '.png', function(img) {

            _addTokens(token, img, top, left, top1, left1);
        });
        j += cardSize / 2.5;
    });
}

function _addTokens(token, img, top, left, _top, _left) {

    img.scale(cardScale * 3 / 2);

    img.token = token;
    img.tokenGenerator = true;
    if (left && top) {
        img.top = top;
        img.left = left;
    } else {
        img.left = _left;
        img.top = _top;
    }
    img.originX = 'center';
    img.originY = 'center';
    img.hasControls = img.hasBorders = false;
    canvas.add(img);
    canvas.sendToBack(img);
}

function listenCanvas() {
    let oldPosition;
    canvas.on({
        'mouse:down': function(options) {
            const evt = options.e;
            if (options.target) {
                oldPosition = [options.target.top, options.target.left];
            } else {
                this.isDragging = true;
                this.selection = false;
                this.lastPosX = evt.clientX;
                this.lastPosY = evt.clientY;
            }
        },
        'mouse:up': function(options) {
            this.isDragging = false;
            this.selection = true;
        },
        'mouse:move': function(options) {
            if (this.isDragging) {
                panViewport(options);
            }
        },
        'mouse:wheel': function(options) {
            zoomViewport(options);
        },
        'mouse:dblclick': function(options) {
            if (options.target && !options.target.shuffle) {
                if (options.target.token) {
                    socket.emit('tokenRemoved', options.target.id);
                    canvas.remove(options.target);
                    removeCardChild(options.target.id);
                } else {
                    const message = {
                        id: options.target.id,
                        cardAngle: options.target.angle
                    };
                    socket.emit('objectMoved', message);
                    tapCard(options.target);
                }
            }
        },
        'selection:updated': function(options) { // todo remove function
            objectClicked(options);
        },
        'selection:created': function(options) {
            objectClicked(options);
        },
        'object:moved': function(options) {
            checkDiscards(options.target);
            if (!options.target.id) {
                playObject(options.target);
            } else {
                moveObject(options.target);
            }
        },
        'object:moving': function(options) {
            const obj = options.target;
            if (obj.card && obj.childs) {
                for (let child of obj.childs) {
                    canvasObjects[child].top += (obj.top - oldPosition[0]);
                    canvasObjects[child].left += (obj.left - oldPosition[1]);
                }
                oldPosition = [obj.top, obj.left];
            }
        }
    });
}

function panViewport(options) {
    const e = options.e;
    const vpt = canvas.viewportTransform;
    const zoom = canvas.getZoom();
    vpt[4] += (e.clientX - canvas.lastPosX) * 2;
    vpt[5] += (e.clientY - canvas.lastPosY) * 2;
    canvas.lastPosX = e.clientX;
    canvas.lastPosY = e.clientY;

    if (vpt[4] >= 0) {
        vpt[4] = 0;
    } else if (vpt[4] < canvas.getWidth() - window.innerWidth * zoom) {
        vpt[4] = canvas.getWidth() - window.innerWidth * zoom;
    }

    if (vpt[5] >= 0) {
        vpt[5] = 0;
    } else if (vpt[5] < canvas.getHeight() - window.innerHeight * zoom) {
        vpt[5] = canvas.getHeight() - window.innerHeight * zoom;
    }
    canvas.zoomToPoint({x: vpt[4], y: vpt[1]}, zoom);
    canvas.calcOffset();
    canvas.requestRenderAll();
}

function zoomViewport(options) {
    const delta = options.e.deltaY * -1;
    let zoom = canvas.getZoom();
    zoom = zoom + (delta / 10 - delta / zoom / 14);

    if (zoom > 6) zoom = 6;
    if (zoom < 1) zoom = 1;
    canvas.zoomToPoint({ x: options.e.offsetX, y: options.e.offsetY }, zoom);
    options.e.preventDefault();
    options.e.stopPropagation();
    const vpt = canvas.viewportTransform;
    
    if (vpt[4] >= 0) {
        vpt[4] = 0;
    } else if (vpt[4] < canvas.getWidth() - window.innerWidth * zoom) {
        vpt[4] = canvas.getWidth() - window.innerWidth * zoom;
    }

    if (vpt[5] >= 0) {
        vpt[5] = 0;
    } else if (vpt[5] < canvas.getHeight() - window.innerHeight * zoom) {
        vpt[5] = canvas.getHeight() - window.innerHeight * zoom;
    }
    canvas.zoomToPoint({x: vpt[4], y: vpt[1]}, zoom);
    canvas.requestRenderAll();
    canvas.calcOffset();
}

function objectClicked(options) {

    if (options.target.shuffle || options.target.shuffle === 0) {
        const deckPosition = options.target.shuffle;

        const discards = [];
        canvas.forEachObject(function(obj) {
            if (deckPosition === obj.discard) {
                console.log(obj.cardId);
                discards.push(obj.cardId);
            }
        });
        console.log(discards);
        
        socket.emit('shuffleDiscards', deckPosition, discards);

    } else if (options.target.tokenGenerator) {

        const token = options.target;
        addTokens(token.token, token.top, token.left);
        token.from = [token.top,token.left];
        token.tokenGenerator = null;
        canvas.bringToFront(options.target);

    } else if (options.target.deck) {
        const deckCard = options.target;

        updateCardCount(deckCard.deck);
        if (cardCount[deckCard.deck] > 0) {
            addDeck(deckCard.deck, deckCard.top, deckCard.left);
        }
        socket.emit('draw', deckCard.deck);
        deckCard.from = [deckCard.top,deckCard.left];
        
        canvas.bringToFront(options.target);

    } else if (options.target.card) {
        canvas.bringToFront(options.target);
        
        if (options.target.childs) {
            for (let child of options.target.childs) {
                canvas.bringToFront(canvasObjects[child]);
            }
        }
    } else if (options.target.token) {
        canvas.bringToFront(options.target);
    }
}


// Called every time a card is drawed from the deck
let deckPosition;
let usernamePosition;
let discardPosition;
let shufflePosition;
function addDeck(deck, top, left, _deckNumber, username) {
    
    console.log('addDeck');
    if (cardCount[deck] < 1)
        return;
    
    fabric.Image.fromURL('img/cards/back.png', function(img) {
        img.deck = deck;
        img.card = true;
        img.scale(cardScale);
        if (left && top) {
            img.left = left;
            img.top = top;
        } else {
            numberOfPlayers += 1;
            if (!deckPosition) {
                initDeckPosition();
            }
            img.left = deckPosition[_deckNumber][0];
            img.top = deckPosition[_deckNumber][1];
            
            const originX = ['left', 'right'][_deckNumber < 2 ? 0 : 1];
            
            const usernameText = new fabric.Text(username, {
                left: usernamePosition[_deckNumber][0],
                top: usernamePosition[_deckNumber][1],
                fontFamily: 'sans-serif',
                originX: originX,
                evented: false,
                fontSize: 15
            });
            canvas.add(usernameText);

            cardCountTexts[deck] = new fabric.Text(cardCount[deck].toString(), {
                left: deckPosition[_deckNumber][0],
                top: deckPosition[_deckNumber][1],
                originX: 'center',
                originY: 'center',
                fontFamily: 'sans-serif',
                evented: false,
                fontSize: 30
            });
            canvas.add(cardCountTexts[deck]);

            fabric.Image.fromURL('img/shuffle.png', function(_img) {
                _img.left = shufflePosition[_deckNumber][0];
                _img.top = shufflePosition[_deckNumber][1];
                _img.originX = 'center';
                _img.originY = 'center';
                _img.scale(0.08);
                _img.shuffle = _deckNumber;
                _img.hasControls = _img.hasBorders = false;
                _img.lockMovementX = true;
                _img.lockMovementY = true;
                canvas.add(_img);
            });
            
            /*
            const shuffleText = new fabric.Text('Shuffle', {
                left: shufflePosition[_deckNumber][0],
                top: shufflePosition[_deckNumber][1],
                originX: 'center',
                originY: 'center',
                fontFamily: 'sans-serif',
                evented: false,
                fontSize: 15
            });
            canvas.add(shuffleText);
            */

            const discardsRect = new fabric.Rect({
                originX: 'center',
                originY: 'center',
                left: discardPosition[_deckNumber][0],
                top: discardPosition[_deckNumber][1],
                width: 300 * cardScale,
                height: 420 * cardScale,
                fill: '#cccccc'
            });
            const group = new fabric.Group([ canvas.backgroundImage, discardsRect ], { left: 0, top: 0 });
            canvas.setBackgroundImage(group);

        }
        img.originX = 'center';
        img.originY = 'center';
        img.hasControls = img.hasBorders = false;
        canvas.add(img);
        decks[deck] = img;
        canvas.sendToBack(img);
        canvas.requestRenderAll();
    });
}

function initDeckPosition(img) {

    const offset = cardSize / 8;
    const x = [ offset + 300 * cardScale / 2, window.innerWidth - (offset + 300 * cardScale / 2)];
    //const x = [ offset + 300 * cardScale / 2, window.innerHeight * screenRatio - (offset + 300 * cardScale / 2) ];
    const y = [ offset + 420 * cardScale / 2 + 15, window.innerHeight - (offset + 420 * cardScale / 2) - 15];
    deckPosition = [
        [ x[0], y[0] ], // top left
        [ x[0], y[1] ], // bottom left
        [ x[1], y[0] ], // top right
        [ x[1], y[1] ] // bottom right
    ];
    usernamePosition = [
        [ offset, 5 ], // top left
        [ offset, window.innerHeight - 25 ], // bottom left
        [ window.innerWidth - offset, 5 ], // top right
        [ window.innerWidth - offset, window.innerHeight - 25 ] // bottom right
    ];
    discardPosition = [
        [ x[0], y[0] + (420 * cardScale + offset * 2) ],
        [ x[0], y[1] - (420 * cardScale + offset * 2) ],
        [ x[1], y[0] + (420 * cardScale + offset * 2) ],
        [ x[1], y[1] - (420 * cardScale + offset * 2) ]
    ];
    /*
    shufflePosition = [
        [ x[0], y[0] + (420 * 3/2 * cardScale + offset * 3) ],
        [ x[0], y[1] - (420 * 3/2 * cardScale + offset * 3) ],
        [ x[1], y[0] + (420 * 3/2 * cardScale + offset * 3) ],
        [ x[1], y[1] - (420 * 3/2 * cardScale + offset * 3) ]
    ];
    */
   shufflePosition = [
        [ x[0], y[0] + (420 * 1/2 * cardScale + offset) ],
        [ x[0], y[1] - (420 * 1/2 * cardScale + offset) ],
        [ x[1], y[0] + (420 * 1/2 * cardScale + offset) ],
        [ x[1], y[1] - (420 * 1/2 * cardScale + offset) ]
    ];
}

function tapCard(card) {
    canvas.bringToFront(card);
    if (card.childs) {
        for (let child of card.childs) {
            obj = canvasObjects[child];
            offset = [card.top - obj.top, card.left - obj.left];
            if (card.angle == 0) {
                obj.top = card.top - offset[1];
                obj.left = card.left  + offset[0];
            } else {
                obj.top = card.top + offset[1];
                obj.left = card.left - offset[0];
            }
            obj.setCoords();
            canvas.bringToFront(obj);
        }
    }
    if (card.angle == 0) {
        card.rotate(90);
    } else {
        card.rotate(0);
    }
    card.setCoords();
    canvas.requestRenderAll();
}

function playObject(object) {
    let message;
    addObject(object);
    if (object.token) {
        // Token played
        message = {
            id: object.id,
            object: object.toObject(['token', 'from'])
        };
        addCardChild(object.id);
    } else {
        // Card played
        message = {
            id: object.id,
            object: object.toObject(['deck', 'card', 'cardId', 'expansion', 'number', 'from', 'discard'])
        };
        object.deck = null;
    }

    coordToRatio(message.object, object.scaleX);
    socket.emit('objectPlayed', message);
    ratioToCoord(message.object, object.scaleX);

    updateCardImage(object, object.scaleX);
}

function moveObject(object) {

    coordToRatio(object, object.scaleX);
    console.log(object.discard);

    let message = {
        id: object.id,
        top: object.top,
        left: object.left,
        width: object.width,
        discard: object.discard
    };
    ratioToCoord(object, object.scaleX);
    object.setCoords();

    socket.emit('objectMoved', message);

    if (object.card) {
        updateCardImage(object);
        if (object.childs) {
            for (let child of object.childs) {
                moveObject(canvasObjects[child]);
            };
        }
    } else if (object.token) {
        addCardChild(object.id);
    }
}

function addCardChild(child) {
    canvas.forEachObject(function(obj) {
        if (obj.id !== child && obj.card) {
            if (!obj.childs)
                obj.childs = new Set();
            if (canvasObjects[child].intersectsWithObject(obj)) {
                obj.childs.add(child);
            } else {
                obj.childs.delete(child);
            }
        }
    });
}

function synchCardChild(card) {
    card.childs = new Set();
    canvas.forEachObject(function(obj) {
        if (obj.token && obj.intersectsWithObject(card)) {
            card.childs.add(obj);
            canvas.bringToFront(obj);
        }
    });
}

function removeCardChild(child) {
    canvas.forEachObject(function(obj) {
        if (obj.id !== child && obj.card) {
            if (obj.childs) {
                obj.childs.delete(child);
            }
        }
    });
}

function updateCardImage(card) {
    let src;
    const img = canvasObjects[card.id];
    if (!img.token) {
        if (inOpponentHand(img.top, img.left))
            src = 'img/cards/back.png';
        else
            src = 'img/cards/' + img.expansion + '/' + img.number + '.png';
        if (!img.getSrc().includes(src)) {
            img.setSrc(src, function() {
                canvas.requestRenderAll();
            });
        }
    }
}

function addObject(object) {
    objectCounter += 1;
    object.id = objectCounter;
    canvasObjects[objectCounter] = object; // todo usare array canvas
}

function inOpponentHand(top) {

    if (!deckPosition) {
        initDeckPosition();
    }

    let i = 0;
    let result = false;
    deckPosition.forEach(function(deck) {

        if (i != deckNumber && i != allyDeckNumber && i < numberOfPlayers) {
            if (deck[1] < window.innerHeight / 2) {
                result = result || top - deck[1] < handHeight / 2;
            } else {
                result = result || deck[1] - top < handHeight / 2;
            }
        }
        i += 1;
    });
    return result;
}

function animateObject(object, top, left) {
    let completed = false;
    object.animate('top', top, { duration: 200, onChange: canvas.renderAll.bind(canvas),
        onComplete: function() {
            if (completed && object.token) {
                completed = false;
                addCardChild(object.id);
            }
            completed = true;
        },
    });
    object.animate('left',  left, { duration: 200, onChange: canvas.renderAll.bind(canvas),
        onComplete: function() {
            if (completed && object.token) {
                completed = false;
                addCardChild(object.id);
            }
            completed = true;
        },
    });
}

function adjustScale(object) {
    if (object.card) {
        object.scale(cardScale);
    } else if (object.token) {
        object.scale(tokenScale);
    }
}

function coordToRatio(object, objectScale) {
    const width = object.width * objectScale;

    object.top = object.top / window.innerHeight;
    object.left = (object.left - (width / 2)) / (window.innerWidth - width);

    if (object.from) {
        object.from[0] = object.from[0] / window.innerHeight;
        object.from[1] = (object.from[1] - (width / 2)) / (window.innerWidth - width);
    }
}

function ratioToCoord(object, objectScale) {
    const width = object.width * objectScale;

    object.top = object.top * window.innerHeight;
    object.left = object.left * (window.innerWidth - width) + (width / 2);

    if (object.from) {
        object.from[0] = object.from[0] * window.innerHeight;
        object.from[1] = object.from[1] * (window.innerWidth - width) + (width / 2);
    }
}

function updateCardCount(deck) {
    
    if (cardCount[deck] > 0) {
        cardCount[deck] -= 1;
    }
    if (cardCount[deck] < 1) {
        cardCountTexts[deck].set('text', '');
    } else {
        cardCountTexts[deck].set('text', cardCount[deck].toString());
    }
}

function checkDiscards(object) {

    if (!discardPosition) {
        initDeckPosition();
    }

    const top = object.top;
    const left = object.left;

    let i = 0;
    const range = cardScale * 200;

    object.discard = null;
    discardPosition.forEach(function(discard) {

        if (Math.abs(discard[0] - left) < range && Math.abs(discard[1] - top) < range) {

            object.left = discard[0];
            object.top = discard[1];
            object.setCoords();
            object.discard = i;
            return;
        }
        i += 1;
    });
}

function shuffleDiscards(_deckPosition, count) {

    const discards = [];
    canvas.forEachObject(function(obj) {
        if (_deckPosition === obj.discard) {
            discards.push(obj);
            delete canvasObjects[obj.id];
            canvas.remove(obj);
        }
    });
    let deckId;
    
    for (const id of Object.keys(deckNumbers)) {
        if (deckNumbers[id] === _deckPosition) {
            deckId = id;
            break;
        }
    }

    const oldCount = cardCount[deckId];
    cardCount[deckId] = count;
    cardCountTexts[deckId].set('text', '' + count);

    if (oldCount == 0)
        addDeck(deckId, deckPosition[_deckPosition][1], deckPosition[_deckPosition][0]);
    canvas.renderAll();
}