package gfonts

import "sync"

type FontFamily struct {
	Family       string            `json:"family"`
	Category     string            `json:"category"`
	Variants     []string          `json:"variants"`
	Subsets      []string          `json:"subsets"`
	Version      string            `json:"version"`
	LastModified string            `json:"lastModified"`
	Files        map[string]string `json:"files"`
	Menu         string            `json:"menu,omitempty"`
}

type ListQuery struct {
	Search   string `json:"search"`
	Category string `json:"category"`
	Subset   string `json:"subset"`
	Sort     string `json:"sort"`
	Offset   int    `json:"offset"`
	Limit    int    `json:"limit"`
}

type ListResult struct {
	Items  []FontFamily `json:"items"`
	Total  int          `json:"total"`
	Offset int          `json:"offset"`
	Limit  int          `json:"limit"`
}

type Catalog struct {
	client *Client

	mu    sync.RWMutex
	items []FontFamily
	// popularityRank[family] = index (lower = more popular) for sort=popularity.
	// We approximate by remembering the original fetch order under sort=alpha (no popularity),
	// and re-fetching with sort=popularity once if requested.
	popularityRank map[string]int
	trendingRank   map[string]int
}
