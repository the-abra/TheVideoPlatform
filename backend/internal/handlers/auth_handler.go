package handlers

import (
	"encoding/json"
	"net/http"

	"titan-backend/internal/middleware"
	"titan-backend/internal/models"
	"titan-backend/internal/services"
)

type AuthHandler struct {
	userRepo    *models.UserRepository
	authService *services.AuthService
}

func NewAuthHandler(userRepo *models.UserRepository, authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		userRepo:    userRepo,
		authService: authService,
	}
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Username == "" || req.Password == "" {
		models.RespondError(w, "Username and password are required", http.StatusBadRequest)
		return
	}

	user, err := h.userRepo.GetByUsername(req.Username)
	if err != nil {
		models.RespondError(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if user == nil || !user.CheckPassword(req.Password) {
		models.RespondError(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := h.authService.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		models.RespondError(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Update last login
	h.userRepo.UpdateLastLogin(user.ID)

	models.RespondSuccess(w, "Authentication successful", map[string]interface{}{
		"token":     token,
		"expiresIn": 86400,
		"user": map[string]interface{}{
			"id":       user.ID,
			"username": user.Username,
			"role":     user.Role,
		},
	}, http.StatusOK)
}

func (h *AuthHandler) Verify(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		models.RespondError(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	models.RespondSuccess(w, "", map[string]interface{}{
		"valid": true,
		"user": map[string]interface{}{
			"id":       claims.UserID,
			"username": claims.Username,
		},
	}, http.StatusOK)
}
