const express = require('express');
const app = express();
const path = require('path');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fetch = require('node-fetch');

const Deck = require('./deck');
const Room = require('./room');

/*
* rooms = { roomName: { 'name': roomName, 'key': roomKey, 'players': { socketId: deckId }, 'decks': { deckId: deckObj } } }
* users = { socketId: { 'deck': deckObj, 'room': roomId, 'createdRooms': [roomId ...] } }
*/
const rooms = {};
const users = {};

app.engine('html', require('ejs').renderFile);
app.use(express.static(path.join(__dirname, 'public')));

// Lobby page
app.get('/', function(req, res) {
    res.render('index.html');
});

// Game page
app.get('/:room', function(req, res) {
    if (req.params.room in rooms) {
        res.render('play.html', {
            room: req.params.room,
            teamPlay: rooms[req.params.room].teamPlay
        });
    } else {
        res.redirect('/');
    }
});


io.on('connection', function(socket){

    users[socket.id] = {
        room: null,
        deck: null,
        createdRooms: []
    };

    // Called from the lobby
    socket.on('getRoomList', callback => {

        callback(Room.serializeRooms(rooms));
    });

    // Called when a user create a new game
    socket.on('createRoom', (roomName, roomKey, maxPlayers, teamPlay, callback) => {

        if (roomName in rooms) {
            callback(false);

        } else {
            rooms[roomName] = new Room(roomName, roomKey, maxPlayers, teamPlay);
            users[socket.id].createdRooms.push(roomName);
            callback(true, Room.serializeRooms(rooms));
        }
    });

    // Called when a user join in a game
    socket.on('joinRoom', function(username, roomName, roomKey, deckId, team, callback) {

        if (!(roomName in rooms)) {
            callback({ success: false, message: 'The game room requested does not exist.' });
            return;
        }

        if (!username) {
            callback({ success: false, message: 'Invalid username.' });
            return;
        }

        if (rooms[roomName].key !== roomKey) {
            callback({ success: false, message: 'Wrong password.' });
            return;
        }

        const room = rooms[roomName];
        room.started = true;
        let playerReplaced = false;
        
        if (username in room.usernames && Array.from(room.players.values()).includes(room.usernames[username])) {

            callback({ success: false, message: 'Username already taken.' });
            return;
        }

        // Replace a disconnected player when a user joins with the same username or the same deck
        if (username in room.usernames && !Array.from(room.players.values()).includes(room.usernames[username])) {

            const _deckId = room.usernames[username];
            const parsedDeck = room.decks.get(_deckId);
            deckId = _deckId;

            users[socket.id].deck = parsedDeck;

            room.players.set(socket.id, _deckId);
            playerReplaced = true;

        } else if (room.decks.has(deckId) && !Array.from(room.players.values()).includes(deckId)) {

            const parsedDeck = room.decks.get(deckId);
            users[socket.id].deck = parsedDeck;

            room.players.set(socket.id, deckId);
            playerReplaced = true;
        }

        const playerNumber = rooms[roomName].players.size;
        const maxPlayers = rooms[roomName].maxPlayers;

        if (!(playerNumber < maxPlayers || (playerNumber <= maxPlayers && playerReplaced))) {

            callback({ success: false, message: 'Room has reached the maximum number of players.' });
            return;
        }

        users[socket.id].room = roomName;
        const api = 'https://www.keyforgegame.com/api/decks/';

        // If the user replaced a previously disconnected user
        if (playerReplaced) {

            console.log('players:');
            console.log(room.players);
            console.log('deck:');
            console.log(deckId);

            // Send the decks to the new player
            const decks = Array.from(room.players.values());
            const deckNumber = rooms[roomName].getDeckNumber(deckId);
            console.log('deckNumber: ');
            console.log(deckNumber);

            const ally = room.getAlly(deckId);
            let allyNumber = null;
            if (ally !== null) {
                //allyNumber = Array.from(room.decks.keys()).indexOf(ally);
                allyNumber = room.getDeckNumber(ally);
            }

            room.usernames[username] = deckId;
            const usernamePositions = rooms[roomName].getUsernamePositions();

            const cardCount = {};
            for (const id of room.decks.keys()) {
                cardCount[id] = room.decks.get(id).size();
            }

            callback({ success: true, message: {
                decks: decks,
                deckNumbers: room.positions,
                deckNumber: deckNumber,
                cardCount: cardCount,
                allyNumber : allyNumber,
                usernames: usernamePositions
            } });

            // Request a synchronization to one player
            for (const player of room.players.keys()) {

                if (player !== socket.id) {
                    const playerSocket = io.sockets.sockets[player];
                    playerSocket.emit('requestSynchronization', deckId);
                    break;
                }
            }

        } else if (deckId === '') {

            fetch(api)
            .then(res => res.json())
            .then(json => {

                // Select random deck
                const n = Math.floor(Math.random() * (json.count + 1));
                const deckUrl = api + '?page=' + n + '&page_size=1&links=cards';
                sendDeck(socket, deckUrl, team, username, callback);
            });

        } else {
            // Retrieve the selected deck
            const deckUrl = api + deckId + '/?links=cards';
            sendDeck(socket, deckUrl, team, username, callback);
        }
    });

    socket.on('disconnect', function() {
        
        const user = users[socket.id];

        // Remove the user room if it is empty
        if (user.room) {

            const room = rooms[user.room];
            room.players.delete(socket.id);

            if (room.players.size === 0)
                delete rooms[user.room];
        }
        
        // Remove every empty room created by the user
        for (const roomName of users[socket.id].createdRooms) {
            
            if (rooms[roomName].players.size === 0 && rooms[roomName].started) {
                delete rooms[roomName];
            }
        }

        delete users[socket.id];
    });

    // Send the status of the game to the users that joined in later
    socket.on('synchronizeObjects', function(deckId, objects) {
        const roomName = users[socket.id].room;
        const players = rooms[roomName].players;

        let userId;

        for (const player of players.keys()) {
            if (players.get(player) === deckId) {
                userId = player;
            }
        }
        console.log(userId);

        const playerSocket = io.sockets.sockets[userId];
        playerSocket.emit('synchronizeObjects', objects);
    });

    // Draw a card from a deck
    socket.on('draw', function() {
        const deck = users[socket.id].deck;
        
        socket.emit('cardDrawed', deck.draw());
        /*const roomName = users[socket.id].room;
        const room = rooms[roomName];
        for (const player of room.players.keys()) {

            const playerSocket = io.sockets.sockets[player];

            if (player !== socket.id) {
                playerSocket.emit('cardDrawed', deck.draw());
            }
        }*/
    });

    // Play a card or a new token
    socket.on('objectPlayed', function(message) {
        const roomName = users[socket.id].room;
        const room = rooms[roomName];
        for (const player of room.players.keys()) {

            const playerSocket = io.sockets.sockets[player];

            if (player !== socket.id) {
                playerSocket.emit('objectPlayed', message);
            }
        }
    });

    // Move (or tap) a card or a token
    socket.on('objectMoved', function(message) {
        const roomName = users[socket.id].room;
        const room = rooms[roomName];
        for (const player of room.players.keys()) {

            const playerSocket = io.sockets.sockets[player];

            if (player !== socket.id) {
                playerSocket.emit('objectMoved', message);
            }
        }
    });

    // Delete a token
    socket.on('tokenRemoved', function(message) {
        const roomName = users[socket.id].room;
        const room = rooms[roomName];
        for (const player of room.players.keys()) {

            const playerSocket = io.sockets.sockets[player];

            if (player !== socket.id) {
                playerSocket.emit('tokenRemoved', message);
            }
        }
    });
});


