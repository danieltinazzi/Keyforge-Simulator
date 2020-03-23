// Script used in index.html

$(document).ready(() => {

    const socket = io('/');
    
    $('#team-play').prop('checked', true);
    $('#max-players').val('4').change();

    $('#max-players').change(function () {

        const selected = $(this).children("option:selected").val();

        if (selected === '2') {
            $('#team-play').prop('disabled', true);

        } else if (selected === '3') {
            $('#team-play').prop('disabled', false);
            $('#team-play').prop('checked', false);

        } else {
            $('#team-play').prop('disabled', false);
            $('#team-play').prop('checked', true);
        }
    });


    const showRoomList = function(rooms) {
        
        $('.room-list').first().html('');
    
        if (Object.keys(rooms).length === 0) {
            const noGame = $('.no-game-template').html();
            $('.room-list').first().append($(noGame));
    
        } else {
            for (const roomName in rooms) {
    
                const roomCardTemplate = $('.room-template').first().html();
                const roomCard = $(roomCardTemplate);
                const playersNumber = Object.keys(rooms[roomName].players).length;
    
                roomCard.find('.room-name').first().html(roomName);
                roomCard.find('.room-size').first().html(playersNumber);
                roomCard.find('a').first().attr('href', encodeURIComponent(roomName));
    
                $('.room-list').first().append(roomCard);
            }
        }
    }
    
    socket.on('connect', () => {
    
        socket.emit('getRoomList', (rooms) => {
            showRoomList(rooms);
        });
    
        $('.create').click(() => {
            const roomName = $('#room-name').val();
            const roomKey = $('#room-key').val();
            const maxPlayers = $('#max-players').val();
            const teamPlay = $('#team-play').prop('checked');

            console.log(maxPlayers);
            console.log(teamPlay);

            if (roomName === '') {
                alert('Enter a valid room name.');
                return;
            }

            socket.emit('createRoom', roomName, roomKey, maxPlayers, teamPlay, (success, rooms) => {

                if (success) {
                    showRoomList(rooms);
                } else {
                    alert('Room already existent.');
                }
            });
        });
    });
});