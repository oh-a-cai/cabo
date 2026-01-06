import React from 'react';
import './App.css';
import io from 'socket.io-client'
import { useEffect, useState } from 'react';

const socket = io("http://localhost:5001");

function App() {
  const [message, setMessage] = useState("");
  const [messageReceived, setMessageReceived] = useState("");
  const sendMessage = () => {
    socket.emit("send_message", {message});
  };
  useEffect(() => {
    socket.on("receive_message", (data) =>{
      setMessageReceived(data.message)
    });
  }, [socket])

  return (
    <div className="App">
      <input placeholder='Message...' onChange={(e) => {setMessage(e.target.value)}}/>
      <button onClick={sendMessage}>Message</button>
      <h1>Message: {messageReceived}</h1>
    </div>
  );
}

export default App;
