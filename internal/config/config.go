package config

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/joho/godotenv"
)

type Config struct {
	APIKey      string
	FontsDir    string
	SidecarPath string
	ConfigPath  string

	mu sync.Mutex
}

type fileShape struct {
	APIKey string `json:"apiKey"`
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	fontsDir := filepath.Join(home, "Library", "Fonts")
	sidecarDir := filepath.Join(home, "Library", "Application Support", "fontz")

	if err := os.MkdirAll(fontsDir, 0o755); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(sidecarDir, 0o755); err != nil {
		return nil, err
	}

	configPath := filepath.Join(sidecarDir, "config.json")

	key := strings.TrimSpace(os.Getenv("GOOGLE_FONTS_API_KEY"))
	if key == "" {
		key = readSavedKey(configPath)
	}

	return &Config{
		APIKey:      key,
		FontsDir:    fontsDir,
		SidecarPath: filepath.Join(sidecarDir, "installed.json"),
		ConfigPath:  configPath,
	}, nil
}

func (c *Config) HasAPIKey() bool {
	return c.APIKey != ""
}

func (c *Config) SaveAPIKey(key string) error {
	key = strings.TrimSpace(key)
	if key == "" {
		return errors.New("api key cannot be empty")
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	payload, err := json.MarshalIndent(fileShape{APIKey: key}, "", "  ")
	if err != nil {
		return err
	}
	tmp := c.ConfigPath + ".tmp"
	if err := os.WriteFile(tmp, payload, 0o600); err != nil {
		return err
	}
	if err := os.Rename(tmp, c.ConfigPath); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	c.APIKey = key
	return nil
}

func readSavedKey(path string) string {
	b, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	var f fileShape
	if err := json.Unmarshal(b, &f); err != nil {
		return ""
	}
	return strings.TrimSpace(f.APIKey)
}
