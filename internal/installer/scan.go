package installer

import (
	"os"
	"path/filepath"
	"strings"
)

// Scan walks the fonts directory and returns a map of family -> list of detected
// variant tokens (or empty string when the variant cannot be determined). Family
// matching is permissive: it strips spaces from each candidate family name and
// looks for filenames starting with that prefix.
func (i *Installer) Scan(families []string) (map[string][]string, error) {
	entries, err := os.ReadDir(i.fontsDir)
	if err != nil {
		return nil, err
	}

	type filenameInfo struct {
		raw      string // original basename without extension
		stripped string // lowercase, spaces removed
	}

	files := make([]filenameInfo, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		ext := strings.ToLower(filepath.Ext(name))
		if ext != ".ttf" && ext != ".otf" {
			continue
		}
		base := strings.TrimSuffix(name, filepath.Ext(name))
		files = append(files, filenameInfo{
			raw:      base,
			stripped: strings.ToLower(strings.ReplaceAll(base, " ", "")),
		})
	}

	out := make(map[string][]string, len(families))
	for _, family := range families {
		needle := strings.ToLower(strings.ReplaceAll(family, " ", ""))
		var found []string
		for _, f := range files {
			if !strings.HasPrefix(f.stripped, needle) {
				continue
			}
			variant := extractVariant(f.stripped, needle)
			found = append(found, variant)
		}
		if len(found) > 0 {
			out[family] = found
		}
	}
	return out, nil
}

func extractVariant(strippedBase, needle string) string {
	rest := strings.TrimPrefix(strippedBase, needle)
	rest = strings.TrimLeft(rest, "-_ ")
	if rest == "" {
		return "regular"
	}
	return rest
}
