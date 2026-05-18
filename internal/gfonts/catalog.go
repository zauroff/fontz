package gfonts

import (
	"fmt"
	"sort"
	"strings"
)

func NewCatalog(client *Client) *Catalog {
	return &Catalog{client: client}
}

func (c *Catalog) ensureLoaded() error {
	c.mu.RLock()
	loaded := c.items != nil
	c.mu.RUnlock()
	if loaded {
		return nil
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if c.items != nil {
		return nil
	}

	items, err := c.client.Fetch()
	if err != nil {
		return err
	}
	c.items = items
	return nil
}

func (c *Catalog) Invalidate() {
	c.mu.Lock()
	c.items = nil
	c.popularityRank = nil
	c.trendingRank = nil
	c.mu.Unlock()
}

func (c *Catalog) ensureRank(kind string) error {
	c.mu.RLock()
	have := c.popularityRank != nil && kind == "popularity" || c.trendingRank != nil && kind == "trending"
	c.mu.RUnlock()
	if have {
		return nil
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if kind == "popularity" && c.popularityRank != nil {
		return nil
	}
	if kind == "trending" && c.trendingRank != nil {
		return nil
	}

	// Re-fetch sorted by the requested key to capture rank order, then map family -> rank.
	q := newQuery(c.client.apiKey, kind)
	ranked, err := c.client.fetchWithQuery(q)
	if err != nil {
		return err
	}
	rank := make(map[string]int, len(ranked))
	for i, f := range ranked {
		rank[f.Family] = i
	}
	if kind == "popularity" {
		c.popularityRank = rank
	} else {
		c.trendingRank = rank
	}
	return nil
}

func (c *Catalog) Categories() ([]string, error) {
	if err := c.ensureLoaded(); err != nil {
		return nil, err
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	set := map[string]struct{}{}
	for _, f := range c.items {
		if f.Category != "" {
			set[f.Category] = struct{}{}
		}
	}
	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	sort.Strings(out)
	return out, nil
}

func (c *Catalog) Subsets() ([]string, error) {
	if err := c.ensureLoaded(); err != nil {
		return nil, err
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	set := map[string]struct{}{}
	for _, f := range c.items {
		for _, s := range f.Subsets {
			set[s] = struct{}{}
		}
	}
	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	sort.Strings(out)
	return out, nil
}

func (c *Catalog) List(q ListQuery) (ListResult, error) {
	if err := c.ensureLoaded(); err != nil {
		return ListResult{}, err
	}
	if q.Sort == "popularity" || q.Sort == "trending" {
		if err := c.ensureRank(q.Sort); err != nil {
			return ListResult{}, err
		}
	}

	c.mu.RLock()
	defer c.mu.RUnlock()

	search := strings.ToLower(strings.TrimSpace(q.Search))
	filtered := make([]FontFamily, 0, len(c.items))
	for _, f := range c.items {
		if q.Category != "" && f.Category != q.Category {
			continue
		}
		if q.Subset != "" && !contains(f.Subsets, q.Subset) {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(f.Family), search) {
			continue
		}
		filtered = append(filtered, f)
	}

	sortItems(filtered, q.Sort, c.popularityRank, c.trendingRank)

	total := len(filtered)
	offset := q.Offset
	if offset < 0 {
		offset = 0
	}
	if offset > total {
		offset = total
	}
	limit := q.Limit
	if limit <= 0 {
		limit = 60
	}
	end := offset + limit
	if end > total {
		end = total
	}

	page := make([]FontFamily, end-offset)
	copy(page, filtered[offset:end])

	return ListResult{
		Items:  page,
		Total:  total,
		Offset: offset,
		Limit:  limit,
	}, nil
}

func (c *Catalog) GetFamily(name string) (FontFamily, error) {
	if err := c.ensureLoaded(); err != nil {
		return FontFamily{}, err
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	for _, f := range c.items {
		if f.Family == name {
			return f, nil
		}
	}
	return FontFamily{}, fmt.Errorf("font family %q not found", name)
}

func sortItems(items []FontFamily, key string, popRank, trendRank map[string]int) {
	switch key {
	case "date":
		sort.SliceStable(items, func(i, j int) bool {
			return items[i].LastModified > items[j].LastModified
		})
	case "popularity":
		sort.SliceStable(items, func(i, j int) bool {
			return popRank[items[i].Family] < popRank[items[j].Family]
		})
	case "trending":
		sort.SliceStable(items, func(i, j int) bool {
			return trendRank[items[i].Family] < trendRank[items[j].Family]
		})
	case "style":
		sort.SliceStable(items, func(i, j int) bool {
			return len(items[i].Variants) > len(items[j].Variants)
		})
	default: // "alpha" or empty
		sort.SliceStable(items, func(i, j int) bool {
			return strings.ToLower(items[i].Family) < strings.ToLower(items[j].Family)
		})
	}
}

func contains(haystack []string, needle string) bool {
	for _, s := range haystack {
		if s == needle {
			return true
		}
	}
	return false
}
