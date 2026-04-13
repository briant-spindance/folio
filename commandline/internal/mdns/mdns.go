// Package mdns provides mDNS service advertisement for the Folio server.
// It allows the server to be discoverable on the local network via
// multicast DNS (e.g., folio.local).
package mdns

import (
	"fmt"
	"log"
	"net"
	"strings"

	"github.com/hashicorp/mdns"
)

// Advertise starts an mDNS responder that advertises an HTTP service
// with the given hostname on the specified port.
//
// The hostname should be the bare name (e.g. "folio") or a .local name
// (e.g. "folio.local"). The .local suffix is stripped before passing to
// the mDNS library, which adds it automatically.
//
// Returns a shutdown function that stops the mDNS responder.
func Advertise(hostname string, port int) (shutdown func(), err error) {
	// Strip .local suffix — the mdns library uses "local." as the default domain.
	name := strings.TrimSuffix(hostname, ".local")

	// Get the host's local network IPs to advertise.
	ips, err := localIPs()
	if err != nil {
		return nil, fmt.Errorf("mdns: failed to determine local IPs: %w", err)
	}

	service, err := mdns.NewMDNSService(
		name,           // instance name
		"_http._tcp",   // service type
		"",             // domain (empty = "local.")
		name+".local.", // hostname FQDN (e.g. "folio.local.")
		port,           // port
		ips,            // IPs to advertise
		[]string{"Folio project management server"}, // TXT record
	)
	if err != nil {
		return nil, fmt.Errorf("mdns: failed to create service: %w", err)
	}

	// Silence the mdns server logs unless there's an error.
	logger := log.New(log.Writer(), "[mdns] ", log.LstdFlags)

	server, err := mdns.NewServer(&mdns.Config{
		Zone:   service,
		Logger: logger,
	})
	if err != nil {
		return nil, fmt.Errorf("mdns: failed to start server: %w", err)
	}

	return func() { server.Shutdown() }, nil
}

// localIPs returns the non-loopback IPv4 and IPv6 addresses on the machine.
func localIPs() ([]net.IP, error) {
	var ips []net.IP

	ifaces, err := net.Interfaces()
	if err != nil {
		return nil, err
	}

	for _, iface := range ifaces {
		// Skip loopback and down interfaces.
		if iface.Flags&net.FlagLoopback != 0 || iface.Flags&net.FlagUp == 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip != nil && !ip.IsLoopback() {
				ips = append(ips, ip)
			}
		}
	}

	if len(ips) == 0 {
		return nil, fmt.Errorf("no non-loopback network interfaces found")
	}

	return ips, nil
}
