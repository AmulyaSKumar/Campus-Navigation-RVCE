import React, { useState } from "react";
import axios from "axios";

function Chatbot() {
    const [message, setMessage] = useState("");
    const [chat, setChat] = useState([]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        const userMessage = { sender: "user", text: message };
        
        try {
            setChat(prevChat => [...prevChat, userMessage]);
            
            // Updated port to 5001
            const response = await axios.post("http://localhost:5001/chat", { 
                message: message 
            });
            
            const botMessage = { sender: "bot", text: response.data.response };
            setChat(prevChat => [...prevChat, botMessage]);
        } catch (error) {
            console.error("Error:", error);
            const errorMessage = { sender: "bot", text: "Sorry, I encountered an error!" };
            setChat(prevChat => [...prevChat, errorMessage]);
        }

        setMessage("");
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage(e);
        }
    };

    return (
        <div className="chatbot-container" style={{
            maxWidth: "500px",
            margin: "20px auto",
            padding: "20px",
            boxShadow: "0 0 10px rgba(0,0,0,0.1)",
            borderRadius: "8px"
        }}>
            <h2>Campus Navigator Assistant</h2>
            <div className="chat-messages" style={{
                height: "400px",
                overflowY: "auto",
                padding: "20px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                marginBottom: "20px"
            }}>
                {chat.map((msg, index) => (
                    <div
                        key={index}
                        style={{
                            textAlign: msg.sender === "user" ? "right" : "left",
                            margin: "10px 0",
                            padding: "8px 12px",
                            backgroundColor: msg.sender === "user" ? "#007bff" : "#e9ecef",
                            color: msg.sender === "user" ? "white" : "black",
                            borderRadius: "12px",
                            maxWidth: "70%",
                            marginLeft: msg.sender === "user" ? "auto" : "0",
                            wordWrap: "break-word"
                        }}
                    >
                        {msg.text}
                    </div>
                ))}
            </div>
            <div className="chat-input" style={{
                display: "flex",
                gap: "10px"
            }}>
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "4px",
                        border: "1px solid #ddd"
                    }}
                />
                <button
                    onClick={sendMessage}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                    }}
                >
                    Send
                </button>
            </div>
        </div>
    );
}

export default Chatbot;