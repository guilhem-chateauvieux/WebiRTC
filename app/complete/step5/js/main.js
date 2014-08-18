var isInitiator;

var clientRoom = prompt("Enter room name:");
var clientId;

var socket;

if (clientRoom !== "") {
  socket = io.connect('http://ged.webinage.fr:9000/');
  console.log('Trying to join ' + clientRoom + ' room...');
  socket.emit('join', clientRoom);
}

socket.on('created', function (room){
  console.log('Room ' + room + ' created successfully');
});

socket.on('joined', function (id){
  clientId = id;
  console.log('You have now joined ' + clientRoom + ' room under ' + clientId + ' identifier');
});

socket.on('full', function (room){
  console.log('Room ' + room + ' is full');
});

socket.on('message', function (message) {
	console.log(message);
});

socket.on('log', function (array){
  console.log.apply(console, array);
});

socket.on('RTCPeerConnectionOffer description', function (description) {
	console.log('RTCPeerConnection offer recieved (' + description + ')');
	//gotRemoteOfferDescription(description);
});

socket.on('RTCPeerConnectionAnswer description', function (description) {
	console.log('RTCPeerConnection answer recieved (' + description + ')');
	//gotRemoteAnswerDescription(description);
});
