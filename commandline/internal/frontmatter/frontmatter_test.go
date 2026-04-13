package frontmatter

import (
	"testing"
)

func TestParse(t *testing.T) {
	input := []byte(`---
title: Test Doc
status: draft
priority: high
tags:
  - api
  - backend
points: 5
---
This is the body.
`)

	doc, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}

	if doc.Data["title"] != "Test Doc" {
		t.Errorf("title: got %q, want %q", doc.Data["title"], "Test Doc")
	}

	if doc.Body != "This is the body.\n" {
		t.Errorf("body: got %q, want %q", doc.Body, "This is the body.\n")
	}
}

func TestParseEmptyBody(t *testing.T) {
	input := []byte(`---
title: No Body
---
`)
	doc, err := Parse(input)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}

	if doc.Data["title"] != "No Body" {
		t.Errorf("title: got %q", doc.Data["title"])
	}
}

func TestStringify(t *testing.T) {
	data := map[string]interface{}{
		"title":  "Test",
		"status": "draft",
	}

	result, err := Stringify(data, "Hello body")
	if err != nil {
		t.Fatalf("Stringify failed: %v", err)
	}

	// Parse it back
	doc, err := Parse(result)
	if err != nil {
		t.Fatalf("Re-parse failed: %v", err)
	}

	if doc.Data["title"] != "Test" {
		t.Errorf("title roundtrip: got %q", doc.Data["title"])
	}
	if doc.Data["status"] != "draft" {
		t.Errorf("status roundtrip: got %q", doc.Data["status"])
	}
	if doc.Body != "Hello body\n" {
		t.Errorf("body roundtrip: got %q", doc.Body)
	}
}

func TestGetString(t *testing.T) {
	data := map[string]interface{}{
		"name": "alice",
		"num":  42,
	}

	if got := GetString(data, "name"); got != "alice" {
		t.Errorf("GetString: got %q", got)
	}
	if got := GetString(data, "missing"); got != "" {
		t.Errorf("GetString missing: got %q", got)
	}
	if got := GetString(data, "num"); got != "42" {
		t.Errorf("GetString num: got %q", got)
	}
}

func TestGetStringPtr(t *testing.T) {
	data := map[string]interface{}{
		"val":  "hello",
		"null": nil,
	}

	if got := GetStringPtr(data, "val"); got == nil || *got != "hello" {
		t.Errorf("GetStringPtr: got %v", got)
	}
	if got := GetStringPtr(data, "null"); got != nil {
		t.Errorf("GetStringPtr null: got %v", got)
	}
	if got := GetStringPtr(data, "missing"); got != nil {
		t.Errorf("GetStringPtr missing: got %v", got)
	}
}

func TestGetInt(t *testing.T) {
	data := map[string]interface{}{
		"a": 10,
		"b": int64(20),
		"c": 30.5,
	}

	if got := GetInt(data, "a"); got != 10 {
		t.Errorf("GetInt a: got %d", got)
	}
	if got := GetInt(data, "b"); got != 20 {
		t.Errorf("GetInt b: got %d", got)
	}
	if got := GetInt(data, "c"); got != 30 {
		t.Errorf("GetInt c: got %d", got)
	}
	if got := GetInt(data, "missing"); got != 0 {
		t.Errorf("GetInt missing: got %d", got)
	}
}

func TestGetFloat(t *testing.T) {
	data := map[string]interface{}{
		"a":    5.5,
		"b":    3,
		"null": nil,
	}

	if got := GetFloat(data, "a"); got == nil || *got != 5.5 {
		t.Errorf("GetFloat a: got %v", got)
	}
	if got := GetFloat(data, "b"); got == nil || *got != 3.0 {
		t.Errorf("GetFloat b: got %v", got)
	}
	if got := GetFloat(data, "null"); got != nil {
		t.Errorf("GetFloat null: got %v", got)
	}
}

func TestGetStringSlice(t *testing.T) {
	data := map[string]interface{}{
		"tags":   []interface{}{"api", "backend"},
		"single": "one",
		"empty":  nil,
	}

	tags := GetStringSlice(data, "tags")
	if len(tags) != 2 || tags[0] != "api" || tags[1] != "backend" {
		t.Errorf("GetStringSlice tags: got %v", tags)
	}

	single := GetStringSlice(data, "single")
	if len(single) != 1 || single[0] != "one" {
		t.Errorf("GetStringSlice single: got %v", single)
	}

	empty := GetStringSlice(data, "empty")
	if empty != nil {
		t.Errorf("GetStringSlice empty: got %v", empty)
	}
}
