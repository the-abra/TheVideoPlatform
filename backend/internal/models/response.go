package models

import (
	"encoding/json"
	"net/http"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type ValidationErrorResponse struct {
	Success bool              `json:"success"`
	Error   string            `json:"error"`
	Details []ValidationError `json:"details"`
}

func RespondJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

func RespondSuccess(w http.ResponseWriter, message string, data interface{}, statusCode int) {
	RespondJSON(w, statusCode, APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func RespondError(w http.ResponseWriter, message string, statusCode int) {
	RespondJSON(w, statusCode, APIResponse{
		Success: false,
		Error:   message,
	})
}

func RespondValidationError(w http.ResponseWriter, message string, details []ValidationError) {
	RespondJSON(w, http.StatusBadRequest, ValidationErrorResponse{
		Success: false,
		Error:   message,
		Details: details,
	})
}
