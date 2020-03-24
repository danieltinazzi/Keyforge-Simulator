const initSocketEvents = function(socket) {

    socket.on('disconnect', function() {
        console.log('socket disconnected');
    });

    socket.on('newPlayer', function(deck, _deckNumber, _cardCount, isAlly, username) {
        if (isAlly) {
            allyDeckNumber = _deckNumber;
        }
        cardCount[deck] = _cardCount;
        addDeck(deck, null, null, _deckNumber, username);
    });

    socket.on('requestSynchronization', function(deck) {

        objects = {};
        for (const objectId in canvasObjects) {

            const canvasObject = canvasObjects[objectId];
            
            let object;
            if (canvasObject.token)
                object = canvasObject.toObject(['token', 'from']);
            else
                object = canvasObject.toObject(['card', 'expansion', 'number', 'from'])

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
            
            /*
            object.top = ratioToCoord(object.top, 'top');
            object.left = ratioToCoord(object.left, 'left');
            object.from[0] = ratioToCoord(object.from[0], 'top');
            object.from[1] = ratioToCoord(object.from[1], 'left');*/

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
                    img.number = object.number;
                    img.card = object.card;
                } else {
                    img.token = object.token;
                }
                adjustScale(img);

                objectCounter = objectId;
                canvasObjects[objectId] = img;
                canvas.add(img);
                addCardChild(objectId);
                img.setCoords();
            });
        }
        canvas.renderAll();
    });

    socket.on('objectPlayed', function(message) {
        /*
        message.object.top = ratioToCoord(message.object.top, 'top');
        message.object.left = ratioToCoord(message.object.left, 'left');
        message.object.from[0] = ratioToCoord(message.object.from[0], 'top');
        message.object.from[1] = ratioToCoord(message.object.from[1], 'left');*/
        if (message.object.token) {
            ratioToCoord(message.object, tokenScale);

        } else {
            ratioToCoord(message.object, cardScale);

            const deck = message.object.deck;
            updateCardCount(deck);
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
            } else {
                img.token = message.object.token;
            }
            adjustScale(img);
            const top = img.top;
            const left = img.left;
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
        img.expansion = card.set;
        img.number = card.number;
    });

}