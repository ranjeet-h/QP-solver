#!/usr/bin/env python3
import datetime
import json
import argparse
from jose import jwt

def generate_token(email, secret_key, days_valid=30, algorithm="HS256"):
    """Generate a JWT token for WebSocket authentication"""
    expiration = datetime.datetime.utcnow() + datetime.timedelta(days=days_valid)
    
    payload = {
        "sub": email,
        "exp": int(expiration.timestamp())
    }
    
    token = jwt.encode(payload, secret_key, algorithm=algorithm)
    
    return {
        "token": token,
        "payload": payload,
        "expires": expiration.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "javascript_usage": f'const AUTH_TOKEN = "{token}";'
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate JWT token for WebSocket authentication")
    parser.add_argument("--email", default="user@example.com", help="Email to use in the token")
    parser.add_argument("--secret", default="your-secret-key", help="Secret key for signing")
    parser.add_argument("--days", type=int, default=30, help="Days until token expiration")
    args = parser.parse_args()
    
    result = generate_token(args.email, args.secret, args.days)
    
    # Print the formatted output
    print("\n=== JWT Token ===")
    print(result["token"])
    print("\n=== Payload ===")
    print(json.dumps(result["payload"], indent=2))
    print("\n=== Expires ===")
    print(result["expires"])
    print("\n=== For JavaScript Use ===")
    print(result["javascript_usage"])
    print("\nThis token will expire in", args.days, "days.")
    print("Replace the AUTH_TOKEN value in script.js with this token.") 