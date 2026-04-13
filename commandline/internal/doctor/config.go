package doctor

import (
	"fmt"
	"os"

	"github.com/briant-spindance/folio/internal/store"
	"gopkg.in/yaml.v3"
)

// folioConfig represents the expected structure of folio.yaml.
type folioConfig struct {
	Project  string         `yaml:"project"`
	Version  string         `yaml:"version"`
	Workflow workflowConfig `yaml:"workflow"`
}

type workflowConfig struct {
	States  []string `yaml:"states"`
	Default string   `yaml:"default"`
}

// checkConfig validates folio.yaml exists and has valid content.
func checkConfig(paths *store.Paths) []Check {
	data, err := os.ReadFile(paths.Config)
	if os.IsNotExist(err) {
		return []Check{fail("folio.yaml not found")}
	}
	if err != nil {
		return []Check{fail(fmt.Sprintf("Cannot read folio.yaml: %v", err))}
	}

	var cfg folioConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return []Check{fail(fmt.Sprintf("folio.yaml has invalid YAML: %v", err))}
	}

	var checks []Check

	if cfg.Project == "" {
		checks = append(checks, warn("folio.yaml: missing 'project' field"))
	}

	if len(cfg.Workflow.States) == 0 {
		checks = append(checks, warn("folio.yaml: missing 'workflow.states'"))
	}

	if cfg.Workflow.Default == "" {
		checks = append(checks, warn("folio.yaml: missing 'workflow.default'"))
	} else if len(cfg.Workflow.States) > 0 {
		found := false
		for _, s := range cfg.Workflow.States {
			if s == cfg.Workflow.Default {
				found = true
				break
			}
		}
		if !found {
			checks = append(checks, warn(fmt.Sprintf("folio.yaml: workflow.default '%s' is not in workflow.states", cfg.Workflow.Default)))
		}
	}

	if len(checks) == 0 {
		checks = append(checks, pass("folio.yaml is valid"))
	}

	return checks
}
