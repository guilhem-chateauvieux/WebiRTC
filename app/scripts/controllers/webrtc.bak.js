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

    //var isInitiator;

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
      var unserialize = JSON.parse(description);
      gotRemoteOfferDescription(unserialize);
    });

    socket.on('RTCPeerConnectionAnswer description', function (description) {
      console.log('RTCPeerConnection answer recieved (' + description + ')');
      var unserialize = JSON.parse(description);
      gotRemoteAnswerDescription(unserialize);
    });

    socket.on('iceCandidate', function (iceCandidate) {
      socket.emit('iceCandidate', {clientRoom: clientRoom, clientId: clientId, iceCandidate: iceCandidate});
      var unserialize = JSON.parse(iceCandidate);
      console.log('Remote Candidate recieved: ' + unserialize.candidate);
      pc.addIceCandidate(new RTCIceCandidate(unserialize));
    });

    var localStream;
    var localVideo = document.querySelector("#localVideoElement");
    var remoteVideo = document.querySelector("#remoteVideoElement");
    var pc;
    var sendChannel, receiveChannel;

    //var servers = null;
    var pc_config = {"iceServers": [{"url": "stun:stun.l.google.com:19302"},
      {"url":"turn:my_username@176.31.150.140", "credential":"my_password"}]};
    var pc_constraints = {
      'optional': [
        {'DtlsSrtpKeyAgreement': true},
        {'RtpDataChannels': true}
      ]};

    if (!!navigator.webkitGetUserMedia) {
      pc = new webkitRTCPeerConnection(pc_config, pc_constraints);
    } else if (!!navigator.mozGetUserMedia) {
      pc = new mozRTCPeerConnection(pc_config, pc_constraints);
    } else {
      alert('"RTCPeerConnection()" function is not supported in this browser.');
    }
    pc.onicecandidate = gotIceCandidate;
    pc.onaddstream = null;   //gotRemoteStream;
    pc.ondatachannel = gotReceiveChannel;

    var getVideoButton = document.getElementById("getVideoButton");
    var callButton = document.getElementById("callButton");
    var hangupButton = document.getElementById("hangupButton");
    var sendButton = document.getElementById("sendButton");
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
          maxHeight: 360
        }
      },
      audio: true
    };

    var customConstraints = {
      video: {
        mandatory: {
          maxWidth: 580,
          maxHeight: 435
        }
      },
      audio: true
    };

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

    function start() {
      if (hasGetUserMedia()) {
        navigator.getUserMedia(hdConstraints, handleStream, handleError);
        getVideoButton.innerHTML = "Stop";
        callButton.disabled = false;
      } else {
        alert('"getUserMedia()" function is not supported in this browser.');
      }
    }

    function stop() {
      localVideo.pause();
      localVideo.src = "";
      localStream.stop();
      getVideoButton.innerHTML = "Start";
      callButton.disabled = true;
    }
    
    function hasGetUserMedia() {
      navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia);
      return !!navigator.getUserMedia;
    }

    function handleStream(stream) {
      localVideo.src = URL.createObjectURL(stream);
      localVideo.classList.add('mirror');
      localStream = stream;
    }

    function call() {
      getVideoButton.disabled = true;
      callButton.disabled = true;
      hangupButton.disabled = false;

      try {
        // Reliable Data Channels not yet supported in Chrome
        sendChannel = pc.createDataChannel("sendDataChannel",
          {reliable: false});
      } catch (e) {
        alert('Failed to create data channel. ' +
              'You need Chrome M25 or later with RtpDataChannel enabled');
      }

      pc.onaddstream = null;
      pc.addStream(localStream);

      sendChannel.onopen = handleSendChannelStateChange;
      sendChannel.onclose = handleSendChannelStateChange;

      pc.createOffer(gotLocalOfferDescription,handleError);

      sendButton.disabled = false;
    }

    function sendData() {
      var data = document.getElementById("dataChannelSend").value;
      sendChannel.send(data);
    }

    function hangup() {
      sendChannel.close();
      receiveChannel.close();
      pc.close();
      //remotePeerConnection.close();
      pc = null;
      //remotePeerConnection = null;
      //TODO socket.emit('hangup') sur lequel on close() et null la pc de l'appelé
      getVideoButton.disabled = false;
      hangupButton.disabled = true;
      callButton.disabled = false;
      sendButton.disabled = true;
      dataChannelSend.value = "";
      dataChannelReceive.value = "";
      dataChannelSend.disabled = true;
      dataChannelSend.placeholder = "Press Start, enter some text, then press Send.";
    }

    function gotLocalOfferDescription(description){
      pc.setLocalDescription(description);
      var serialize = JSON.stringify(description);
      socket.emit('RTCPeerConnectionOffer description', {clientRoom: clientRoom, clientId: clientId, offerDescription: serialize});
    }

    function gotRemoteOfferDescription(description){
      pc.setRemoteDescription(description);
      pc.createAnswer(gotLocalAnswerDescription,handleError);
    }

    function gotLocalAnswerDescription(description){
      pc.setLocalDescription(description);
      console.log('RTCPeerConnectionAnswer description sent...');
      var serialize = JSON.stringify(description);
      socket.emit('RTCPeerConnectionAnswer description', {clientRoom: clientRoom, clientId: clientId, answerDescription: serialize});
    }

    function gotRemoteAnswerDescription(description){
      pc.setRemoteDescription(description);
    }

    function gotRemoteStream(event){
      remoteVideo.src = URL.createObjectURL(event.stream);
    }

    function gotIceCandidate(event){
      if (event.candidate) {
        console.log('Local Candidate: ' + event.candidate.candidate);
        var serialize = JSON.stringify(event.candidate);
        socket.emit('iceCandidate', {clientRoom: clientRoom, clientId: clientId, iceCandidate: serialize});
      }
    }
    
    function gotReceiveChannel(event) {
      receiveChannel = event.channel;
      receiveChannel.onmessage = handleMessage;
      receiveChannel.onopen = handleReceiveChannelStateChange;
      receiveChannel.onclose = handleReceiveChannelStateChange;
    }

    function handleMessage(event) {
      document.getElementById("dataChannelReceive").value = event.data;
    }

    function handleSendChannelStateChange() {
      var readyState = sendChannel.readyState;
      if (readyState == "open") {
        dataChannelSend.disabled = false;
        dataChannelSend.focus();
        dataChannelSend.placeholder = "";
        sendButton.disabled = false;
      } else {
        dataChannelSend.disabled = true;
        sendButton.disabled = true;
      }
    }

    function handleReceiveChannelStateChange() {
      var readyState = receiveChannel.readyState;
    }

    function handleError(error) {
      console.log('Error', error);
    }

  });