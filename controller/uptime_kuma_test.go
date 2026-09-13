package controller

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFetchGroupDataReturnsRecentHeartbeatHistory(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/status-page/demo":
			_, _ = w.Write([]byte(`{"publicGroupList":[{"id":1,"name":"Core","monitorList":[{"id":7,"name":"Gateway"}]}]}`))
		case "/api/status-page/heartbeat/demo":
			history := make([]map[string]any, heartbeatLimit+2)
			baseTime := time.Date(2026, time.September, 13, 10, 0, 0, 0, time.UTC)
			for index := range heartbeatLimit + 2 {
				status := 1
				if index == heartbeatLimit+1 {
					status = 0
				}
				history[index] = map[string]any{
					"status": status,
					"time":   baseTime.Add(time.Duration(index) * time.Minute).Format("2006-01-02 15:04:05"),
					"msg":    "hidden",
					"ping":   12,
				}
			}
			payload, err := common.Marshal(map[string]any{
				"heartbeatList": map[string]any{
					"7": history,
					"8": []map[string]any{{"status": 1, "time": "ignored"}},
				},
				"uptimeList": map[string]float64{"7_24": 0.975},
			})
			require.NoError(t, err)
			_, _ = w.Write(payload)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(server.Close)

	result := fetchGroupData(context.Background(), server.Client(), map[string]any{
		"url": server.URL, "slug": "demo", "categoryName": "Production",
	})
	require.Len(t, result.Monitors, 1)
	monitor := result.Monitors[0]
	assert.Equal(t, "Production", result.CategoryName)
	assert.Equal(t, "Gateway", monitor.Name)
	assert.Equal(t, "Core", monitor.Group)
	assert.Equal(t, 0.975, monitor.Uptime)
	assert.Equal(t, 0, monitor.Status, "the newest heartbeat determines current status")
	require.Len(t, monitor.Heartbeats, heartbeatLimit)
	assert.Equal(t, "2026-09-13 10:02:00", monitor.Heartbeats[0].Time)
	assert.Equal(t, "2026-09-13 11:01:00", monitor.Heartbeats[heartbeatLimit-1].Time)

	payload, err := common.Marshal(monitor)
	require.NoError(t, err)
	assert.NotContains(t, string(payload), "msg")
	assert.NotContains(t, string(payload), "ping")
}

func TestFetchGroupDataReturnsEmptyResultWhenUpstreamFails(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "unavailable", http.StatusServiceUnavailable)
	}))
	t.Cleanup(server.Close)

	result := fetchGroupData(context.Background(), server.Client(), map[string]any{
		"url": server.URL, "slug": "demo", "categoryName": "Production",
	})
	assert.Equal(t, "Production", result.CategoryName)
	assert.Empty(t, result.Monitors)
}
