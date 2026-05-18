package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"fontz/internal/config"
	"fontz/internal/gfonts"
	"fontz/internal/installer"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx       context.Context
	cfg       *config.Config
	catalog   *gfonts.Catalog
	installer *installer.Installer
	initErr   string
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	cfg, err := config.Load()
	if err != nil {
		a.initErr = err.Error()
		runtime.LogErrorf(ctx, "config load failed: %v", err)
		return
	}
	a.cfg = cfg

	if cfg.HasAPIKey() {
		a.initServices()
	}
}

func (a *App) initServices() {
	client := gfonts.NewClient(a.cfg.APIKey)
	a.catalog = gfonts.NewCatalog(client)

	emit := func(event string, data ...interface{}) {
		runtime.EventsEmit(a.ctx, event, data...)
	}
	a.installer = installer.New(a.cfg.FontsDir, a.cfg.SidecarPath, a.catalog, emit)
}

func (a *App) ensureReady() error {
	if a.initErr != "" {
		return errors.New(a.initErr)
	}
	if a.cfg == nil || !a.cfg.HasAPIKey() {
		return errors.New("api key not set")
	}
	if a.catalog == nil || a.installer == nil {
		return errors.New("app not initialized")
	}
	return nil
}

func (a *App) ListFonts(q gfonts.ListQuery) (gfonts.ListResult, error) {
	if err := a.ensureReady(); err != nil {
		return gfonts.ListResult{}, err
	}
	return a.catalog.List(q)
}

func (a *App) GetFamily(family string) (gfonts.FontFamily, error) {
	if err := a.ensureReady(); err != nil {
		return gfonts.FontFamily{}, err
	}
	return a.catalog.GetFamily(family)
}

func (a *App) GetCategories() ([]string, error) {
	if err := a.ensureReady(); err != nil {
		return nil, err
	}
	return a.catalog.Categories()
}

func (a *App) GetSubsets() ([]string, error) {
	if err := a.ensureReady(); err != nil {
		return nil, err
	}
	return a.catalog.Subsets()
}

func (a *App) RefreshCatalog() error {
	if err := a.ensureReady(); err != nil {
		return err
	}
	a.catalog.Invalidate()
	return nil
}

func (a *App) Install(req installer.InstallRequest) (installer.InstallResult, error) {
	if err := a.ensureReady(); err != nil {
		return installer.InstallResult{}, err
	}
	return a.installer.Install(a.ctx, req)
}

func (a *App) ScanInstalled(families []string) (map[string][]string, error) {
	if err := a.ensureReady(); err != nil {
		return nil, err
	}
	return a.installer.Scan(families)
}

func (a *App) StartupError() string {
	return a.initErr
}

func (a *App) NeedsAPIKey() bool {
	if a.initErr != "" {
		return false
	}
	return a.cfg == nil || !a.cfg.HasAPIKey()
}

// SetAPIKey validates the supplied key against the Google Fonts API, persists it
// to ~/Library/Application Support/fontz/config.json, and initializes (or rebuilds)
// the catalog + installer using the new key.
func (a *App) SetAPIKey(key string) error {
	if a.cfg == nil {
		return errors.New("config not loaded")
	}
	key = strings.TrimSpace(key)
	if key == "" {
		return errors.New("api key cannot be empty")
	}
	if err := validateGoogleFontsKey(a.ctx, key); err != nil {
		return err
	}
	if err := a.cfg.SaveAPIKey(key); err != nil {
		return err
	}
	a.initServices()
	return nil
}

// OpenURL opens an external URL in the user's default browser. Used by the
// API-key dialog to take the user to Google Cloud Console.
func (a *App) OpenURL(rawURL string) {
	runtime.BrowserOpenURL(a.ctx, rawURL)
}

func validateGoogleFontsKey(ctx context.Context, key string) error {
	q := url.Values{}
	q.Set("key", key)
	endpoint := "https://www.googleapis.com/webfonts/v1/webfonts?" + q.Encode()

	cctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(cctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("network error validating key: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		return nil
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
	return fmt.Errorf("google rejected the key (%s): %s", resp.Status, strings.TrimSpace(string(body)))
}
