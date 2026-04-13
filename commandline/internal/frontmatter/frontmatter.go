// Package frontmatter provides helpers for parsing and serializing
// YAML frontmatter in Markdown files (compatible with gray-matter).
package frontmatter

import (
	"bytes"
	"fmt"
	"strings"

	fm "github.com/adrg/frontmatter"
	"gopkg.in/yaml.v3"
)

// ParsedDoc holds the result of parsing a Markdown file with frontmatter.
type ParsedDoc struct {
	Data map[string]interface{}
	Body string
}

// Parse parses YAML frontmatter from markdown content.
func Parse(content []byte) (*ParsedDoc, error) {
	var data map[string]interface{}
	body, err := fm.Parse(bytes.NewReader(content), &data)
	if err != nil {
		return nil, fmt.Errorf("frontmatter parse: %w", err)
	}
	// The underlying YAML v2 decoder produces map[interface{}]interface{} for
	// nested maps. Convert them to map[string]interface{} so the rest of the
	// codebase can use simple string key lookups.
	data = convertMapKeys(data).(map[string]interface{})
	return &ParsedDoc{
		Data: data,
		Body: strings.TrimLeft(string(body), "\n"),
	}, nil
}

// convertMapKeys recursively converts map[interface{}]interface{} (produced by
// YAML v2) to map[string]interface{}.
func convertMapKeys(v interface{}) interface{} {
	switch val := v.(type) {
	case map[interface{}]interface{}:
		m := make(map[string]interface{}, len(val))
		for k, v2 := range val {
			m[fmt.Sprintf("%v", k)] = convertMapKeys(v2)
		}
		return m
	case map[string]interface{}:
		m := make(map[string]interface{}, len(val))
		for k, v2 := range val {
			m[k] = convertMapKeys(v2)
		}
		return m
	case []interface{}:
		for i, item := range val {
			val[i] = convertMapKeys(item)
		}
		return val
	default:
		return v
	}
}

// Stringify serializes frontmatter data and body back to a Markdown string
// compatible with gray-matter output (--- delimited YAML + body).
func Stringify(data map[string]interface{}, body string) ([]byte, error) {
	yamlBytes, err := yaml.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("frontmatter stringify: %w", err)
	}
	var buf bytes.Buffer
	buf.WriteString("---\n")
	buf.Write(yamlBytes)
	buf.WriteString("---\n")
	if body != "" {
		buf.WriteString(body)
		// Ensure trailing newline
		if !strings.HasSuffix(body, "\n") {
			buf.WriteString("\n")
		}
	}
	return buf.Bytes(), nil
}

// GetString extracts a string value from frontmatter data.
func GetString(data map[string]interface{}, key string) string {
	v, ok := data[key]
	if !ok {
		return ""
	}
	s, ok := v.(string)
	if !ok {
		return fmt.Sprintf("%v", v)
	}
	return s
}

// GetStringPtr extracts a nullable string value.
func GetStringPtr(data map[string]interface{}, key string) *string {
	v, ok := data[key]
	if !ok || v == nil {
		return nil
	}
	s, ok := v.(string)
	if !ok {
		str := fmt.Sprintf("%v", v)
		return &str
	}
	return &s
}

// GetInt extracts an integer value (YAML often parses as int).
func GetInt(data map[string]interface{}, key string) int {
	v, ok := data[key]
	if !ok {
		return 0
	}
	switch n := v.(type) {
	case int:
		return n
	case int64:
		return int(n)
	case float64:
		return int(n)
	default:
		return 0
	}
}

// GetFloat extracts a nullable float64 value.
func GetFloat(data map[string]interface{}, key string) *float64 {
	v, ok := data[key]
	if !ok || v == nil {
		return nil
	}
	switch n := v.(type) {
	case int:
		f := float64(n)
		return &f
	case int64:
		f := float64(n)
		return &f
	case float64:
		return &n
	default:
		return nil
	}
}

// GetStringSlice extracts a string slice from frontmatter data.
func GetStringSlice(data map[string]interface{}, key string) []string {
	v, ok := data[key]
	if !ok || v == nil {
		return nil
	}
	switch s := v.(type) {
	case []interface{}:
		result := make([]string, 0, len(s))
		for _, item := range s {
			if str, ok := item.(string); ok {
				result = append(result, str)
			} else {
				result = append(result, fmt.Sprintf("%v", item))
			}
		}
		return result
	case []string:
		return s
	case string:
		// Single string value, wrap in slice
		return []string{s}
	default:
		return nil
	}
}

// GetBool extracts a boolean value.
func GetBool(data map[string]interface{}, key string) bool {
	v, ok := data[key]
	if !ok {
		return false
	}
	b, ok := v.(bool)
	return ok && b
}
