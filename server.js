var		app = require('express')(),
		server = require('http').Server(app),
		io = require('socket.io')(server),
		port = 9000;

app.get('/', function(req, res){
	res.sendfile('index.html');
});

var roomsArray = new Array();

io.on('connection', function(socket){

	socket.on('join', function (room) {

		if (!roomsArray[room]) {
			roomsArray.push(room);
			roomsArray[room] = new Array();
			socket.emit('created', room);
			console.log('Room ' + room + ' created successfully');
		}

		if (roomsArray[room].length < 2) {
			var clientId = generateId();
			var index = roomsArray[room].length;

			roomsArray[room].push(index);
			roomsArray[room][index] = {clientRoom: room, clientId: clientId, clientSocket: socket};
	        socket.emit('joined', clientId);

			roomTransfer(room, clientId, 'A client has joined your room under ' + clientId + ' identifier');
			displayRoomMembers(room);
		} else {
			socket.emit('full');
		}

	});

	socket.on('RTCPeerConnectionOffer description', function (content) {
		console.log('RTCPeerConnectionOffer description recieved from ' + socket.id);
		relayOfferDescription(content.clientRoom, content.clientId, content.offerDescription);
	});

	socket.on('RTCPeerConnectionAnswer description', function (content) {
		console.log('RTCPeerConnectionAnswer description recieved from ' + socket.id);
		relayAnswerDescription(content.clientRoom, content.clientId, content.answerDescription);
	});

	socket.on('iceCandidate', function (content) {
		console.log('iceCandidate recieved from ' + socket.id);
		relayIceCandidate(content.clientRoom, content.clientId, content.iceCandidate);
	});

	socket.on('hangup', function (content) {
	    console.log('Hang up recieved (from ' + socket.id + ' socket)');
	    relayHangUp(content.clientRoom, content.clientId);
	});

	socket.on('disconnect', function () {
	    console.log('Client disconnected (' + socket.id + ' socket)');
	    deleteEntry(socket);
	});

});

server.listen(port, function() {
	console.log('listening on *:' + port);
});

function log() {
	var array = [" >>> Message from server:"];
  for (var i = 0; i < arguments.length; i++) {
  	array.push(arguments[i]);
  }
    io.emit('log', array);
}

// unique id generator
function generateId() {
	var S4 = function () {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	};
	return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

function getInformations(socket) {
	var informations = {clientRoom: null, clientId: null, clientSocket: null};
	roomsArray.every(function(element, index, array) {
		console.log(array);
		for (key = 0; key < roomsArray[element].length; key++) {
			console.log('Checking { id: ' + roomsArray[element][key].clientId
                + ', socket.id: ' + roomsArray[element][key].clientSocket.id + ' }');
			if (roomsArray[element][key].clientSocket.id == socket.id) {
				informations.clientRoom = roomsArray[element][key].clientRoom;
				informations.clientId = roomsArray[element][key].clientId;
				informations.clientSocket = roomsArray[element][key].clientSocket;
				return informations;
			}
		}
	});
	return informations;
}

function diplayInformations(informations) {
	console.log('{room: ' + informations.clientRoom + ', id: ' + informations.clientId
		+ ', socket.id: ' + informations.clientSocket.id + '}');
}

function deleteEntry(socket) {
	roomsArray.every(function(room, index, array) {
		for (key = 0; key < roomsArray[room].length; key++) {
			if (roomsArray[room][key].clientSocket.id == socket.id) {
				console.log('Removal of ' + roomsArray[room][key].clientId + ' entry');
				roomsArray[room].splice(key, 1);
				displayRoomMembers(room);
			}
		}
	});
}

function roomBroadcast(room, message) {
	for (key = 0; key < roomsArray[room].length; key++) {
		console.log('Unique message sent to ' + roomsArray[room][key].clientId + ' via ' + roomsArray[room][key].clientSocket.id + ' socket');
		roomsArray[room][key].clientSocket.emit('message', message);
	}
}

function roomTransfer(room, excludedClientId, message) {
	for (key = 0; key < roomsArray[room].length; key++) {
		if (roomsArray[room][key].clientId !== excludedClientId) {
			console.log('Unique message sent to ' + roomsArray[room][key].clientId + ' via ' + roomsArray[room][key].clientSocket.id + ' socket');
			roomsArray[room][key].clientSocket.emit('message', message);
		}
	}
}

function relayOfferDescription(room, excludedClientId, offerDescription) {
	for (key = 0; key < roomsArray[room].length; key++) {
		if (roomsArray[room][key].clientId !== excludedClientId) {
			console.log('Unique offer description sent to ' + roomsArray[room][key].clientId + ' via ' + roomsArray[room][key].clientSocket.id + ' socket');
			roomsArray[room][key].clientSocket.emit('RTCPeerConnectionOffer description', offerDescription);
		}
	}
}

function relayAnswerDescription(room, excludedClientId, answerDescription) {
	for (key = 0; key < roomsArray[room].length; key++) {
		if (roomsArray[room][key].clientId !== excludedClientId) {
			console.log('Unique answer description sent to ' + roomsArray[room][key].clientId + ' via ' + roomsArray[room][key].clientSocket.id + ' socket');
			roomsArray[room][key].clientSocket.emit('RTCPeerConnectionAnswer description', answerDescription);
		}
	}
}

function relayIceCandidate(room, excludedClientId, iceCandidate) {
	for (key = 0; key < roomsArray[room].length; key++) {
		if (roomsArray[room][key].clientId !== excludedClientId) {
			console.log('Unique iceCandidate sent to ' + roomsArray[room][key].clientId + ' via ' + roomsArray[room][key].clientSocket.id + ' socket');
			console.log(' -> ICE Candidate: ' + iceCandidate.candidate);
			roomsArray[room][key].clientSocket.emit('iceCandidate', iceCandidate);
		}
	}
}

function relayHangUp(room, excludedClientId) {
	for (key = 0; key < roomsArray[room].length; key++) {
		if (roomsArray[room][key].clientId !== excludedClientId) {
			console.log('Unique Hang Up signal sent to ' + roomsArray[room][key].clientId + ' via ' + roomsArray[room][key].clientSocket.id + ' socket');
			roomsArray[room][key].clientSocket.emit('hangup');
		}
	}
}

function displayRoomMembers(room) {
	console.log(' -> Room: ' + room + ' (' + roomsArray[room].length + ' member(s))')
	for (key = 0; key < roomsArray[room].length; key++) {
		console.log(' { id: ' + roomsArray[room][key].clientId
                + ', socket.id: ' + roomsArray[room][key].clientSocket.id + ' }');
	}
}
