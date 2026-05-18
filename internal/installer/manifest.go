package installer

import (
	"encoding/json"
	"errors"
	"os"
	"time"
)

type ManifestEntry struct {
	Family      string    `json:"family"`
	Variant     string    `json:"variant"`
	Filename    string    `json:"filename"`
	InstalledAt time.Time `json:"installedAt"`
}

type manifest struct {
	Entries []ManifestEntry `json:"entries"`
}

func (i *Installer) loadManifest() (manifest, error) {
	var m manifest
	b, err := os.ReadFile(i.sidecarPath)
	if errors.Is(err, os.ErrNotExist) {
		return m, nil
	}
	if err != nil {
		return m, err
	}
	if len(b) == 0 {
		return m, nil
	}
	if err := json.Unmarshal(b, &m); err != nil {
		return m, err
	}
	return m, nil
}

func (i *Installer) saveManifest(m manifest) error {
	tmp := i.sidecarPath + ".tmp"
	b, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, i.sidecarPath)
}

func (i *Installer) recordEntry(family, variant, filename string) error {
	i.mu.Lock()
	defer i.mu.Unlock()
	m, err := i.loadManifest()
	if err != nil {
		return err
	}
	for idx, e := range m.Entries {
		if e.Filename == filename {
			m.Entries[idx].InstalledAt = time.Now().UTC()
			return i.saveManifest(m)
		}
	}
	m.Entries = append(m.Entries, ManifestEntry{
		Family:      family,
		Variant:     variant,
		Filename:    filename,
		InstalledAt: time.Now().UTC(),
	})
	return i.saveManifest(m)
}

func (i *Installer) ourFilenames() map[string]bool {
	i.mu.Lock()
	defer i.mu.Unlock()
	m, err := i.loadManifest()
	if err != nil {
		return map[string]bool{}
	}
	out := make(map[string]bool, len(m.Entries))
	for _, e := range m.Entries {
		out[e.Filename] = true
	}
	return out
}

func (i *Installer) Manifest() ([]ManifestEntry, error) {
	i.mu.Lock()
	defer i.mu.Unlock()
	m, err := i.loadManifest()
	if err != nil {
		return nil, err
	}
	return m.Entries, nil
}
