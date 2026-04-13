package doctor

import (
	"fmt"
	"os"

	"github.com/briant-spindance/folio/internal/frontmatter"
	"github.com/briant-spindance/folio/internal/store"
)

// checkTeam validates the team.md file.
func checkTeam(paths *store.Paths) []Check {
	data, err := os.ReadFile(paths.Team)
	if os.IsNotExist(err) {
		return []Check{warn("team.md not found")}
	}
	if err != nil {
		return []Check{fail(fmt.Sprintf("Cannot read team.md: %v", err))}
	}

	doc, err := frontmatter.Parse(data)
	if err != nil {
		return []Check{fail(fmt.Sprintf("team.md: invalid frontmatter: %v", err))}
	}

	membersRaw, ok := doc.Data["members"]
	if !ok {
		return []Check{warn("team.md: missing 'members' field")}
	}

	members, ok := membersRaw.([]interface{})
	if !ok {
		return []Check{fail("team.md: 'members' is not a list")}
	}

	var checks []Check
	for i, m := range members {
		member, ok := m.(map[string]interface{})
		if !ok {
			checks = append(checks, warn(fmt.Sprintf("team.md: member %d is not a valid entry", i+1)))
			continue
		}
		name := frontmatter.GetString(member, "name")
		if name == "" {
			checks = append(checks, warn(fmt.Sprintf("team.md: member %d is missing 'name'", i+1)))
		}
	}

	if len(checks) == 0 {
		return []Check{pass("Team file is valid")}
	}

	return checks
}
