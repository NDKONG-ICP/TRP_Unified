package database

import (
	"fmt"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

type User struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Username string `gorm:"unique;not null" json:"username"`
	Email    string `gorm:"unique;not null" json:"email"`
	Password string `gorm:"not null" json:"-"` // Don't return password in JSON
}

type APIKey struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	UserID    uint   `gorm:"not null" json:"user_id"`
	Key       string `gorm:"unique;not null" json:"key"`
	CreatedAt int64  `gorm:"autoCreateTime" json:"created_at"`
	User      User   `gorm:"foreignKey:UserID" json:"-"`
}

func InitDB() (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", "postgres"),
		getEnv("DB_NAME", "icp_coder"),
		getEnv("DB_PORT", "5432"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	DB = db
	return db, nil
}

func RunMigrations(db *gorm.DB) error {
	return db.AutoMigrate(&User{}, &APIKey{})
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
