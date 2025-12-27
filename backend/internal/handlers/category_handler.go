package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"titan-backend/internal/models"
)

type CategoryHandler struct {
	categoryRepo *models.CategoryRepository
}

func NewCategoryHandler(categoryRepo *models.CategoryRepository) *CategoryHandler {
	return &CategoryHandler{
		categoryRepo: categoryRepo,
	}
}

func (h *CategoryHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	categories, err := h.categoryRepo.GetAll()
	if err != nil {
		models.RespondError(w, "Failed to fetch categories", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "", map[string]interface{}{
		"categories": categories,
		"total":      len(categories),
	}, http.StatusOK)
}

func (h *CategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		Icon string `json:"icon"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ID == "" || req.Name == "" || req.Icon == "" {
		models.RespondError(w, "ID, name, and icon are required", http.StatusBadRequest)
		return
	}

	// Sanitize ID
	req.ID = strings.ToLower(strings.ReplaceAll(req.ID, " ", "-"))

	// Check if category exists
	existing, _ := h.categoryRepo.GetByID(req.ID)
	if existing != nil {
		models.RespondError(w, "Category with this ID already exists", http.StatusConflict)
		return
	}

	category := &models.Category{
		ID:   req.ID,
		Name: req.Name,
		Icon: req.Icon,
	}

	if err := h.categoryRepo.Create(category); err != nil {
		models.RespondError(w, "Failed to create category", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "Category created successfully", map[string]interface{}{
		"category": category,
	}, http.StatusCreated)
}

func (h *CategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Get existing category
	existing, err := h.categoryRepo.GetByID(id)
	if err != nil {
		models.RespondError(w, "Failed to fetch category", http.StatusInternalServerError)
		return
	}
	if existing == nil {
		models.RespondError(w, "Category not found", http.StatusNotFound)
		return
	}

	var req struct {
		Name string `json:"name"`
		Icon string `json:"icon"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.RespondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Icon != "" {
		existing.Icon = req.Icon
	}

	if err := h.categoryRepo.Update(existing); err != nil {
		models.RespondError(w, "Failed to update category", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "Category updated successfully", map[string]interface{}{
		"category": existing,
	}, http.StatusOK)
}

func (h *CategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Check if category exists
	existing, err := h.categoryRepo.GetByID(id)
	if err != nil {
		models.RespondError(w, "Failed to fetch category", http.StatusInternalServerError)
		return
	}
	if existing == nil {
		models.RespondError(w, "Category not found", http.StatusNotFound)
		return
	}

	// Prevent deleting 'other' category
	if id == "other" {
		models.RespondError(w, "Cannot delete the 'other' category", http.StatusBadRequest)
		return
	}

	if err := h.categoryRepo.Delete(id); err != nil {
		models.RespondError(w, "Failed to delete category", http.StatusInternalServerError)
		return
	}

	models.RespondSuccess(w, "Category deleted successfully", map[string]interface{}{
		"deletedId": id,
	}, http.StatusOK)
}