// Retrieve a deck from the Keyforge official API
const sendDeck = function(socket, deckUrl, team, username, callback) {

    fetch(deckUrl)
    .then(res => res.json())
    .then(json => {
        new Deck(json, function(deck) {

            users[socket.id].deck = deck;

            const roomName = users[socket.id].room;
            const room = rooms[roomName];
            room.players.set(socket.id, deck.id);
            room.decks.set(deck.id, deck);

            if (team === 'A') {
                room.teamA.add(deck.id);
                console.log(deck.id + ' added to team A');

            } else if (team === 'B') {
                room.teamB.add(deck.id);
                console.log(deck.id + ' added to team B');
            }

            // Send the decks to the new player
            const decks = Array.from(room.players.values());
            const ally = room.getAlly(deck.id);

            let allyNumber = null;
            if (ally !== null) {
                //allyNumber = Array.from(room.decks.keys()).(ally);
                allyNumber = room.getDeckNumber(ally);
            }

            const deckNumber = room.getDeckNumber(deck.id);

            
            room.usernames[username] = deck.id;
            const usernamePositions = rooms[roomName].getUsernamePositions();

            const cardCount = {};
            for (const id of room.decks.keys()) {
                cardCount[id] = room.decks.get(id).size();
            }

            callback({ success: true, message: {
                decks: decks,
                deckNumbers: room.positions,
                deckNumber: deckNumber,
                cardCount: cardCount,
                allyNumber: allyNumber,
                usernames: usernamePositions
            } });

            // Inform the players that a new player joined in
            let synchRequested = false;
            for (const player of room.players.keys()) {

                const playerSocket = io.sockets.sockets[player];

                if (player !== socket.id) {
                    
                    const otherDeck = room.players.get(player);
                    const cardCount = deck.size();
                    
                    if (deck.id === room.getAlly(otherDeck)) {
                        playerSocket.emit('newPlayer', deck.id, deckNumber, cardCount, true, username);

                    } else {
                        playerSocket.emit('newPlayer', deck.id, deckNumber, cardCount, false, username);
                    }

                    if (!synchRequested) {
                        playerSocket.emit('requestSynchronization', deck.id);
                        synchRequested = true;
                    }
                }
            }
        });
    });
}


http.listen(3000, function(){
    console.log('Listening on *:3000');
});