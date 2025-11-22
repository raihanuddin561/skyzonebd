// Quick script to decode JWT token from localStorage
// Usage: Run this in browser console on your site

function decodeToken() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('❌ No token found in localStorage');
    return;
  }
  
  console.log('🔑 Raw Token:', token);
  
  try {
    // JWT has 3 parts: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Invalid token format');
      return;
    }
    
    // Decode payload (middle part)
    const payload = JSON.parse(atob(parts[1]));
    
    console.log('✅ Decoded Token Payload:');
    console.log('   User ID:', payload.userId);
    console.log('   Role:', payload.role);
    console.log('   Issued At:', new Date(payload.iat * 1000).toLocaleString());
    console.log('   Expires At:', new Date(payload.exp * 1000).toLocaleString());
    
    // Check if expired
    const now = Date.now() / 1000;
    if (payload.exp < now) {
      console.warn('⚠️ Token is EXPIRED! Please login again.');
    } else {
      console.log('✅ Token is still valid');
    }
    
    return payload;
  } catch (error) {
    console.error('❌ Failed to decode token:', error);
  }
}

// Instructions
console.log('📋 To check your token, run: decodeToken()');
