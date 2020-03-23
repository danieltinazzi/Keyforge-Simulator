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

function startCanvas(decks, deckNums, deckNum, allyDeckNum, usernames) {

    console.log(usernames);
    numberOfPlayers = 0;
    cardSize = window.innerHeight / 7;
    cardScale = cardSize / 420;
    tokenScale = cardScale * 3 / 2;
    handHeight = cardSize + cardSize / 4;
    grid = 10;
    screenRatio = 2;

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
    //c.width = window.innerHeight * screenRatio;

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
        //width: window.innerHeight * screenRatio,
        width: window.innerWidth,
        height: window.innerHeight,
        fill: '#f6f6f6'
    });
    const rect2 = new fabric.Rect({
        left: 0,
        top: 0,
        //width: window.innerHeight * screenRatio,
        width: window.innerWidth,
        height: handHeight,
        fill: '#cccccc'
    });
    const rect3 = new fabric.Rect({
        left: 0,
        top: window.innerHeight - handHeight,
        //width: window.innerHeight * screenRatio,
        width: window.innerWidth,
        height: handHeight,
        fill: '#cccccc'
    });
    var group = new fabric.Group([ rect1, rect2, rect3 ], { left: 0, top: 0 });
    canvas.setBackgroundImage(group);
}

function addTokens(token, top, left) {
    let tokens;
    if (token) {
        tokens = [token];
    } else {
        tokens = ['amber','strength','dmg1','dmg3','dmg5','enrage','protect','stun'];
    }

    let i = 0;
    tokens.forEach(token => {
        let _top;
        if (!top)
            _top = (window.innerHeight / 2) - ((tokens.length - 1) * cardSize / 8) + i;
        fabric.Image.fromURL('img/tokens/' + token + '.png', function(img) {
            img.scale(cardScale * 3 / 2);
            img.token = token;
            img.tokenGenerator = true;
            img.top = top;
            if (left && top) {
                img.left = left;
            } else {
                img.left = cardSize / 4;
                img.top = _top;
            }
            img.originX = 'center';
            img.originY = 'center';
            img.hasControls = img.hasBorders = false;
            canvas.add(img);
            canvas.sendToBack(img);
        });
        i += cardSize / 4;
    });
}

