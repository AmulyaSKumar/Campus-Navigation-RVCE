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
            const API_BASE = (process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE || 'http://localhost:5001').replace(/\/$/, '');
            const response = await axios.post(`${API_BASE}/chat`, { 
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
        <div className="max-w-lg mx-auto my-5 p-5 bg-bgCard rounded-xl shadow-soft border border-gray-100">
            <h2 className="text-section-heading text-textHeading mb-4">Campus Navigator Assistant</h2>
            <div className="h-96 overflow-y-auto p-4 border border-gray-200 rounded-lg mb-5 bg-bgPage">
                {chat.map((msg, index) => (
                    <div
                        key={index}
                        className={`my-2.5 py-2 px-3 rounded-xl max-w-[70%] break-words text-body
                            ${msg.sender === "user" 
                                ? "ml-auto text-right bg-primary text-white" 
                                : "mr-auto text-left bg-gray-100 text-textBody"
                            }`}
                    >
                        {msg.text}
                    </div>
                ))}
            </div>
            <div className="flex gap-3">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 py-3 px-4 rounded-lg border-2 border-gray-200 bg-bgCard text-textBody
                              focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                              transition-all duration-200 placeholder:text-textHelper"
                />
                <button
                    onClick={sendMessage}
                    className="py-3 px-6 bg-primary text-white font-semibold rounded-lg
                              hover:bg-primaryDark hover:-translate-y-0.5 
                              active:translate-y-0 transition-all duration-200
                              shadow-button cursor-pointer"
                >
                    Send
                </button>
            </div>
        </div>
    );
}

export default Chatbot;