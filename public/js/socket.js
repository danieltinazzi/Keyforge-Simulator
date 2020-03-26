const initSocketEvents = function(socket) {

    socket.on('disconnect', function() {
        console.log('socket disconnected');
    });

    socket.on('newPlayer', function(deck, _deckNumber, _cardCount, isAlly, username) {
        if (isAlly) {
            allyDeckNumber = _deckNumber;
        }
        deckNumbers[deck] = _deckNumber;
        cardCount[deck] = _cardCount;
        addDeck(deck, null, null, _deckNumber, username);
    });

    socket.on('requestSynchronization', function(deck) {

        objects = {};
        for (const objectId in canvasObjects) {

            const canvasObject = canvasObjects[objectId];

            if (canvasObject.deck)
                break;
            
            let object;
            if (canvasObject.token)
                object = canvasObject.toObject(['token', 'from']);
            else
                object = canvasObject.toObject(['cardId', 'card', 'expansion', 'number', 'from', 'discard'])

            //object.top = coordToRatio(object.top, 'top');
            //object.left = coordToRatio(object.left, 'left');
            console.log(object.scaleX);
            coordToRatio(object, object.scaleX);
            object.from = [ object.top, object.left ];

            objects[objectId] = object;
            
        }

        socket.emit('synchronizeObjects', deck, objects);
    });

    socket.on('synchronizeObjects', function(objects) {

        for (const objectId in objects) {

            const object = objects[objectId];
            
            if (object.token) {
                ratioToCoord(object, tokenScale);
    
            } else {
                ratioToCoord(object, cardScale);

                if (inOpponentHand(object.top, object.left))
                    object.src = 'img/cards/back.png';
                else
                    object.src = 'img/cards/' + object.expansion + '/' + object.number + '.png';
            }

            fabric.Image.fromObject(object, function(img) {
                img.id = objectId;
                img.hasControls = img.hasBorders = false;
                if (!object.token) {
                    img.expansion = object.expansion;
                    img.cardId = object.cardId;
                    img.number = object.number;
                    img.card = object.card;

                    if (object.discard !== null) {
                        img.discard = object.discard;
                        if (!discardPosition) {
                            initDeckPosition();
                        }
                        img.left = discardPosition[object.discard][0];
                        img.top = discardPosition[object.discard][1];
                    }
                } else {
                    img.token = object.token;
                }
                adjustScale(img);

                objectCounter = objectId;
                canvasObjects[objectId] = img;
                canvas.add(img);
                if (object.token) {
                    addCardChild(objectId);
                    canvas.bringToFront(img);
                } else {
                    synchCardChild(img);
                }
                img.setCoords();
                canvas.requestRenderAll();
            });
        }
        //canvas.renderAll();
    });

    socket.on('objectPlayed', function(message) {
        
        if (message.object.token) {
            ratioToCoord(message.object, tokenScale);

        } else {
            ratioToCoord(message.object, cardScale);

            const deck = message.object.deck;
            updateCardCount(deck);
            if (cardCount[deck] < 1) {
                canvas.remove(decks[deck]);
            }
            message.object.deck = null;

            if (inOpponentHand(message.object.top, message.object.left))
                message.object.src = 'img/cards/back.png';
            else
                message.object.src = 'img/cards/' + message.object.expansion + '/' + message.object.number + '.png';
        }

        fabric.Image.fromObject(message.object, function(img) {
            img.id = message.id;
            img.hasControls = img.hasBorders = false;
            if (!message.object.token) {
                img.expansion = message.object.expansion;
                img.number = message.object.number;
                img.card = message.object.card;
                img.cardId = message.object.cardId;
            } else {
                img.token = message.object.token;
            }
            adjustScale(img);
            let top = img.top;
            let left = img.left;

            if (!img.token && message.object.discard !== null) {
                img.discard = message.object.discard;
                if (!discardPosition) {
                    initDeckPosition();
                }
                left = discardPosition[message.object.discard][0];
                top = discardPosition[message.object.discard][1];
            }

            img.top = message.object.from[0];
            img.left = message.object.from[1];

            objectCounter = message.id;
            canvasObjects[message.id] = img;
            canvas.add(img);
            animateObject(img, top, left);
            img.setCoords();
        });
    });

    socket.on('objectMoved', function(message) {
        /*
        message.objectTop = ratioToCoord(message.objectTop, 'top');
        message.objectLeft = ratioToCoord(message.objectLeft, 'left');*/

        const object = canvasObjects[message.id];
        ratioToCoord(message, object.scaleX);
        if (message.cardAngle !== undefined) {
            object.angle = message.cardAngle;
            tapCard(object);
        }
        if (message.top && message.left) {
            
            object.discard = null;
            
            if (!object.token && message.discard !== null) {
                object.discard = message.discard;
                if (!discardPosition) {
                    initDeckPosition();
                }
                message.left = discardPosition[message.discard][0];
                message.top = discardPosition[message.discard][1];
            }

            animateObject(object, message.top, message.left);
            
            if (!object.tokenGenerator && !object.token) { // todo use updateCardImage
                let src;
                if (inOpponentHand(message.top, message.left))
                    src = 'img/cards/back.png';
                else
                    src = 'img/cards/' + object.expansion + '/' + object.number + '.png';
                
                if (!object.getSrc().includes(src)) {
                    object.setSrc(src);
                    canvas.renderAll();
                }
            }
            canvas.bringToFront(object);
        }
    });

    socket.on('tokenRemoved', function(token) {
        canvas.remove(canvasObjects[token]);
        removeCardChild(token);
    });

    socket.on('cardDrawed', function(card) { // todo remove?
        const img = canvas.getActiveObject();
        //const src = 'img/cards/' + card.set + '/' + card.number + '.png';
        console.log(card.id);
        img.cardId = card.id;
        img.expansion = card.set;
        img.number = card.number;
    });

    socket.on('shuffleDiscards', function(deckPosition, count) {
        shuffleDiscards(deckPosition, count);
    });

}