function listenCanvas() {
    let oldPosition;
    canvas.on({
        'mouse:down': function(options) {
            var evt = options.e;
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
            if (options.target) {
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
    var e = options.e;
    var vpt = canvas.viewportTransform;
    var zoom = canvas.getZoom();
    vpt[4] += e.clientX - canvas.lastPosX;
    vpt[5] += e.clientY - canvas.lastPosY;
    canvas.lastPosX = e.clientX;
    canvas.lastPosY = e.clientY;

    if (vpt[4] >= 0) {
        vpt[4] = 0;
    } else if (vpt[4] < canvas.getWidth() - window.innerWidth * zoom) {
        vpt[4] = canvas.getWidth() - window.innerWidth * zoom;
    }

    /*
    if (vpt[4] >= 0) {
        vpt[4] = 0;
    } else if (vpt[4] < canvas.getWidth() - window.innerHeight * screenRatio * zoom) {
        if (canvas.getWidth() - window.innerHeight * screenRatio * zoom < 0)
            vpt[4] = canvas.getWidth() - window.innerHeight * screenRatio * zoom;
        else
            vpt[4] = 0;
    }
    */

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
    var delta = options.e.deltaY * -1;
    var zoom = canvas.getZoom();
    zoom = zoom + (delta / 10 - delta / zoom / 14);
    //zoom = zoom + delta / 20;
    if (zoom > 6) zoom = 6;
    if (zoom < 1) zoom = 1;
    canvas.zoomToPoint({ x: options.e.offsetX, y: options.e.offsetY }, zoom);
    options.e.preventDefault();
    options.e.stopPropagation();
    var vpt = canvas.viewportTransform;
    
    if (vpt[4] >= 0) {
        vpt[4] = 0;
    } else if (vpt[4] < canvas.getWidth() - window.innerWidth * zoom) {
        vpt[4] = canvas.getWidth() - window.innerWidth * zoom;
    }

    /*
    if (vpt[4] >= 0) {
        vpt[4] = 0;
    } else if (vpt[4] < canvas.getWidth() - window.innerHeight * screenRatio * zoom) {
        if (canvas.getWidth() - window.innerHeight * screenRatio * zoom < 0)
            vpt[4] = canvas.getWidth() - window.innerHeight * screenRatio * zoom;
        else
            vpt[4] = 0;
    }
    */

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
    if (options.target.tokenGenerator) {
        const token = options.target;
        addTokens(token.token, token.top, token.left);
        token.from = [token.top,token.left];
        token.tokenGenerator = null;
        canvas.bringToFront(options.target);

    } else if (options.target.deck) {
        const deckCard = options.target;
        addDeck(deckCard.deck, deckCard.top, deckCard.left);
        socket.emit('draw', deckCard.deck);
        deckCard.from = [deckCard.top,deckCard.left];
        deckCard.deck = null;
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
function addDeck(deck, top, left, _deckNumber, username) {
    
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
            
            /*
            const textbox = new fabric.Textbox(username, {
                left: img.left,
                top: img.top,
                evented: false,
                width: 150,
                fontSize: 16
            });
            canvas.add(textbox);
            */

        }
        img.originX = 'center';
        img.originY = 'center';
        img.hasControls = img.hasBorders = false;
        canvas.add(img);
        canvas.sendToBack(img);
        canvas.requestRenderAll();
    });
}

function initDeckPosition(img) {

    const offset = cardSize / 8;
    const x = [ offset + 300 * cardScale / 2, window.innerWidth - (offset + 300 * cardScale / 2) ];
    //const x = [ offset + 300 * cardScale / 2, window.innerHeight * screenRatio - (offset + 300 * cardScale / 2) ];
    const y = [ offset + 420 * cardScale / 2, window.innerHeight - (offset + 420 * cardScale / 2) ];
    deckPosition = [
        [ x[0], y[0] ], // top left
        [ x[0], y[1] ], // bottom left
        [ x[1], y[0] ], // top right
        [ x[1], y[1] ] // bottom right
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
            object: object.toObject(['card', 'expansion', 'number', 'from'])
        };
    }
    /*
    message.object.top = coordToRatio(message.object.top, 'top');
    message.object.left = coordToRatio(message.object.left, 'left');
    message.object.from[0] = coordToRatio(message.object.from[0], 'top');
    message.object.from[1] = coordToRatio(message.object.from[1], 'left');
    */

    coordToRatio(message.object, object.scaleX);
    socket.emit('objectPlayed', message);
    ratioToCoord(message.object, object.scaleX);

    updateCardImage(object, object.scaleX);
}

function moveObject(object) {

    coordToRatio(object, object.scaleX);
    /*
    let message = {
        objectId: object.id,
        objectTop: coordToRatio(object.top, 'top'),
        objectLeft: coordToRatio(object.left, 'left')
    };*/
    let message = {
        id: object.id,
        top: object.top,
        left: object.left,
        width: object.width
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

function inOpponentHand(top, left) {
    console.log(deckNumber);
    console.log(allyDeckNumber);

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

/*
function coordToRatio(x, coord) {
    const cardWidth = cardSize * 5 / 7;
    console.log(cardSize);
    if (coord === 'top')
        return x / window.innerHeight;
    else
        //return (x / window.innerWidth) * window.innerHeight * screenRatio
        return (x - cardWidth / 2) / (window.innerWidth - cardWidth);
}

function ratioToCoord(x, coord) {
    const cardWidth = cardSize * 5 / 7;
    console.log(cardSize);
    if (coord === 'top')
        return x * window.innerHeight;
    else
        //return (x / (window.innerHeight * screenRatio)) * window.innerWidth;
        return x * (window.innerWidth - cardWidth) + (cardWidth / 2);
}
*/

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