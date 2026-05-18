package gfonts

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const endpoint = "https://www.googleapis.com/webfonts/v1/webfonts"

type Client struct {
	apiKey string
	http   *http.Client
}

func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		http:   &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) Fetch() ([]FontFamily, error) {
	return c.fetchWithQuery(newQuery(c.apiKey, "alpha"))
}

func newQuery(apiKey, sortKey string) url.Values {
	q := url.Values{}
	q.Set("key", apiKey)
	if sortKey != "" {
		q.Set("sort", sortKey)
	}
	return q
}

func (c *Client) fetchWithQuery(q url.Values) ([]FontFamily, error) {
	req, err := http.NewRequest(http.MethodGet, endpoint+"?"+q.Encode(), nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("google fonts api: %s: %s", resp.Status, string(body))
	}

	var payload struct {
		Items []FontFamily `json:"items"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	return payload.Items, nil
}
