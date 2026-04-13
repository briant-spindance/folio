package store

import (
	"os"

	"github.com/briantol/folio/internal/frontmatter"
	"github.com/briantol/folio/internal/model"
)

// TeamStore provides read access to team members.
type TeamStore struct {
	paths *Paths
}

// NewTeamStore creates a new TeamStore.
func NewTeamStore(p *Paths) *TeamStore {
	return &TeamStore{paths: p}
}

// List returns all team members.
func (s *TeamStore) List() []model.TeamMember {
	data, err := os.ReadFile(s.paths.Team)
	if err != nil {
		return nil
	}

	doc, err := frontmatter.Parse(data)
	if err != nil {
		return nil
	}

	membersRaw, ok := doc.Data["members"]
	if !ok {
		return nil
	}

	membersSlice, ok := membersRaw.([]interface{})
	if !ok {
		return nil
	}

	members := make([]model.TeamMember, 0, len(membersSlice))
	for _, item := range membersSlice {
		m, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		member := model.TeamMember{
			Name: frontmatter.GetString(m, "name"),
			Role: frontmatter.GetString(m, "role"),
		}
		if gh := frontmatter.GetStringPtr(m, "github"); gh != nil {
			member.GitHub = gh
		}
		members = append(members, member)
	}

	return members
}
