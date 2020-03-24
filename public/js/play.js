$(document).ready(() => {

    // Create the connection
    socket = io('/', {
        forceNew: true
    });

    initSocketEvents(socket);

    socket.on('connect', function() {
        $('#start').removeAttr('disabled');
    });

    // UI sealed checkbox
    $('#sealed').prop('checked', false);

    $('#sealed').click(() => {
        const isChecked = $('#sealed').prop('checked');
        $('#deck-id').prop('disabled', isChecked);
    });
    
    // Start the game
    $('#start').click(function() {

        $(this).prop('disabled', true);

        const username = $('#username').val();
        const roomName = $('#start').attr('room');
        const roomKey = $('#room-key').val();
        const sealed = $('#sealed').prop('checked');

        let team = null;
        const teamInput = $("input[name='team']:checked");
        
        if (teamInput.val())
            team = teamInput.val();

        console.log(username);

        let deckId = '';
        if (!sealed)
            deckId = $('#deck-id').val();
        
        // Send a request to join in the game
        socket.emit('joinRoom', username, roomName, roomKey, deckId, team, (data) => {

            if (data.success) {
                const canvasTemplate = $('.canvas-template').html();
                $('#content').html(canvasTemplate);

                // Start the canvas
                startCanvas(
                    data.message.decks,
                    data.message.deckNumbers,
                    data.message.deckNumber,
                    data.message.cardCount,
                    data.message.allyNumber,
                    data.message.usernames
                );
            } else {
                alert(data.message);
                $('#start').prop('disabled', false);
            }
        });
    });
});