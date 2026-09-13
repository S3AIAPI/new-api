package controller

import (
	"fmt"
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

// GetCheckinStatus 获取用户签到状态和历史记录
func GetCheckinStatus(c *gin.Context) {
	setting := operation_setting.GetCheckinSetting()
	if !setting.Enabled {
		common.ApiErrorMsg(c, "签到功能未启用")
		return
	}
	userId := c.GetInt("id")
	// 获取月份参数，默认为当前月份
	month := c.DefaultQuery("month", time.Now().Format("2006-01"))
	eligibility, err := model.GetCheckinEligibility(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	stats, err := model.GetUserCheckinStats(userId, month)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"enabled":               setting.Enabled,
			"min_quota":             setting.MinQuota,
			"max_quota":             setting.MaxQuota,
			"min_user_quota":        setting.MinUserQuota,
			"min_used_quota":        setting.MinUsedQuota,
			"daily_user_limit":      setting.DailyUserLimit,
			"daily_quota_limit":     setting.DailyQuotaLimit,
			"deductible_groups":     setting.DeductibleGroups,
			"eligibility":           eligibility,
			"eligible":              eligibility.Eligible,
			"current_quota":         eligibility.CurrentQuota,
			"current_used_quota":    eligibility.CurrentUsedQuota,
			"today_user_count":      eligibility.TodayUserCount,
			"today_quota_awarded":   eligibility.TodayQuotaAwarded,
			"daily_quota_remaining": eligibility.DailyQuotaRemaining,
			"stats":                 stats,
		},
	})
}

// DoCheckin 执行用户签到
func DoCheckin(c *gin.Context) {
	setting := operation_setting.GetCheckinSetting()
	if !setting.Enabled {
		common.ApiErrorMsg(c, "签到功能未启用")
		return
	}

	userId := c.GetInt("id")
	checkin, err := model.UserCheckin(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("用户签到，获得额度 %s", logger.LogQuota(checkin.QuotaAwarded)))
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "签到成功",
		"data": gin.H{
			"quota_awarded": checkin.QuotaAwarded,
			"checkin_date":  checkin.CheckinDate},
	})
}
