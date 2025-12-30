# 🔥 Quick Debug Cheatsheet

## When You See An Error:

```
1. grep -r "error text" .          → Find where
2. Read ±20 lines                   → Understand context
3. Follow the variable              → Trace data flow
4. Check config files               → Find settings
5. Add log.Printf()                 → See what's happening
6. Test each hypothesis             → Eliminate causes
```

## Common Commands:

```bash
# SEARCH
grep -r "text" .                    # Search all files
grep -r "text" --include="*.go" .   # Only .go files
grep -rn "text" .                   # Show line numbers

# FIND FILES
find . -name "*.go"                 # All Go files
find . -name "*handler*"            # Files with "handler" in name

# LOGS
tail -50 app.log                    # Last 50 lines
tail -f app.log                     # Live updates

# PROCESS
ps aux | grep go                    # Find Go processes
kill -9 <PID>                       # Kill process

# ENV
cat .env                            # View environment
printenv | grep JWT                 # View specific var
```

## Token/Auth Errors = Check:

```bash
cat .env | grep JWT                 # Is secret correct?
grep -r "GenerateToken" .           # Where created?
grep -r "ValidateToken" .           # Where validated?
# Usually: expired or wrong secret
```

## Can't Connect = Check:

```bash
ps aux | grep <service>             # Is it running?
netstat -tulpn | grep <port>        # Is port open?
curl localhost:<port>/health        # Can reach it?
```

## Null/Undefined = Check:

- Did API return data?
- Is variable initialized?
- Add: `if x == nil { log.Fatal("x is nil!") }`

---

**Remember:** 90% of bugs are:
1. Config wrong (check .env)
2. Service not running (check ps)
3. Expired session (check timestamps)
4. Typo (check spelling)
5. Wrong environment (dev vs prod)
