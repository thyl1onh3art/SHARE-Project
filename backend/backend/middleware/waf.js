const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// IP whitelist and blacklist
const ipWhitelist = new Set([
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1'
]);

const ipBlacklist = new Set();

// Suspicious patterns
const suspiciousPatterns = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /union\s+select/gi,
  /drop\s+table/gi,
  /delete\s+from/gi,
  /insert\s+into/gi,
  /update\s+set/gi,
  /exec\s*\(/gi,
  /eval\s*\(/gi,
  /\.\.\//g,
  /\.\.\\/g,
  /etc\/passwd/gi,
  /proc\/self\/environ/gi,
  /bin\/sh/gi,
  /cmd\.exe/gi,
  /powershell/gi,
  /wget/gi,
  /curl/gi,
  /nc\s/gi,
  /netcat/gi
];

// Rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.log(`🚫 Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ 
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Global rate limiter (disabled for development)
const globalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100000, // 100000 requests per window (very high for development)
  'Too many requests from this IP, please try again later'
);

// Login rate limiter
const loginRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 login attempts per window
  'Too many login attempts, please try again later'
);

// Registration rate limiter
const registrationRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // 3 registrations per hour
  'Too many registration attempts, please try again later'
);

// 2FA rate limiter
const twoFactorRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  3, // 3 2FA attempts per 5 minutes
  'Too many 2FA attempts, please try again later'
);

// Slow down after failed attempts
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // Allow 2 requests per windowMs without delay
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Max delay of 20 seconds
  skipSuccessfulRequests: true,
  skipFailedRequests: false
});

// WAF middleware
const wafMiddleware = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Check IP blacklist
  if (ipBlacklist.has(clientIP)) {
    console.log(`🚫 Blocked blacklisted IP: ${clientIP}`);
    return res.status(403).json({ 
      message: 'Access denied',
      code: 'IP_BLACKLISTED'
    });
  }

  // Check for suspicious patterns in URL and body
  const url = req.url.toLowerCase();
  const body = JSON.stringify(req.body || {}).toLowerCase();
  const query = JSON.stringify(req.query || {}).toLowerCase();
  
  const allContent = `${url} ${body} ${query}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(allContent)) {
      console.log(`🚫 Blocked suspicious request from IP: ${clientIP}`);
      console.log(`🚫 Suspicious content: ${allContent.substring(0, 200)}...`);
      
      // Add to blacklist after multiple suspicious requests
      addToBlacklist(clientIP);
      
      return res.status(403).json({ 
        message: 'Suspicious request detected',
        code: 'SUSPICIOUS_REQUEST'
      });
    }
  }

  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(\b(OR|AND)\s+['"]\s*=\s*['"])/gi,
    /(\b(OR|AND)\s+1\s*=\s*1)/gi
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(allContent)) {
      console.log(`🚫 Blocked SQL injection attempt from IP: ${clientIP}`);
      addToBlacklist(clientIP);
      
      return res.status(403).json({ 
        message: 'SQL injection attempt detected',
        code: 'SQL_INJECTION'
      });
    }
  }

  // Check for XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(allContent)) {
      console.log(`🚫 Blocked XSS attempt from IP: ${clientIP}`);
      addToBlacklist(clientIP);
      
      return res.status(403).json({ 
        message: 'XSS attempt detected',
        code: 'XSS_ATTEMPT'
      });
    }
  }

  // Check for path traversal
  const pathTraversalPatterns = [
    /\.\.\//g,
    /\.\.\\/g,
    /\.\.%2f/gi,
    /\.\.%5c/gi,
    /\.\.%252f/gi,
    /\.\.%255c/gi
  ];

  for (const pattern of pathTraversalPatterns) {
    if (pattern.test(allContent)) {
      console.log(`🚫 Blocked path traversal attempt from IP: ${clientIP}`);
      addToBlacklist(clientIP);
      
      return res.status(403).json({ 
        message: 'Path traversal attempt detected',
        code: 'PATH_TRAVERSAL'
      });
    }
  }

  next();
};

// Add IP to blacklist
function addToBlacklist(ip) {
  ipBlacklist.add(ip);
  console.log(`🚫 Added IP to blacklist: ${ip}`);
  
  // Remove from blacklist after 24 hours
  setTimeout(() => {
    ipBlacklist.delete(ip);
    console.log(`✅ Removed IP from blacklist: ${ip}`);
  }, 24 * 60 * 60 * 1000);
}

// Remove IP from blacklist (admin function)
function removeFromBlacklist(ip) {
  ipBlacklist.delete(ip);
  console.log(`✅ Manually removed IP from blacklist: ${ip}`);
}

// Get blacklist status
function getBlacklistStatus() {
  return {
    blacklistedIPs: Array.from(ipBlacklist),
    whitelistedIPs: Array.from(ipWhitelist),
    totalBlocked: ipBlacklist.size
  };
}

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https:; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  );
  
  next();
};

module.exports = {
  wafMiddleware,
  globalRateLimit,
  loginRateLimit,
  registrationRateLimit,
  twoFactorRateLimit,
  speedLimiter,
  securityHeaders,
  addToBlacklist,
  removeFromBlacklist,
  getBlacklistStatus
};
