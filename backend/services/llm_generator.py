import requests

# URL Ngrok dari Server GPU
REMOTE_AI_URL = "https://jeana-klephtic-odell.ngrok-free.dev/ai/generate"

def generate_herbal_recommendation(llm_input):
    """
    Client-side version of the generator.
    This sends the data to the Remote GPU server for reasoning.
    """
    try:
        print(f"📡 Sending reasoning request to Remote GPU Server...")
        response = requests.post(REMOTE_AI_URL, json=llm_input, timeout=120)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Server AI error: {response.text}")
            return {"error": f"Server AI error: {response.text}"}
            
    except Exception as e:
        print(f"❌ Failed to reach Remote GPU Server: {str(e)}")
        return {"error": f"Connection to Remote AI lost: {str(e)}"}
