from transformers import AutoTokenizer, AutoModel
import torch
import json
import os

# Lazy loading - don't load model until needed
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_tokenizer = None
_model = None
_QUESTIONS = None

def _load_model():
    """Lazy load the model and tokenizer only when needed"""
    global _tokenizer, _model
    if _tokenizer is None or _model is None:
        print("Loading semantic model...")
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model = AutoModel.from_pretrained(MODEL_NAME)
        print("Semantic model loaded successfully")
    return _tokenizer, _model

def _load_questions():
    """Lazy load questions data"""
    global _QUESTIONS
    if _QUESTIONS is None:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        questions_path = os.path.join(current_dir, "questions.json")
        with open(questions_path, "r") as f:
            _QUESTIONS = json.load(f)["questions"]
    return _QUESTIONS

# Function to generate sentence embeddings
def get_embedding(text):
    tokenizer, model = _load_model()
    tokens = tokenizer(text, return_tensors="pt", padding=True, truncation=True)
    with torch.no_grad():
        output = model(**tokens)
    return output.last_hidden_state.mean(dim=1)

# Function to find the most similar question
def find_best_match(user_query):
    QUESTIONS = _load_questions()
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
