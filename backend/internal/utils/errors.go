package utils

import "errors"

var (
	ErrNotFound         = errors.New("resource not found")
	ErrUnauthorized     = errors.New("unauthorized")
	ErrForbidden        = errors.New("forbidden")
	ErrBadRequest       = errors.New("bad request")
	ErrConflict         = errors.New("conflict")
	ErrInternalServer   = errors.New("internal server error")
	ErrInvalidToken     = errors.New("invalid token")
	ErrExpiredToken     = errors.New("token expired")
	ErrInvalidFileType  = errors.New("invalid file type")
	ErrFileTooLarge     = errors.New("file too large")
	ErrDuplicateEntry   = errors.New("duplicate entry")
)
