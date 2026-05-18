package installer

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"fontz/internal/gfonts"
)

type InstallRequest struct {
	Family    string   `json:"family"`
	Variants  []string `json:"variants"`
	Overwrite bool     `json:"overwrite"`
}

type VariantResult struct {
	Variant   string `json:"variant"`
	Status    string `json:"status"` // "installed", "collision", "error"
	Filename  string `json:"filename,omitempty"`
	Error     string `json:"error,omitempty"`
	Collision bool   `json:"collision,omitempty"`
}

type InstallResult struct {
	Family   string          `json:"family"`
	Variants []VariantResult `json:"variants"`
}

type ProgressEvent struct {
	Family  string `json:"family"`
	Variant string `json:"variant"`
	Status  string `json:"status"` // "started", "completed", "failed"
	Error   string `json:"error,omitempty"`
}

type Emitter func(event string, data ...interface{})

type Installer struct {
	fontsDir    string
	sidecarPath string
	catalog     *gfonts.Catalog
	emit        Emitter
	http        *http.Client

	mu sync.Mutex // serializes sidecar reads/writes
}

func New(fontsDir, sidecarPath string, catalog *gfonts.Catalog, emit Emitter) *Installer {
	return &Installer{
		fontsDir:    fontsDir,
		sidecarPath: sidecarPath,
		catalog:     catalog,
		emit:        emit,
		http:        &http.Client{Timeout: 60 * time.Second},
	}
}

func (i *Installer) Install(ctx context.Context, req InstallRequest) (InstallResult, error) {
	if req.Family == "" {
		return InstallResult{}, errors.New("family is required")
	}
	if len(req.Variants) == 0 {
		return InstallResult{}, errors.New("at least one variant is required")
	}

	fam, err := i.catalog.GetFamily(req.Family)
	if err != nil {
		return InstallResult{}, err
	}

	ours := i.ourFilenames()

	result := InstallResult{Family: req.Family}
	for _, variant := range req.Variants {
		vr := i.installOne(ctx, fam, variant, req.Overwrite, ours)
		result.Variants = append(result.Variants, vr)
	}

	return result, nil
}

func (i *Installer) installOne(ctx context.Context, fam gfonts.FontFamily, variant string, overwrite bool, ours map[string]bool) VariantResult {
	out := VariantResult{Variant: variant}

	url, ok := fam.Files[variant]
	if !ok {
		out.Status = "error"
		out.Error = fmt.Sprintf("variant %q not available for %s", variant, fam.Family)
		return out
	}

	filename := buildFilename(fam.Family, variant)
	target := filepath.Join(i.fontsDir, filename)
	out.Filename = filename

	if info, err := os.Stat(target); err == nil && !info.IsDir() {
		if !ours[filename] && !overwrite {
			out.Status = "collision"
			out.Collision = true
			return out
		}
	}

	i.emit("install:progress", ProgressEvent{Family: fam.Family, Variant: variant, Status: "started"})

	if err := i.downloadAtomic(ctx, url, target); err != nil {
		out.Status = "error"
		out.Error = err.Error()
		i.emit("install:progress", ProgressEvent{Family: fam.Family, Variant: variant, Status: "failed", Error: err.Error()})
		return out
	}

	if err := i.recordEntry(fam.Family, variant, filename); err != nil {
		out.Status = "error"
		out.Error = fmt.Sprintf("font written but failed to update manifest: %v", err)
		i.emit("install:progress", ProgressEvent{Family: fam.Family, Variant: variant, Status: "failed", Error: out.Error})
		return out
	}

	out.Status = "installed"
	i.emit("install:progress", ProgressEvent{Family: fam.Family, Variant: variant, Status: "completed"})
	return out
}

func (i *Installer) downloadAtomic(ctx context.Context, url, target string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}

	resp, err := i.http.Do(req)
	if err != nil {
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download %s: %s", url, resp.Status)
	}

	tmp := target + ".partial"
	f, err := os.OpenFile(tmp, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o644)

	if err != nil {
		return err
	}
	if _, err := io.Copy(f, resp.Body); err != nil {
		f.Close()
		_ = os.Remove(tmp)
		return err
	}

	if err := f.Close(); err != nil {
		_ = os.Remove(tmp)
		return err
	}

	if err := os.Rename(tmp, target); err != nil {
		_ = os.Remove(tmp)
		return err
	}

	return nil
}

func buildFilename(family, variant string) string {
	clean := strings.ReplaceAll(family, " ", "")

	return fmt.Sprintf("%s-%s.ttf", clean, variant)
}
