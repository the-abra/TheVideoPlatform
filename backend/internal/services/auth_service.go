package services

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

type AuthService struct {
	jwtSecret    string
	expiryHours  int
}

func NewAuthService(jwtSecret string, expiryHours int) *AuthService {
	return &AuthService{
		jwtSecret:   jwtSecret,
		expiryHours: expiryHours,
	}
}

func (s *AuthService) GenerateToken(userID int, username, role string) (string, error) {
	claims := JWTClaims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(s.expiryHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "titan-backend",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

func GetJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" || secret == "default-secret-change-me" || secret == "your-jwt-secret-key-here" {
		panic("SECURITY ERROR: JWT_SECRET must be set to a strong random value in .env file. Never use default values in production!")
	}
	if len(secret) < 32 {
		panic("SECURITY ERROR: JWT_SECRET must be at least 32 characters long")
	}
	return secret
}
