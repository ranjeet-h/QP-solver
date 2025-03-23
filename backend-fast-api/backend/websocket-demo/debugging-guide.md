# Debugging WebSocket 403 Forbidden Errors

If you're seeing a 403 Forbidden error when trying to connect to the WebSocket, follow these steps to diagnose and fix the issue:

## 1. Check Your Authentication Token

The most common reason for 403 errors is an invalid, expired, or incorrectly formatted JWT token.

### Verify Token Validity

1. Inspect the token in the browser console:
   ```javascript
   console.log(AUTH_TOKEN);
   ```

2. Decode and check the token payload at [jwt.io](https://jwt.io/)
   - Ensure the `exp` (expiration) timestamp is in the future
   - Verify the `sub` (subject) matches a valid user email

3. Make sure the token's signature is verified using the same secret as configured in `settings.JWT_SECRET_KEY`

### Generate a New Token

If your token is expired, you need to get a fresh token. You can:
- Log in through the regular application interface to get a new token
- Use the `/token` endpoint (if available) to generate a new token

## 2. Network Issues

### Check the WebSocket URL

Ensure the WebSocket URL is correct:
- The correct format is `ws://hostname:port/api/pdf/ws/process`
- For secure connections, use `wss://` instead of `ws://`
- Check if there are any proxy or CORS issues

### Browser Console

Open your browser's developer tools (F12) and check:
- Network tab: Look for WebSocket connections and check their status
- Console tab: Check for any JavaScript errors

## 3. Server Logs

If possible, check the server logs for more detailed error messages:
- Look for log entries around the time of the connection attempt
- Check for errors in authentication or token validation
- Verify the WebSocket endpoint is correctly registered

## 4. Common Solutions

1. **Token Format**: Ensure the token is sent as `{ "token": "YOUR_JWT_TOKEN" }`

2. **Token Generation**: Generate a new token with appropriate claims:
   ```python
   # Example token generation
   from jose import jwt
   import datetime
   
   expiration = datetime.datetime.utcnow() + datetime.timedelta(days=30)
   payload = {
       "sub": "user@example.com",  # Valid user email
       "exp": expiration.timestamp()  # Expiration timestamp
   }
   
   token = jwt.encode(payload, "your-secret-key", algorithm="HS256")
   print(token)
   ```

3. **Connection Timing**: Some WebSocket implementations might have timing issues. 
   Try adding a small delay before sending the token:
   ```javascript
   socket.onopen = () => {
     updateConnectionStatus('connected');
     // Add a small delay
     setTimeout(() => {
       sendAuthToken();
     }, 100);
   };
   ```

4. **Server Configuration**: Make sure the server's CORS settings allow WebSocket connections from your origin

## 5. Test with a Standalone Client

If you're still having issues, try testing with a standalone WebSocket client:
- Use tools like Postman or [websocket.org/echo.html](https://websocket.org/echo.html)
- This can help determine if the issue is with your client code or the server 