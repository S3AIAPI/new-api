package controller

import (
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func GetAccessTokenStatus(c *gin.Context) {
	status, err := model.GetUserAccessTokenStatus(c.GetInt("id"))
	if err != nil {
		writeSecurityOperationError(c, err)
		return
	}
	common.ApiSuccess(c, status)
}

func GenerateAccessToken(c *gin.Context) {
	if middleware.RequireSecurityProof(c, service.VerificationOperation{Scope: service.VerificationScopeAccessTokenGenerate}) == nil {
		return
	}
	id := c.GetInt("id")
	key, err := common.GenerateRandomKey(29 + common.GetRandomInt(4))
	if err != nil {
		writeSecurityOperationError(c, err)
		return
	}
	var existing int64
	if err := model.DB.Model(&model.User{}).Where("access_token = ?", key).Count(&existing).Error; err != nil {
		writeSecurityOperationError(c, err)
		return
	}
	if existing != 0 {
		common.ApiErrorI18n(c, i18n.MsgUuidDuplicate)
		return
	}
	if err := model.UpdateUserAccessToken(id, key); err != nil {
		writeSecurityOperationError(c, err)
		return
	}
	recordUserSecurityAudit(c, id, "access_token.generate", map[string]any{"token_ref": model.AccessTokenFingerprint(key)})
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": key})
}

func RevokeAccessToken(c *gin.Context) {
	if middleware.RequireSecurityProof(c, service.VerificationOperation{Scope: service.VerificationScopeAccessTokenRevoke}) == nil {
		return
	}
	ref, err := model.RevokeUserAccessToken(c.GetInt("id"))
	if err != nil {
		writeSecurityOperationError(c, err)
		return
	}
	if ref != "" {
		recordUserSecurityAudit(c, c.GetInt("id"), "access_token.revoke", map[string]any{"token_ref": ref})
	}
	common.ApiSuccess(c, nil)
}

func GetAuditLogs(c *gin.Context) {
	page := common.GetPageQuery(c)
	if page.Page < 1 || page.PageSize < 1 || page.Page > 100000000 {
		common.ApiErrorMsg(c, "Invalid audit pagination")
		return
	}
	viewerRole := c.GetInt("role")
	filter, err := parseAuditLogFilter(c, c.FullPath() == "/api/audit/self")
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	logs, total, err := model.GetAuditLogs(filter, page.GetStartIdx(), page.GetPageSize(), viewerRole)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	page.SetItems(logs)
	page.SetTotal(int(total))
	common.ApiSuccess(c, page)
}

func parseAuditLogFilter(c *gin.Context, selfView bool) (model.AuditLogFilter, error) {
	filter := model.AuditLogFilter{
		Username:        c.Query("username"),
		Category:        c.Query("category"),
		TokenRef:        c.Query("token_ref"),
		ExcludeTokenRef: c.Query("exclude_token_ref"),
		RequestId:       c.Query("request_id"),
		SelfView:        selfView,
	}
	if selfView {
		filter.UserId = c.GetInt("id")
		filter.Username = ""
	}
	if !model.ValidAuditCategory(filter.Category) || !model.ValidTokenFingerprint(filter.TokenRef) || !model.ValidTokenFingerprint(filter.ExcludeTokenRef) {
		return model.AuditLogFilter{}, fmt.Errorf("Invalid audit filters")
	}
	for name, target := range map[string]*int64{"start_timestamp": &filter.StartTimestamp, "end_timestamp": &filter.EndTimestamp} {
		if raw := c.Query(name); raw != "" {
			parsed, err := strconv.ParseInt(raw, 10, 64)
			if err != nil || parsed < 0 {
				return model.AuditLogFilter{}, fmt.Errorf("Invalid audit time range")
			}
			*target = parsed
		}
	}
	if filter.EndTimestamp > 0 && filter.EndTimestamp < filter.StartTimestamp {
		return model.AuditLogFilter{}, fmt.Errorf("Invalid audit time range")
	}
	if raw := c.Query("success"); raw != "" {
		if raw != "true" && raw != "false" {
			return model.AuditLogFilter{}, fmt.Errorf("Invalid audit result")
		}
		success := raw == "true"
		filter.Success = &success
	}
	return filter, nil
}

func ExportAuditLogsCSV(c *gin.Context) {
	selfView := c.FullPath() == "/api/audit/self/export"
	filter, err := parseAuditLogFilter(c, selfView)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	writeCSVDownload(c, "audit-logs", func(writer io.Writer) error {
		return model.WriteAuditLogsCSV(writer, filter, c.GetInt("role"))
	})
}
