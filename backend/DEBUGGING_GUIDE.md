# My Debugging Framework - Personal Guide

## The 7-Step Process (For ANY Bug)

### Step 1: Read the Error Message
**What to extract:**
- [ ] Timestamp - when did it happen?
- [ ] Component - which part of the system?
- [ ] What failed - specific action?
- [ ] Who/Where - IP address, user, location?

**Example:**
```
2025/12/29 23:26:46 [Terminal] SECURITY: Blocked terminal access with invalid token from 127.0.0.1:59566
```
- Timestamp: 2025/12/29 23:26:46
- Component: Terminal
- Failed: Token validation
- Where: localhost

---

### Step 2: Find the Source Code

**Commands to use:**
```bash
# Search for exact error text
grep -r "exact error text here" .

# Search for keywords if exact fails
grep -r "keyword1" .
grep -r "keyword2" .

# Search in specific file types only (faster)
grep -r "error text" --include="*.go" .
grep -r "error text" --include="*.js" .
```

**My first bug:** Terminal token validation
- Searched: `grep -r "SECURITY: Blocked terminal access" .`
- Found: `internal/handlers/terminal_handler.go:78`

---

### Step 3: Read Context Around the Error

**What to look for (±20 lines):**
- What happens BEFORE the error line?
- What INPUT variable causes it?
- What function/condition triggers it?
- What is the EXPECTED behavior?

**Example from my code:**
```go
// Line 75-79 in terminal_handler.go
claims, err := h.authService.ValidateToken(token)  // ← Input: token
if err != nil {                                     // ← Condition
    http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
    log.Printf("[Terminal] SECURITY: Blocked terminal access with invalid token from %s", r.RemoteAddr)
    return
}
```

---

### Step 4: Follow the Data Flow

**Ask these questions:**
1. Where does the variable come from?
2. What function processes it?
3. What can make it fail?

**My example - Following "token":**
```
Line 61: token := r.URL.Query().Get("token")  ← Comes from URL
   ↓
Line 75: claims, err := h.authService.ValidateToken(token)  ← Goes to validation
   ↓
auth_service.go:46: func ValidateToken(tokenString string)  ← Implementation
   ↓
Line 47-52: jwt.ParseWithClaims(...)  ← Uses jwtSecret to verify
```

---

### Step 5: Check Configuration

**Common config sources:**
```bash
# Check environment files
cat .env
cat .env.example
cat config.yml

# Check where config is loaded
grep -r "LoadConfig" .
grep -r "getEnv" .

# Check initialization in main.go
cat cmd/server/main.go
```

**My example:**
- Config loaded: `utils.LoadConfig()` in main.go:32
- JWT Secret from: `.env` file → `JWT_SECRET` variable
- Used in: `authService := NewAuthService(config.JWTSecret, ...)`

---

### Step 6: Form Hypotheses (List Possible Causes)

**Rank by probability:**
1. **Most likely** - Common issues (expired tokens, wrong config)
2. **Medium** - Edge cases (timing issues, race conditions)
3. **Low** - Rare issues (cosmic rays flipping bits 😄)

**My bug hypotheses:**
1. ✅ HIGH: Token expired (JWT_EXPIRY_HOURS passed)
2. ✅ HIGH: Server restarted with different JWT_SECRET
3. ⚠️ MEDIUM: Client caching old token
4. ⚠️ LOW: Token corrupted in transmission
5. ⚠️ LOW: Environment mismatch (dev vs prod)

---

### Step 7: Test and Eliminate

**Add logging to confirm:**
```go
// Instead of generic error
log.Printf("Error: %v", err)

// Add specific details
log.Printf("Token validation failed: %v | Token length: %d | First 10 chars: %s",
    err, len(token), token[:10])
```

**Test each hypothesis:**
- [ ] Generate fresh token → Test if it works
- [ ] Check .env JWT_SECRET → Confirm it's stable
- [ ] Check server restart logs → See if secret changed
- [ ] Clear client cache → Test again

---

## Common Patterns I've Seen

### Pattern: "Invalid Token/Credentials"
**Usually means:**
- Expired session
- Wrong secret key
- Server restart lost session

**Debug:** Check timestamps, config files, server uptime

---

### Pattern: "Connection Refused"
**Usually means:**
- Service not running
- Wrong port
- Firewall blocking

**Debug:** Check process status, ports, network

---

### Pattern: "Null Pointer / Undefined"
**Usually means:**
- Variable not initialized
- API returned unexpected format
- Missing error handling

**Debug:** Add null checks, log variable values

---

## My Bug Solutions Log

### Bug #1: Terminal Token Validation (2025-12-29)
**Error:** `SECURITY: Blocked terminal access with invalid token`
**Root cause:** [TO BE DETERMINED]
**Solution:** [TO BE IMPLEMENTED]
**What I learned:** How to trace JWT authentication flow

---

## Quick Reference Commands

```bash
# Search in files
grep -r "search term" .
grep -r "term" --include="*.go" .
grep -r "term" -i .  # case insensitive

# Find files by name
find . -name "*.go" -type f
find . -name "*handler*" -type f

# Check running processes
ps aux | grep "process_name"

# Check ports
netstat -tulpn | grep :5000

# View logs (last 50 lines)
tail -50 app.log

# Follow logs in real-time
tail -f app.log

# Check environment
printenv | grep JWT
cat .env | grep JWT
```

---

## English + Code Learning Tips

### Technical Terms I'm Learning:
- **Token** = A piece of data that proves identity (like a digital ID card)
- **Validation** = Checking if something is correct/valid
- **Handler** = Function that handles/processes requests
- **Middleware** = Code that runs between request and response
- **Repository** = Layer that talks to database

### Writing Practice:
- Write commit messages in English
- Comment code in English
- Keep this debugging log in English

**Why?** Most programming resources are in English. Practice now = easier later.

---

## Next Steps

- [ ] Fix current terminal token issue
- [ ] Debug 10 more bugs using this framework
- [ ] Add each bug to this log
- [ ] Review this file before debugging sessions
