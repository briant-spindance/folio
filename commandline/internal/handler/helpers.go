package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/briantol/folio/internal/model"
)

// JSON writes a JSON response.
func JSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// ErrorJSON writes a JSON error response.
func ErrorJSON(w http.ResponseWriter, status int, message string) {
	JSON(w, status, map[string]string{"error": message})
}

// ReadJSON decodes a JSON request body into v.
func ReadJSON(r *http.Request, v interface{}) error {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return err
	}
	return json.Unmarshal(body, v)
}

// QueryInt returns an integer query parameter with a default and clamping.
func QueryInt(r *http.Request, key string, defaultVal, min, max int) int {
	s := r.URL.Query().Get(key)
	if s == "" {
		return defaultVal
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return defaultVal
	}
	if n < min {
		return min
	}
	if n > max {
		return max
	}
	return n
}

// QueryFloat returns a nullable float64 query parameter.
func QueryFloat(r *http.Request, key string) *float64 {
	s := r.URL.Query().Get(key)
	if s == "" {
		return nil
	}
	n, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	return &n
}

// featureListAll returns params to list all features (used by status endpoint).
func featureListAll() model.ListFeaturesParams {
	return model.ListFeaturesParams{
		Page:  1,
		Limit: 1000,
		Sort:  "order",
		Dir:   "asc",
	}
}

// issueListAll returns params to list all issues (used by status endpoint).
func issueListAll() model.ListIssuesParams {
	return model.ListIssuesParams{
		Page:  1,
		Limit: 1000,
		Sort:  "order",
		Dir:   "asc",
	}
}

// QueryCSV returns a comma-separated query parameter as a string slice.
func QueryCSV(r *http.Request, key string) []string {
	s := r.URL.Query().Get(key)
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	if len(result) == 0 {
		return nil
	}
	return result
}
