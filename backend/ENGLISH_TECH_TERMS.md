# Technical English for Programming

## Core Verbs (Actions in Code)

| English | Meaning | Example |
|---------|---------|---------|
| **Initialize** | Set up for first time | `Initialize the database` |
| **Validate** | Check if correct | `Validate the user token` |
| **Parse** | Read and understand data | `Parse the JSON response` |
| **Handle** | Deal with / process | `Handle the error` |
| **Trigger** | Cause to happen | `Trigger the event` |
| **Invoke** | Call / run | `Invoke the function` |
| **Fetch** | Get / retrieve | `Fetch data from API` |
| **Authenticate** | Verify identity | `Authenticate the user` |
| **Authorize** | Check permissions | `Authorize admin access` |
| **Implement** | Create / build | `Implement the feature` |
| **Deploy** | Put into production | `Deploy the application` |
| **Debug** | Find and fix problems | `Debug the error` |

## Common Nouns (Things in Code)

| English | Meaning | Example |
|---------|---------|---------|
| **Token** | Digital proof of identity | `JWT token` |
| **Handler** | Function that processes requests | `HTTP handler` |
| **Middleware** | Code between request/response | `Auth middleware` |
| **Repository** | Data access layer | `User repository` |
| **Service** | Business logic layer | `Auth service` |
| **Endpoint** | API URL path | `/api/login endpoint` |
| **Payload** | Data being sent | `Request payload` |
| **Response** | Data being returned | `HTTP response` |
| **Session** | Temporary user state | `User session` |
| **Configuration** | Settings | `Server config` |
| **Environment** | Where code runs | `Production environment` |
| **Dependency** | Required package | `External dependency` |

## Error Message Vocabulary

| Word | Meaning |
|------|---------|
| **Invalid** | Not correct / not allowed |
| **Unauthorized** | No permission / not logged in |
| **Forbidden** | Logged in but not allowed |
| **Expired** | Time ran out |
| **Malformed** | Wrong format / corrupted |
| **Timeout** | Took too long |
| **Refused** | Rejected / blocked |
| **Failed** | Did not succeed |

## Writing Commit Messages

```bash
# Use simple past tense or imperative (command form)

✅ GOOD:
git commit -m "Fix token validation error"
git commit -m "Add logging to auth service"
git commit -m "Update JWT secret configuration"

❌ BAD (but still okay):
git commit -m "Fixed token validation error"  # Past tense works too
git commit -m "Adding logging..."  # -ing form is less common

❌ UNCLEAR:
git commit -m "Changes"
git commit -m "Update"
git commit -m "Fix bug"  # Which bug?
```

## Common Abbreviations

| Short | Full | Meaning |
|-------|------|---------|
| **API** | Application Programming Interface | How programs talk to each other |
| **HTTP** | HyperText Transfer Protocol | Web communication |
| **JWT** | JSON Web Token | Secure token format |
| **DB** | Database | Where data is stored |
| **ENV** | Environment | Settings/configuration |
| **Auth** | Authentication | Login/identity verification |
| **Repo** | Repository | Code storage or data layer |
| **Init** | Initialize | Set up / start |
| **Config** | Configuration | Settings |
| **Prod** | Production | Live/real environment |
| **Dev** | Development | Testing environment |

## Pronunciation Tips (How to say them)

- **Cache** = "cash" (not "catch-ee")
- **Route** = "root" (in programming context)
- **MySQL** = "my S-Q-L" or "my sequel"
- **Linux** = "LIN-ux" (not "LINE-ux")
- **NGINX** = "engine-X"
- **PostgreSQL** = "post-gres" (often just "Postgres")
- **JWT** = "J-W-T" (say each letter)
- **API** = "A-P-I" (say each letter)

## Practice: Explain Code in English

```go
// Code:
func ValidateToken(token string) error {
    if token == "" {
        return errors.New("token is empty")
    }
    return nil
}

// In English:
"This function validates a token. It takes a string as input.
If the token is empty, it returns an error saying 'token is empty'.
Otherwise, it returns nil (no error)."
```

**Practice this:** Read your code out loud in English. Improves both!

## Common Questions/Phrases

```
"Where is X defined?" - Where does X exist in code?
"How do I debug this?" - How do I find the problem?
"What does this do?" - Explain this code
"Why is this failing?" - What causes the error?
"Can you walk me through this?" - Explain step by step
```

## Your English Improvement Plan

1. **Daily:** Write 1 commit message in English
2. **Weekly:** Document 1 bug in MY_BUGS.md in English
3. **Monthly:** Read 1 technical blog post in English

**Result:** In 3 months, technical English will be easy!
