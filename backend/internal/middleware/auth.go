package middleware

import (
	"context"
	"net/http"
	"strings"

	"titan-backend/internal/models"
	"titan-backend/internal/services"
)

type contextKey string

const UserContextKey contextKey = "user"

func AuthMiddleware(authService *services.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				models.RespondError(w, "Missing authorization header", http.StatusUnauthorized)
				return
			}

			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			if tokenString == authHeader {
				models.RespondError(w, "Invalid authorization header format", http.StatusUnauthorized)
				return
			}

			claims, err := authService.ValidateToken(tokenString)
			if err != nil {
				models.RespondError(w, "Invalid or expired token", http.StatusUnauthorized)
				return
			}

			// Add claims to context
			ctx := context.WithValue(r.Context(), UserContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserFromContext(r *http.Request) *services.JWTClaims {
	if claims, ok := r.Context().Value(UserContextKey).(*services.JWTClaims); ok {
		return claims
	}
	return nil
}
