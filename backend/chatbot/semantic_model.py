from transformers import AutoTokenizer, AutoModel
import torch
import json

# Load the tokenizer and model for semantic similarity
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME)

import os

current_dir = os.path.dirname(os.path.abspath(__file__))  # Get current script directory
questions_path = os.path.join(current_dir, "questions.json")  # Path to questions.json

with open(questions_path, "r") as f:
    QUESTIONS = json.load(f)["questions"]

# Function to generate sentence embeddings
def get_embedding(text):
    tokens = tokenizer(text, return_tensors="pt", padding=True, truncation=True)
    with torch.no_grad():
        output = model(**tokens)
    return output.last_hidden_state.mean(dim=1)

# Function to find the most similar question
def find_best_match(user_query):
    user_embedding = get_embedding(user_query)
    best_match = None
    highest_similarity = -1

    for question in QUESTIONS:
        question_embedding = get_embedding(question)
        similarity = torch.nn.functional.cosine_similarity(user_embedding, question_embedding).item()
        
        if similarity > highest_similarity:
            highest_similarity = similarity
            best_match = question

    return best_match if highest_similarity > 0.7 else None  # Threshold for similarity
