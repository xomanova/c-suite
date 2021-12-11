let socket = new WebSocket("wss://c-suite.xomanova.io/socket/");

socket.onopen = function(e) {
  socket.send("Connection established");
};

// send message from the form
document.forms.publish.onsubmit = function() {
    let outgoingMessage = this.message.value;

    socket.send(outgoingMessage);
    return false;
};

// message received - show the message in div#messages
socket.onmessage = function(event) {
    let message = event.data;
  
    let messageElem = document.createElement('div');
    messageElem.textContent = message;
    document.getElementById('messages').prepend(messageElem);
};

socket.onclose = function(event) {
  if (event.wasClean) {
    alert(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
  } else {
    // e.g. server process killed or network down
    // event.code is usually 1006 in this case
    alert('[close] Connection died');
  }
};

socket.onerror = function(error) {
  alert(`[error] ${error.message}`);
};