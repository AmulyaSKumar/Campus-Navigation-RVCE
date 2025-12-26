import aiml
import os

class ChatBot:
    def __init__(self):
        self.kernel = aiml.Kernel()
        
        # Get the path to bot.aiml
        current_dir = os.path.dirname(os.path.abspath(__file__))
        aiml_path = os.path.join(current_dir, "bot.aiml")
        
        print(f"Loading AIML from: {aiml_path}")
        
        if not os.path.exists(aiml_path):
            raise FileNotFoundError(f"AIML file not found at {aiml_path}")
            
        self.kernel.learn(aiml_path)
        print("AIML file loaded successfully")

    def get_response(self, message):
        if not message:
            return "Please provide a message."
        
        response = self.kernel.respond(message.upper())
        
        if not response or response.strip() == "":
            return "I'm not sure how to respond to that. Could you please rephrase?"
            
        return response

# Create a single instance
chatbot = ChatBot()