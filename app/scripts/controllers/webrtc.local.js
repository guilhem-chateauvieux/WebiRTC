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

    var localStream;
    var localVideo = document.querySelector("#localVideoElement");
    var remoteVideo = document.querySelector("#remoteVideoElement");
    var localPeerConnection, remotePeerConnection;
    var sendChannel, receiveChannel;

    var servers = null;

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
      
      if (!!navigator.webkitGetUserMedia) {
        localPeerConnection = new webkitRTCPeerConnection(servers,
          {optional: [{RtpDataChannels: true}]});
        remotePeerConnection = new webkitRTCPeerConnection(servers,
          {optional: [{RtpDataChannels: true}]});
      } else if (!!navigator.mozGetUserMedia) {
        localPeerConnection = new mozRTCPeerConnection(servers,
          {optional: [{RtpDataChannels: true}]});
        remotePeerConnection = new mozRTCPeerConnection(servers,
          {optional: [{RtpDataChannels: true}]});
      } else {
        alert('"RTCPeerConnection()" function is not supported in this browser.');
      }

      try {
        // Reliable Data Channels not yet supported in Chrome
        sendChannel = localPeerConnection.createDataChannel("sendDataChannel",
          {reliable: false});
      } catch (e) {
        alert('Failed to create data channel. ' +
              'You need Chrome M25 or later with RtpDataChannel enabled');
      }
      
      localPeerConnection.onicecandidate = gotLocalIceCandidate;
      remotePeerConnection.onicecandidate = gotRemoteIceCandidate;

      remotePeerConnection.onaddstream = gotRemoteStream;
      localPeerConnection.addStream(localStream);

      sendChannel.onopen = handleSendChannelStateChange;
      sendChannel.onclose = handleSendChannelStateChange;
      remotePeerConnection.ondatachannel = gotReceiveChannel;

      localPeerConnection.createOffer(gotLocalDescription,handleError);

      sendButton.disabled = false;
    }

    function sendData() {
      var data = document.getElementById("dataChannelSend").value;
      sendChannel.send(data);
    }

    function hangup() {
      sendChannel.close();
      receiveChannel.close();
      localPeerConnection.close();
      remotePeerConnection.close();
      localPeerConnection = null;
      remotePeerConnection = null;
      getVideoButton.disabled = false;
      hangupButton.disabled = true;
      callButton.disabled = false;
      sendButton.disabled = true;
      dataChannelSend.value = "";
      dataChannelReceive.value = "";
      dataChannelSend.disabled = true;
      dataChannelSend.placeholder = "Press Start, enter some text, then press Send.";
    }

    function gotLocalDescription(description){
      localPeerConnection.setLocalDescription(description);
      remotePeerConnection.setRemoteDescription(description);
      remotePeerConnection.createAnswer(gotRemoteDescription,handleError);
    }

    function gotRemoteDescription(description){
      remotePeerConnection.setLocalDescription(description);
      localPeerConnection.setRemoteDescription(description);
    }

    function gotRemoteStream(event){
      remoteVideo.src = URL.createObjectURL(event.stream);
    }

    function gotLocalIceCandidate(event){
      if (event.candidate) {
        remotePeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
      }
    }

    function gotRemoteIceCandidate(event){
      if (event.candidate) {
        localPeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
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