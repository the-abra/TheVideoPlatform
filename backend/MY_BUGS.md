# My Bug Tracker

## Template (Copy this for each bug):

```
### Bug #X: [Short description]
**Date:** YYYY-MM-DD
**Error:** [Paste error message]
**File:** [path/to/file.go:line]
**Root Cause:** [What actually caused it]
**Solution:** [How I fixed it]
**Commands I used:**
- grep -r "..." .
- cat file.go
- [other commands]
**Time spent:** X minutes
**What I learned:** [One sentence]
```

---

## Bug #1: Terminal Token Validation Error
**Date:** 2025-12-29
**Error:**
```
2025/12/29 23:26:46 [Terminal] SECURITY: Blocked terminal access with invalid token from 127.0.0.1:59566
```
**File:** `internal/handlers/terminal_handler.go:78`
**Root Cause:** [INVESTIGATING - likely expired JWT token]

**Investigation steps:**
1. ✅ Found error location with: `grep -r "SECURITY: Blocked terminal" .`
2. ✅ Read terminal_handler.go and auth_service.go
3. ✅ Traced token flow: URL param → ValidateToken → JWT verification
4. ✅ Found config: JWT_SECRET in .env, JWT_EXPIRY_HOURS = 24
5. ⏳ TODO: Check if token is expired vs wrong secret

**Hypotheses:**
- [ ] Token older than 24 hours (expired)
- [ ] Server restarted with different JWT_SECRET
- [ ] Client cached old token

**Next steps:**
1. Add better logging in ValidateToken to see exact error
2. Generate fresh token and test
3. Check .env JWT_SECRET hasn't changed

**What I learned:**
How to trace authentication flow by following function calls from error → handler → service → config.

---

## Bug #2: [Your next bug here]

---

## Statistics
- Total bugs solved: 1
- Fastest solve: ? min
- Most common cause: ?
- Most useful command: grep -r
