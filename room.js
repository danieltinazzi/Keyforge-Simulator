module.exports = class Room {

    constructor(name, key, maxPlayers, teamPlay) {
        this.started = false;
        this.name = name;
        this.key = key;
        this.players = new Map();
        this.decks = new Map();

        this.maxPlayers = maxPlayers;
        if (maxPlayers > 2)
            this.teamPlay = teamPlay;
        else
            this.teamPlay = false;
        this.teamA = new Set();
        this.teamB = new Set();

        this.positions = {};
        this.usernames = {};
    }

    getAlly(deck) {
        if (this.teamA.has(deck)) {
            for (const otherDeck of this.teamA) {
                if (otherDeck != deck)
                    return otherDeck;
            }
        } else if (this.teamB.has(deck)) {
            for (const otherDeck of this.teamB) {
                if (otherDeck != deck)
                    return otherDeck;
            }
        }
        return null;
    }

    getDeckNumber(deckId) {
        let position;

        if (deckId in this.positions) {
            position = this.positions[deckId];

        } else if (this.teamPlay) {

            if (this.teamA.has(deckId)) {

                if (this.teamA.size == 1)
                    position = 0;
                else
                    position = 2;
            } else {

                if (this.teamB.size == 1)
                    position = 1;
                else
                    position = 3;
            }
            this.positions[deckId] = position;

        } else {
            position = Array.from(this.decks.keys()).indexOf(deckId);
            this.positions[deckId] = position;
        }

        return position;
    }

    getUsernamePositions() {
        let usernamePositions = {};
        for (const username in this.usernames) {
            const id = this.usernames[username];
            const position = this.positions[id];
            usernamePositions[position] = username;
        }
        console.log(usernamePositions);
        return usernamePositions;
    }

    static serializeRooms(rooms) {

        const serializedRooms = {};

        for (const roomName in rooms) {
            serializedRooms[roomName] = {};
            serializedRooms[roomName].name = rooms[roomName].name;
            serializedRooms[roomName].key = rooms[roomName].key;
            serializedRooms[roomName].players = Array.from(rooms[roomName].players);
        }
        return serializedRooms;
    }
}