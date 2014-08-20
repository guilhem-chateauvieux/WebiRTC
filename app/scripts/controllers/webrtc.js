'use strict';

/**
 * @ngdoc function
 * @name webRtcApp.controller:WebRTCCtrl
 * @description
 * # WebRTCCtrl
 * Controller of the webRtcApp
 */
angular.module('webRtcApp')
  .controller('WebRTCCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];

    ////////////////////////////////////////////////

    /**
     * Variables used by the script
     */

    ////////////////////////////////////////////////

    var clientRoom = prompt("Enter room name:");
    if (clientRoom == "") {
      clientRoom = "default";
    }
    var displayRoom = document.getElementById("room");
    displayRoom.innerHTML = "Current room: \"" + clientRoom + "\"";
    var clientId;
    var displayIdentifier = document.getElementById("identifier");
    var caller = true;
    var hangUpReceiver = false;

    var socket;

    var localStream;
    var localVideo = document.querySelector("#localVideoElement");
    var remoteVideo = document.querySelector("#remoteVideoElement");
    var sendChannel, receiveChannel;
    var sendTextarea = document.getElementById("dataChannelSend");
    var receiveTextarea = document.getElementById("dataChannelReceive");
    
    var pc_config = {"iceServers": [{"url": "stun:stun.l.google.com:19302"},
      {"url":"turn:my_username@176.31.150.140", "credential":"my_password"}]};
    var pc_constraints = {
      'optional': [
        {'DtlsSrtpKeyAgreement': true},
        {'RtpDataChannels': true}
      ]};
    var pc = new webkitRTCPeerConnection(pc_config, pc_constraints);
    pc.onicecandidate = gotIceCandidate;
    pc.onaddstream = gotRemoteStream;
    pc.ondatachannel = gotReceiveChannel;
    var iceCandidatesArray = new Array();

    var getVideoButton = document.getElementById("getVideoButton");
    var callButton = document.getElementById("callButton");
    var hangupButton = document.getElementById("hangupButton");
    var sendButton = document.getElementById("sendButton");
    var cifResolution = document.getElementById("cifResolution");
    var vgaResolution = document.getElementById("vgaResolution");
    var hdResolution = document.getElementById("hdResolution");
    var fhdResolution = document.getElementById("fhdResolution");
    getVideoButton.disabled = false;
    callButton.disabled = true;
    hangupButton.disabled = true;
    sendButton.disabled = true;
    getVideoButton.onclick = toggle;
    callButton.onclick = call;
    hangupButton.onclick = hangup;
    sendButton.onclick = sendData;

    var hdConstraints = {
      video: {
        mandatory: {
          minWidth: 1280,
          minHeight: 720
        }
      },
      audio: true
    };

    var vgaConstraints = {
      video: {
        mandatory: {
          maxWidth: 640,
          maxHeight: 480
        }
      },
      audio: true
    };

    var cifConstraints = {
      video: {
        mandatory: {
          maxWidth: 320,
          maxHeight: 240
        }
      },
      audio: true
    };

    ////////////////////////////////////////////////

    /**
     * Socket I/O part for a custom signalisation system
     */

    ////////////////////////////////////////////////

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
      displayIdentifier.innerHTML = "Status: connected under \"" + clientId + "\" identifier";
      console.log('You have now joined ' + clientRoom + ' room under ' + clientId + ' identifier');
    });

    socket.on('full', function (room){
      displayIdentifier.innerHTML = "Status: unable to connect, room is full";
      alert('Room ' + clientRoom + ' is full. Reload the page and try another room name.');
    });

    socket.on('message', function (message) {
      console.log(message);
    });

    socket.on('log', function (array){
      console.log.apply(console, array);
    });

    socket.on('RTCPeerConnectionOffer description', function (description) {
      caller = false;
      alert("Incoming call...\nPlease grant your web browser access to your webcam.");
      getVideoButton.disabled = true;
      callButton.disabled = true;

      start();

      console.log('RTCPeerConnection offer recieved (' + description + ')');
      var unserialize = JSON.parse(description);
      gotRemoteOfferDescription(unserialize);
    });

    socket.on('RTCPeerConnectionAnswer description', function (description) {
      console.log('RTCPeerConnection answer recieved (' + description + ')');
      var unserialize = JSON.parse(description);
      gotRemoteAnswerDescription(unserialize);
    });

    socket.on('iceCandidate', function (iceCandidate) {
      var unserialize = JSON.parse(iceCandidate);
      console.log('Remote Candidate recieved: ' + unserialize.candidate);
      pc.addIceCandidate(new RTCIceCandidate(unserialize));
    });

    socket.on('hangup', function () {
      hangUpReceiver = true;
      console.log('Remote Client has hung up');
      hangup();
    });

    ////////////////////////////////////////////////

    /**
     * Functions called by the HTML5 WebRTC page
     */

    ////////////////////////////////////////////////

    // Calls a different function according to the green button label
    function toggle() {
      switch(getVideoButton.innerHTML) {
        case "Start":
          start();
          break;
        case "Stop":
          stop();
          break;
      }
    }

    // Gets an audio/video stream from the web browser under specific constraints
    function start() {
      if (hasGetUserMedia()) {
        var constraints;
        switch(getVideoButton.innerHTML) {
          case "Start":
            constraints = cifConstraints;
            break;
          case "Stop":
            constraints = vgaConstraints;
            break;
          case "Stop":
            constraints = hdConstraints;
            break;
          case "Stop":
            constraints = fhdConstraints;
            break;
        }
        cifResolution.disabled = true;
        vgaResolution.disabled = true;
        hdResolution.disabled = true;
        fhdResolution.disabled = true;
        navigator.getUserMedia(constraints, handleStream, handleError);
        getVideoButton.innerHTML = "Stop";
      } else {
        alert('"getUserMedia()" function is not supported in this browser.');
      }
    }

    // Releases the access to audio/video source through the web browser
    function stop() {
      localVideo.pause();
      localVideo.src = "";
      localStream.stop();
      if (caller) {
        getVideoButton.innerHTML = "Start";
        callButton.disabled = true;
      }
    }
    
    // Checks if the web browser can handle audio/video access to hardware sources
    function hasGetUserMedia() {
      navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia);
      return !!navigator.getUserMedia;
    }

    // Function called in case of successful access to audio/video stream
    function handleStream(stream) {
      localStream = stream;
      console.log('Local stream added');
      localVideo.src = URL.createObjectURL(stream);
      localVideo.classList.add('mirror');   // Horizontal mirror effect added on local video diplay
      pc.addStream(stream);   // Adds local accessed stream to the RTCPeerConnection
      if (caller) {
        callButton.disabled = false;
      } else {
        hangupButton.disabled = false;
        pc.createAnswer(gotLocalAnswerDescription, handleError);    // Creates an answer to a RTCPeerConnection establishment
      }
    }

    // Initiates a call between the local and remote peer
    function call() {
      getVideoButton.disabled = true;
      callButton.disabled = true;
      hangupButton.disabled = false;

      try {
        // Reliable Data Channels is not yet supported in Chrome
        sendChannel = pc.createDataChannel("sendDataChannel",
          {reliable: false});   // Creates a data channel for text messages
        sendChannel.onmessage = handleMessage;
      } catch (e) {
        alert('Failed to create data channel. ' +
              'You need Chrome M25 or later with RtpDataChannel enabled');
      }
      sendChannel.onopen = handleSendChannelStateChange;
      sendChannel.onclose = handleSendChannelStateChange;

      pc.createOffer(gotLocalOfferDescription, handleError);    // Creates an offer to a RTCPeerConnection establishment

      sendButton.disabled = false;
    }

    // Closes the established peer to peer connection
    function hangup() {
      hangupButton.disabled = true;
      sendChannel.close();    // Closes the data channel instance on one of the peers
      if (caller) {
        getVideoButton.disabled = false;
        sendButton.disabled = true;
      } else {
        stop();
      }
      pc.close();   // Closes the RTCPeerConnection instance on one of the peers
      pc = null;
      dataChannelSend.value = "";
      dataChannelReceive.value = "";
      dataChannelSend.disabled = true;
      dataChannelSend.placeholder = "Call ended, please reload the page.";
      if (!hangUpReceiver) {
        socket.emit('hangup', {clientRoom: clientRoom, clientId: clientId});    // Signal the hang up to the other peer
      }
    }

    // Function called on a local RTCPeerConnection opening to describe the local peer
    function gotLocalOfferDescription(description){
      pc.setLocalDescription(new RTCSessionDescription(description));
      console.log('Local RTCPeerConnection offer description added.');
      var serialize = JSON.stringify(description);    // Serializes the description as only strings can be passed through a websocket
      socket.emit('RTCPeerConnectionOffer description', {clientRoom: clientRoom, clientId: clientId, offerDescription: serialize});
    }

    // Function called on a remote RTCPeerConnection opening to describe the remote peer
    function gotRemoteOfferDescription(description){
      pc.setRemoteDescription(new RTCSessionDescription(description));
      console.log('Remote RTCPeerConnection offer description added.');
    }

    // Function called on a remote RTCPeerConnection answering to describe the local peer
    function gotLocalAnswerDescription(description){
      pc.setLocalDescription(new RTCSessionDescription(description));
      console.log('Local RTCPeerConnection answer description added.');
      var serialize = JSON.stringify(description);    // Serializes the description as only strings can be passed through a websocket
      socket.emit('RTCPeerConnectionAnswer description', {clientRoom: clientRoom, clientId: clientId, answerDescription: serialize});
    }

    // Function called on a local RTCPeerConnection answering to describe the remote peer
    function gotRemoteAnswerDescription(description){
      pc.setRemoteDescription(new RTCSessionDescription(description));
      console.log('Remote RTCPeerConnection answer description added.');
    }

    // Function called on an stream reception by a peer
    function gotRemoteStream(event){
      remoteVideo.src = URL.createObjectURL(event.stream);
    }

    // Function called on an ICE candidate reception by a peer
    function gotIceCandidate(event){
      if (event.candidate) {
        if (iceCandidatesArray.length == 0) {
          iceCandidatesArray.push(0);
          iceCandidatesArray[0] = event.candidate;
          console.log('New Local Candidate: ' + event.candidate.candidate);
          var serialize = JSON.stringify(event.candidate);    // Serializes the ICE candidate as only strings can be passed through a websocket
          socket.emit('iceCandidate', {clientRoom: clientRoom, clientId: clientId, iceCandidate: serialize});
        } else {
          if (newIceCandidate(event.candidate)) {
            var key = iceCandidatesArray.length;
            iceCandidatesArray.push(key);
            iceCandidatesArray[key] = event.candidate;
            console.log('New Local Candidate: ' + event.candidate.candidate);
            var serialize = JSON.stringify(event.candidate);    // Serializes the ICE candidate as only strings can be passed through a websocket
            socket.emit('iceCandidate', {clientRoom: clientRoom, clientId: clientId, iceCandidate: serialize});
          } else {
            console.log('Existing Local Candidate: ' + event.candidate.candidate);
          }
        }
      }
    }

    // Checks if the received ICE candidate is new or duplicated
    function newIceCandidate(candidate) {
      for (var key = 0; key < iceCandidatesArray.length; key++) {
        if (candidate.candidate == iceCandidatesArray[key].candidate) {
          return false;
        }
      }
      return true;
    }

    // Sends chars string data through the established data channel
    function sendData() {
      var data = sendTextarea.value;
      sendChannel.send(data);
      dataChannelSend.value = "";   // Clear sending textbox content after the text emission
    }

    // Creates a sending back data channel on a reception data channel opening
    function gotReceiveChannel(event) {
      sendChannel = event.channel;
      sendChannel.onmessage = handleMessage;
      sendChannel.onopen = handleReceiveChannelStateChange;
      sendChannel.onclose = handleReceiveChannelStateChange;
    }

    // Function called on a text message reception by a peer
    function handleMessage(event) {
      receiveTextarea.value = event.data;
    }

    // Function called on an emission data channel opening
    function handleSendChannelStateChange() {
      var readyState = sendChannel.readyState;
      enableMessageInterface(readyState == "open");
    }

    // Function called on a reception data channel opening
    function handleReceiveChannelStateChange() {
      var readyState = sendChannel.readyState;
      enableMessageInterface(readyState == "open");
    }

    // Allows to enter text into the send textboxes
    function enableMessageInterface(shouldEnable) {
        if (shouldEnable) {
        dataChannelSend.disabled = false;
        dataChannelSend.focus();
        dataChannelSend.placeholder = "";
        sendButton.disabled = false;
      } else {
        dataChannelSend.disabled = true;
        sendButton.disabled = true;
      }
    }

    // Log unexpected behaviour in the console of the web browser
    function handleError(error) {
      console.log('Error', error);
    }

  });