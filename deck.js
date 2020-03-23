function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

sets = {
    '341': 'Call of the Archons',
    '435': 'Age of Ascension',
    '452': 'Worlds Collide'
};

class Card {
    constructor(json) {
        this.id = json['id'];
        this.image = json['front_image'];
        this.set = json['expansion'];
        this.number = json['card_number'];
    }
}

module.exports = class Deck {
    constructor(json, callback) {
        let data = json['data'];
        if (Array.isArray(data))
            data = data[0];
        this.name = data['name'];
        this.set = data['expansion'];
        if (this.set in sets)
            this.set_name = sets[this.set];
        else
            this.set_name = 'Unknown';
        this.id = data['id'];
        this.card_list = data['_links']['cards'];
        this.playable_card_list = this.card_list.slice();
        this.deck = this.playable_card_list.slice();
        shuffleArray(this.deck);
        const c = this.cards = {};
        json['_linked']['cards'].forEach(function(card) {
            c[card['id']] = new Card(card);
        });
        callback(this);
    }

    size() {
        return this.deck.length;
    }
    
    shuffle() {
        this.deck = this.playable_card_list.slice();
        shuffleArray(this.deck);
    }

    draw() {
        let card;
        if (this.size() == 0) {
            this.shuffle();
            console.log('deck shuffled');
        } else {
            const card_id = this.deck.pop();
            card = this.cards[card_id];
        }
        return card;
    }
    
    purge(card_id) {
        this.playable_card_list.remove(card_id);
        this.playable_card_list = this.playable_card_list.filter(id => id !== card_id);
    }
}